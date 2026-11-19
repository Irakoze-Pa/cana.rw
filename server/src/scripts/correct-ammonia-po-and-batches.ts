/** Revalues the received El Co Ammonia purchase and every completed batch issue. */
import "dotenv/config";
import mongoose from "mongoose";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import Product from "../modules/product/product.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import Supplier from "../modules/suppliers/supplier.model";
import SupplierPayment from "../modules/supplierPayments/supplierPayment.model";

const poNumber = "PO-20261113-001";
const expectedSupplierCode = "EL-001";
const unitPrice = 2_600;
const note = "Ammonia purchase price corrected to confirmed El Co supplier offer: 30 kg × 2,600 RWF/kg = 78,000 RWF.";
const round = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};
const appendNote = (prior: string | undefined) => {
  const text = String(prior || "").trim();
  return text.includes(note) ? text : [text, note].filter(Boolean).join("\n");
};

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const session = await mongoose.startSession();
  let result: Record<string, unknown> = {};
  try {
    await session.withTransaction(async () => {
      const material: any = await RawMaterial.findOne({ name: /^Ammonia$/i }).session(session);
      if (!material) throw new Error("Ammonia material not found.");
      const supplier: any = await Supplier.findOne({ code: expectedSupplierCode }).session(session);
      const po: any = await PurchaseOrder.findOne({ poNumber }).session(session);
      if (!supplier || !po || String(po.supplier) !== String(supplier._id) || po.status !== "received") {
        throw new Error("Expected received El Co purchase order was not found.");
      }
      const line: any = po.items.find((item: any) => String(item.rawMaterial) === String(material._id));
      if (!line || Number(line.quantity) !== 30 || ![2_600, 3_000].includes(Number(line.unitPrice))) {
        throw new Error("Purchase order line differs from expected 30 kg Ammonia; stopped without changes.");
      }
      const payments = await SupplierPayment.countDocuments({ purchaseOrder: po._id }).session(session);
      if (payments) throw new Error("This purchase order has linked payments; payment reconciliation is required before repricing.");
      const lot: any = await RawMaterialLot.findOne({ purchaseOrder: po._id, rawMaterial: material._id }).session(session);
      const purchase: any = await InventoryTransaction.findOne({ purchaseOrder: po._id, rawMaterial: material._id, type: "Purchase" }).session(session);
      if (!lot || !purchase || Number(lot.receivedQuantity) !== 30 || Number(purchase.quantity) !== 30) {
        throw new Error("Received lot and inventory receipt do not match the 30 kg purchase order.");
      }
      const inventory: any = await Inventory.findOne({ rawMaterial: material._id }).session(session);
      if (!inventory) throw new Error("Ammonia inventory record not found.");

      const oldUnitPrice = Number(line.unitPrice);
      // The receipt's saved before-balance and original unit cost establish the historic opening average.
      const openingAvg = Number(purchase.unitCost || 0);
      const priorQty = Number(purchase.quantityBefore || 0);
      const correctedAverage = round(priorQty + 30 > 0
        ? (priorQty * openingAvg + 30 * unitPrice) / (priorQty + 30)
        : unitPrice);

      const issues: any[] = await InventoryTransaction.find({ rawMaterial: material._id, type: "Production Issue" }).sort({ transactionDate: 1 }).session(session);
      const adjustedBatches: any[] = [];
      for (const issue of issues) {
        if (!mongoose.Types.ObjectId.isValid(String(issue.productionBatch || ""))) continue;
        const batch: any = await ProductionBatch.findById(issue.productionBatch).session(session);
        if (!batch || batch.status !== "Completed") continue;
        const lineCost: any = batch.materialCostLines.find((item: any) => String(item.rawMaterial) === String(material._id));
        if (!lineCost) throw new Error(`${batch.batchNo} has an Ammonia issue but no matching cost line.`);
        const qty = Number(issue.quantity || 0);
        if (Math.abs(qty - Number(lineCost.quantity || 0)) > 0.0001) throw new Error(`${batch.batchNo} Ammonia quantity does not reconcile.`);
        const updatedLineCost = round(qty * unitPrice, 2);
        issue.unitCost = unitPrice;
        issue.totalCost = updatedLineCost;
        issue.notes = appendNote(issue.notes);
        await issue.save({ session });
        lineCost.unitPrice = unitPrice;
        lineCost.totalCost = updatedLineCost;
        lineCost.priceSource = "production_issue";
        const materialCost = round(batch.materialCostLines.reduce((sum: number, item: any) => sum + Number(item.totalCost || 0), 0));
        const totalCost = round(materialCost + Number(batch.allocatedLaborCost || 0) + Number(batch.allocatedEnergyCost || 0) + Number(batch.allocatedOtherCost || 0));
        const outputKg = Number(batch.actualQuantity || 0);
        const product: any = await Product.findById(batch.product).session(session).lean();
        const packSizeKg = Number(product?.packSizeKg || 0);
        batch.actualMaterialCost = materialCost;
        batch.totalActualCost = totalCost;
        batch.costPerKg = outputKg > 0 ? round(totalCost / outputKg) : 0;
        batch.costPerPack = outputKg > 0 && packSizeKg > 0 ? round(totalCost / outputKg * packSizeKg) : 0;
        batch.costedAt = new Date();
        batch.costPriceAsOf = new Date();
        batch.notes = appendNote(batch.notes);
        await batch.save({ session });
        adjustedBatches.push({ batchNo: batch.batchNo, ammoniaKg: qty, batchMaterialCost: materialCost, batchTotalCost: totalCost, costPerPack: batch.costPerPack });
      }

      line.unitPrice = unitPrice;
      line.total = round(Number(line.quantity) * unitPrice, 2);
      po.subtotal = round(po.items.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0));
      po.total = round(po.subtotal + Number(po.tax || 0));
      po.notes = appendNote(po.notes);
      await po.save({ session });
      lot.unitCost = unitPrice;
      lot.notes = appendNote(lot.notes);
      await lot.save({ session });
      purchase.unitCost = unitPrice;
      purchase.totalCost = round(30 * unitPrice, 2);
      purchase.notes = appendNote(purchase.notes);
      await purchase.save({ session });
      inventory.averageCostPerUnit = correctedAverage;
      await inventory.save({ session });
      await RawMaterial.updateOne({ _id: material._id }, { $set: { costPerUnit: correctedAverage } }, { session });

      result = {
        purchaseOrder: poNumber,
        supplier: supplier.name,
        quantityKg: 30,
        oldUnitPrice,
        newUnitPrice: unitPrice,
        correctedOrderTotal: po.total,
        correctedInventoryAverage: correctedAverage,
        adjustedCompletedBatches: adjustedBatches.length,
        batches: adjustedBatches,
        stockQuantitiesChanged: false,
        supplierPaymentsLinked: payments,
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
