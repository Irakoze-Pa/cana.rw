/** Correct the Sheba cheque: it remains uncleared and is assigned to Equity. */
import "dotenv/config";
import mongoose from "mongoose";
import { Invoice, Payment } from "../modules/billing/billing.model";
import { TreasuryAccount } from "../modules/accounting/accounting.model";

const chequeNumber = "SHEBA-20261019-PENDING";
const expectedAmount = 1_333_000;
const correctionNote = "Clearance reversed on 2026-11-07: cheque remains due and is assigned to CANAN Business Group · Equity Bank.";

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  const session = await mongoose.startSession();
  let report: Record<string, unknown> = {};
  try {
    await session.withTransaction(async () => {
      const equity: any = await TreasuryAccount.findOne({ type: "bank", institution: /equity/i, status: "active" }).session(session);
      if (!equity) throw new Error("The active CANAN Equity account was not found.");
      const payments: any[] = await Payment.find({ method: "bank_cheque", chequeNumber }).sort({ createdAt: 1 }).session(session);
      if (payments.length !== 3) throw new Error(`Expected three Sheba allocations, found ${payments.length}.`);
      const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      if (Math.abs(total - expectedAmount) > 0.001) throw new Error(`Cheque total is ${total}, not ${expectedAmount} RWF.`);
      const alreadyReopened = payments.every((payment) => payment.chequeStatus === "due" && payment.status === "pending" && String(payment.treasuryAccount) === String(equity._id));
      report = { mode: alreadyReopened ? "already-corrected" : apply ? "applied" : "dry-run", chequeNumber, amount: total, allocations: payments.map((payment) => ({ receiptNumber: payment.receiptNumber, amount: payment.amount, oldStatus: payment.chequeStatus, newStatus: "due" })), account: equity.name };
      if (!apply || alreadyReopened) return;
      if (payments.some((payment) => payment.chequeStatus !== "cleared" || payment.status !== "received")) throw new Error("The Sheba cheque is not in the expected cleared state.");
      for (const payment of payments) {
        const invoice: any = await Invoice.findById(payment.invoice).session(session);
        if (!invoice || invoice.status === "void") throw new Error(`Invoice for ${payment.receiptNumber} is unavailable.`);
        if (Number(invoice.amountPaid || 0) + 0.001 < Number(payment.amount)) throw new Error(`${invoice.invoiceNumber} paid amount cannot be safely restored.`);
        invoice.amountPaid = Number(Math.max(0, Number(invoice.amountPaid || 0) - Number(payment.amount)).toFixed(2));
        invoice.balance = Number((Number(invoice.total) - invoice.amountPaid - Number(invoice.writtenOffAmount || 0)).toFixed(2));
        invoice.status = invoice.balance <= 0 ? Number(invoice.writtenOffAmount || 0) > 0 ? "written_off" : "paid" : invoice.amountPaid > 0 ? "partially_paid" : "issued";
        await invoice.save({ session });
        payment.status = "pending";
        payment.chequeStatus = "due";
        payment.treasuryAccount = equity._id;
        payment.clearedAt = undefined;
        payment.depositedAt = undefined;
        payment.statusHistory.push({ status: "due", at: new Date(), note: correctionNote });
        payment.notes = [String(payment.notes || "").trim(), correctionNote].filter(Boolean).join("\n");
        await payment.save({ session });
      }
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
