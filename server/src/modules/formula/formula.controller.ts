import {
  Request,
  Response,
} from "express";

import {
  createFormula,
  createNewFormulaVersion,
  getFormulas,
  getFormulaById,
  getFormulasByProduct,
  getActiveFormulaByProduct,
  updateFormula,
  deactivateFormula,
  deleteFormula,
} from "./formula.service";

// =====================================================
// CREATE
// =====================================================

export async function createFormulaController(
  req: Request,
  res: Response
) {
  try {
    const formula =
      await createFormula(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Formula created successfully.",
      data: formula,
    });
  } catch (error) {
    console.error(
      "Create Formula Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create formula.",
    });
  }
}

// =====================================================
// CREATE NEW VERSION
// =====================================================

export async function createNewFormulaVersionController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const formula =
      await createNewFormulaVersion(
        id,
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      message:
        "New formula version created successfully.",
      data: formula,
    });
  } catch (error) {
    console.error(
      "Create Formula Version Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create new formula version.",
    });
  }
}

// =====================================================
// GET ALL
// =====================================================

export async function getFormulasController(
  _req: Request,
  res: Response
) {
  try {
    const formulas =
      await getFormulas();

    return res.status(200).json({
      success: true,
      data: formulas,
    });
  } catch (error) {
    console.error(
      "Get Formulas Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch formulas.",
    });
  }
}

// =====================================================
// GET ONE
// =====================================================

export async function getFormulaByIdController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const formula =
      await getFormulaById(id);

    return res.status(200).json({
      success: true,
      data: formula,
    });
  } catch (error) {
    console.error(
      "Get Formula Error:",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Formula not found.",
    });
  }
}

// =====================================================
// GET BY PRODUCT
// =====================================================

export async function getFormulasByProductController(
  req: Request,
  res: Response
) {
  try {
    const productId =
      String(
        req.params.productId
      );

    if (
      !productId ||
      productId ===
        "undefined"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required.",
      });
    }

    const formulas =
      await getFormulasByProduct(
        productId
      );

    return res.status(200).json({
      success: true,
      data: formulas,
    });
  } catch (error) {
    console.error(
      "Get Product Formulas Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch product formulas.",
    });
  }
}

// =====================================================
// GET ACTIVE
// =====================================================

export async function getActiveFormulaController(
  req: Request,
  res: Response
) {
  try {
    const productId =
      String(
        req.params.productId
      );

    if (
      !productId ||
      productId ===
        "undefined"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required.",
      });
    }

    const formula =
      await getActiveFormulaByProduct(
        productId
      );

    return res.status(200).json({
      success: true,
      data: formula,
    });
  } catch (error) {
    console.error(
      "Get Active Formula Error:",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Active formula not found.",
    });
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateFormulaController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const formula =
      await updateFormula(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Formula updated successfully.",
      data: formula,
    });
  } catch (error) {
    console.error(
      "Update Formula Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update formula.",
    });
  }
}

// =====================================================
// DEACTIVATE
// =====================================================

export async function deactivateFormulaController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const formula =
      await deactivateFormula(
        id
      );

    return res.status(200).json({
      success: true,
      message:
        "Formula deactivated successfully.",
      data: formula,
    });
  } catch (error) {
    console.error(
      "Deactivate Formula Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to deactivate formula.",
    });
  }
}

// =====================================================
// DELETE
// =====================================================

export async function deleteFormulaController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const result =
      await deleteFormula(id);

    return res.status(200).json(
      result
    );
  } catch (error) {
    console.error(
      "Delete Formula Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete formula.",
    });
  }
}