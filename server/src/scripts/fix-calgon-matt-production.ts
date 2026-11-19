import { createHash } from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import { createNewFormulaVersion } from "../modules/formula/formula.service";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import MaterialConsumption from "../modules/production/materialConsumption/materialConsumption.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import { revalueProductionBatchCost } from "../modules/production/productionBatch/productionBatch.service";
import PurchaseOrder from "../modules/purchaseOrders/purchaseOrder.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";

dotenv.config();

const apply = process.argv.includes("--apply");
const targetBatchNo = "PB-2026-0012";
const round = (value: number) => Number(Number(value || 0).toFixed(4));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function quantitySnapshot(batch: any, formula: any, consumption: any, issue: any) {
  return {
    batch: {
      plannedQuantity: batch.plannedQuantity,
      actualQuantity: batch.actualQuantity,
      outputs: (batch.outputs || []).map((item: any) => ({
        product: String(item.product),
        plannedQuantity: item.plannedQuantity,
        actualQuantity: item.actualQuantity,
        plannedPacks: item.plannedPacks,
        actualPacks: item.actualPacks,
      })),
      formulaQuantities: (batch.formulaSnapshot || []).map((item: any) => ({
        rawMaterial: String(item.rawMaterial),
        quantity: item.quantity,
      })),
    },
    formulaQuantities: (formula.items || []).map((item: any) => ({
      quantity: item.quantity,
      wastePercentage: item.wastePercentage,
    })),
    consumption: consumption
      ? (consumption.items || []).map((item: any) => ({
          rawMaterial: String(item.rawMaterial),
          standardQuantity: item.standardQuantity,
          issuedQuantity: item.issuedQuantity,
          actualQuantity: item.actualQuantity,
          wasteQuantity: item.wasteQuantity,
          returnQuantity: item.returnQuantity,
        }))
      : [],
    issue: {
      quantity: issue.quantity,
      quantityBefore: issue.quantityBefore,
      quantityAfter: issue.quantityAfter,
    },
  };
}

async function run() {
  await connectDB();

  const batch: any = await ProductionBatch.findOne({ batchNo: targetBatchNo }).lean();
  if (!batch) throw new Error(`${targetBatchNo} was not found.`);
  if (batch.status !== "Completed") throw new Error(`${targetBatchNo} must be completed before its cost can be corrected.`);

  const formula: any = await Formula.findById(batch.formula).lean();
  if (!formula) throw new Error(`Formula ${String(batch.formula)} was not found.`);

  const [legacyCalgon, activeCalgon, consumption]: any[] = await Promise.all([
    RawMaterial.findOne({ name: /^Calgon \(SHMP\)$/i, status: "Inactive" }).lean(),
    RawMaterial.findOne({ name: /^Calgon$/i, status: "Active" }).lean(),
    MaterialConsumption.findOne({ productionBatch: batch._id }).lean(),
  ]);
  if (!legacyCalgon) throw new Error("The inactive Calgon (SHMP) setup record was not found.");
  if (!activeCalgon) throw new Error("The active Calgon setup record was not found.");

  const formulaCalgonItems = (formula.items || []).filter(
    (item: any) => String(item.rawMaterial) === String(legacyCalgon._id),
  );
  if (formulaCalgonItems.length !== 1) {
    throw new Error(`Expected one legacy Calgon line in ${formula.code} V${formula.version}; found ${formulaCalgonItems.length}.`);
  }

  const existingCorrectFormula: any = await Formula.findOne({
    product: formula.product,
    code: formula.code,
    status: "Active",
    items: {
      $elemMatch: {
        rawMaterial: activeCalgon._id,
        quantity: Number(formulaCalgonItems[0].quantity),
      },
    },
  }).sort({ version: -1 }).lean();

  const issue: any = await InventoryTransaction.findOne({
    productionBatch: batch._id,
    rawMaterial: legacyCalgon._id,
    type: "Production Issue",
  }).lean();
  if (!issue) throw new Error(`The ${targetBatchNo} Calgon production issue was not found.`);

  const purchaseOrder: any = await PurchaseOrder.findOne({
    status: "received",
    "items.rawMaterial": activeCalgon._id,
    orderDate: { $lte: issue.transactionDate },
  }).sort({ orderDate: -1, _id: -1 }).lean();
  if (!purchaseOrder) throw new Error("No received Calgon purchase order exists before this Matt production issue.");

  const purchasedLines = (purchaseOrder.items || []).filter(
    (item: any) => String(item.rawMaterial) === String(activeCalgon._id),
  );
  if (purchasedLines.length !== 1) throw new Error("The Calgon purchase order must contain exactly one Calgon line.");
  const purchasedLine = purchasedLines[0];
  const verifiedUnitPrice = Number(purchasedLine.unitPrice || 0);
  if (!(verifiedUnitPrice > 0)) throw new Error("The received Calgon purchase price is not valid.");
  if (Math.abs(Number(purchasedLine.total || 0) - Number(purchasedLine.quantity || 0) * verifiedUnitPrice) > 0.01) {
    throw new Error("The received Calgon purchase line total does not match quantity × unit price.");
  }
  const correctionNote = `Calgon cost verified against ${purchaseOrder.poNumber}: ${verifiedUnitPrice} RWF/${purchasedLine.unit}.`;
  const correctedIssueNotes = String(issue.notes || "").includes(correctionNote)
    ? String(issue.notes || "")
    : [issue.notes, correctionNote].filter(Boolean).join(" ");

  const beforeQuantities = quantitySnapshot(batch, formula, consumption, issue);
  const plan = {
    mode: apply ? "APPLY" : "DRY_RUN",
    batch: targetBatchNo,
    formula: `${formula.code} V${formula.version}`,
    formulaAction: existingCorrectFormula
      ? `Reuse ${existingCorrectFormula.code} V${existingCorrectFormula.version}`
      : `Create ${formula.code} V${Number(formula.version) + 1}`,
    newFormulaVersion: {
      from: `${legacyCalgon.name} (${legacyCalgon.code})`,
      to: `${activeCalgon.name} (${activeCalgon.code})`,
      quantity: formulaCalgonItems[0].quantity,
      unit: formulaCalgonItems[0].unit,
    },
    verifiedPurchase: {
      purchaseOrder: purchaseOrder.poNumber,
      quantity: purchasedLine.quantity,
      unit: purchasedLine.unit,
      unitPrice: verifiedUnitPrice,
      lineTotal: purchasedLine.total,
    },
    batchIssueCost: {
      quantity: issue.quantity,
      unit: issue.unit,
      unitPriceBefore: issue.unitCost,
      unitPriceAfter: verifiedUnitPrice,
      valueBefore: issue.totalCost,
      valueAfter: round(Number(issue.quantity) * verifiedUnitPrice),
    },
  };
  console.log(JSON.stringify(plan, null, 2));

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to save this correction.");
    return;
  }

  const newFormula: any = existingCorrectFormula || await createNewFormulaVersion(String(formula._id), {
    items: (formula.items || []).map((item: any) => ({
      rawMaterial: String(item.rawMaterial) === String(legacyCalgon._id)
        ? String(activeCalgon._id)
        : String(item.rawMaterial),
      appliesToProduct: item.appliesToProduct ? String(item.appliesToProduct) : undefined,
      quantity: Number(item.quantity || 0),
      unit: String(item.rawMaterial) === String(legacyCalgon._id)
        ? activeCalgon.unit
        : item.unit,
      wastePercentage: Number(item.wastePercentage || 0),
      notes: item.notes || "",
    })),
    status: "Active",
    notes: [formula.notes, "Calgon reference corrected to the active El Co material record."].filter(Boolean).join("\n"),
  });

  await InventoryTransaction.updateOne(
    { _id: issue._id },
    {
      $set: {
        unitCost: verifiedUnitPrice,
        totalCost: round(Number(issue.quantity) * verifiedUnitPrice),
        notes: correctedIssueNotes,
      },
    },
  );

  const revalued: any = await revalueProductionBatchCost(String(batch._id));

  const [batchAfter, formulaAfter, consumptionAfter, issueAfter]: any[] = await Promise.all([
    ProductionBatch.findById(batch._id).lean(),
    Formula.findById(formula._id).lean(),
    MaterialConsumption.findOne({ productionBatch: batch._id }).lean(),
    InventoryTransaction.findById(issue._id).lean(),
  ]);
  const afterQuantities = quantitySnapshot(batchAfter, formulaAfter, consumptionAfter, issueAfter);
  if (hash(beforeQuantities) !== hash(afterQuantities)) {
    throw new Error("Safety verification failed: a production or stock quantity changed during the Calgon cost correction.");
  }

  console.log(JSON.stringify({
    applied: true,
    stockQuantitiesUnchanged: true,
    formula: {
      code: newFormula.code,
      version: newFormula.version,
      estimatedMaterialCost: newFormula.estimatedMaterialCost,
      estimatedTotalCost: newFormula.estimatedTotalCost,
    },
    batch: {
      batchNo: revalued.batchNo,
      materialCost: revalued.actualMaterialCost,
      totalCost: revalued.totalActualCost,
      costPerKg: revalued.costPerKg,
      costPerPack: revalued.costPerPack,
    },
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
