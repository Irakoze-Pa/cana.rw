/**
 * Applies the physical count supplied on 1 October 2026.
 *
 * This is intentionally an inventory adjustment, not a direct balance edit:
 * every change remains visible in Stock Movements with its before/after value.
 * Run once with: npx ts-node --transpile-only src/scripts/apply-october-2026-raw-material-count.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import { adjustStock } from "../modules/inventory/inventory.service";

type Count = { name: string; quantity: number; packSizes?: number[]; unit?: string };

const counts: Count[] = [
  { name: "HPMC", quantity: 100, packSizes: [25] },
  { name: "White Cement", quantity: 125, packSizes: [40] },
  { name: "Ammonia", quantity: 920, unit: "kg" },
  { name: "Antifoam", quantity: 29, packSizes: [50], unit: "kg" },
  { name: "Indogel", quantity: 18, unit: "kg" },
  { name: "Marble grit – 1.5 mm", quantity: 4, packSizes: [50] },
  { name: "Marble grit – 3 mm", quantity: 100, packSizes: [50] },
  { name: "Marble grit– 0.5 mm", quantity: 450, packSizes: [50] },
  { name: "Marble grit– 2.5 mm", quantity: 0, packSizes: [50] },
  { name: "Titanium", quantity: 175, packSizes: [25] },
  { name: "Acrylic Thickener", quantity: 2737.8, packSizes: [240] },
  { name: "Acticide", quantity: 23, packSizes: [20], unit: "kg" },
  { name: "Calgon", quantity: 10, packSizes: [25], unit: "kg" },
  { name: "Colorant Violet", quantity: 0.7, packSizes: [1] },
  { name: "Filler Powder", quantity: 150, packSizes: [25] },
  { name: "Homopolymer", quantity: 130, packSizes: [25] },
  { name: "Kerosene", quantity: 0, packSizes: [5], unit: "kg" },
  { name: "MPG", quantity: 9, packSizes: [20], unit: "kg" },
  { name: "PVA", quantity: 1000, packSizes: [25] },
  { name: "Sodium Benzoate", quantity: 25, packSizes: [25] },
  { name: "Star Whiting / Caolin", quantity: 100, packSizes: [50] },
  { name: "Styrene Acrylic", quantity: 368, packSizes: [240] },
  { name: "Texanol", quantity: 6.7, packSizes: [20], unit: "kg" },
  { name: "Tylose 250", quantity: 9.5, packSizes: [25] },
  { name: "Whiting 15", quantity: 100, packSizes: [50] },
  { name: "Whiting 16", quantity: 1000 },
  { name: "Marble Sand", quantity: 9900, packSizes: [50] },
];

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  for (const count of counts) {
    const material = await RawMaterial.findOne({ name: count.name });
    if (!material) throw new Error(`Material not found: ${count.name}`);
    const inventory = await Inventory.findOne({ rawMaterial: material._id });
    if (!inventory) throw new Error(`Inventory not found: ${count.name}`);
    if (Number(inventory.reservedQuantity || 0) > count.quantity) throw new Error(`${count.name} has reserved stock above the counted balance.`);

    const alreadyApplied = await InventoryTransaction.exists({ rawMaterial: material._id, reason: "Physical stock count — 01 Oct 2026", quantityAfter: count.quantity });
    if (alreadyApplied) {
      console.log(`Skipped ${count.name}: count already applied.`);
      continue;
    }

    const unit = count.unit || material.unit;
    await RawMaterial.updateOne({ _id: material._id }, { $set: { unit, ...(count.packSizes ? { packSizes: count.packSizes } : {}) } });
    await Inventory.updateOne({ _id: inventory._id }, { $set: { unit } });
    await adjustStock({
      rawMaterial: material._id.toString(),
      newQuantity: count.quantity,
      reason: "Physical stock count — 01 Oct 2026",
      notes: `Counted balance and package configuration updated from the authorised raw-material stock register.${count.packSizes?.length ? ` Pack sizes: ${count.packSizes.join(", ")} ${unit}.` : ""}`,
    });
    console.log(`Updated ${count.name}: ${count.quantity} ${unit}`);
  }
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
