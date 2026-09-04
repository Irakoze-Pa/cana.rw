import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import Product from "../modules/product/product.model";
import FinishedGoodsStoreBalance from "../modules/finishedGoods/storeBalance.model";

dotenv.config();

type ProductStock = {
  name: string;
  quantity: number;
  packLabel: string;
  packSizeKg: number;
};

const notebookStocks: ProductStock[] = [
  { name: "CANA BUDGET", quantity: 520, packLabel: "20L", packSizeKg: 20 },
  { name: "CANA VINYL MATT", quantity: 580, packLabel: "20L", packSizeKg: 20 },
  { name: "CANA WEATHER GUARD", quantity: 980, packLabel: "20L", packSizeKg: 20 },
  { name: "CANA SILK VINYL", quantity: 660, packLabel: "20L", packSizeKg: 20 },
  { name: "CANA WALL PLASTER", quantity: 2100, packLabel: "25kg", packSizeKg: 25 },
  { name: "CANA WOOD GLUE", quantity: 192, packLabel: "4L", packSizeKg: 4 },
];

const wallMasterVariants: ProductStock[] = [
  { name: "CANA WALL MASTER 2.5", quantity: 3000, packLabel: "30kg", packSizeKg: 30 },
  { name: "CANA WALL MASTER 3", quantity: 4140, packLabel: "30kg", packSizeKg: 30 },
  { name: "CANA WALL MASTER 0", quantity: 1560, packLabel: "30kg", packSizeKg: 30 },
];

async function setTotalStock(product: any, quantity: number) {
  const salesBalance = await FinishedGoodsStoreBalance.findOne({ product: product._id, store: "sales" }).lean();
  const salesQuantity = Number(salesBalance?.quantity || 0);
  if (salesQuantity > quantity) {
    throw new Error(`${product.name}: the sales store (${salesQuantity} kg) is higher than the requested total (${quantity} kg).`);
  }

  await Promise.all([
    Product.updateOne({ _id: product._id }, { $set: { stock: quantity } }),
    FinishedGoodsStoreBalance.findOneAndUpdate(
      { product: product._id, store: "production" },
      { $set: { quantity: quantity - salesQuantity } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);
}

async function sync() {
  await connectDB();

  for (const stock of notebookStocks) {
    const product = await Product.findOne({ name: stock.name });
    if (!product) throw new Error(`Cannot find ${stock.name}.`);
    product.unit = stock.packLabel;
    product.packSizeKg = stock.packSizeKg;
    product.baseUnit = "kg";
    await product.save();
    await setTotalStock(product, stock.quantity);
  }

  const genericWallMaster = await Product.findOne({ name: "CANA WALL MASTER" });
  if (!genericWallMaster) throw new Error("Cannot find the existing CANA WALL MASTER product.");

  for (const [index, stock] of wallMasterVariants.entries()) {
    const product = await Product.findOneAndUpdate(
      { name: stock.name },
      {
        $setOnInsert: {
          code: `WM-${["2-5", "3", "0"][index]}`,
          category: genericWallMaster.category,
          price: genericWallMaster.price,
          description: genericWallMaster.description || "Wall Master paint.",
          image: genericWallMaster.image || "",
          trackBatch: true,
        },
        $set: {
          status: "Active",
          unit: stock.packLabel,
          packSizeKg: stock.packSizeKg,
          densityKgPerL: undefined,
          baseUnit: "kg",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!product) throw new Error(`Cannot create ${stock.name}.`);
    await setTotalStock(product, stock.quantity);
  }

  // Preserve the historic generic SKU but remove it from new stock selections.
  const genericSales = await FinishedGoodsStoreBalance.findOne({ product: genericWallMaster._id, store: "sales" }).lean();
  const genericSalesQuantity = Number(genericSales?.quantity || 0);
  await Product.updateOne({ _id: genericWallMaster._id }, { $set: { status: "Inactive", stock: genericSalesQuantity } });
  await FinishedGoodsStoreBalance.findOneAndUpdate(
    { product: genericWallMaster._id, store: "production" },
    { $set: { quantity: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log("Finished-goods notebook quantities synced. Wall Master variants were created as separate products.");
}

sync()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
