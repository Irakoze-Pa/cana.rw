import type { Request, Response } from "express";

import type {
  MaterialConsumptionStatus,
} from "./materialConsumption.model";

import {
  cancelMaterialConsumption,
  completeMaterialConsumption,
  createMaterialConsumption,
  getMaterialConsumptionByBatch,
  getMaterialConsumptionById,
  getMaterialConsumptionStats,
  getMaterialConsumptions,
  issueMaterialConsumption,
  returnMaterialConsumption,
  updateMaterialConsumption,
} from "./materialConsumption.service";

/**
 * =====================================================
 * CONSTANTS
 * =====================================================
 */

const MATERIAL_CONSUMPTION_STATUSES: MaterialConsumptionStatus[] = [
  "Draft",
  "Issued",
  "Partially Consumed",
  "Consumed",
  "Cancelled",
];

/**
 * =====================================================
 * ERROR HANDLER
 * =====================================================
 */

const handleControllerError = (
  res: Response,
  error: unknown
) => {
  console.error(
    "Material Consumption Controller Error:",
    error
  );

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  const lowerMessage = message.toLowerCase();

  /**
   * 404
   */
  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("does not exist")
  ) {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  /**
   * 409
   */
  if (
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("duplicate") ||
    lowerMessage.includes("already has") ||
    lowerMessage.includes("already issued")
  ) {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  /**
   * 400
   */
  if (
    lowerMessage.includes("cast to objectid") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("required") ||
    lowerMessage.includes("must be") ||
    lowerMessage.includes("cannot be") ||
    lowerMessage.includes("cannot change") ||
    lowerMessage.includes("quantity") ||
    lowerMessage.includes("reconciliation") ||
    lowerMessage.includes("only draft") ||
    lowerMessage.includes("only in progress") ||
    lowerMessage.includes("only be completed") ||
    lowerMessage.includes("locked") ||
    lowerMessage.includes("cannot be cancelled") ||
    lowerMessage.includes("cannot receive returns") ||
    lowerMessage.includes("cannot be completed") ||
    lowerMessage.includes("not allowed")
  ) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  /**
   * 500
   */
  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

/**
 * =====================================================
 * CREATE MATERIAL CONSUMPTION
 * =====================================================
 *
 * POST /api/material-consumptions
 */

export const createMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        productionOrder,
        productionBatch,
        notes,
      } = req.body;

      /**
       * Production Order
       */
      if (
        typeof productionOrder !== "string" ||
        !productionOrder.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Production Order is required.",
        });
      }

      /**
       * Production Batch
       */
      if (
        typeof productionBatch !== "string" ||
        !productionBatch.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Production Batch is required.",
        });
      }

      /**
       * Notes
       */
      if (
        notes !== undefined &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "notes must be a string.",
        });
      }

      const data =
        await createMaterialConsumption({
          productionOrder,
          productionBatch,
          notes,
        });

      return res.status(201).json({
        success: true,
        message:
          "Material Consumption created successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * GET ALL MATERIAL CONSUMPTIONS
 * =====================================================
 *
 * GET /api/material-consumptions
 */

export const getMaterialConsumptionsController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        status,
        productionOrder,
        productionBatch,
        search,
        page,
        limit,
      } = req.query;

      /**
       * -----------------------------------------------
       * QUERY
       * -----------------------------------------------
       */

      const query: {
        status?: MaterialConsumptionStatus;
        productionOrder?: string;
        productionBatch?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {};

      /**
       * -----------------------------------------------
       * STATUS
       * -----------------------------------------------
       */

      if (
        typeof status === "string"
      ) {
        if (
          !MATERIAL_CONSUMPTION_STATUSES.includes(
            status as MaterialConsumptionStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Invalid material consumption status. Allowed values: ${MATERIAL_CONSUMPTION_STATUSES.join(
                ", "
              )}.`,
          });
        }

        query.status =
          status as MaterialConsumptionStatus;
      }

      /**
       * -----------------------------------------------
       * PRODUCTION ORDER
       * -----------------------------------------------
       */

      if (
        typeof productionOrder === "string"
      ) {
        query.productionOrder =
          productionOrder;
      }

      /**
       * -----------------------------------------------
       * PRODUCTION BATCH
       * -----------------------------------------------
       */

      if (
        typeof productionBatch === "string"
      ) {
        query.productionBatch =
          productionBatch;
      }

      /**
       * -----------------------------------------------
       * SEARCH
       * -----------------------------------------------
       */

      if (
        typeof search === "string"
      ) {
        query.search = search.trim();
      }

      /**
       * -----------------------------------------------
       * PAGE
       * -----------------------------------------------
       */

      if (
        typeof page === "string"
      ) {
        const parsedPage =
          Number(page);

        if (
          !Number.isInteger(parsedPage) ||
          parsedPage <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "page must be a positive integer.",
          });
        }

        query.page = parsedPage;
      }

      /**
       * -----------------------------------------------
       * LIMIT
       * -----------------------------------------------
       */

      if (
        typeof limit === "string"
      ) {
        const parsedLimit =
          Number(limit);

        if (
          !Number.isInteger(parsedLimit) ||
          parsedLimit <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "limit must be a positive integer.",
          });
        }

        /**
         * Prevent extremely large queries.
         */
        if (parsedLimit > 100) {
          return res.status(400).json({
            success: false,
            message:
              "limit cannot be greater than 100.",
          });
        }

        query.limit = parsedLimit;
      }

      /**
       * -----------------------------------------------
       * GET
       * -----------------------------------------------
       */

      const data =
        await getMaterialConsumptions(
          query
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * GET MATERIAL CONSUMPTION STATS
 * =====================================================
 *
 * GET /api/material-consumptions/stats
 */

export const getMaterialConsumptionStatsController =
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const data =
        await getMaterialConsumptionStats();

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * GET MATERIAL CONSUMPTION BY BATCH
 * =====================================================
 *
 * GET /api/material-consumptions/batch/:productionBatchId
 */

export const getMaterialConsumptionByBatchController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        productionBatchId,
      } = req.params;

      if (
        typeof productionBatchId !== "string" ||
        !productionBatchId.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Production Batch ID is required.",
        });
      }

      const data =
        await getMaterialConsumptionByBatch(
          productionBatchId
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * GET MATERIAL CONSUMPTION BY ID
 * =====================================================
 *
 * GET /api/material-consumptions/:id
 */

export const getMaterialConsumptionByIdController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const data =
        await getMaterialConsumptionById(
          id
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * UPDATE MATERIAL CONSUMPTION
 * =====================================================
 *
 * PATCH /api/material-consumptions/:id
 *
 * ALLOWED:
 * - actualQuantity
 * - wasteQuantity
 * - lotNumber
 * - item notes
 * - general notes
 *
 * PROTECTED:
 * - standardQuantity
 * - issuedQuantity
 * - returnQuantity
 * - varianceQuantity
 * - variancePercentage
 * - status
 * - issuedBy
 * - consumedBy
 * - completedBy
 * - rawMaterial
 * - rawMaterialName
 * - rawMaterialCode
 * - unit
 */

export const updateMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const {
        items,
        notes,
        status,
        issuedBy,
        consumedBy,
        completedBy,
        issuedQuantity,
        returnQuantity,
        standardQuantity,
        varianceQuantity,
        variancePercentage,
      } = req.body;

      /**
       * -----------------------------------------------
       * PROTECTED TOP LEVEL FIELDS
       * -----------------------------------------------
       */

      if (status !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "status cannot be changed here. Use Issue, Return, Complete, or Cancel operations.",
        });
      }

      if (issuedBy !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "issuedBy cannot be changed here. Use Issue Materials.",
        });
      }

      if (consumedBy !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "consumedBy cannot be changed here. Use Complete Material Consumption.",
        });
      }

      if (completedBy !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "completedBy cannot be changed here. Use Complete Material Consumption.",
        });
      }

      if (issuedQuantity !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "issuedQuantity cannot be changed here. Use Issue Materials.",
        });
      }

      if (returnQuantity !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "returnQuantity cannot be changed here. Use Return Materials.",
        });
      }

      if (standardQuantity !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "standardQuantity cannot be changed after Material Consumption creation.",
        });
      }

      if (varianceQuantity !== undefined) {
        return res.status(400).json({
          success: false,
          message:
            "varianceQuantity is calculated automatically.",
        });
      }

      if (
        variancePercentage !==
        undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "variancePercentage is calculated automatically.",
        });
      }

      /**
       * -----------------------------------------------
       * ITEMS
       * -----------------------------------------------
       */

      if (
        items !== undefined &&
        !Array.isArray(items)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "items must be an array.",
        });
      }

      /**
       * -----------------------------------------------
       * NOTES
       * -----------------------------------------------
       */

      if (
        notes !== undefined &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "notes must be a string.",
        });
      }

      /**
       * -----------------------------------------------
       * VALIDATE ITEMS
       * -----------------------------------------------
       */

      if (Array.isArray(items)) {
        for (
          let index = 0;
          index < items.length;
          index++
        ) {
          const item =
            items[index];

          if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Item ${index + 1} must be an object.`,
            });
          }

          /**
           * Actual
           */

          if (
            item.actualQuantity !==
            undefined
          ) {
            if (
              typeof item.actualQuantity !==
                "number" ||
              !Number.isFinite(
                item.actualQuantity
              ) ||
              item.actualQuantity < 0
            ) {
              return res.status(400).json({
                success: false,
                message:
                  `Item ${
                    index + 1
                  }: actualQuantity must be a valid non-negative number.`,
              });
            }
          }

          /**
           * Waste
           */

          if (
            item.wasteQuantity !==
            undefined
          ) {
            if (
              typeof item.wasteQuantity !==
                "number" ||
              !Number.isFinite(
                item.wasteQuantity
              ) ||
              item.wasteQuantity < 0
            ) {
              return res.status(400).json({
                success: false,
                message:
                  `Item ${
                    index + 1
                  }: wasteQuantity must be a valid non-negative number.`,
              });
            }
          }

          /**
           * Lot
           */

          if (
            item.lotNumber !==
              undefined &&
            typeof item.lotNumber !==
              "string"
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Item ${
                  index + 1
                }: lotNumber must be a string.`,
            });
          }

          /**
           * Notes
           */

          if (
            item.notes !==
              undefined &&
            typeof item.notes !==
              "string"
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Item ${
                  index + 1
                }: notes must be a string.`,
            });
          }

          /**
           * Protected item fields
           */

          if (
            item.issuedQuantity !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "issuedQuantity cannot be changed here. Use Issue Materials.",
            });
          }

          if (
            item.returnQuantity !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "returnQuantity cannot be changed here. Use Return Materials.",
            });
          }

          if (
            item.standardQuantity !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "standardQuantity cannot be changed here.",
            });
          }

          if (
            item.varianceQuantity !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "varianceQuantity is calculated automatically.",
            });
          }

          if (
            item.variancePercentage !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "variancePercentage is calculated automatically.",
            });
          }

          /**
           * Raw material identity is locked
           */

          if (
            item.rawMaterial !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "rawMaterial cannot be changed after Material Consumption creation.",
            });
          }

          if (
            item.rawMaterialName !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "rawMaterialName cannot be changed after Material Consumption creation.",
            });
          }

          if (
            item.rawMaterialCode !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "rawMaterialCode cannot be changed after Material Consumption creation.",
            });
          }

          if (
            item.unit !==
              undefined
          ) {
            return res.status(400).json({
              success: false,
              message:
                "unit cannot be changed after Material Consumption creation.",
            });
          }
        }
      }

      /**
       * -----------------------------------------------
       * SAFE INPUT
       * -----------------------------------------------
       */

      const updateInput: {
        items?: Array<{
          actualQuantity?: number;
          wasteQuantity?: number;
          lotNumber?: string;
          notes?: string;
        }>;
        notes?: string;
      } = {};

      if (Array.isArray(items)) {
        updateInput.items =
          items.map((item) => ({
            ...(item.actualQuantity !==
            undefined
              ? {
                  actualQuantity:
                    item.actualQuantity,
                }
              : {}),

            ...(item.wasteQuantity !==
            undefined
              ? {
                  wasteQuantity:
                    item.wasteQuantity,
                }
              : {}),

            ...(item.lotNumber !==
            undefined
              ? {
                  lotNumber:
                    item.lotNumber,
                }
              : {}),

            ...(item.notes !==
            undefined
              ? {
                  notes:
                    item.notes,
                }
              : {}),
          }));
      }

      if (
        notes !== undefined
      ) {
        updateInput.notes =
          notes;
      }

      /**
       * -----------------------------------------------
       * UPDATE
       * -----------------------------------------------
       */

      const data =
        await updateMaterialConsumption(
          id,
          updateInput
        );

      return res.status(200).json({
        success: true,
        message:
          "Material Consumption updated successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * ISSUE MATERIALS
 * =====================================================
 *
 * POST /api/material-consumptions/:id/issue
 */

export const issueMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const {
        issuedBy,
        items,
        notes,
      } = req.body;

      /**
       * Issued By
       */

      if (
        issuedBy !== undefined &&
        typeof issuedBy !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "issuedBy must be a valid user ID.",
        });
      }

      /**
       * Items
       */

      if (
        items !== undefined &&
        !Array.isArray(items)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "items must be an array.",
        });
      }

      /**
       * Notes
       */

      if (
        notes !== undefined &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "notes must be a string.",
        });
      }

      /**
       * Validate issue items
       */

      if (Array.isArray(items)) {
        for (
          let index = 0;
          index < items.length;
          index++
        ) {
          const item =
            items[index];

          if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Issue item ${
                  index + 1
                } must be an object.`,
            });
          }

          if (
            typeof item.rawMaterial !==
              "string" ||
            !item.rawMaterial.trim()
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Issue item ${
                  index + 1
                }: rawMaterial is required.`,
            });
          }

          if (
            item.issuedQuantity !==
            undefined
          ) {
            if (
              typeof item.issuedQuantity !==
                "number" ||
              !Number.isFinite(
                item.issuedQuantity
              ) ||
              item.issuedQuantity <= 0
            ) {
              return res.status(400).json({
                success: false,
                message:
                  `Issue item ${
                    index + 1
                  }: issuedQuantity must be greater than zero.`,
              });
            }
          }

          if (
            item.lotNumber !==
              undefined &&
            typeof item.lotNumber !==
              "string"
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Issue item ${
                  index + 1
                }: lotNumber must be a string.`,
            });
          }

          if (
            item.notes !==
              undefined &&
            typeof item.notes !==
              "string"
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Issue item ${
                  index + 1
                }: notes must be a string.`,
            });
          }
        }
      }

      const data =
        await issueMaterialConsumption(
          id,
          {
            issuedBy,
            items,
            notes,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Materials issued successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * RETURN MATERIALS
 * =====================================================
 *
 * POST /api/material-consumptions/:id/return
 */

export const returnMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const {
        returnedBy,
        items,
        notes,
      } = req.body;

      /**
       * Returned By
       */

      if (
        returnedBy !== undefined &&
        typeof returnedBy !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "returnedBy must be a valid user ID.",
        });
      }

      /**
       * Items are required
       */

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one material return item is required.",
        });
      }

      /**
       * Notes
       */

      if (
        notes !== undefined &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "notes must be a string.",
        });
      }

      /**
       * Validate items
       */

      for (
        let index = 0;
        index < items.length;
        index++
      ) {
        const item =
          items[index];

        if (
          !item ||
          typeof item !== "object" ||
          Array.isArray(item)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Return item ${
                index + 1
              } must be an object.`,
          });
        }

        if (
          typeof item.rawMaterial !==
            "string" ||
          !item.rawMaterial.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Return item ${
                index + 1
              }: rawMaterial is required.`,
          });
        }

        if (
          typeof item.returnQuantity !==
            "number" ||
          !Number.isFinite(
            item.returnQuantity
          ) ||
          item.returnQuantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Return item ${
                index + 1
              }: returnQuantity must be greater than zero.`,
          });
        }

        if (
          item.notes !==
            undefined &&
          typeof item.notes !==
            "string"
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Return item ${
                index + 1
              }: notes must be a string.`,
          });
        }
      }

      const data =
        await returnMaterialConsumption(
          id,
          {
            returnedBy,
            items,
            notes,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Materials returned successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * COMPLETE MATERIAL CONSUMPTION
 * =====================================================
 *
 * POST /api/material-consumptions/:id/complete
 *
 * Material Consumption becomes "Consumed"
 * only after Production Batch is "Completed".
 */

export const completeMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const {
        completedBy,
        notes,
      } = req.body;

      /**
       * Completed By
       */

      if (
        completedBy !== undefined &&
        typeof completedBy !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "completedBy must be a valid user ID.",
        });
      }

      /**
       * Notes
       */

      if (
        notes !== undefined &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "notes must be a string.",
        });
      }

      /**
       * Complete
       */

      const data =
        await completeMaterialConsumption(
          id,
          {
            completedBy,
            notes,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Material Consumption completed successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };

/**
 * =====================================================
 * CANCEL MATERIAL CONSUMPTION
 * =====================================================
 *
 * PATCH /api/material-consumptions/:id/cancel
 */

export const cancelMaterialConsumptionController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string" ||
        !id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Material Consumption ID is required.",
        });
      }

      const data =
        await cancelMaterialConsumption(
          id
        );

      return res.status(200).json({
        success: true,
        message:
          "Material Consumption cancelled successfully.",
        data,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error
      );
    }
  };