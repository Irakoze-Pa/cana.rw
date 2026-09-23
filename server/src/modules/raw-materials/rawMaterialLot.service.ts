import mongoose from "mongoose";
import RawMaterial from "./rawMaterial.model";
import RawMaterialLot, { LotStatus } from "./rawMaterialLot.model";
import { addStock } from "../inventory/inventory.service";
import InventoryTransaction from "../inventory/inventoryTransaction.model";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import SupplierMaterial from "./supplierMaterial.model";

export async function listLots(rawMaterialId?: string) { const query = rawMaterialId ? { rawMaterial: rawMaterialId } : {}; return RawMaterialLot.find(query).populate("rawMaterial", "name code unit").populate("supplier", "name code").sort({ expiresAt: 1, receivedAt: -1 }).lean(); }
export async function createLot(rawMaterialId: string, input: { supplier: string; purchaseOrder?: string; lotNumber?: string; receivedQuantity: number; unitCost: number; updateSupplierPrice?: boolean; receivedAt?: string; expiresAt?: string; status?: LotStatus; notes?: string }) {
  if (!mongoose.Types.ObjectId.isValid(rawMaterialId)) throw new Error("Invalid raw material.");
  const material = await RawMaterial.findById(rawMaterialId);
  if (!material) throw new Error("Raw material not found.");
  if (!mongoose.Types.ObjectId.isValid(input.supplier)) throw new Error("Select the supplier that delivered this lot.");
  const receivedQuantity = Number(String(input.receivedQuantity ?? "").replace(/,/g, "").trim());
  let unitCost = Number(String(input.unitCost ?? "").replace(/,/g, "").trim());
  const hasActualCost = Number.isFinite(unitCost) && unitCost > 0;
  if (!Number.isFinite(receivedQuantity) || receivedQuantity <= 0) throw new Error(`Received quantity must be greater than zero ${material.unit}. Example: 10000 for 10,000 ${material.unit}.`);
  if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("Unit cost cannot be negative.");
  if (unitCost === 0) unitCost = Number(material.costPerUnit || 0);
  if (input.expiresAt && new Date(input.expiresAt) < new Date(input.receivedAt || Date.now())) throw new Error("Expiry date must be after the received date.");
  let purchaseOrder: any = null;
  if (input.purchaseOrder) {
    if (!mongoose.Types.ObjectId.isValid(input.purchaseOrder)) throw new Error("Invalid purchase order.");
    purchaseOrder = await PurchaseOrder.findById(input.purchaseOrder);
    if (!purchaseOrder || !["approved", "partially_received"].includes(purchaseOrder.status)) throw new Error("Choose an approved purchase order that is still open for delivery.");
    if (String(purchaseOrder.supplier) !== String(input.supplier)) throw new Error("The delivery supplier must match the selected purchase order.");
    const orderedItem = purchaseOrder.items.find((item: any) => String(item.rawMaterial) === String(material._id));
    if (!orderedItem) throw new Error("This raw material is not included on the selected purchase order.");
    if (!hasActualCost && Number(orderedItem.unitPrice || 0) > 0) unitCost = Number(orderedItem.unitPrice);
    const previousReceipts = await RawMaterialLot.aggregate([{ $match: { purchaseOrder: purchaseOrder._id, rawMaterial: material._id } }, { $group: { _id: null, quantity: { $sum: "$receivedQuantity" } } }]);
    const remaining = Number(orderedItem.quantity) - Number(previousReceipts[0]?.quantity || 0);
    if (receivedQuantity > remaining + 0.000001) throw new Error(`Received quantity exceeds the open quantity on ${purchaseOrder.poNumber}. Remaining: ${remaining} ${material.unit}.`);
  }
  const lotNumber = input.lotNumber?.trim().toUpperCase() || `LOT-${new Date().getFullYear()}-${String((await RawMaterialLot.countDocuments()) + 1).padStart(5, "0")}`;
  const year = new Date().getFullYear();
  const grnNumber = `GRN-${year}-${String((await RawMaterialLot.countDocuments()) + 1).padStart(5, "0")}`;
  const lot = await RawMaterialLot.create({ grnNumber, lotNumber, rawMaterial: material._id, supplier: input.supplier, purchaseOrder: purchaseOrder?._id, receivedQuantity, availableQuantity: receivedQuantity, unit: material.unit, unitCost, receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined, status: input.status || "available", notes: input.notes || "" });
  if (lot.status === "available") await addStock({ rawMaterial: material._id.toString(), quantity: lot.receivedQuantity, unitCost: lot.unitCost, lotNumber: lot.lotNumber, type: "Purchase", referenceType: purchaseOrder ? "PurchaseOrder" : "Manual", referenceId: purchaseOrder?._id?.toString(), purchaseOrder: purchaseOrder?._id?.toString(), reason: `Lot ${lot.lotNumber} received`, notes: lot.notes });
  if (input.updateSupplierPrice && hasActualCost) {
    await SupplierMaterial.findOneAndUpdate({ supplier: input.supplier, rawMaterial: material._id }, { $set: { unitPrice: unitCost, status: "Active" } }, { new: true });
  }
  if (purchaseOrder) {
    const receipts = await RawMaterialLot.aggregate([{ $match: { purchaseOrder: purchaseOrder._id } }, { $group: { _id: "$rawMaterial", quantity: { $sum: "$receivedQuantity" } } }]);
    const receivedByMaterial = new Map(receipts.map((item) => [String(item._id), Number(item.quantity)]));
    purchaseOrder.status = purchaseOrder.items.every((item: any) => Number(receivedByMaterial.get(String(item.rawMaterial)) || 0) >= Number(item.quantity)) ? "received" : "partially_received";
    await purchaseOrder.save();
  }
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

export async function getLotTrace(lotId: string) {
  if (!mongoose.Types.ObjectId.isValid(lotId)) throw new Error("Invalid material lot.");
  const lot = await RawMaterialLot.findById(lotId).populate("rawMaterial", "name code unit").populate("supplier", "name code").lean();
  if (!lot) throw new Error("Material lot not found.");
  const transactions = await InventoryTransaction.find({ rawMaterial: lot.rawMaterial?._id || lot.rawMaterial, lotNumber: lot.lotNumber })
    .sort({ transactionDate: 1, createdAt: 1 })
    .populate("productionBatch", "batchNo batchNumber productName productCode status plannedQuantity actualQuantity unit")
    .populate("productionOrder", "productionOrderNo")
    .select("type quantity unit lotNumber reason notes transactionDate productionBatch productionOrder")
    .lean();
  const issuedQuantity = transactions.filter((item) => item.type === "Production Issue").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const returnedQuantity = transactions.filter((item) => item.type === "Production Return").reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  return { lot, transactions, summary: { receivedQuantity: Number(lot.receivedQuantity || 0), availableQuantity: Number(lot.availableQuantity || 0), issuedQuantity, returnedQuantity } };
}
