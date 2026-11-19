import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import { createNewFormulaVersion } from "../modules/formula/formula.service";
import "../modules/raw-materials/rawMaterial.model";

dotenv.config();

const apply = process.argv.includes("--apply");

async function run() {
  await connectDB();

  const formulas: any[] = await Formula.find({ status: "Active" })
    .populate("items.rawMaterial", "name code unit status")
    .sort({ code: 1, version: 1 });

  const plans = formulas.map((formula) => {
    const mismatches = (formula.items || []).filter((item: any) => {
      const material = item.rawMaterial;
      return material && String(item.unit || "").toLowerCase() !== String(material.unit || "").toLowerCase();
    });
    return { formula, mismatches };
  }).filter((plan) => plan.mismatches.length > 0);

  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    formulas: plans.map(({ formula, mismatches }) => ({
      formula: `${formula.code} V${formula.version}`,
      nextVersion: formula.version + 1,
      changes: mismatches.map((item: any) => ({
        rawMaterial: item.rawMaterial.name,
        code: item.rawMaterial.code,
        quantityUnchanged: item.quantity,
        from: item.unit,
        to: item.rawMaterial.unit,
      })),
    })),
  }, null, 2));

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to create corrected active formula versions.");
    return;
  }

  const created: Array<Record<string, unknown>> = [];
  for (const { formula } of plans) {
    const expectedQuantities = (formula.items || []).map((item: any) => Number(item.quantity || 0));
    const newFormula: any = await createNewFormulaVersion(String(formula._id), {
      items: (formula.items || []).map((item: any) => ({
        rawMaterial: String(item.rawMaterial._id),
        appliesToProduct: item.appliesToProduct ? String(item.appliesToProduct) : undefined,
        quantity: Number(item.quantity || 0),
        unit: String(item.rawMaterial.unit),
        wastePercentage: Number(item.wastePercentage || 0),
        notes: item.notes || "",
      })),
      status: "Active",
      notes: [formula.notes, "Formula units aligned with each raw material's pricing unit; quantities unchanged."].filter(Boolean).join("\n"),
    });
    const createdQuantities = (newFormula.items || []).map((item: any) => Number(item.quantity || 0));
    if (JSON.stringify(createdQuantities) !== JSON.stringify(expectedQuantities)) {
      throw new Error(`Quantity verification failed for ${formula.code} V${newFormula.version}.`);
    }
    created.push({
      formula: `${newFormula.code} V${newFormula.version}`,
      materialCost: newFormula.estimatedMaterialCost,
      totalCost: newFormula.estimatedTotalCost,
      quantitiesUnchanged: true,
    });
  }

  console.log(JSON.stringify({ applied: true, created }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
