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

// Procurement owns supplier onboarding; Finance can maintain contact and
// commercial details because it also needs the supplier register for payments.
router.put("/:id", authorizeArea("procurement", "finance"), updateSupplierController);

router.delete("/:id", authorizeArea("procurement"), deleteSupplierController);

export default router;
