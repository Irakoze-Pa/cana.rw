import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User, { Company, UserRole, UserStatus } from "../models/users";
import Supplier from "../modules/suppliers/supplier.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import Product from "../modules/product/product.model";
import Formula from "../modules/formula/formula.model";
import { hashPassword } from "../utils/password";

dotenv.config();

async function seed() {
  if (process.env.SEED_DEMO_DATA !== "true") {
    throw new Error("Refusing to seed data. Set SEED_DEMO_DATA=true in server/.env for an intentional local demo setup.");
  }

  await connectDB();
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const admin = await User.findOneAndUpdate(
    { phone: "+250700000000" },
    { $setOnInsert: { fullName: "CANA Administrator", phone: "+250700000000", email: "admin@cana.local", password: await hashPassword(password), role: UserRole.ADMIN, company: Company.CANA_GROUP, status: UserStatus.ACTIVE, permissions: [] } },
    { upsert: true, new: true }
  );
  const supplier = await Supplier.findOneAndUpdate(
    { code: "DEMO-SUP" },
    { $setOnInsert: { name: "CANA Demo Chemical Supplies", code: "DEMO-SUP", contactPerson: "Supply Team", phone: "+250700000001", email: "supply@example.test", country: "Rwanda", paymentTerms: "30 days", status: "Active" } },
    { upsert: true, new: true }
  );
  const rawMaterial = await RawMaterial.findOneAndUpdate(
    { code: "TIO2-DEMO" },
    { $setOnInsert: { name: "Titanium Dioxide", code: "TIO2-DEMO", category: "Pigment", unit: "kg", quantity: 0, reservedQuantity: 0, availableQuantity: 0, minimumStock: 100, costPerUnit: 12.5, supplier: supplier._id, status: "Active" } },
    { upsert: true, new: true }
  );
  const product = await Product.findOneAndUpdate(
    { code: "INT-WHT-DEMO" },
    { $setOnInsert: { name: "CANA Interior White", code: "INT-WHT-DEMO", category: "Paint", price: 35, stock: 0, unit: "bucket", description: "Demo product for the CANA production workflow.", status: "Active", trackBatch: true } },
    { upsert: true, new: true }
  );
  await Formula.findOneAndUpdate(
    { product: product._id, code: "INT-WHT-DEMO", version: 1 },
    { $setOnInsert: { product: product._id, name: "Interior White Base", code: "INT-WHT-DEMO", version: 1, batchSize: 10, batchUnit: "bucket", items: [{ rawMaterial: rawMaterial._id, quantity: 2, unit: "kg", wastePercentage: 2 }], laborCost: 15, energyCost: 5, otherCost: 2, estimatedMaterialCost: 25, estimatedTotalCost: 47, status: "Active", notes: "Demo formula" } },
    { upsert: true, new: true }
  );
  console.log("Demo setup complete.");
  console.log(`Admin login: ${admin.phone} / ${password}`);
  console.log("Next: receive a purchase order for TIO2-DEMO, then create a production order using INT-WHT-DEMO.");
}

seed().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
