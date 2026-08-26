import { Router } from "express";

import {
  createProductionOrderController,
  getProductionOrdersController,
  getProductionOrderByIdController,
  getProductionOrderStatsController,
  updateProductionOrderController,
  deleteProductionOrderController,
} from "./productionOrder.controller";

// =====================================================
// ROUTER
// =====================================================

const router = Router();

// =====================================================
// PRODUCTION ORDER ROUTES
// =====================================================

// GET STATS
router.get(
  "/stats",
  getProductionOrderStatsController
);

// CREATE
router.post(
  "/",
  createProductionOrderController
);

// GET ALL
router.get(
  "/",
  getProductionOrdersController
);

// GET BY ID
router.get(
  "/:id",
  getProductionOrderByIdController
);

// UPDATE
router.patch(
  "/:id",
  updateProductionOrderController
);

// DELETE
router.delete(
  "/:id",
  deleteProductionOrderController
);

export default router;