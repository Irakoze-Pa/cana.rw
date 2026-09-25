import { Router } from "express";

import upload from "./product.upload";
import { authorizeRoles, protect } from "../../middleware/auth.middleware";
import Product from "./product.model";

import {
  createProductController,
  getProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from "./product.controller";

const router = Router();

// Customer prices are intentionally separate from the public catalogue. The
// server returns the wholesale amount as `price`, so totals cannot be spoofed
// by changing a browser-side value.
router.get("/customer-prices", protect, authorizeRoles("customer"), async (_req, res, next) => {
  try {
    const products = await Product.find({ status: "Active" }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: products.map(({ wholesalePrice, price, ...product }) => ({ ...product, price: Number(wholesalePrice ?? price), retailPrice: Number(price), priceTier: "wholesale" })) });
  } catch (error) { next(error); }
});

/* =========================================================
   GET ALL PRODUCTS
   GET /api/products
========================================================= */

router.get(
  "/",
  getProductsController
);

/* =========================================================
   GET PRODUCT BY ID
   GET /api/products/:id
========================================================= */

router.get(
  "/:id",
  getProductByIdController
);

/* =========================================================
   CREATE PRODUCT
   POST /api/products

   image → req.file
========================================================= */

router.post(
  "/",
  protect,
  authorizeRoles("admin", "staff"),
  upload.single("image"),
  createProductController
);

/* =========================================================
   UPDATE PRODUCT
   PUT /api/products/:id

   image → req.file
========================================================= */

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "staff"),
  upload.single("image"),
  updateProductController
);

/* =========================================================
   DELETE PRODUCT
   DELETE /api/products/:id
========================================================= */

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "staff"),
  deleteProductController
);

export default router;
