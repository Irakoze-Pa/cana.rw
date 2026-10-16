import { Router } from "express";
import mongoose from "mongoose";
import { TreasuryAccount } from "../accounting/accounting.model";
import { treasuryWorkspace } from "../accounting/accounting.service";
import Expense from "./expense.model";

const router = Router();
const activeChequeStatuses = ["issued", "due", "deposited"];

async function refreshDueCheques() {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  await Expense.updateMany({ method: "bank_cheque", chequeStatus: "issued", chequeDate: { $lte: endOfToday } }, { $set: { chequeStatus: "due" }, $push: { statusHistory: { status: "due", at: new Date(), note: "Maturity date reached" } } });
}

async function validateFundingAccount(data: any, amount: number) {
  // Accounting is optional during the operational rollout. Expenses remain
  // valid business records without a treasury account and can be classified
  // in accounting later. When an account is supplied, validate it fully.
  if (!data.treasuryAccount) return;
  if (!mongoose.Types.ObjectId.isValid(data.treasuryAccount)) throw new Error("Select the cash, bank or Mobile Money account used for this expense.");
  const account: any = await TreasuryAccount.findById(data.treasuryAccount).lean();
  if (!account || account.status !== "active") throw new Error("Select an active payment account.");
  const expectedType = data.method === "cash" ? "cash" : data.method === "mobile_money" ? "mobile_money" : "bank";
  if (data.method !== "other" && account.type !== expectedType) throw new Error("The selected account does not match the payment method.");
  const workspace = await treasuryWorkspace();
  const balance = Number((workspace.accounts as any[]).find((item) => String(item._id) === String(account._id))?.balance || 0);
  if (amount > balance + 0.0001) throw new Error(`Insufficient funds in ${account.name}. Available: ${balance.toLocaleString("en-RW")} RWF.`);
}

async function nextExpenseNumber() {
  const prefix = `EXP-${new Date().getFullYear()}-`;
  const latest: any = await Expense.findOne({ expenseNumber: new RegExp(`^${prefix}\\d+$`) }).sort({ expenseNumber: -1 }).select("expenseNumber").lean();
  const previous = Number(String(latest?.expenseNumber || "").slice(prefix.length));
  return { prefix, sequence: (Number.isFinite(previous) ? previous : 0) + 1 };
}

router.get("/", async (_req, res, next) => {
  try { await refreshDueCheques(); res.json({ data: await Expense.find().populate("treasuryAccount", "name type institution accountNumber").sort({ date: -1, createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.post("/batch", async (req, res, next) => {
  try {
    const data = req.body || {}; const lines = Array.isArray(data.lines) ? data.lines : [];
    if (!lines.length) throw new Error("Add at least one expense line.");
    if (!data.method) throw new Error("Select a payment method.");
    if (data.method === "bank_cheque" && (!String(data.chequeNumber || "").trim() || !String(data.bankName || "").trim() || !data.chequeDate)) throw new Error("Cheque number, bank name and maturity date are required for a bank cheque.");
    if (data.method === "bank_cheque" && !Number.isFinite(new Date(data.chequeDate).getTime())) throw new Error("Enter a valid cheque maturity date.");
    const invalid = lines.find((line: any) => !line.category || !String(line.description || "").trim() || !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0);
    if (invalid) throw new Error("Each expense line needs a category, reason, and amount greater than zero.");
    await validateFundingAccount(data, lines.reduce((sum: number, line: any) => sum + Number(line.amount), 0));
    const nextNumber = await nextExpenseNumber();
    const isCheque = data.method === "bank_cheque"; const now = new Date(); const chequeStatus = isCheque ? (new Date(data.chequeDate).getTime() <= now.getTime() ? "due" : "issued") : "cleared";
    const expenses = await Expense.create(lines.map((line: any, index: number) => ({ date: data.date, payee: data.payee || "", method: data.method, ...(data.treasuryAccount ? { treasuryAccount: data.treasuryAccount } : {}), reference: data.reference || "", chequeNumber: data.chequeNumber || "", bankName: data.bankName || "", chequeDate: isCheque ? new Date(data.chequeDate) : undefined, chequeStatus, issuedAt: isCheque ? now : undefined, clearedAt: isCheque ? undefined : now, statusHistory: [{ status: chequeStatus, at: now, note: isCheque ? "Expense cheque issued" : "Expense paid" }], notes: data.notes || "", category: line.category, description: String(line.description).trim(), amount: Number(line.amount), expenseNumber: `${nextNumber.prefix}${String(nextNumber.sequence + index).padStart(5, "0")}` })));
    res.status(201).json({ data: expenses });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = req.body || {}; const amount = Number(data.amount);
    if (!data.category || !String(data.description || "").trim()) throw new Error("Category and description are required.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Expense amount must be greater than zero.");
    if (data.method === "bank_cheque" && (!String(data.chequeNumber || "").trim() || !String(data.bankName || "").trim() || !data.chequeDate)) throw new Error("Cheque number, bank name and maturity date are required for a bank cheque.");
    await validateFundingAccount(data, amount);
    const nextNumber = await nextExpenseNumber();
    const { treasuryAccount, ...expenseData } = data;
    const expense = await Expense.create({ ...expenseData, ...(treasuryAccount ? { treasuryAccount } : {}), expenseNumber: `${nextNumber.prefix}${String(nextNumber.sequence).padStart(5, "0")}`, amount });
    res.status(201).json({ data: expense });
  } catch (error) { next(error); }
});

router.patch("/cheques/:chequeNumber/status", async (req, res, next) => {
  try {
    const chequeNumber = decodeURIComponent(req.params.chequeNumber).trim(); const status = String(req.body?.status || "");
    if (!chequeNumber || !["deposited", "cleared", "bounced", "cancelled"].includes(status)) throw new Error("Select a valid cheque action.");
    const records: any[] = await Expense.find({ method: "bank_cheque", chequeNumber });
    if (!records.length) throw new Error("Expense cheque not found.");
    const current = records[0].chequeStatus || "cleared";
    if (![...activeChequeStatuses].includes(current)) throw new Error(`A ${current} cheque cannot be changed.`);
    if (status === "deposited" && !["issued", "due"].includes(current)) throw new Error("Only an issued or due cheque can be deposited.");
    let clearingAccount = records[0].treasuryAccount || req.body?.treasuryAccount;
    if (status === "cleared") {
      if (!clearingAccount) {
        const activeBanks = await TreasuryAccount.find({ type: "bank", status: "active" }).select("_id").lean();
        if (activeBanks.length !== 1) throw new Error("Select the bank account from which this cheque cleared.");
        clearingAccount = activeBanks[0]._id;
      }
      await validateFundingAccount({ treasuryAccount: clearingAccount, method: "bank_cheque" }, records.reduce((sum, item) => sum + Number(item.amount || 0), 0));
    }
    const now = new Date();
    await Expense.updateMany({ method: "bank_cheque", chequeNumber }, { $set: { chequeStatus: status, ...(status === "deposited" ? { depositedAt: now } : {}), ...(status === "cleared" ? { clearedAt: now, treasuryAccount: clearingAccount } : {}) }, $push: { statusHistory: { status, at: now, note: `Expense cheque marked ${status}` } } });
    res.json({ data: await Expense.find({ method: "bank_cheque", chequeNumber }).sort({ expenseNumber: 1 }).lean() });
  } catch (error) { next(error); }
});

export default router;
