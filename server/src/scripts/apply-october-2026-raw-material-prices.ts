/** Applies the approved current planning prices and reorder thresholds from the raw-material register. */
import "dotenv/config";
import mongoose from "mongoose";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import Inventory from "../modules/inventory/inventory.model";

type PriceUpdate = { names: string[]; price?: number; minimumStock?: number };
const updates: PriceUpdate[] = [
  { names: ["Tylose 100"], price: 11000, minimumStock: 50 },
  { names: ["Whiting 20"], price: 300, minimumStock: 800 },
  { names: ["Whiting 2"], minimumStock: 100 },
  { names: ["Whiting 40"], price: 300, minimumStock: 500 },
  { names: ["Whiting 15"], price: 300, minimumStock: 100 },
  { names: ["Filler Powder"], price: 900, minimumStock: 25 },
  { names: ["Colorant Violet"], price: 30000, minimumStock: 0.5 },
  { names: ["Tylose 250"], price: 11000, minimumStock: 15 },
  { names: ["Marble grit– 2.5 mm", "Marble grit – 2.5 mm"], price: 300, minimumStock: 1000 },
  { names: ["Marble grit – 3 mm"], price: 300, minimumStock: 1000 },
  { names: ["Marble grit – 1.5 mm"], price: 300, minimumStock: 500 },
  { names: ["Marble grit– 0.5 mm", "Marble grit – 0.5 mm"], price: 300 },
  { names: ["Texanol"], price: 6000, minimumStock: 20 },
  { names: ["Indogel"], price: 6000, minimumStock: 20 },
  { names: ["Styrene Acrylic"], price: 3900, minimumStock: 700 },
  { names: ["Homopolymer"], price: 4600, minimumStock: 50 },
  { names: ["Acrylic Thickener"], price: 7000, minimumStock: 20 },
  { names: ["Vam Viova"], price: 3000, minimumStock: 240 },
  { names: ["Sodium Benzoate"], price: 3000, minimumStock: 20 },
  { names: ["Titanium"], price: 7500, minimumStock: 200 },
  { names: ["Calgon", "Calgon (SHMP)"], price: 6000, minimumStock: 20 },
  { names: ["Kerosene"], price: 3000, minimumStock: 20 },
  { names: ["Acticide"], price: 8000, minimumStock: 20 },
  { names: ["MPG"], price: 7500, minimumStock: 20 },
  { names: ["Antifoam"], price: 7000, minimumStock: 20 },
  { names: ["Ammonia", "Amonia Solution"], price: 3000, minimumStock: 20 },
  { names: ["PVA"], price: 7500, minimumStock: 200 },
  { names: ["Star Whiting / Caolin"], price: 350, minimumStock: 50 },
  { names: ["White Cement"], price: 1300, minimumStock: 200 },
  { names: ["Marble Sand"], price: 300, minimumStock: 2500 },
  { names: ["Indobo"], price: 5000 },
  { names: ["Imifuka"], price: 300 },
  { names: ["H2O"], price: 5, minimumStock: 2500 },
  { names: ["HPMC"], price: 11000, minimumStock: 2500 },
  { names: ["Stickers"], price: 11000 },
];

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  for (const update of updates) {
    const material = await RawMaterial.findOne({ name: { $in: update.names } });
    if (!material) throw new Error(`Material not found: ${update.names.join(" / ")}`);
    const set = { ...(update.price !== undefined ? { costPerUnit: update.price } : {}), ...(update.minimumStock !== undefined ? { minimumStock: update.minimumStock } : {}) };
    await RawMaterial.updateOne({ _id: material._id }, { $set: set });
    const inventory = await Inventory.findOne({ rawMaterial: material._id });
    if (inventory && update.minimumStock !== undefined) {
      const status = material.status !== "Active" ? "Inactive" : inventory.quantity <= 0 ? "Out of Stock" : inventory.quantity <= update.minimumStock ? "Low Stock" : "Available";
      await Inventory.updateOne({ _id: inventory._id }, { $set: { minimumStock: update.minimumStock, status } });
    }
    console.log(`Updated ${material.name}: ${update.price !== undefined ? `${update.price} RWF/${material.unit}` : "price unchanged"}${update.minimumStock !== undefined ? ` · minimum ${update.minimumStock} ${material.unit}` : ""}`);
  }
  await mongoose.disconnect();
};

run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
