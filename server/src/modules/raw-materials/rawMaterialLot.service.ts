import mongoose from "mongoose";
import RawMaterial from "./rawMaterial.model";
import RawMaterialLot, { LotStatus } from "./rawMaterialLot.model";
import { addStock } from "../inventory/inventory.service";

export async function listLots(rawMaterialId?: string) { const query = rawMaterialId ? { rawMaterial: rawMaterialId } : {}; return RawMaterialLot.find(query).populate("rawMaterial", "name code unit").populate("supplier", "name code").sort({ expiresAt: 1, receivedAt: -1 }).lean(); }
export async function createLot(rawMaterialId: string, input: { supplier: string; lotNumber?: string; receivedQuantity: number; unitCost: number; receivedAt?: string; expiresAt?: string; status?: LotStatus; notes?: string }) {
  if (!mongoose.Types.ObjectId.isValid(rawMaterialId)) throw new Error("Invalid raw material.");
  const material = await RawMaterial.findById(rawMaterialId);
  if (!material) throw new Error("Raw material not found.");
  if (!mongoose.Types.ObjectId.isValid(input.supplier)) throw new Error("Select the supplier that delivered this lot.");
  if (!Number.isFinite(Number(input.receivedQuantity)) || Number(input.receivedQuantity) <= 0) throw new Error("Received quantity must be greater than zero.");
  if (!Number.isFinite(Number(input.unitCost)) || Number(input.unitCost) < 0) throw new Error("Unit cost cannot be negative.");
  if (input.expiresAt && new Date(input.expiresAt) < new Date(input.receivedAt || Date.now())) throw new Error("Expiry date must be after the received date.");
  const lotNumber = input.lotNumber?.trim().toUpperCase() || `LOT-${new Date().getFullYear()}-${String((await RawMaterialLot.countDocuments()) + 1).padStart(5, "0")}`;
  const lot = await RawMaterialLot.create({ lotNumber, rawMaterial: material._id, supplier: input.supplier, receivedQuantity: Number(input.receivedQuantity), availableQuantity: Number(input.receivedQuantity), unit: material.unit, unitCost: Number(input.unitCost), receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, status: input.status || "available", notes: input.notes || "" });
  if (lot.status === "available") await addStock({ rawMaterial: material._id.toString(), quantity: lot.receivedQuantity, unitCost: lot.unitCost, lotNumber: lot.lotNumber, type: "Purchase", referenceType: "Manual", referenceId: undefined, reason: `Lot ${lot.lotNumber} received`, notes: lot.notes });
  return RawMaterialLot.findById(lot._id).populate("rawMaterial", "name code unit").populate("supplier", "name code");
}
