/** Correct the named payee on the 300,000 RWF expense and treasury entry. */
import "dotenv/config";
import mongoose from "mongoose";
import Expense from "../modules/expenses/expense.model";
import { TreasuryTransaction } from "../modules/accounting/accounting.model";

const amount = 300_000;
const oldName = /kalis+a/i;
const newName = "IRAKOZE Isidore";
const replaceName = (value: unknown) => String(value || "").replace(/kalis+a(?:\s+abdallah)?/gi, newName);
const correctedDescription = (value: unknown) => /^wages/i.test(String(value || "").trim()) ? `Wages (${newName})` : replaceName(value);

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  try {
    const [expenses, transactions]: any[][] = await Promise.all([
      Expense.find({ amount, $or: [{ payee: oldName }, { description: oldName }, { reference: oldName }, { payee: newName }] }).lean(),
      TreasuryTransaction.find({ amount, $or: [{ description: oldName }, { reference: oldName }] }).lean(),
    ]);
    if (expenses.length !== 1) throw new Error(`Expected one matching 300,000 RWF expense, found ${expenses.length}.`);
    if (transactions.length > 1) throw new Error(`Expected at most one matching treasury transaction, found ${transactions.length}.`);
    const expense = expenses[0];
    const transaction = transactions[0];
    const alreadyCorrected = expense.payee === newName && expense.description === `Wages (${newName})`;
    console.log(JSON.stringify({ mode: alreadyCorrected ? "already-corrected" : apply ? "applied" : "dry-run", expense: { id: expense._id, number: expense.expenseNumber, date: expense.date, amount: expense.amount, oldPayee: expense.payee, newPayee: newName, oldDescription: expense.description, newDescription: correctedDescription(expense.description), reference: expense.reference }, treasuryTransaction: transaction ? { id: transaction._id, number: transaction.transactionNumber, date: transaction.date, amount: transaction.amount, oldDescription: transaction.description, newDescription: replaceName(transaction.description), oldReference: transaction.reference, newReference: replaceName(transaction.reference) } : null }, null, 2));
    if (!apply || alreadyCorrected) return;
    await Expense.updateOne({ _id: expense._id, amount }, { $set: { payee: newName, description: correctedDescription(expense.description), reference: replaceName(expense.reference), notes: [String(expense.notes || "").trim(), "Payee corrected from Kalissa to IRAKOZE Isidore; amount, date and payment account unchanged."].filter(Boolean).join("\n") } });
    if (transaction) await TreasuryTransaction.updateOne({ _id: transaction._id, amount }, { $set: { description: replaceName(transaction.description), reference: replaceName(transaction.reference) } });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
