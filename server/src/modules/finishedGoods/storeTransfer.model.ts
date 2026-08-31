import mongoose, { Schema } from "mongoose";

const schema = new Schema({ product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true }, fromStore: { type: String, enum: ["production", "sales"], required: true }, toStore: { type: String, enum: ["production", "sales"], required: true }, quantity: { type: Number, min: 0.0001, required: true }, unit: { type: String, required: true }, reference: { type: String, required: true, unique: true }, notes: { type: String, default: "" }, performedBy: { type: Schema.Types.ObjectId, ref: "User" } }, { timestamps: true });
export default mongoose.models.FinishedGoodsStoreTransfer || mongoose.model("FinishedGoodsStoreTransfer", schema);
