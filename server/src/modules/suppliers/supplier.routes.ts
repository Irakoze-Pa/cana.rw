import { Router } from "express";

import {
  createSupplierController,
  getSuppliersController,
  getSupplierByIdController,
  updateSupplierController,
  deleteSupplierController,
} from "./supplier.controller";

const router = Router();

router.post("/", createSupplierController);

router.get("/", getSuppliersController);

router.get("/:id", getSupplierByIdController);

router.put("/:id", updateSupplierController);

router.delete("/:id", deleteSupplierController);

export default router;