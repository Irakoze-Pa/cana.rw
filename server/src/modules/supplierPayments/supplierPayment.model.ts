import mongoose, { Schema } from "mongoose";

const supplierPaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: ["cash", "bank_transfer", "bank_cheque", "mobile_money", "other"], required: true },
  chequeNumber: { type: String, trim: true, default: "" },
  bankName: { type: String, trim: true, default: "" },
  chequeDate: Date,
  reference: { type: String, trim: true, default: "" },
  paidAt: { type: Date, default: Date.now },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

export default mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);
