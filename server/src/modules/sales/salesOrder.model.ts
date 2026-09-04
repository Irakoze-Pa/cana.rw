import mongoose, { Schema, Types } from "mongoose";

export const salesOrderStatuses = ["draft", "submitted", "confirmed", "in_production", "ready_for_delivery", "delivered", "cancelled"] as const;
export type SalesOrderStatus = (typeof salesOrderStatuses)[number];

const itemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true, trim: true },
  productCode: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.0001 },
  unit: { type: String, required: true, trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const salesOrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quotation: { type: Schema.Types.ObjectId, ref: "Quotation" },
  items: { type: [itemSchema], validate: [(items: unknown[]) => items.length > 0, "A sales order requires at least one item."] },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: salesOrderStatuses, default: "draft", index: true },
  deliveryAddress: { type: String, trim: true, default: "" },
  requestedDeliveryDate: Date,
  notes: { type: String, trim: true, default: "" },
  statusHistory: [{ status: { type: String, enum: salesOrderStatuses, required: true }, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: "User" } }],
}, { timestamps: true });

export interface SalesOrderItem { product: Types.ObjectId; productName: string; productCode: string; quantity: number; unit: string; unitPrice: number; total: number }
export default mongoose.models.SalesOrder || mongoose.model("SalesOrder", salesOrderSchema);
