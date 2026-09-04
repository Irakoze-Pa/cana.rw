import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    store: { type: String, enum: ["production", "sales"], required: true },
    quantityBefore: { type: Number, required: true, min: 0 },
    quantityAfter: { type: Number, required: true, min: 0 },
    difference: { type: Number, required: true },
    unit: { type: String, required: true, default: "kg" },
    reference: { type: String, required: true, unique: true },
    reason: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.models.FinishedGoodsStockAdjustment || mongoose.model("FinishedGoodsStockAdjustment", schema);
