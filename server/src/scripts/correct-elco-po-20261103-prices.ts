/** Reconcile final EL CO prices on PO-20261103-001 without changing quantities. */
import "dotenv/config";
import mongoose from "mongoose";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import SupplierMaterial from "../modules/raw-materials/supplierMaterial.model";
import SupplierPayment from "../modules/supplierPayments/supplierPayment.model";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";

const poNumber = "PO-20261103-001";
const corrections = [
  { code: "RM-2026-00007", name: "Antifoam", quantity: 60, oldCost: 7_000, newCost: 7_500 },
  { code: "RM-2026-00049", name: "Acticide", quantity: 40, oldCost: 8_000, newCost: 7_500 },
];
const note = "Final supplier price reconciliation recorded 2026-11-03: Antifoam 60 kg at 7,500 RWF/kg and Acticide 40 kg at 7,500 RWF/kg; quantities unchanged.";
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
      if (await SupplierPayment.exists({ purchaseOrder: po._id }).session(session)) throw new Error("This order has supplier payments and needs payment-aware reconciliation.");
      const changes: Record<string, unknown>[] = [];
      let alreadyApplied = true;
      for (const correction of corrections) {
        const material: any = await RawMaterial.findOne({ code: correction.code }).session(session);
        if (!material) throw new Error(`${correction.name} was not found.`);
        const line: any = po.items.find((item: any) => String(item.rawMaterial) === String(material._id));
        if (!line || !close(Number(line.quantity), correction.quantity)) throw new Error(`${correction.name} order quantity does not match ${correction.quantity} kg.`);
        if (close(Number(line.unitPrice), correction.newCost)) continue;
        alreadyApplied = false;
        if (!close(Number(line.unitPrice), correction.oldCost)) throw new Error(`${correction.name} no longer has the expected starting price.`);
        const lots: any[] = await RawMaterialLot.find({ purchaseOrder: po._id, rawMaterial: material._id }).session(session);
        if (lots.length !== 1 || !close(Number(lots[0].receivedQuantity), correction.quantity) || !close(Number(lots[0].unitCost), correction.oldCost)) throw new Error(`${correction.name} receipt does not match the order.`);
        const receipt: any = await InventoryTransaction.findOne({ purchaseOrder: po._id, rawMaterial: material._id, type: "Purchase" }).session(session);
        if (!receipt || !close(Number(receipt.quantity), correction.quantity) || !close(Number(receipt.unitCost), correction.oldCost)) throw new Error(`${correction.name} stock movement does not match the receipt.`);
        const later = await InventoryTransaction.countDocuments({ rawMaterial: material._id, transactionDate: { $gt: receipt.transactionDate } }).session(session);
        if (later) throw new Error(`${correction.name} has later stock movements; cost replay is required.`);
        const inventory: any = await Inventory.findOne({ rawMaterial: material._id }).session(session);
        if (!inventory || !close(Number(inventory.quantity), Number(receipt.quantityAfter))) throw new Error(`${correction.name} inventory does not reconcile to its latest receipt.`);
        const oldAverage = Number(inventory.averageCostPerUnit || 0);
        const newAverage = (Number(inventory.quantity) * oldAverage + correction.quantity * (correction.newCost - correction.oldCost)) / Number(inventory.quantity);
        changes.push({ material: correction.name, quantity: correction.quantity, oldUnitCost: correction.oldCost, newUnitCost: correction.newCost, oldLineTotal: Number(line.total), newLineTotal: correction.quantity * correction.newCost, oldAverageCost: oldAverage, newAverageCost: newAverage });
        if (!apply) continue;
        line.unitPrice = correction.newCost;
        line.total = correction.quantity * correction.newCost;
        lots[0].unitCost = correction.newCost;
        lots[0].notes = appendNote(lots[0].notes);
        await lots[0].save({ session });
        receipt.unitCost = correction.newCost;
        receipt.totalCost = correction.quantity * correction.newCost;
        receipt.notes = appendNote(receipt.notes);
        await receipt.save({ session });
        inventory.averageCostPerUnit = newAverage;
        await inventory.save({ session });
        material.costPerUnit = newAverage;
        await material.save({ session });
        await SupplierMaterial.updateOne({ supplier: po.supplier, rawMaterial: material._id }, { $set: { unitPrice: correction.newCost, status: "Active" } }, { session });
      }
      const expectedLines = new Map([["RM-2026-00007", 450_000], ["RM-2026-00010", 150_000], ["RM-2026-00048", 112_500], ["RM-2026-00049", 300_000]]);
      let newTotal = 0;
      for (const line of po.items) {
        const material: any = await RawMaterial.findById(line.rawMaterial).session(session).lean();
        const expected = expectedLines.get(material?.code);
        const lineTotal = corrections.some((item) => item.code === material?.code) ? Number(line.quantity) * corrections.find((item) => item.code === material?.code)!.newCost : Number(line.total);
        if (expected === undefined || !close(lineTotal, expected)) throw new Error(`Unexpected line total for ${material?.name || line.rawMaterial}.`);
        newTotal += lineTotal;
      }
      if (!close(newTotal, 1_012_500)) throw new Error(`Reconciled order total is ${newTotal}, not 1,012,500 RWF.`);
      report = { mode: alreadyApplied ? "already-applied" : apply ? "applied" : "dry-run", poNumber, lines: changes, oldTotal: Number(po.total), newTotal };
      if (!apply || alreadyApplied) return;
      po.subtotal = newTotal;
      po.total = newTotal;
      po.notes = appendNote(po.notes);
      await po.save({ session });
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
