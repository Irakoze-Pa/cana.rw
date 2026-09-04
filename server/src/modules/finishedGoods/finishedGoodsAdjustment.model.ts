import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  store: { type: String, enum: ["production", "sales"], required: true },
  quantityChange: { type: Number, required: true, validate: [(value: number) => Number.isFinite(value) && value !== 0, "Adjustment quantity must not be zero."] },
  quantityBefore: { type: Number, required: true, min: 0 },
  quantityAfter: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  reference: { type: String, required: true, unique: true },
  reason: { type: String, required: true, trim: true, minlength: 3 },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.models.FinishedGoodsAdjustment || mongoose.model("FinishedGoodsAdjustment", schema);
