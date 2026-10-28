/** Audited, one-off correction for El Co ltd.'s received Acticide PO. */
import "dotenv/config";
import mongoose from "mongoose";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import Supplier from "../modules/suppliers/supplier.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import SupplierPayment from "../modules/supplierPayments/supplierPayment.model";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import ProductionOrder from "../modules/production/productionOrder/productionOrder.model";
import Formula from "../modules/formula/formula.model";
import Product from "../modules/product/product.model";

const poNumber = "PO-20261014-001";
const oldTotal = 320_000;
const correctedTotal = 300_000;
const quantity = 40;
const correctedUnitCost = correctedTotal / quantity;
const correctionNote = "Correction recorded 2026-10-28: user-directed supplier amount correction from 320,000 RWF to 300,000 RWF for 40 kg Acticide (8,000 to 7,500 RWF/kg).";
const round = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
const appendNote = (existing: string | undefined, note: string) =>
  [String(existing || "").trim(), note].filter(Boolean).join("\n");

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  const session = await mongoose.startSession();
  let report: Record<string, unknown> | undefined;
  try {
    await session.withTransaction(async () => {
      const po: any = await PurchaseOrder.findOne({ poNumber }).session(session);
      if (!po) throw new Error(`${poNumber} was not found.`);
      const supplier: any = await Supplier.findById(po.supplier).session(session);
      if (!supplier || supplier.code !== "EL-001" || supplier.name.toLowerCase() !== "el co ltd") {
        throw new Error(`${poNumber} is not linked to El Co ltd. (EL-001).`);
      }
      if (po.status !== "received") throw new Error(`${poNumber} is not received; no correction applied.`);
      if (Number(po.total) !== oldTotal || Number(po.subtotal) !== oldTotal || Number(po.tax || 0) !== 0 || po.items.length !== 1) {
        throw new Error(`${poNumber} totals or line count differ from the expected 320,000 RWF single-line order.`);
      }
      const line = po.items[0];
      const material: any = await RawMaterial.findById(line.rawMaterial).session(session);
      if (!material || material.code !== "RM-2026-00049" || material.name.toLowerCase() !== "acticide") {
        throw new Error(`${poNumber} does not contain the expected Acticide (RM-2026-00049) line.`);
      }
      if (Number(line.quantity) !== quantity || Number(line.unitPrice) !== 8_000 || Number(line.total) !== oldTotal) {
        throw new Error(`${poNumber} line no longer matches 40 kg at 8,000 RWF/kg.`);
      }
      const lots: any[] = await RawMaterialLot.find({ purchaseOrder: po._id }).session(session);
      if (lots.length !== 1 || String(lots[0].rawMaterial) !== String(material._id) || Number(lots[0].receivedQuantity) !== quantity || Number(lots[0].unitCost) !== 8_000 || lots[0].excludeFromSupplierPayable) {
        throw new Error(`${poNumber} does not have exactly one matching payable receipt lot at the expected cost.`);
      }
      const payments: any[] = await SupplierPayment.find({ purchaseOrder: po._id }).session(session);
      if (payments.length) throw new Error(`${poNumber} has linked supplier payments; this correction needs a payment-aware reconciliation.`);
      const purchaseTransactions: any[] = await InventoryTransaction.find({ purchaseOrder: po._id, type: "Purchase" }).sort({ transactionDate: 1 }).session(session);
      if (purchaseTransactions.length !== 1 || Number(purchaseTransactions[0].quantity) !== quantity || Number(purchaseTransactions[0].unitCost) !== 8_000 || Number(purchaseTransactions[0].totalCost) !== oldTotal) {
        throw new Error(`${poNumber} does not have exactly one matching 320,000 RWF inventory receipt transaction.`);
      }
      const receiptTransaction = purchaseTransactions[0];
      const inventory: any = await Inventory.findOne({ rawMaterial: material._id }).session(session);
      if (!inventory) throw new Error("No current Acticide inventory record exists.");

      const laterTransactions: any[] = await InventoryTransaction.find({
        rawMaterial: material._id,
        transactionDate: { $gt: receiptTransaction.transactionDate },
      }).sort({ transactionDate: 1, createdAt: 1 }).session(session);
      const lastRecordedQuantity = Number((laterTransactions[laterTransactions.length - 1] || receiptTransaction).quantityAfter);
      if (Math.abs(Number(inventory.quantity) - lastRecordedQuantity) > 0.0001) {
        throw new Error("Current Acticide inventory does not reconcile to its latest recorded movement.");
      }
      if (laterTransactions.some((transaction) => !["Adjustment", "Production Issue"].includes(String(transaction.type)))) {
        throw new Error("An unexpected post-receipt Acticide movement needs manual cost review before correction.");
      }
      const receiptOpeningQuantity = Number(receiptTransaction.quantityBefore);
      let originalAverageCost = Number(inventory.averageCostPerUnit);
      let correctedAverageCost = round((receiptOpeningQuantity * originalAverageCost + quantity * correctedUnitCost) / (receiptOpeningQuantity + quantity));
      const updatedIssues: Array<{ transaction: string; batch: string; quantity: number; oldUnitCost: number; newUnitCost: number; oldTotalCost: number; newTotalCost: number }> = [];
      const updatedBatches = new Set<string>();
      for (const transaction of laterTransactions) {
        const type = String(transaction.type);
        const amount = Number(transaction.quantity || 0);
        if (["Purchase", "Adjustment", "Production Return", "Opening Balance"].includes(type) && amount > 0) {
          const incomingCost = Number(transaction.unitCost || originalAverageCost);
          const quantityBefore = Number(transaction.quantityBefore || 0);
          originalAverageCost = round((quantityBefore * originalAverageCost + amount * incomingCost) / (quantityBefore + amount));
          correctedAverageCost = round((quantityBefore * correctedAverageCost + amount * incomingCost) / (quantityBefore + amount));
        } else if (["Production Issue", "Production Return"].includes(type) && Number(transaction.totalCost || 0) > 0) {
          const oldUnitCost = Number(transaction.unitCost || 0);
          const oldTotalCost = Number(transaction.totalCost || 0);
          const newTotalCost = round(amount * correctedAverageCost, 2);
          updatedIssues.push({ transaction: String(transaction._id), batch: String(transaction.productionBatch || ""), quantity: amount, oldUnitCost, newUnitCost: correctedAverageCost, oldTotalCost, newTotalCost });
          if (transaction.productionBatch) updatedBatches.add(String(transaction.productionBatch));
          if (apply) {
            transaction.unitCost = correctedAverageCost;
            transaction.totalCost = newTotalCost;
            transaction.notes = appendNote(transaction.notes, correctionNote);
            await transaction.save({ session });
          }
        }
      }
      if (Math.abs(originalAverageCost - Number(inventory.averageCostPerUnit)) > 0.01) {
        throw new Error(`Unchanged-price replay (${originalAverageCost}) does not reconcile to current average (${inventory.averageCostPerUnit}).`);
      }
      correctedAverageCost = round(correctedAverageCost);
      const correctedIssueCosts = new Map(updatedIssues.map((item) => [item.transaction, item.newTotalCost]));
      const affectedTransactions: any[] = await InventoryTransaction.find({
        productionBatch: { $in: [...updatedBatches].map((id) => new mongoose.Types.ObjectId(id)) },
        type: { $in: ["Production Issue", "Production Return"] },
      }).session(session).lean();
      const affectedMaterialIds = [...new Set(affectedTransactions.map((transaction) => String(transaction.rawMaterial)))].map((id) => new mongoose.Types.ObjectId(id));
      const affectedInventories: any[] = await Inventory.find({ rawMaterial: { $in: affectedMaterialIds } }).session(session).lean();
      const inventoryCosts = new Map(affectedInventories.map((entry) => [String(entry.rawMaterial), String(entry.rawMaterial) === String(material._id) ? correctedAverageCost : Number(entry.averageCostPerUnit || 0)]));
      const batchChanges: Array<Record<string, unknown>> = [];
      for (const batchId of updatedBatches) {
        const batch: any = await ProductionBatch.findById(batchId).session(session);
        if (!batch || batch.status !== "Completed") throw new Error(`Affected production batch ${batch?.batchNo || batchId} is not completed.`);
        const txs = affectedTransactions.filter((transaction) => String(transaction.productionBatch) === batchId);
        const materialCost = txs.reduce((sum, transaction) => {
          const correctedIssueCost = correctedIssueCosts.get(String(transaction._id));
          const transactionCost = correctedIssueCost !== undefined
            ? correctedIssueCost
            : Number(transaction.totalCost || 0) > 0
              ? Number(transaction.totalCost)
              : Number(transaction.quantity || 0) * Number(inventoryCosts.get(String(transaction.rawMaterial)) || 0);
          return sum + (transaction.type === "Production Return" ? -1 : 1) * transactionCost;
        }, 0);
        const productionOrder: any = batch.productionOrder ? await ProductionOrder.findById(batch.productionOrder).session(session).lean() : null;
        const formula: any = batch.formula ? await Formula.findById(batch.formula).session(session).lean() : null;
        const product: any = batch.product ? await Product.findById(batch.product).session(session).lean() : null;
        const orderQuantity = Number(productionOrder?.quantity || 0);
        const allocation = orderQuantity > 0 ? Number(batch.plannedQuantity || 0) / orderQuantity : 1;
        const labor = Number(productionOrder?.laborCost ?? formula?.laborCost ?? 0) * allocation;
        const energy = Number(productionOrder?.energyCost ?? formula?.energyCost ?? 0) * allocation;
        const other = Number(productionOrder?.otherCost ?? formula?.otherCost ?? 0) * allocation;
        const total = Math.max(0, materialCost + labor + energy + other);
        const output = Number(batch.actualQuantity || 0);
        const perKg = output > 0 ? total / output : 0;
        const packSize = product?.baseUnit === "kg" ? Number(product.packSizeKg || 0) : 0;
        batchChanges.push({ batch: batch.batchNo, oldActualMaterialCost: batch.actualMaterialCost, newActualMaterialCost: round(Math.max(0, materialCost)), oldTotalActualCost: batch.totalActualCost, newTotalActualCost: round(total), oldCostPerKg: batch.costPerKg, newCostPerKg: round(perKg), oldCostPerPack: batch.costPerPack, newCostPerPack: round(packSize > 0 ? perKg * packSize : 0) });
        if (apply) {
          batch.actualMaterialCost = round(Math.max(0, materialCost));
          batch.allocatedLaborCost = round(labor);
          batch.allocatedEnergyCost = round(energy);
          batch.allocatedOtherCost = round(other);
          batch.totalActualCost = round(total);
          batch.costPerKg = round(perKg);
          batch.costPerPack = round(packSize > 0 ? perKg * packSize : 0);
          batch.costedAt = new Date();
          batch.notes = appendNote(batch.notes, correctionNote);
          await batch.save({ session });
        }
      }

      report = {
        mode: apply ? "applied" : "dry-run",
        supplier: supplier.name,
        poNumber,
        material: material.name,
        quantity,
        purchaseOrder: { oldTotal: Number(po.total), newTotal: correctedTotal, oldUnitPrice: Number(line.unitPrice), newUnitPrice: correctedUnitCost },
        receipt: { grnNumber: lots[0].grnNumber, lotNumber: lots[0].lotNumber, oldUnitCost: Number(lots[0].unitCost), newUnitCost: correctedUnitCost, oldPayable: Number(lots[0].receivedQuantity) * Number(lots[0].unitCost), newPayable: Number(lots[0].receivedQuantity) * correctedUnitCost },
        supplierPayments: 0,
        inventory: { quantity: Number(inventory.quantity), oldAverageCost: Number(inventory.averageCostPerUnit), newAverageCost: correctedAverageCost, oldValue: round(Number(inventory.quantity) * Number(inventory.averageCostPerUnit), 2), newValue: round(Number(inventory.quantity) * correctedAverageCost, 2) },
        revaluedIssues: updatedIssues,
        revaluedBatches: batchChanges,
        supplierOfferChanged: false,
      };
      if (!apply) return;

      line.unitPrice = correctedUnitCost;
      line.total = correctedTotal;
      po.subtotal = correctedTotal;
      po.total = correctedTotal;
      po.notes = appendNote(po.notes, correctionNote);
      await po.save({ session });

      lots[0].unitCost = correctedUnitCost;
      lots[0].notes = appendNote(lots[0].notes, correctionNote);
      await lots[0].save({ session });

      receiptTransaction.unitCost = correctedUnitCost;
      receiptTransaction.totalCost = correctedTotal;
      receiptTransaction.notes = appendNote(receiptTransaction.notes, correctionNote);
      await receiptTransaction.save({ session });

      inventory.averageCostPerUnit = correctedAverageCost;
      await inventory.save({ session });
      await RawMaterial.updateOne({ _id: material._id }, { $set: { costPerUnit: correctedAverageCost } }, { session });
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
