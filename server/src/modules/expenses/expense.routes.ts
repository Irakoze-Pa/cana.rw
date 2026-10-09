import { Router } from "express";
import mongoose from "mongoose";
import { TreasuryAccount } from "../accounting/accounting.model";
import { treasuryWorkspace } from "../accounting/accounting.service";
import Expense from "./expense.model";

const router = Router();

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
  try { res.json({ data: await Expense.find().populate("treasuryAccount", "name type institution accountNumber").sort({ date: -1, createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.post("/batch", async (req, res, next) => {
  try {
    const data = req.body || {}; const lines = Array.isArray(data.lines) ? data.lines : [];
    if (!lines.length) throw new Error("Add at least one expense line.");
    if (!data.method) throw new Error("Select a payment method.");
    if (data.method === "bank_cheque" && (!String(data.chequeNumber || "").trim() || !String(data.bankName || "").trim())) throw new Error("Cheque number and bank name are required for a bank cheque.");
    const invalid = lines.find((line: any) => !line.category || !String(line.description || "").trim() || !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0);
    if (invalid) throw new Error("Each expense line needs a category, reason, and amount greater than zero.");
    await validateFundingAccount(data, lines.reduce((sum: number, line: any) => sum + Number(line.amount), 0));
    const nextNumber = await nextExpenseNumber();
    const expenses = await Expense.create(lines.map((line: any, index: number) => ({ date: data.date, payee: data.payee || "", method: data.method, ...(data.treasuryAccount ? { treasuryAccount: data.treasuryAccount } : {}), reference: data.reference || "", chequeNumber: data.chequeNumber || "", bankName: data.bankName || "", notes: data.notes || "", category: line.category, description: String(line.description).trim(), amount: Number(line.amount), expenseNumber: `${nextNumber.prefix}${String(nextNumber.sequence + index).padStart(5, "0")}` })));
    res.status(201).json({ data: expenses });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = req.body || {}; const amount = Number(data.amount);
    if (!data.category || !String(data.description || "").trim()) throw new Error("Category and description are required.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Expense amount must be greater than zero.");
    if (data.method === "bank_cheque" && (!String(data.chequeNumber || "").trim() || !String(data.bankName || "").trim())) throw new Error("Cheque number and bank name are required for a bank cheque.");
    await validateFundingAccount(data, amount);
    const nextNumber = await nextExpenseNumber();
    const { treasuryAccount, ...expenseData } = data;
    const expense = await Expense.create({ ...expenseData, ...(treasuryAccount ? { treasuryAccount } : {}), expenseNumber: `${nextNumber.prefix}${String(nextNumber.sequence).padStart(5, "0")}`, amount });
    res.status(201).json({ data: expense });
  } catch (error) { next(error); }
});

export default router;
