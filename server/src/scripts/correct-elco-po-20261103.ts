/** Audited correction: EL CO Acticide receipt was 40 kg, not 20 kg. */
import "dotenv/config";
import mongoose from "mongoose";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import SupplierPayment from "../modules/supplierPayments/supplierPayment.model";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";

const poNumber = "PO-20261103-001";
const materialCode = "RM-2026-00049";
const oldQuantity = 20;
const newQuantity = 40;
const unitCost = 8_000;
const delta = newQuantity - oldQuantity;
const note = "Correction recorded 2026-11-03: EL CO Acticide delivery corrected from 20 kg to 40 kg; unit cost remains 8,000 RWF/kg.";
const appendNote = (current: unknown) => [String(current || "").trim(), note].filter(Boolean).join("\n");
const close = (left: number, right: number) => Math.abs(left - right) < 0.0001;

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  const session = await mongoose.startSession();
  let report: Record<string, unknown> = {};
  try {
    await session.withTransaction(async () => {
      const po: any = await PurchaseOrder.findOne({ poNumber }).session(session);
      if (!po || po.status !== "received") throw new Error(`${poNumber} is not a received purchase order.`);
      const line: any = po.items.find((item: any) => close(Number(item.unitPrice), unitCost));
      if (!line) throw new Error("The expected Acticide line was not found.");
      const material: any = await RawMaterial.findById(line.rawMaterial).session(session);
      if (!material || material.code !== materialCode || material.name.toLowerCase() !== "acticide") throw new Error("The expected Acticide material was not found.");
      if (close(Number(line.quantity), newQuantity)) {
        report = { mode: "already-applied", poNumber, material: material.name, quantity: Number(line.quantity), total: Number(po.total) };
        return;
      }
      if (!close(Number(line.quantity), oldQuantity) || !close(Number(line.total), oldQuantity * unitCost)) throw new Error("The Acticide order line no longer matches the expected 20 kg starting state.");
      const lots: any[] = await RawMaterialLot.find({ purchaseOrder: po._id, rawMaterial: material._id }).session(session);
      if (lots.length !== 1 || !close(Number(lots[0].receivedQuantity), oldQuantity) || !close(Number(lots[0].availableQuantity), oldQuantity) || !close(Number(lots[0].unitCost), unitCost)) throw new Error("The Acticide receipt lot no longer matches the expected unused 20 kg lot.");
      const receipt: any = await InventoryTransaction.findOne({ purchaseOrder: po._id, rawMaterial: material._id, type: "Purchase" }).session(session);
      if (!receipt || !close(Number(receipt.quantity), oldQuantity) || !close(Number(receipt.quantityAfter), Number(receipt.quantityBefore) + oldQuantity)) throw new Error("The Acticide stock receipt no longer matches the expected 20 kg movement.");
      const later = await InventoryTransaction.countDocuments({ rawMaterial: material._id, transactionDate: { $gt: receipt.transactionDate } }).session(session);
      if (later) throw new Error("Later Acticide movements exist; replay is required before this correction can be applied.");
      const payments = await SupplierPayment.countDocuments({ purchaseOrder: po._id }).session(session);
      if (payments) throw new Error("This order has supplier payments and requires payment-aware reconciliation.");
      const inventory: any = await Inventory.findOne({ rawMaterial: material._id }).session(session);
      if (!inventory || !close(Number(inventory.quantity), Number(receipt.quantityAfter))) throw new Error("Current Acticide inventory does not reconcile to the receipt balance.");

      const oldTotal = Number(po.total);
      const newLineTotal = newQuantity * unitCost;
      const newOrderTotal = oldTotal + delta * unitCost;
      const openingQuantity = Number(receipt.quantityBefore);
      const currentAverage = Number(inventory.averageCostPerUnit || 0);
      const openingValue = Number(inventory.quantity) * currentAverage - oldQuantity * unitCost;
      const newAverage = (openingValue + newQuantity * unitCost) / (openingQuantity + newQuantity);
      report = {
        mode: apply ? "applied" : "dry-run",
        poNumber,
        material: material.name,
        order: { oldQuantity, newQuantity, unitCost, oldTotal, newTotal: newOrderTotal },
        lot: { lotNumber: lots[0].lotNumber, oldReceived: oldQuantity, newReceived: newQuantity, oldAvailable: oldQuantity, newAvailable: newQuantity },
        inventory: { oldQuantity: Number(inventory.quantity), newQuantity: Number(inventory.quantity) + delta, oldAverageCost: currentAverage, newAverageCost: newAverage },
        supplierPayments: payments,
      };
      if (!apply) return;

      line.quantity = newQuantity;
      line.total = newLineTotal;
      po.subtotal = Number(po.subtotal) + delta * unitCost;
      po.total = newOrderTotal;
      po.notes = appendNote(po.notes);
      await po.save({ session });

      lots[0].receivedQuantity = newQuantity;
      lots[0].availableQuantity = newQuantity;
      lots[0].notes = appendNote(lots[0].notes);
      await lots[0].save({ session });

      receipt.quantity = newQuantity;
      receipt.totalCost = newLineTotal;
      receipt.quantityAfter = Number(receipt.quantityAfter) + delta;
      receipt.notes = appendNote(receipt.notes);
      await receipt.save({ session });

      inventory.quantity = Number(inventory.quantity) + delta;
      inventory.availableQuantity = Number(inventory.availableQuantity) + delta;
      inventory.averageCostPerUnit = newAverage;
      inventory.lastTransactionAt = new Date();
      await inventory.save({ session });
      material.quantity = Number(material.quantity) + delta;
      material.availableQuantity = Number(material.availableQuantity) + delta;
      material.costPerUnit = newAverage;
      await material.save({ session });
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
