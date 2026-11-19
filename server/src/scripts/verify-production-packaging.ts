import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import Product from "../modules/product/product.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import {
  isProductionPackagingName,
  packagingNamesForProduct,
} from "../modules/production/productionPackaging.service";

dotenv.config();

const round = (value: number) => Number(Number(value || 0).toFixed(2));
const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function finishedPackCount(record: any) {
  if (Array.isArray(record.outputs) && record.outputs.length) {
    return record.outputs.reduce((sum: number, output: any) => {
      const actualPacks = Number(output.actualPacks || 0);
      if (actualPacks > 0) return sum + actualPacks;
      const quantity = Number(output.actualQuantity || output.plannedQuantity || output.quantity || 0);
      return sum + quantity / Number(output.packSizeKg || 0);
    }, 0);
  }
  const product = record.product as any;
  return Number(record.actualQuantity || record.batchSize || 0) / Number(product?.packSizeKg || 0);
}

async function verifyFormulas() {
  const formulas: any[] = await Formula.find({ status: "Active" })
    .populate("product", "name packSizeKg")
    .populate("items.rawMaterial", "name unit")
    .sort({ code: 1, version: -1 })
    .lean();

  return formulas.map((formula) => {
    const packs = finishedPackCount(formula);
    ensure(Number.isInteger(packs) && packs > 0, `${formula.code} V${formula.version} has an invalid finished pack count.`);

    const expected = packagingNamesForProduct(formula.product?.name || "");
    const packaging = (formula.items || []).filter((item: any) =>
      isProductionPackagingName(item.rawMaterial?.name || ""),
    );
    ensure(packaging.length === expected.length, `${formula.code} V${formula.version} has incomplete packaging.`);

    for (const name of expected) {
      const line = packaging.find((item: any) => normalize(item.rawMaterial?.name) === normalize(name));
      ensure(line, `${formula.code} V${formula.version} is missing ${name}.`);
      ensure(Number(line.quantity) === packs, `${formula.code} V${formula.version} must use ${packs} ${name}.`);
      ensure(normalize(line.unit) === "pcs", `${formula.code} V${formula.version} ${name} must be measured in pcs.`);
    }

    return {
      formula: `${formula.code} V${formula.version}`,
      product: formula.product?.name,
      packs,
      packaging: expected.join(" + "),
    };
  });
}

async function verifyCompletedBatches() {
  const batches: any[] = await ProductionBatch.find({ status: "Completed" })
    .populate("product", "name packSizeKg")
    .sort({ batchNo: 1 })
    .lean();

  return batches.map((batch) => {
    const packs = finishedPackCount(batch);
    ensure(packs > 0, `${batch.batchNo} has no finished pack quantity.`);

    const expected = packagingNamesForProduct(batch.productName || batch.product?.name || "");
    const packaging = (batch.materialCostLines || []).filter((line: any) =>
      line.quantitySource === "pack_output",
    );
    ensure(packaging.length === expected.length, `${batch.batchNo} has incomplete packaging cost lines.`);

    for (const name of expected) {
      const line = packaging.find((item: any) => normalize(item.rawMaterialName) === normalize(name));
      ensure(line, `${batch.batchNo} is missing the ${name} cost line.`);
      ensure(Math.abs(Number(line.quantity) - packs) < 0.001, `${batch.batchNo} must cost ${packs} ${name}.`);
      ensure(normalize(line.unit) === "pcs", `${batch.batchNo} ${name} must be costed in pcs.`);
      ensure(Number(line.unitPrice) > 0, `${batch.batchNo} ${name} has no unit price.`);
    }

    const materialTotal = round((batch.materialCostLines || []).reduce(
      (sum: number, line: any) => sum + Number(line.totalCost || 0),
      0,
    ));
    ensure(Math.abs(materialTotal - Number(batch.actualMaterialCost || 0)) <= 0.01, `${batch.batchNo} material cost does not reconcile.`);

    const componentTotal = round(
      Number(batch.actualMaterialCost || 0)
      + Number(batch.allocatedLaborCost || 0)
      + Number(batch.allocatedEnergyCost || 0)
      + Number(batch.allocatedOtherCost || 0),
    );
    ensure(Math.abs(componentTotal - Number(batch.totalActualCost || 0)) <= 0.01, `${batch.batchNo} total cost does not reconcile.`);

    return {
      batch: batch.batchNo,
      product: batch.productName,
      packs: round(packs),
      packaging: packaging.map((line: any) => `${round(line.quantity)} ${line.rawMaterialName}`).join(" + "),
      totalCost: round(batch.totalActualCost || 0),
      costPerPack: round(batch.totalActualCost / packs),
    };
  });
}

async function run() {
  await connectDB();
  const [formulas, batches] = await Promise.all([
    verifyFormulas(),
    verifyCompletedBatches(),
  ]);
  console.log(JSON.stringify({
    verified: true,
    activeFormulas: formulas,
    completedBatches: batches,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
