/** Assign Kalisa Abdallah's already-cleared cheque to CANAN's BK account. */
import "dotenv/config";
import mongoose from "mongoose";
import { Invoice, Payment } from "../modules/billing/billing.model";
import { TreasuryAccount } from "../modules/accounting/accounting.model";
import User from "../models/users";

const chequeNumber = "0000001";
const expectedAmount = 700_000;
const expectedInvoice = "INV-2026-00041";

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  try {
    const payments: any[] = await Payment.find({ method: "bank_cheque", chequeNumber }).lean();
    if (payments.length !== 1) throw new Error(`Expected one allocation for cheque ${chequeNumber}, found ${payments.length}.`);
    const payment = payments[0];
    if (Number(payment.amount) !== expectedAmount || payment.chequeStatus !== "cleared" || payment.status !== "received") throw new Error("The cheque does not match the expected cleared 700,000 RWF receipt.");
    const [invoice, customer, bk, currentAccount]: any[] = await Promise.all([
      Invoice.findById(payment.invoice).lean(),
      User.findById(payment.customer).select("fullName businessName").lean(),
      TreasuryAccount.findOne({ type: "bank", institution: /bank of kigali|\bbk\b/i, status: "active" }).lean(),
      payment.treasuryAccount ? TreasuryAccount.findById(payment.treasuryAccount).lean() : null,
    ]);
    if (!invoice || invoice.invoiceNumber !== expectedInvoice) throw new Error(`Cheque is not linked to ${expectedInvoice}.`);
    if (!customer || !/kalisa\s+abdallah/i.test(String(customer.fullName || customer.businessName || ""))) throw new Error("Cheque customer is not Kalisa Abdallah.");
    if (!bk) throw new Error("The active CANAN Bank of Kigali account was not found.");
    const alreadyAssigned = String(payment.treasuryAccount || "") === String(bk._id);
    const receiptDate = new Date(payment.clearedAt || payment.receivedAt);
    const currentOpeningDate = new Date(bk.openingDate || bk.createdAt);
    const openingDateNeedsCorrection = receiptDate.getTime() < currentOpeningDate.getTime();
    console.log(JSON.stringify({ mode: alreadyAssigned && !openingDateNeedsCorrection ? "already-correct" : apply ? "applied" : "dry-run", chequeNumber, amount: payment.amount, invoice: invoice.invoiceNumber, customer: customer.fullName || customer.businessName, fromAccount: currentAccount?.name || "Unassigned", toAccount: bk.name, status: payment.chequeStatus, receiptDate, bkOpeningDate: { old: currentOpeningDate, new: openingDateNeedsCorrection ? receiptDate : currentOpeningDate } }, null, 2));
    if (!apply) return;
    if (!alreadyAssigned) await Payment.updateOne({ _id: payment._id, chequeStatus: "cleared", status: "received" }, { $set: { treasuryAccount: bk._id }, $push: { statusHistory: { status: "cleared", at: new Date(), note: "Treasury account corrected to CANAN Business Group · Bank of Kigali; clearance and invoice allocation unchanged." } } });
    if (openingDateNeedsCorrection) await TreasuryAccount.updateOne({ _id: bk._id }, { $set: { openingDate: receiptDate, notes: `${String(bk.notes || "").trim()}\nOpening date aligned to the first verified BK receipt (${chequeNumber}).`.trim() } });
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
