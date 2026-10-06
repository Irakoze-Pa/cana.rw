import mongoose, { Schema, Types } from "mongoose";

export const salesOrderStatuses = [
  "draft",
  "submitted",
  "confirmed",
  "in_production",
  "ready_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type SalesOrderStatus = (typeof salesOrderStatuses)[number];

const itemSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: ["product", "raw_material"],
      default: "product",
      required: true,
    },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    productName: { type: String, required: true, trim: true },
    productCode: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, required: true, trim: true },
    // Quantity on a sales order is the number of customer packs. Stock is kept
    // in its base unit (normally kg), so retain the converted issue quantity.
    packLabel: { type: String, trim: true, default: "" },
    packSizeKg: { type: Number, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0.0001 },
    stockUnit: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Locked at delivery so profit reporting never changes when raw-material
    // prices or future production costs change.
    costPerUnit: { type: Number, default: 0, min: 0 },
    costTotal: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const salesOrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quotation: { type: Schema.Types.ObjectId, ref: "Quotation" },
    items: {
      type: [itemSchema],
      validate: [
        (items: unknown[]) => items.length > 0,
        "A sales order requires at least one item.",
      ],
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: salesOrderStatuses,
      default: "draft",
      index: true,
    },
    deliveryAddress: { type: String, trim: true, default: "" },
    requestedDeliveryDate: Date,
    deliveredAt: Date,
    notes: { type: String, trim: true, default: "" },
    statusHistory: [
      {
        status: { type: String, enum: salesOrderStatuses, required: true },
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true },
);

export interface SalesOrderItem {
  itemType?: "product" | "raw_material";
  product?: Types.ObjectId;
  rawMaterial?: Types.ObjectId;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  packLabel?: string;
  packSizeKg?: number;
  stockQuantity: number;
  stockUnit: string;
  unitPrice: number;
  total: number;
  costPerUnit?: number;
  costTotal?: number;
}
export default mongoose.models.SalesOrder ||
  mongoose.model("SalesOrder", salesOrderSchema);
