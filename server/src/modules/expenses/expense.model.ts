import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema({
  expenseNumber: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  category: { type: String, required: true, enum: ["transport", "utilities", "rent", "maintenance", "packaging", "labour", "office", "marketing", "taxes_fees", "other"] },
  description: { type: String, required: true, trim: true },
  payee: { type: String, trim: true, default: "" },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, required: true, enum: ["cash", "bank_transfer", "bank_cheque", "mobile_money", "other"] },
  reference: { type: String, trim: true, default: "" },
  chequeNumber: { type: String, trim: true, default: "" },
  bankName: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
