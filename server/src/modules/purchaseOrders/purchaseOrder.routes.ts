import { Router } from "express";

import {
  createPurchaseOrderController,
  getPurchaseOrdersController,
  getPurchaseOrderByIdController,
  updatePurchaseOrderController,
  updatePurchaseOrderStatusController,
  deletePurchaseOrderController,
} from "./purchaseOrder.controller";
import { authorizeArea, protect } from "../../middleware/auth.middleware";

const router = Router();
router.use(protect);

// =====================================================
// CREATE PURCHASE ORDER
// =====================================================

router.post(
  "/",
  authorizeArea("procurement"),
  createPurchaseOrderController
);

// =====================================================
// GET ALL PURCHASE ORDERS
// =====================================================

router.get(
  "/",
  authorizeArea("procurement", "finance"),
  getPurchaseOrdersController
);

// =====================================================
// GET PURCHASE ORDER BY ID
// =====================================================

router.get(
  "/:id",
  authorizeArea("procurement", "finance"),
  getPurchaseOrderByIdController
);

// =====================================================
// UPDATE PURCHASE ORDER STATUS
// =====================================================

router.patch(
  "/:id/status",
  authorizeArea("procurement"),
  updatePurchaseOrderStatusController
);

router.patch(
  "/:id",
  authorizeArea("procurement"),
  updatePurchaseOrderController
);

// =====================================================
// DELETE PURCHASE ORDER
// =====================================================

router.delete(
  "/:id",
  authorizeArea("procurement"),
  deletePurchaseOrderController
);

export default router;
