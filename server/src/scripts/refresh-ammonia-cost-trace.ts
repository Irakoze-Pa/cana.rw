/** Refreshes active formula estimates and multi-output allocation after the Ammonia correction. */
import "dotenv/config";
import mongoose from "mongoose";
import Formula from "../modules/formula/formula.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import { revalueProductionBatchCost } from "../modules/production/productionBatch/productionBatch.service";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import { resolveCurrentMaterialPrices } from "../modules/raw-materials/materialPrice.service";

const correctedUnitPrice = 2_600;
const round = (value: number, decimals = 2) => Number(Number(value || 0).toFixed(decimals));

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const session = await mongoose.startSession();
  try {
    const ammonia: any = await RawMaterial.findOne({ name: /^Ammonia$/i }).session(session);
    if (!ammonia || Number(ammonia.costPerUnit || 0) >= 3_000) {
      throw new Error("Ammonia inventory cost does not show the approved correction.");
    }
    const formulas: any[] = await Formula.find({ status: "Active", "items.rawMaterial": ammonia._id }).session(session);
    const materialIds = [...new Set(formulas.flatMap((formula) => formula.items.map((item: any) => String(item.rawMaterial))))];
    const resolvedPrices = await resolveCurrentMaterialPrices(materialIds);
    const formulaUpdates = [];
    for (const formula of formulas) {
      let materialCost = 0;
      for (const item of formula.items) {
        const price = String(item.rawMaterial) === String(ammonia._id)
          ? correctedUnitPrice
          : Number(resolvedPrices.get(String(item.rawMaterial))?.unitPrice || 0);
        if (!(price > 0)) throw new Error(`Missing current purchase price for formula material ${item.rawMaterial}.`);
        const quantity = Number(item.quantity || 0) * (1 + Number(item.wastePercentage || 0) / 100);
        materialCost += quantity * price;
      }
      const estimatedMaterialCost = round(materialCost);
      const estimatedTotalCost = round(estimatedMaterialCost + Number(formula.laborCost || 0) + Number(formula.energyCost || 0) + Number(formula.otherCost || 0));
      formula.estimatedMaterialCost = estimatedMaterialCost;
      formula.estimatedTotalCost = estimatedTotalCost;
      await formula.save({ session });
      formulaUpdates.push({ code: formula.code, version: formula.version, estimatedMaterialCost, estimatedTotalCost });
    }

    const combinedBatch: any = await ProductionBatch.findOne({ batchNo: "PB-2026-0015", status: "Completed" }).session(session);
    if (!combinedBatch || !Array.isArray(combinedBatch.outputs) || !combinedBatch.outputs.length) {
      throw new Error("Expected completed shared-output batch PB-2026-0015 was not found.");
    }
    const total = Number(combinedBatch.totalActualCost || 0);
    const outputKg = Number(combinedBatch.actualQuantity || 0);
    const allocations = combinedBatch.outputs.map((output: any) => {
      const quantity = Number(output.actualQuantity || output.plannedQuantity || 0);
      const weightShare = outputKg > 0 ? quantity / outputKg : 0;
      const allocatedCost = round(total * weightShare, 4);
      const packSize = Number(output.packSizeKg || 30);
      output.allocatedCost = allocatedCost;
      output.costPerPack = quantity > 0 ? round(allocatedCost / quantity * packSize, 4) : 0;
      output.actualPacks = Number(output.actualPacks || output.plannedPacks || 0);
      return { product: output.productName, quantity, allocatedCost, costPerPack: output.costPerPack };
    });
    await combinedBatch.save({ session });
    const issueBatchIds = [...new Set((await InventoryTransaction.find({ rawMaterial: ammonia._id, type: "Production Issue" }).session(session).lean())
      .map((issue: any) => String(issue.productionBatch || ""))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id)))];
    const refreshedBatches = [];
    for (const id of issueBatchIds) {
      const batch: any = await ProductionBatch.findById(id).session(session).lean();
      if (batch?.status !== "Completed") continue;
      const updated: any = await revalueProductionBatchCost(id);
      refreshedBatches.push({ batchNo: updated.batchNo, currentMaterialCost: updated.currentMaterialCost, currentTotalCost: updated.currentTotalCost, currentCostPerPack: updated.currentCostPerPack });
    }
    const allocationTotal = allocations.reduce((sum: number, row: { allocatedCost: number }) => sum + row.allocatedCost, 0);
    console.log(JSON.stringify({ refreshedFormulas: formulaUpdates.length, formulas: formulaUpdates, reallocatedBatch: combinedBatch.batchNo, allocations, allocationTotal: round(allocationTotal, 4), batchCost: total, refreshedBatchReplacementCosts: refreshedBatches }, null, 2));
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
