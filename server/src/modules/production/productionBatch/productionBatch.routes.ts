import { Router } from "express";

import {
  createProductionBatchController,
  getProductionBatchesController,
  getProductionBatchByIdController,
  getProductionBatchStatsController,
  updateProductionBatchController,
  deleteProductionBatchController,
} from "./productionBatch.controller";

const router = Router();

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