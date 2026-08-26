import {
  Request,
  Response,
} from "express";

import {
  createProductionBatch,
  getProductionBatches,
  getProductionBatchById,
  getBatchesByProductionOrder,
  getActiveProductionBatches,
  updateProductionBatch,
  deleteProductionBatch,
  ProductionBatchServiceError,
} from "./productionBatch.service";

// =====================================================
// ERROR HANDLER
// =====================================================

function handleProductionBatchError(
  error: unknown,
  res: Response,
  fallbackMessage: string
) {
  console.error(
    "Production Batch Error:",
    error
  );

  if (
    error instanceof
    ProductionBatchServiceError
  ) {
    return res
      .status(error.statusCode)
      .json({
        success: false,
        message: error.message,
      });
  }

  const mongoError =
    error as {
      code?: number;
      name?: string;
      message?: string;
      errors?: Record<
        string,
        {
          message?: string;
        }
      >;
    };

  if (
    mongoError?.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message:
        "A production batch with the same unique value already exists.",
    });
  }

  if (
    mongoError?.name ===
    "ValidationError"
  ) {
    const validationMessages =
      mongoError.errors
        ? Object.values(
            mongoError.errors
          )
            .map(
              (item) =>
                item?.message
            )
            .filter(Boolean)
            .join("; ")
        : "";

    return res.status(400).json({
      success: false,
      message:
        validationMessages ||
        mongoError.message ||
        "Production batch validation failed.",
    });
  }

  if (
    mongoError?.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid production batch data.",
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

export async function createProductionBatchController(
  req: Request,
  res: Response
) {
  try {
    const batch =
      await createProductionBatch(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Production batch created successfully.",
      data: batch,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to create production batch."
    );
  }
}

// =====================================================
// GET STATS
// =====================================================

export async function getProductionBatchStatsController(
  _req: Request,
  res: Response
) {
  try {
    const batches =
      await getProductionBatches();

    const safeBatches =
      Array.isArray(batches)
        ? batches
        : [];

    const total =
      safeBatches.length;

    const planned =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "Planned"
      ).length;

    const ready =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "Ready"
      ).length;

    const inProgress =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "In Progress"
      ).length;

    const paused =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "Paused"
      ).length;

    const completed =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "Completed"
      ).length;

    const cancelled =
      safeBatches.filter(
        (batch: any) =>
          batch.status ===
          "Cancelled"
      ).length;

    // Cancelled batches do not affect
    // production quantities.

    const activeBatches =
      safeBatches.filter(
        (batch: any) =>
          batch.status !==
          "Cancelled"
      );

    const plannedQuantity =
      activeBatches.reduce(
        (
          total: number,
          batch: any
        ) =>
          total +
          Number(
            batch.plannedQuantity || 0
          ),
        0
      );

    const actualQuantity =
      activeBatches.reduce(
        (
          total: number,
          batch: any
        ) =>
          total +
          Number(
            batch.actualQuantity || 0
          ),
        0
      );

    return res.status(200).json({
      success: true,
      data: {
        total,
        planned,
        ready,
        inProgress,
        paused,
        completed,
        cancelled,
        plannedQuantity,
        actualQuantity,
      },
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to fetch production batch statistics."
    );
  }
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionBatchesController(
  _req: Request,
  res: Response
) {
  try {
    const batches =
      await getProductionBatches();

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to fetch production batches."
    );
  }
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionBatchByIdController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(
        req.params.id || ""
      ).trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production batch ID is required.",
      });
    }

    const batch =
      await getProductionBatchById(
        id
      );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message:
          "Production batch not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to fetch production batch."
    );
  }
}

// =====================================================
// GET BY PRODUCTION ORDER
// =====================================================

export async function getBatchesByProductionOrderController(
  req: Request,
  res: Response
) {
  try {
    const productionOrderId =
      String(
        req.params.productionOrderId ||
          ""
      ).trim();

    if (
      !productionOrderId ||
      productionOrderId ===
        "undefined" ||
      productionOrderId ===
        "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production order ID is required.",
      });
    }

    const batches =
      await getBatchesByProductionOrder(
        productionOrderId
      );

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to fetch production order batches."
    );
  }
}

// =====================================================
// GET ACTIVE
// =====================================================

export async function getActiveProductionBatchesController(
  _req: Request,
  res: Response
) {
  try {
    const batches =
      await getActiveProductionBatches();

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to fetch active production batches."
    );
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateProductionBatchController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(
        req.params.id || ""
      ).trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production batch ID is required.",
      });
    }

    const batch =
      await updateProductionBatch(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Production batch updated successfully.",
      data: batch,
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to update production batch."
    );
  }
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionBatchController(
  req: Request,
  res: Response
) {
  try {
    const id =
      String(
        req.params.id || ""
      ).trim();

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production batch ID is required.",
      });
    }

    await deleteProductionBatch(
      id
    );

    return res.status(200).json({
      success: true,
      message:
        "Production batch deleted successfully.",
    });
  } catch (error: unknown) {
    return handleProductionBatchError(
      error,
      res,
      "Failed to delete production batch."
    );
  }
}