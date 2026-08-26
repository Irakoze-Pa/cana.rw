import { Request, Response } from "express";
import mongoose from "mongoose";

import inventoryService from "./inventory.service";

// =========================================================
// HELPERS
// =========================================================

const getErrorMessage = (
  error: unknown
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
};

const isDuplicateKeyError = (
  error: unknown
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
};

const isValidObjectId = (
  value: string
): boolean => {
  return mongoose.Types.ObjectId.isValid(value);
};

// =========================================================
// CREATE INVENTORY
// =========================================================

export const createInventory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory =
      await inventoryService.createInventory(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Inventory created successfully.",
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Create Inventory Error:",
      error
    );

    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message:
          "Inventory already exists for this raw material.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// GET ALL INVENTORY
// =========================================================

export const getInventory = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory =
      await inventoryService.getInventory();

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Get Inventory Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// GET INVENTORY BY ID
// =========================================================

export const getInventoryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid inventory ID.",
      });
      return;
    }

    const inventory =
      await inventoryService.getInventoryById(
        id
      );

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Get Inventory By ID Error:",
      error
    );

    const message =
      getErrorMessage(error);

    if (
      message ===
      "Inventory not found."
    ) {
      res.status(404).json({
        success: false,
        message,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message,
    });
  }
};

// =========================================================
// GET INVENTORY BY RAW MATERIAL
// =========================================================

export const getInventoryByRawMaterial =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const rawMaterialId = String(
        req.params.rawMaterialId
      );

      if (
        !isValidObjectId(rawMaterialId)
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID.",
        });
        return;
      }

      const inventory =
        await inventoryService.getInventoryByRawMaterial(
          rawMaterialId
        );

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error(
        "Get Inventory By Raw Material Error:",
        error
      );

      const message =
        getErrorMessage(error);

      if (
        message ===
        "Inventory not found for this raw material."
      ) {
        res.status(404).json({
          success: false,
          message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message,
      });
    }
  };

// =========================================================
// GET INVENTORY SUMMARY
// =========================================================

export const getInventorySummary =
  async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const summary =
        await inventoryService.getInventorySummary();

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error(
        "Get Inventory Summary Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// ADD STOCK
// =========================================================

export const addStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory =
      await inventoryService.addStock(
        req.body
      );

    res.status(200).json({
      success: true,
      message:
        "Stock added successfully.",
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Add Stock Error:",
      error
    );

    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message:
          "Inventory already exists for this raw material.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// REMOVE STOCK
// =========================================================

export const removeStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory =
      await inventoryService.removeStock(
        req.body
      );

    res.status(200).json({
      success: true,
      message:
        "Stock removed successfully.",
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Remove Stock Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// ADJUST STOCK
// =========================================================

export const adjustStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inventory =
      await inventoryService.adjustStock(
        req.body
      );

    res.status(200).json({
      success: true,
      message:
        "Inventory adjusted successfully.",
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Adjust Stock Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// GET TRANSACTIONS
// =========================================================

export const getInventoryTransactions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const transactions =
        await inventoryService.getInventoryTransactions(
          {
            rawMaterial:
              req.query.rawMaterial
                ? String(
                    req.query.rawMaterial
                  )
                : undefined,

            inventory:
              req.query.inventory
                ? String(
                    req.query.inventory
                  )
                : undefined,

            type:
              req.query.type
                ? String(
                    req.query.type
                  ) as any
                : undefined,

            startDate:
              req.query.startDate
                ? new Date(
                    String(
                      req.query.startDate
                    )
                  )
                : undefined,

            endDate:
              req.query.endDate
                ? new Date(
                    String(
                      req.query.endDate
                    )
                  )
                : undefined,

            limit:
              req.query.limit
                ? Number(
                    req.query.limit
                  )
                : undefined,

            skip:
              req.query.skip
                ? Number(
                    req.query.skip
                  )
                : undefined,
          }
        );

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error(
        "Get Inventory Transactions Error:",
        error
      );

      res.status(400).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// GET RECENT TRANSACTIONS
// =========================================================

export const getRecentTransactions =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const requestedLimit = Number(
        req.query.limit ?? 10
      );

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
        requestedLimit > 0
          ? Math.min(
              requestedLimit,
              100
            )
          : 10;

      const transactions =
        await inventoryService.getRecentTransactions(
          limit
        );

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error(
        "Get Recent Transactions Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// GET LOW STOCK
// =========================================================

export const getLowStockInventory =
  async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const inventory =
        await inventoryService.getLowStockInventory();

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error(
        "Get Low Stock Inventory Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// GET OUT OF STOCK
// =========================================================

export const getOutOfStockInventory =
  async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const inventory =
        await inventoryService.getOutOfStockInventory();

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error(
        "Get Out Of Stock Inventory Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// RESERVE STOCK
// =========================================================

export const reserveStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawMaterialId = String(
      req.body.rawMaterial
    );

    const quantity = Number(
      req.body.quantity
    );

    if (
      !isValidObjectId(
        rawMaterialId
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid raw material ID.",
      });
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "Reservation quantity must be greater than 0.",
      });
      return;
    }

    const inventory =
      await inventoryService.reserveStock(
        rawMaterialId,
        quantity
      );

    res.status(200).json({
      success: true,
      message:
        "Stock reserved successfully.",
      data: inventory,
    });
  } catch (error) {
    console.error(
      "Reserve Stock Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// =========================================================
// RELEASE RESERVED STOCK
// =========================================================

export const releaseReservedStock =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const rawMaterialId = String(
        req.body.rawMaterial
      );

      const quantity = Number(
        req.body.quantity
      );

      if (
        !isValidObjectId(
          rawMaterialId
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID.",
        });
        return;
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Release quantity must be greater than 0.",
        });
        return;
      }

      const inventory =
        await inventoryService.releaseReservedStock(
          rawMaterialId,
          quantity
        );

      res.status(200).json({
        success: true,
        message:
          "Reserved stock released successfully.",
        data: inventory,
      });
    } catch (error) {
      console.error(
        "Release Reserved Stock Error:",
        error
      );

      res.status(400).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  };

// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  createInventory,
  getInventory,
  getInventoryById,
  getInventoryByRawMaterial,
  getInventorySummary,
  addStock,
  removeStock,
  adjustStock,
  getInventoryTransactions,
  getRecentTransactions,
  getLowStockInventory,
  getOutOfStockInventory,
  reserveStock,
  releaseReservedStock,
};