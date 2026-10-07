import mongoose, { Schema } from "mongoose";

const supplierPaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },
  openingPayable: { type: Schema.Types.ObjectId, ref: "SupplierOpeningPayable", index: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: ["cash", "bank_transfer", "bank_cheque", "mobile_money", "other"], required: true },
  treasuryAccount: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", index: true },
  chequeNumber: { type: String, trim: true, default: "" },
  bankName: { type: String, trim: true, default: "" },
  chequeDate: Date,
  chequeStatus: {
    type: String,
    enum: ["issued", "due", "deposited", "cleared", "bounced", "cancelled"],
    default: "cleared",
    index: true,
  },
  issuedAt: Date,
  depositedAt: Date,
  clearedAt: Date,
  statusHistory: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
  }],
  reference: { type: String, trim: true, default: "" },
  paidAt: { type: Date, default: Date.now },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

const openingPayableSchema = new Schema({
  openingNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balance: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["open", "partially_paid", "paid", "void"], default: "open", index: true },
  openingDate: { type: Date, required: true },
  dueDate: Date,
  description: { type: String, required: true, trim: true },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

export default mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);
export const SupplierOpeningPayable = mongoose.models.SupplierOpeningPayable || mongoose.model("SupplierOpeningPayable", openingPayableSchema);
