/**
 * Corrects completed production batches' Indogel issue costs to the verified
 * El Co purchase price of 7,500 RWF/kg.
 */
import "dotenv/config";
import mongoose from "mongoose";

import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import Product from "../modules/product/product.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";

const verifiedPurchaseOrder = "PO-20261103-001";
const correctedUnitCost = 7_500;
const correctionNote =
  "Indogel cost corrected from unsupported opening-stock valuation to verified El Co purchase price: 20 kg for 150,000 RWF (7,500 RWF/kg).";

const round = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

const appendNote = (existing: string | undefined, note: string) => {
  const current = String(existing || "").trim();
  return current.includes(note) ? current : [current, note].filter(Boolean).join("\n");
};

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const session = await mongoose.startSession();
  let report: Record<string, unknown> = {};

  try {
    await session.withTransaction(async () => {
      const material: any = await RawMaterial.findOne({ name: /^Indogel$/i }).session(session);
      if (!material) throw new Error("Indogel was not found.");

      const purchaseOrder: any = await PurchaseOrder.findOne({ poNumber: verifiedPurchaseOrder }).session(session);
      if (!purchaseOrder) throw new Error(`${verifiedPurchaseOrder} was not found.`);
      const purchaseLine = purchaseOrder.items.find(
        (item: any) => String(item.rawMaterial) === String(material._id),
      );
      if (
        !purchaseLine
        || Number(purchaseLine.quantity) !== 20
        || Number(purchaseLine.unitPrice) !== correctedUnitCost
        || Number(purchaseLine.total) !== 150_000
      ) {
        throw new Error("The verified Indogel purchase no longer reconciles to 20 kg at 7,500 RWF/kg.");
      }

      const issues: any[] = await InventoryTransaction.find({
        rawMaterial: material._id,
        type: "Production Issue",
      }).sort({ transactionDate: 1 }).session(session);
      if (!issues.length) throw new Error("No Indogel production issues were found.");

      const batches: any[] = [];
      for (const issue of issues) {
        const batch: any = await ProductionBatch.findById(issue.productionBatch).session(session);
        if (!batch || batch.status !== "Completed") continue;
        const line: any = batch.materialCostLines.find(
          (item: any) => String(item.rawMaterial) === String(material._id),
        );
        if (!line) throw new Error(`${batch.batchNo} is missing its Indogel cost line.`);
        const quantity = Number(issue.quantity || 0);
        if (!(quantity > 0) || Math.abs(quantity - Number(line.quantity || 0)) > 0.0001) {
          throw new Error(`${batch.batchNo} Indogel issue and cost-line quantities do not reconcile.`);
        }

        const previousUnitCost = Number(issue.unitCost || 0);
        const previousTotalCost = Number(issue.totalCost || 0);
        const correctedTotalCost = round(quantity * correctedUnitCost, 2);
        if (previousUnitCost !== correctedUnitCost || previousTotalCost !== correctedTotalCost) {
          issue.unitCost = correctedUnitCost;
          issue.totalCost = correctedTotalCost;
          issue.notes = appendNote(issue.notes, correctionNote);
          await issue.save({ session });
        }
        line.unitPrice = correctedUnitCost;
        line.totalCost = correctedTotalCost;
        line.priceSource = "production_issue";

        const materialCost = round(batch.materialCostLines.reduce(
          (sum: number, item: any) => sum + Number(item.totalCost || 0), 0,
        ));
        const totalCost = round(materialCost
          + Number(batch.allocatedLaborCost || 0)
          + Number(batch.allocatedEnergyCost || 0)
          + Number(batch.allocatedOtherCost || 0));
        const outputKg = Number(batch.actualQuantity || 0);
        if (!(outputKg > 0)) throw new Error(`${batch.batchNo} has no actual output.`);
        const product: any = await Product.findById(batch.product).session(session).lean();
        const packSizeKg = Number(product?.packSizeKg || 0);

        batch.actualMaterialCost = materialCost;
        batch.totalActualCost = totalCost;
        batch.costPerKg = round(totalCost / outputKg);
        batch.costPerPack = packSizeKg > 0 ? round(totalCost / outputKg * packSizeKg) : 0;
        batch.costedAt = new Date();
        batch.costPriceAsOf = new Date();
        batch.notes = appendNote(batch.notes, correctionNote);
        await batch.save({ session });
        batches.push({
          batch: batch.batchNo,
          quantity,
          previousUnitCost,
          correctedUnitCost,
          previousIndogelCost: previousTotalCost,
          correctedIndogelCost: correctedTotalCost,
          actualMaterialCost: batch.actualMaterialCost,
          totalActualCost: batch.totalActualCost,
          costPerPack: batch.costPerPack,
        });
      }

      report = {
        corrected: true,
        evidence: {
          purchaseOrder: verifiedPurchaseOrder,
          purchasedQuantity: Number(purchaseLine.quantity),
          purchaseTotal: Number(purchaseLine.total),
          verifiedUnitCost: correctedUnitCost,
        },
        correctedBatches: batches.length,
        batches,
      };
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
