import mongoose, { Schema } from "mongoose";

const staffPaymentSchema = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { type: String, enum: ["salary", "advance"], required: true },
  // Salary amount is the net paid amount and can legitimately be zero when
  // approved advances fully consume the gross salary for that pay period.
  amount: { type: Number, required: true, min: 0 },
  grossAmount: { type: Number, default: 0, min: 0 },
  advanceDeduction: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  period: { type: String, trim: true, default: "" },
  reason: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected", "paid", "deducted"], default: "pending", index: true },
  paymentDate: { type: Date },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

export default mongoose.models.StaffPayment || mongoose.model("StaffPayment", staffPaymentSchema);
