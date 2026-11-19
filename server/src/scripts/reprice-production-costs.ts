import { createHash } from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import FinishedGoodsStoreBalance from "../modules/finishedGoods/storeBalance.model";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import { revalueProductionBatchCost } from "../modules/production/productionBatch/productionBatch.service";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import { resolveCurrentMaterialPrices } from "../modules/raw-materials/materialPrice.service";

dotenv.config();

const apply = process.argv.includes("--apply");
const round = (value: number) => Number(Number(value || 0).toFixed(2));

function laborForProducts(names: string[]) {
  const joined = names.join(" ").toLowerCase();
  if (joined.includes("wall master")) return 60_000;
  if (joined.includes("weather guard")) return 40_000;
  if (joined.includes("silk")) return 40_000;
  if (joined.includes("vinyl matt") || /\bmatt\b/.test(joined)) return 30_000;
  if (joined.includes("budget")) return 30_000;
  if (joined.includes("wood glue")) return 20_000;
  if (joined.includes("plaster")) return 10_000;
  return undefined;
}

async function protectedOperationalSnapshot() {
  const [inventory, movements, finished, lots] = await Promise.all([
    Inventory.find().select("_id rawMaterial quantity reservedQuantity availableQuantity averageCostPerUnit").sort({ _id: 1 }).lean(),
    InventoryTransaction.find().select("_id inventory rawMaterial type quantity unit unitCost totalCost quantityBefore quantityAfter lotNumber").sort({ _id: 1 }).lean(),
    FinishedGoodsStoreBalance.find()
      .select("_id product store quantity minimumQuantity")
      .sort({ _id: 1 })
      .lean(),
    RawMaterialLot.find()
      .select("_id rawMaterial supplier purchaseOrder receivedQuantity availableQuantity unit unitCost status")
      .sort({ _id: 1 })
      .lean(),
  ]);
  return { inventory, movements, finished, lots };
}

const snapshotHash = (snapshot: unknown) => createHash("sha256")
  .update(JSON.stringify(snapshot))
  .digest("hex");

function changedDocumentIds(before: any[], after: any[]) {
  const beforeById = new Map(before.map((item) => [String(item._id), JSON.stringify(item)]));
  const afterById = new Map(after.map((item) => [String(item._id), JSON.stringify(item)]));
  return [...new Set([...beforeById.keys(), ...afterById.keys()])]
    .filter((id) => beforeById.get(id) !== afterById.get(id));
}

async function run() {
  await connectDB();

  const [formulas, batches] = await Promise.all([
    Formula.find()
      .populate("product", "name code")
      .populate("outputs.product", "name code")
      .lean(),
    ProductionBatch.find({ status: "Completed" }).select("_id batchNo productName").sort({ batchNo: 1 }).lean(),
  ]);

  const formulaMaterialIds = [
    ...new Set(formulas.flatMap((formula: any) => (formula.items || []).map((item: any) => String(item.rawMaterial)))),
  ];
  const prices = await resolveCurrentMaterialPrices(formulaMaterialIds);
  const requiredMaterialIds = formulaMaterialIds;
  const unresolved = requiredMaterialIds.filter((id) => Number(prices.get(id)?.unitPrice || 0) <= 0);
  if (unresolved.length) {
    throw new Error(`Repricing stopped. ${unresolved.length} raw material(s) have no supplier, inventory-average, or setup price: ${unresolved.join(", ")}`);
  }

  const formulaPlans = formulas.map((formula: any) => {
    const primary = formula.product as any;
    const names = [primary?.name, ...(formula.outputs || []).map((output: any) => output.product?.name)].filter(Boolean);
    const laborCost = laborForProducts(names);
    const estimatedMaterialCost = round((formula.items || []).reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity || 0) * (1 + Number(item.wastePercentage || 0) / 100);
      return sum + quantity * Number(prices.get(String(item.rawMaterial))?.unitPrice || 0);
    }, 0));
    return {
      id: String(formula._id),
      code: formula.code,
      version: formula.version,
      products: names.join(" + "),
      previousLabor: Number(formula.laborCost || 0),
      laborCost,
      estimatedMaterialCost,
      energyCost: Number(formula.energyCost || 0),
      otherCost: Number(formula.otherCost || 0),
    };
  });

  const productionFormulaPlans = formulaPlans.filter((plan) => plan.laborCost !== undefined);
  const unmatchedReferencedFormulaIds = new Set(
    (await ProductionBatch.distinct("formula", { status: "Completed" })).map(String),
  );
  productionFormulaPlans.forEach((plan) => unmatchedReferencedFormulaIds.delete(plan.id));
  if (unmatchedReferencedFormulaIds.size) {
    throw new Error(`No labour policy matched ${unmatchedReferencedFormulaIds.size} completed-batch formula(s): ${[...unmatchedReferencedFormulaIds].join(", ")}`);
  }

  const sourceCounts = { supplier_offer: 0, inventory_average: 0, material_setup: 0 };
  prices.forEach((price) => { sourceCounts[price.source] += 1; });
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    completedBatches: batches.length,
    formulasToUpdate: productionFormulaPlans.length,
    priceSources: sourceCounts,
    laborChanges: productionFormulaPlans.map((plan) => ({
      formula: `${plan.code} V${plan.version}`,
      products: plan.products,
      from: plan.previousLabor,
      to: plan.laborCost,
    })),
  }, null, 2));

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to save formula and completed-batch costs.");
    return;
  }

  const protectedBefore = await protectedOperationalSnapshot();

  for (const plan of productionFormulaPlans) {
    await Formula.updateOne(
      { _id: plan.id },
      {
        $set: {
          laborCost: plan.laborCost,
          estimatedMaterialCost: plan.estimatedMaterialCost,
          estimatedTotalCost: round(
            plan.estimatedMaterialCost + Number(plan.laborCost || 0) + plan.energyCost + plan.otherCost,
          ),
        },
      },
    );
  }

  const results: Array<Record<string, unknown>> = [];
  for (const batch of batches) {
    const before: any = await ProductionBatch.findById(batch._id)
      .select("actualMaterialCost allocatedLaborCost allocatedEnergyCost allocatedOtherCost totalActualCost costPerKg costPerPack")
      .lean();
    const updated: any = await revalueProductionBatchCost(String(batch._id));
    results.push({
      batch: batch.batchNo,
      product: batch.productName,
      materialBefore: round(before?.actualMaterialCost || 0),
      materialAfter: round(updated?.actualMaterialCost || 0),
      laborBefore: round(before?.allocatedLaborCost || 0),
      laborAfter: round(updated?.allocatedLaborCost || 0),
      totalBefore: round(before?.totalActualCost || 0),
      totalAfter: round(updated?.totalActualCost || 0),
      costPerPack: round(updated?.costPerPack || 0),
      fallbackMaterials: updated?.costPriceFallbackMaterials || [],
    });
  }

  const protectedAfter = await protectedOperationalSnapshot();
  if (snapshotHash(protectedAfter) !== snapshotHash(protectedBefore)) {
    const changes = {
      inventory: changedDocumentIds(protectedBefore.inventory, protectedAfter.inventory),
      movements: changedDocumentIds(protectedBefore.movements, protectedAfter.movements),
      finished: changedDocumentIds(protectedBefore.finished, protectedAfter.finished),
      lots: changedDocumentIds(protectedBefore.lots, protectedAfter.lots),
    };
    throw new Error(`Safety verification failed. Changed protected records: ${JSON.stringify(changes)}`);
  }

  const invalidBatches = await ProductionBatch.find({ status: "Completed" }).lean().then((docs: any[]) =>
    docs.filter((batch) => {
      const componentTotal = round(Number(batch.actualMaterialCost || 0) + Number(batch.allocatedLaborCost || 0) + Number(batch.allocatedEnergyCost || 0) + Number(batch.allocatedOtherCost || 0));
      return Math.abs(componentTotal - Number(batch.totalActualCost || 0)) > 0.01;
    }),
  );
  if (invalidBatches.length) {
    throw new Error(`Cost verification failed for: ${invalidBatches.map((batch: any) => batch.batchNo).join(", ")}`);
  }

  console.log(JSON.stringify({ applied: true, protectedOperationalDataUnchanged: true, batches: results }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
