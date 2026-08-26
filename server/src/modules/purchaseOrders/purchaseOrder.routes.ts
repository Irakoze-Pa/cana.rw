import { Router } from "express";

import {
  createPurchaseOrderController,
  getPurchaseOrdersController,
  getPurchaseOrderByIdController,
  updatePurchaseOrderStatusController,
  deletePurchaseOrderController,
} from "./purchaseOrder.controller";

const router = Router();

// =====================================================
// CREATE PURCHASE ORDER
// =====================================================

router.post(
  "/",
  createPurchaseOrderController
);

// =====================================================
// GET ALL PURCHASE ORDERS
// =====================================================

router.get(
  "/",
  getPurchaseOrdersController
);

// =====================================================
// GET PURCHASE ORDER BY ID
// =====================================================

router.get(
  "/:id",
  getPurchaseOrderByIdController
);

// =====================================================
// UPDATE PURCHASE ORDER STATUS
// =====================================================

router.patch(
  "/:id/status",
  updatePurchaseOrderStatusController
);

// =====================================================
// DELETE PURCHASE ORDER
// =====================================================

router.delete(
  "/:id",
  deletePurchaseOrderController
);

export default router;