import { Router } from "express";
import { protect, authorizeRoles, AuthRequest } from "../../middleware/auth.middleware";
import { UserRole } from "../../models/users";
import Balance from "./storeBalance.model";
import Transfer from "./storeTransfer.model";
import Product from "../product/product.model";

const router = Router();
router.use(protect, authorizeRoles(UserRole.ADMIN, UserRole.STAFF));

async function ensureProductionBalances() {
  const products = await Product.find({ status: "Active" }).select("_id stock").lean();
  await Promise.all(products.map((product) => Balance.updateOne({ product: product._id, store: "production" }, { $setOnInsert: { quantity: Number(product.stock || 0) } }, { upsert: true })));
}

router.get("/balances", async (_req, res, next) => {
  try {
    await ensureProductionBalances();
    const balances = await Balance.find().populate({ path: "product", select: "name code unit baseUnit packSizeKg category status", match: { status: "Active" } }).sort({ updatedAt: -1 });
    res.json({ data: balances.filter((balance) => balance.product) });
  } catch (error) { next(error); }
});

router.get("/transfers", async (_req, res, next) => {
  try { res.json({ data: await Transfer.find().populate("product", "name code unit baseUnit packSizeKg").populate("performedBy", "fullName").sort({ createdAt: -1 }).limit(100) }); }
  catch (error) { next(error); }
});


router.post("/transfers", async (req: AuthRequest, res, next) => {
  try {
    const { product, fromStore, toStore, quantity, notes } = req.body;
    const amount = Number(quantity);
    if (typeof product !== "string" || fromStore === toStore || !["production", "sales"].includes(fromStore) || !["production", "sales"].includes(toStore) || !Number.isFinite(amount) || amount <= 0) throw new Error("Select a product, different stores, and a positive transfer quantity.");
    await ensureProductionBalances();
    const source = await Balance.findOneAndUpdate({ product, store: fromStore, quantity: { $gte: amount } }, { $inc: { quantity: -amount } }, { new: true });
    if (!source) throw new Error("Insufficient stock in the source store for this transfer.");
    await Balance.findOneAndUpdate({ product, store: toStore }, { $inc: { quantity: amount } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const finishedProduct = await Product.findById(product).select("baseUnit");
    if (!finishedProduct) throw new Error("Finished product not found.");
    const reference = `FGT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const data = await Transfer.create({ product, fromStore, toStore, quantity: amount, unit: finishedProduct.baseUnit || "kg", reference, notes: typeof notes === "string" ? notes.trim() : "", performedBy: req.user!.id });
    res.status(201).json({ data });
  } catch (error) { next(error); }
});


export default router;
