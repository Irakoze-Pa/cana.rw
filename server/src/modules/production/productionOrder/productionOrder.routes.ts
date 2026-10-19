import { Router } from "express";

import {
  createProductionOrderController,
  getProductionOrdersController,
  getProductionOrderByIdController,
  getProductionOrderStatsController,
  updateProductionOrderController,
  deleteProductionOrderController,
} from "./productionOrder.controller";
import { authorizeArea, protect } from "../../../middleware/auth.middleware";

// =====================================================
// ROUTER
// =====================================================

const router = Router();
router.use(protect, authorizeArea("production"));

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
