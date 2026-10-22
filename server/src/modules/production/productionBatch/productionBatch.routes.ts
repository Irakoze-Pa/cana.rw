import { Router } from "express";

import {
  createProductionBatchController,
  getProductionBatchesController,
  getProductionBatchByIdController,
  getProductionBatchStatsController,
  updateProductionBatchController,
  deleteProductionBatchController,
  revalueProductionBatchCostController,
} from "./productionBatch.controller";
import { authorizeArea, protect } from "../../../middleware/auth.middleware";

const router = Router();
router.use(protect, authorizeArea("production"));

// =====================================================
// STATS
// =====================================================

router.get(
  "/stats",
  getProductionBatchStatsController
);

// =====================================================
// CREATE
// =====================================================

router.post(
  "/",
  createProductionBatchController
);

router.post(
  "/:id/revalue-cost",
  revalueProductionBatchCostController,
);

// =====================================================
// GET ALL
// =====================================================

router.get(
  "/",
  getProductionBatchesController
);

// =====================================================
// GET BY ID
// =====================================================

router.get(
  "/:id",
  getProductionBatchByIdController
);

// =====================================================
// UPDATE
// =====================================================

router.patch(
  "/:id",
  updateProductionBatchController
);

// =====================================================
// DELETE
// =====================================================

router.delete(
  "/:id",
  deleteProductionBatchController
);

export default router;
