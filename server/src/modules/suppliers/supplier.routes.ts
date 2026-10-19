import { Router } from "express";

import {
  createSupplierController,
  getSuppliersController,
  getSupplierByIdController,
  updateSupplierController,
  deleteSupplierController,
} from "./supplier.controller";
import { authorizeArea, protect } from "../../middleware/auth.middleware";

const router = Router();
router.use(protect);

router.post("/", authorizeArea("procurement"), createSupplierController);

router.get("/", authorizeArea("procurement", "finance"), getSuppliersController);

router.get("/:id", authorizeArea("procurement", "finance"), getSupplierByIdController);

router.put("/:id", authorizeArea("procurement"), updateSupplierController);

router.delete("/:id", authorizeArea("procurement"), deleteSupplierController);

export default router;
