import mongoose, { Schema } from "mongoose";
const schema = new Schema({ product: { type: Schema.Types.ObjectId, ref: "Product", required: true }, store: { type: String, enum: ["production", "sales"], required: true }, quantity: { type: Number, default: 0, min: 0 }, minimumQuantity: { type: Number, default: 0, min: 0 } }, { timestamps: true });
schema.index({ product: 1, store: 1 }, { unique: true });
export default mongoose.models.FinishedGoodsStoreBalance || mongoose.model("FinishedGoodsStoreBalance", schema);
