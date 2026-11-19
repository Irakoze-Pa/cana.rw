import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import Product from "../modules/product/product.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";

dotenv.config();

const round = (value: number) => Number(Number(value || 0).toFixed(2));
const close = (left: number, right: number, tolerance = 0.02) => Math.abs(Number(left || 0) - Number(right || 0)) <= tolerance;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  await connectDB();
  const batches: any[] = await ProductionBatch.find({ status: "Completed" })
    .populate("product", "name packSizeKg")
    .sort({ batchNo: 1 })
    .lean();
  const batchIds = batches.map((batch) => batch._id);
  const movements: any[] = await InventoryTransaction.find({
    productionBatch: { $in: batchIds },
    type: { $in: ["Production Issue", "Production Return"] },
  }).lean();

  const rows = batches.map((batch) => {
    ensure(batch.costingBasis === "actual_issue_cost", `${batch.batchNo} is not using actual issue-cost valuation.`);
    const batchMovements = movements.filter((movement) => String(movement.productionBatch) === String(batch._id));
    const movementByMaterial = new Map<string, { quantity: number; value: number }>();
    batchMovements.forEach((movement) => {
      const id = String(movement.rawMaterial);
      const sign = movement.type === "Production Return" ? -1 : 1;
      const quantity = Number(movement.quantity || 0);
      const value = Number(movement.totalCost || 0) > 0
        ? Number(movement.totalCost)
        : quantity * Number(movement.unitCost || 0);
      const current = movementByMaterial.get(id) || { quantity: 0, value: 0 };
      current.quantity += sign * quantity;
      current.value += sign * value;
      movementByMaterial.set(id, current);
    });

    const lines: any[] = Array.isArray(batch.materialCostLines) ? batch.materialCostLines : [];
    ensure(lines.length > 0, `${batch.batchNo} has no material cost lines.`);
    const lineByMaterial = new Map(lines.map((line) => [String(line.rawMaterial), line]));
    movementByMaterial.forEach((movement, materialId) => {
      if (movement.quantity <= 0) return;
      const line: any = lineByMaterial.get(materialId);
      ensure(line, `${batch.batchNo} is missing an issued material cost line for ${materialId}.`);
      if (movement.value > 0) {
        ensure(line.priceSource === "production_issue", `${batch.batchNo} did not use the saved issue price for ${line.rawMaterialName}.`);
        ensure(close(line.unitPrice, movement.value / movement.quantity), `${batch.batchNo} issue unit price does not reconcile for ${line.rawMaterialName}.`);
        if (line.quantitySource !== "pack_output") {
          ensure(close(line.quantity, movement.quantity), `${batch.batchNo} issue quantity does not reconcile for ${line.rawMaterialName}.`);
          ensure(close(line.totalCost, movement.value), `${batch.batchNo} issue value does not reconcile for ${line.rawMaterialName}.`);
        }
      }
    });

    const materialTotal = round(lines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0));
    ensure(close(materialTotal, batch.actualMaterialCost), `${batch.batchNo} material lines do not reconcile to material cost.`);
    const componentTotal = round(
      Number(batch.actualMaterialCost || 0)
      + Number(batch.allocatedLaborCost || 0)
      + Number(batch.allocatedEnergyCost || 0)
      + Number(batch.allocatedOtherCost || 0),
    );
    ensure(close(componentTotal, batch.totalActualCost), `${batch.batchNo} cost components do not reconcile.`);
    const outputKg = Number(batch.actualQuantity || 0);
    ensure(outputKg > 0, `${batch.batchNo} has no actual output.`);
    ensure(close(batch.costPerKg, componentTotal / outputKg), `${batch.batchNo} cost per kg does not reconcile.`);

    const outputs = Array.isArray(batch.outputs) ? batch.outputs : [];
    if (outputs.length) {
      const allocated = round(outputs.reduce((sum: number, output: any) => sum + Number(output.allocatedCost || 0), 0));
      ensure(close(allocated, componentTotal), `${batch.batchNo} output allocations do not reconcile.`);
    } else {
      const product: any = batch.product;
      const packSize = Number(product?.packSizeKg || 0);
      if (packSize > 0) ensure(close(batch.costPerPack, componentTotal / outputKg * packSize), `${batch.batchNo} cost per pack does not reconcile.`);
    }

    const currentLines: any[] = Array.isArray(batch.currentMaterialCostLines) ? batch.currentMaterialCostLines : [];
    ensure(currentLines.length > 0, `${batch.batchNo} has no current replacement-cost lines.`);
    const currentMaterialTotal = round(currentLines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0));
    ensure(close(currentMaterialTotal, batch.currentMaterialCost), `${batch.batchNo} current material lines do not reconcile.`);
    const currentComponentTotal = round(
      Number(batch.currentMaterialCost || 0)
      + Number(batch.allocatedLaborCost || 0)
      + Number(batch.allocatedEnergyCost || 0)
      + Number(batch.allocatedOtherCost || 0),
    );
    ensure(close(currentComponentTotal, batch.currentTotalCost), `${batch.batchNo} current replacement cost does not reconcile.`);
    ensure(close(batch.currentCostPerKg, currentComponentTotal / outputKg), `${batch.batchNo} current cost per kg does not reconcile.`);
    const replacementPackSize = Number(batch.product?.packSizeKg || 0);
    if (replacementPackSize > 0) {
      ensure(close(batch.currentCostPerPack, currentComponentTotal / outputKg * replacementPackSize), `${batch.batchNo} current cost per pack does not reconcile.`);
    }

    return {
      batch: batch.batchNo,
      product: batch.productName,
      materialCost: round(batch.actualMaterialCost),
      totalCost: round(batch.totalActualCost),
      costPerKg: round(batch.costPerKg),
      costPerPack: round(batch.costPerPack),
      currentMaterialCost: round(batch.currentMaterialCost),
      currentTotalCost: round(batch.currentTotalCost),
      currentCostPerPack: round(batch.currentCostPerPack),
      fallbackLines: lines.filter((line) => line.priceSource !== "production_issue").length,
      fallbackMaterials: lines
        .filter((line) => line.priceSource !== "production_issue")
        .map((line) => `${line.rawMaterialName} · ${line.priceSource}`),
    };
  });

  console.log(JSON.stringify({
    verified: true,
    completedBatches: rows.length,
    actualIssueCostBatches: rows.filter((row) => row.fallbackLines === 0).length,
    batchesWithLegacyFallback: rows.filter((row) => row.fallbackLines > 0).length,
    batches: rows,
  }, null, 2));
}

void Product;
run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
