import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import { synchronizeFormulaPackaging } from "../modules/production/productionPackaging.service";
import { resolveCurrentMaterialPrices } from "../modules/raw-materials/materialPrice.service";

dotenv.config();

const apply = process.argv.includes("--apply");
const round = (value: number) => Number(Number(value || 0).toFixed(2));

async function run() {
  await connectDB();
  const formulas: any[] = await Formula.find({ status: "Active" }).sort({ code: 1, version: -1 }).lean();
  const plans: any[] = [];

  for (const formula of formulas) {
    const sourceItems = (formula.items || []).map((item: any) => ({
      rawMaterial: String(item.rawMaterial),
      ...(item.appliesToProduct ? { appliesToProduct: String(item.appliesToProduct) } : {}),
      quantity: Number(item.quantity || 0),
      unit: item.unit,
      wastePercentage: Number(item.wastePercentage || 0),
      notes: item.notes || "",
    }));
    const synchronized = await synchronizeFormulaPackaging({
      productId: String(formula.product),
      batchSize: Number(formula.batchSize || 0),
      outputs: formula.outputs || [],
      items: sourceItems,
    });
    const materialIds = synchronized.items.map((item: any) => String(item.rawMaterial));
    const prices = await resolveCurrentMaterialPrices(materialIds);
    const missing = materialIds.filter((id) => Number(prices.get(id)?.unitPrice || 0) <= 0);
    if (missing.length) throw new Error(`Formula ${formula.code} has unpriced material(s): ${missing.join(", ")}`);
    const estimatedMaterialCost = round(synchronized.items.reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity || 0) * (1 + Number(item.wastePercentage || 0) / 100);
      return sum + quantity * Number(prices.get(String(item.rawMaterial))?.unitPrice || 0);
    }, 0));
    plans.push({
      formulaId: String(formula._id),
      formula: `${formula.code} V${formula.version}`,
      packCount: synchronized.packCount,
      packaging: synchronized.packagingNames,
      items: synchronized.items,
      estimatedMaterialCost,
      estimatedTotalCost: round(
        estimatedMaterialCost + Number(formula.laborCost || 0) + Number(formula.energyCost || 0) + Number(formula.otherCost || 0),
      ),
    });
  }

  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    formulas: plans.map((plan) => ({
      formula: plan.formula,
      finishedPacks: plan.packCount,
      packaging: plan.packaging.map((name: string) => `${plan.packCount} ${name}`),
    })),
  }, null, 2));

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to save automatic packaging quantities.");
    return;
  }

  for (const plan of plans) {
    await Formula.updateOne(
      { _id: plan.formulaId },
      { $set: {
        items: plan.items,
        estimatedMaterialCost: plan.estimatedMaterialCost,
        estimatedTotalCost: plan.estimatedTotalCost,
      } },
    );
  }
  console.log(`Updated ${plans.length} active formulas with automatic packaging.`);
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
