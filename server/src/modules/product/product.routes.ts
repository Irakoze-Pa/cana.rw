import { Router } from "express";

import upload from "./product.upload";
import { authorizeRoles, protect } from "../../middleware/auth.middleware";

import {
  createProductController,
  getProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from "./product.controller";

const router = Router();

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
