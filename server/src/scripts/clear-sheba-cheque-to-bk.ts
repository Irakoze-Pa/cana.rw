/** Add/standardize CANAN bank accounts and clear the grouped Sheba cheque into BK. */
import "dotenv/config";
import mongoose from "mongoose";
import { Payment } from "../modules/billing/billing.model";
import { TreasuryAccount } from "../modules/accounting/accounting.model";
import { updateCustomerCheque } from "../modules/billing/billing.service";
import "../models/users";

const chequeNumber = "SHEBA-20261019-PENDING";
const allocationGroup = "CHQ-SHEBA-20261019";
const expectedAmount = 1_333_000;

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  try {
    const equity: any = await TreasuryAccount.findOne({ type: "bank", institution: /equity/i }).lean();
    if (!equity) throw new Error("The existing Equity bank account was not found.");
    const payments: any[] = await Payment.find({ method: "bank_cheque", chequeNumber }).sort({ createdAt: 1 }).lean();
    if (payments.length !== 3) throw new Error(`Expected three Sheba cheque allocations, found ${payments.length}.`);
    const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (Math.abs(total - expectedAmount) > 0.001) throw new Error(`Sheba cheque total is ${total}, not ${expectedAmount} RWF.`);
    const statuses = [...new Set(payments.map((payment) => payment.chequeStatus))];
    const existingBk: any = await TreasuryAccount.findOne({ type: "bank", institution: /bank of kigali|\bbk\b/i }).lean();
    console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", chequeNumber, allocations: payments.length, amount: total, statuses, equity: { oldName: equity.name, newName: "CANAN Business Group · Equity Bank" }, bk: existingBk ? { id: existingBk._id, name: existingBk.name } : { action: "create", name: "CANAN Business Group · Bank of Kigali" } }, null, 2));
    if (!apply) return;

    await TreasuryAccount.updateOne({ _id: equity._id }, { $set: { name: "CANAN Business Group · Equity Bank", institution: "Equity Bank" } });
    const bk: any = await TreasuryAccount.findOneAndUpdate(
      { type: "bank", institution: /bank of kigali|\bbk\b/i },
      { $set: { name: "CANAN Business Group · Bank of Kigali", institution: "Bank of Kigali (BK)", status: "active" }, $setOnInsert: { accountNumber: "", currency: "RWF", openingBalance: 0, openingDate: new Date(), notes: "CANAN Business Group operating bank account." } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (payments.every((payment) => payment.chequeStatus === "cleared")) return;
    if (payments.some((payment) => !["received", "due", "deposited"].includes(payment.chequeStatus))) throw new Error("One or more Sheba cheque allocations can no longer be cleared.");
    await Payment.updateMany({ _id: { $in: payments.map((payment) => payment._id) } }, { $set: { allocationGroup } });
    await updateCustomerCheque(String(payments[0]._id), "cleared", String(bk._id));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
