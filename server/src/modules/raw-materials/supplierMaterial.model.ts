import mongoose, { Schema } from "mongoose";
const schema = new Schema({ supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true }, rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true }, supplierCode: { type: String, trim: true, default: "" }, unitPrice: { type: Number, required: true, min: 0 }, leadTimeDays: { type: Number, default: 0, min: 0 }, minimumOrderQuantity: { type: Number, default: 0, min: 0 }, status: { type: String, enum: ["Active", "Inactive"], default: "Active" } }, { timestamps: true });
schema.index({ supplier: 1, rawMaterial: 1 }, { unique: true });
export default mongoose.models.SupplierMaterial || mongoose.model("SupplierMaterial", schema);
