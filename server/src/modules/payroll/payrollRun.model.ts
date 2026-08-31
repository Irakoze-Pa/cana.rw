import mongoose, { Schema } from "mongoose";

const item = new Schema({ label: { type: String, required: true }, amount: { type: Number, min: 0, required: true } }, { _id: false });
const advanceAllocation = new Schema({ advance: { type: Schema.Types.ObjectId, ref: "StaffPayment", required: true }, amount: { type: Number, min: 0, required: true } }, { _id: false });
const line = new Schema({ staff: { type: Schema.Types.ObjectId, ref: "User", required: true }, baseSalary: { type: Number, min: 0, required: true }, earnings: { type: [item], default: [] }, deductions: { type: [item], default: [] }, advanceAllocations: { type: [advanceAllocation], default: [] }, grossPay: { type: Number, min: 0, required: true }, totalDeductions: { type: Number, min: 0, required: true }, netPay: { type: Number, min: 0, required: true }, paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" } }, { _id: false });
const schema = new Schema({ payrollNumber: { type: String, required: true, unique: true }, period: { type: String, required: true }, status: { type: String, enum: ["draft", "reviewed", "approved", "paid", "cancelled"], default: "draft" }, lines: { type: [line], default: [] }, notes: { type: String, default: "" }, createdBy: { type: Schema.Types.ObjectId, ref: "User" }, approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, paidAt: Date }, { timestamps: true });
schema.index({ period: 1 }, { unique: true });
export default mongoose.models.PayrollRun || mongoose.model("PayrollRun", schema);
