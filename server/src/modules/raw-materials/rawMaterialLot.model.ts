import mongoose, { Schema, Types } from "mongoose";

export const lotStatuses = ["available", "quarantined", "expired", "consumed"] as const;
export type LotStatus = (typeof lotStatuses)[number];
export interface RawMaterialLotDoc extends mongoose.Document { _id: Types.ObjectId; lotNumber: string; rawMaterial: Types.ObjectId; supplier: Types.ObjectId; receivedQuantity: number; availableQuantity: number; unit: string; unitCost: number; receivedAt: Date; expiresAt?: Date; status: LotStatus; notes?: string }
const schema = new Schema<RawMaterialLotDoc>({ lotNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true }, rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true }, supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true }, receivedQuantity: { type: Number, required: true, min: 0.0001 }, availableQuantity: { type: Number, required: true, min: 0 }, unit: { type: String, required: true, trim: true }, unitCost: { type: Number, required: true, min: 0 }, receivedAt: { type: Date, required: true, default: Date.now }, expiresAt: Date, status: { type: String, enum: lotStatuses, default: "available", index: true }, notes: { type: String, trim: true, default: "" } }, { timestamps: true });
schema.index({ rawMaterial: 1, status: 1, expiresAt: 1 });
export default mongoose.models.RawMaterialLot || mongoose.model<RawMaterialLotDoc>("RawMaterialLot", schema);
