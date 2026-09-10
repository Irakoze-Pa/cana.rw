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
  const receivedQuantity = Number(String(input.receivedQuantity ?? "").replace(/,/g, "").trim());
  const unitCost = Number(String(input.unitCost ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(receivedQuantity) || receivedQuantity <= 0) throw new Error(`Received quantity must be greater than zero ${material.unit}. Example: 10000 for 10,000 ${material.unit}.`);
  if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("Unit cost cannot be negative.");
  if (input.expiresAt && new Date(input.expiresAt) < new Date(input.receivedAt || Date.now())) throw new Error("Expiry date must be after the received date.");
  const lotNumber = input.lotNumber?.trim().toUpperCase() || `LOT-${new Date().getFullYear()}-${String((await RawMaterialLot.countDocuments()) + 1).padStart(5, "0")}`;
  const year = new Date().getFullYear();
  const grnNumber = `GRN-${year}-${String((await RawMaterialLot.countDocuments()) + 1).padStart(5, "0")}`;
  const lot = await RawMaterialLot.create({ grnNumber, lotNumber, rawMaterial: material._id, supplier: input.supplier, receivedQuantity, availableQuantity: receivedQuantity, unit: material.unit, unitCost, receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, status: input.status || "available", notes: input.notes || "" });
  if (lot.status === "available") await addStock({ rawMaterial: material._id.toString(), quantity: lot.receivedQuantity, unitCost: lot.unitCost, lotNumber: lot.lotNumber, type: "Purchase", referenceType: "Manual", referenceId: undefined, reason: `Lot ${lot.lotNumber} received`, notes: lot.notes });
  return RawMaterialLot.findById(lot._id).populate("rawMaterial", "name code unit").populate("supplier", "name code");
}

export async function releaseLot(rawMaterialId: string, lotId: string) {
  if (!mongoose.Types.ObjectId.isValid(rawMaterialId) || !mongoose.Types.ObjectId.isValid(lotId)) throw new Error("Invalid material lot.");
  const lot = await RawMaterialLot.findOne({ _id: lotId, rawMaterial: rawMaterialId });
  if (!lot) throw new Error("Material lot not found.");
  if (lot.status !== "quarantined") throw new Error("Only quarantined lots can be released to stock.");
  if (lot.expiresAt && lot.expiresAt <= new Date()) throw new Error("An expired lot cannot be released to stock.");
  if (lot.availableQuantity <= 0) throw new Error("A lot with no available quantity cannot be released.");
  await addStock({ rawMaterial: rawMaterialId, quantity: lot.availableQuantity, unitCost: lot.unitCost, lotNumber: lot.lotNumber, type: "Purchase", referenceType: "Manual", referenceId: undefined, reason: `Lot ${lot.lotNumber} released after quality check`, notes: lot.notes });
  lot.status = "available";
  await lot.save();
  return RawMaterialLot.findById(lot._id).populate("rawMaterial", "name code unit").populate("supplier", "name code");
}
