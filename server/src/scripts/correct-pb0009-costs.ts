/** One-off audited correction for PB-2026-0009 material issue prices. */
import "dotenv/config";
import mongoose from "mongoose";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import RawMaterialConsumption from "../modules/production/materialConsumption/materialConsumption.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import Inventory from "../modules/inventory/inventory.model";
import Formula from "../modules/formula/formula.model";
import Product from "../modules/product/product.model";

const corrections = [
  { label: "Titanium", pattern: /titanium/i, unitCost: 7500 },
  { label: "Texanol", pattern: /texanol/i, unitCost: 7500 },
  { label: "Stickers", pattern: /sticker/i, unitCost: 400 },
];

const round = (value: number) => Number(value.toFixed(2));

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const apply = process.argv.includes("--apply");
  const batch: any = await ProductionBatch.findOne({
    $or: [{ batchNo: "PB-2026-0009" }, { batchNumber: "PB-2026-0009" }],
  });
  if (!batch) throw new Error("PB-2026-0009 was not found.");
  const consumption: any = await RawMaterialConsumption.findOne({
    productionBatch: batch._id,
    status: { $ne: "Cancelled" },
  }).lean();
  if (!consumption) throw new Error("PB-2026-0009 has no active material consumption record.");

  const matched = corrections.map((correction) => {
    const items = (consumption.items || []).filter((item: any) =>
      correction.pattern.test(`${item.rawMaterialName || ""} ${item.rawMaterialCode || ""}`),
    );
    if (!items.length) throw new Error(`${correction.label} was not found in PB-2026-0009 consumption.`);
    return { ...correction, items };
  });

  const before: any[] = [];
  for (const correction of matched) {
    for (const item of correction.items) {
      const transactions: any[] = await InventoryTransaction.find({
        productionBatch: batch._id,
        rawMaterial: item.rawMaterial,
        type: { $in: ["Production Issue", "Production Return"] },
      });
      if (!transactions.length) {
        throw new Error(`${correction.label} has no production issue transaction in PB-2026-0009.`);
      }
      for (const transaction of transactions) {
        before.push({
          material: item.rawMaterialName,
          transaction: transaction._id,
          quantity: transaction.quantity,
          oldUnitCost: transaction.unitCost,
          oldTotalCost: transaction.totalCost,
          newUnitCost: correction.unitCost,
          newTotalCost: round(Number(transaction.quantity || 0) * correction.unitCost),
        });
        if (apply) {
          transaction.unitCost = correction.unitCost;
          transaction.totalCost = round(Number(transaction.quantity || 0) * correction.unitCost);
          await transaction.save();
        }
      }
    }
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", batch: batch.batchNo, corrections: before }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const transactions: any[] = await InventoryTransaction.find({
    productionBatch: batch._id,
    type: { $in: ["Production Issue", "Production Return"] },
  }).lean();
  const inventories: any[] = await Inventory.find({
    rawMaterial: { $in: transactions.map((transaction) => transaction.rawMaterial) },
  }).lean();
  const inventoryCost = new Map(
    inventories.map((inventory) => [String(inventory.rawMaterial), Number(inventory.averageCostPerUnit || 0)]),
  );
  const materialCost = transactions.reduce((sum, transaction) => {
    const totalCost = Number(transaction.totalCost || 0) > 0
      ? Number(transaction.totalCost)
      : Number(transaction.quantity || 0) * Number(inventoryCost.get(String(transaction.rawMaterial)) || 0);
    return sum + (transaction.type === "Production Return" ? -1 : 1) * totalCost;
  }, 0);
  const [formula, product]: any[] = await Promise.all([
    Formula.findById(batch.formula).select("laborCost energyCost otherCost").lean(),
    Product.findById(batch.product).select("baseUnit packSizeKg").lean(),
  ]);
  const labor = Number(batch.allocatedLaborCost || formula?.laborCost || 0);
  const energy = Number(batch.allocatedEnergyCost || formula?.energyCost || 0);
  const other = Number(batch.allocatedOtherCost || formula?.otherCost || 0);
  const total = Math.max(0, materialCost + labor + energy + other);
  const output = Number(batch.actualQuantity || 0);
  const perKg = output > 0 ? total / output : 0;
  const packSize = product?.baseUnit === "kg" ? Number(product.packSizeKg || 0) : 0;
  batch.actualMaterialCost = round(Math.max(0, materialCost));
  batch.totalActualCost = round(total);
  batch.costPerKg = round(perKg);
  batch.costPerPack = round(perKg * packSize);
  batch.costedAt = new Date();
  await batch.save();

  console.log(JSON.stringify({
    mode: "applied",
    batch: batch.batchNo,
    corrections: before,
    totals: {
      actualMaterialCost: batch.actualMaterialCost,
      totalActualCost: batch.totalActualCost,
      costPerKg: batch.costPerKg,
      costPerPack: batch.costPerPack,
    },
  }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
