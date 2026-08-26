import { Router } from "express";

import {
  createMaterialConsumptionController,
  getMaterialConsumptionsController,
  getMaterialConsumptionByIdController,
  getMaterialConsumptionByBatchController,
  updateMaterialConsumptionController,
  cancelMaterialConsumptionController,
  getMaterialConsumptionStatsController,
} from "./materialConsumption.controller";

const router = Router();

// =========================================================
// SPECIFIC GET ROUTES
// IMPORTANT:
// These MUST come before /:id
// =========================================================

// GET /api/material-consumptions/batch/:productionBatchId
router.get(
  "/batch/:productionBatchId",
  getMaterialConsumptionByBatchController
);

// GET /api/material-consumptions/stats
router.get(
  "/stats",
  getMaterialConsumptionStatsController
);

// =========================================================
// MAIN COLLECTION ROUTES
// =========================================================

// GET /api/material-consumptions
router.get(
  "/",
  getMaterialConsumptionsController
);

// POST /api/material-consumptions
router.post(
  "/",
  createMaterialConsumptionController
);

// =========================================================
// SINGLE CONSUMPTION
// =========================================================

// GET /api/material-consumptions/:id
router.get(
  "/:id",
  getMaterialConsumptionByIdController
);

// PUT /api/material-consumptions/:id
router.put(
  "/:id",
  updateMaterialConsumptionController
);

// PATCH /api/material-consumptions/:id/cancel
router.patch(
  "/:id/cancel",
  cancelMaterialConsumptionController
);

export default router;