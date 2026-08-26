import { Request, Response } from "express";

import {
  createProductionOrder,
  getProductionOrders,
  getProductionOrderById,
  getProductionOrderStats,
  updateProductionOrder,
  deleteProductionOrder,
  ProductionOrderServiceError,
} from "./productionOrder.service";

// =====================================================
// ERROR HANDLER
// =====================================================

function handleProductionOrderError(
  error: unknown,
  res: Response,
  fallbackMessage: string
) {
  console.error(
    "Production Order Error:",
    error
  );

  if (
    error instanceof ProductionOrderServiceError
  ) {
    return res
      .status(error.statusCode)
      .json({
        success: false,
        message: error.message,
      });
  }

  const mongooseError =
    error as {
      code?: number;
      name?: string;
      message?: string;
    };

  // Duplicate key
  if (
    mongooseError?.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message:
        "A production order with the same unique value already exists.",
    });
  }

  // Mongoose validation
  if (
    mongooseError?.name ===
    "ValidationError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        mongooseError.message ||
        "Production order validation failed.",
    });
  }

  // Cast error
  if (
    mongooseError?.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid production order data.",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

// =====================================================
// CREATE
// =====================================================

export async function createProductionOrderController(
  req: Request,
  res: Response
) {
  try {
    const productionOrder =
      await createProductionOrder(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Production order created successfully.",
      data: productionOrder,
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to create production order."
    );
  }
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionOrdersController(
  _req: Request,
  res: Response
) {
  try {
    const productionOrders =
      await getProductionOrders();

    return res.status(200).json({
      success: true,
      data: productionOrders,
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to fetch production orders."
    );
  }
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionOrderByIdController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id || "").trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production order ID is required.",
      });
    }

    const productionOrder =
      await getProductionOrderById(id);

    if (!productionOrder) {
      return res.status(404).json({
        success: false,
        message:
          "Production order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: productionOrder,
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to fetch production order."
    );
  }
}

// =====================================================
// STATS
// =====================================================

export async function getProductionOrderStatsController(
  _req: Request,
  res: Response
) {
  try {
    const stats =
      await getProductionOrderStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to fetch production order statistics."
    );
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateProductionOrderController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id || "").trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production order ID is required.",
      });
    }

    const productionOrder =
      await updateProductionOrder(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Production order updated successfully.",
      data: productionOrder,
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to update production order."
    );
  }
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionOrderController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(req.params.id || "").trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production order ID is required.",
      });
    }

    await deleteProductionOrder(id);

    return res.status(200).json({
      success: true,
      message:
        "Production order deleted successfully.",
    });
  } catch (error: unknown) {
    return handleProductionOrderError(
      error,
      res,
      "Failed to delete production order."
    );
  }
}