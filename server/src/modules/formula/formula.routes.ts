import {
  Router,
} from "express";

import {
  createFormulaController,
  createNewFormulaVersionController,
  getFormulasController,
  getFormulaByIdController,
  getFormulasByProductController,
  getActiveFormulaController,
  updateFormulaController,
  deactivateFormulaController,
  deleteFormulaController,
} from "./formula.controller";

const router =
  Router();

// =====================================================
// CREATE
// =====================================================

router.post(
  "/",
  createFormulaController
);

// =====================================================
// CREATE NEW VERSION
//
// POST /api/formulas/:id/new-version
// =====================================================

router.post(
  "/:id/new-version",
  createNewFormulaVersionController
);

// =====================================================
// GET ALL
// =====================================================

router.get(
  "/",
  getFormulasController
);

// =====================================================
// GET BY PRODUCT
// =====================================================

router.get(
  "/product/:productId",
  getFormulasByProductController
);

// =====================================================
// GET ACTIVE BY PRODUCT
// =====================================================

router.get(
  "/product/:productId/active",
  getActiveFormulaController
);

// =====================================================
// GET ONE
// =====================================================

router.get(
  "/:id",
  getFormulaByIdController
);

// =====================================================
// UPDATE
// =====================================================

router.put(
  "/:id",
  updateFormulaController
);

// =====================================================
// DEACTIVATE
// =====================================================

router.patch(
  "/:id/deactivate",
  deactivateFormulaController
);

// =====================================================
// DELETE
// =====================================================

router.delete(
  "/:id",
  deleteFormulaController
);

export default router;