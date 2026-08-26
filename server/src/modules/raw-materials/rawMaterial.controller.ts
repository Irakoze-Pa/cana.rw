import {
  Request,
  Response,
} from "express";

import {
  createRawMaterial,
  getRawMaterials,
  getRawMaterialById,
  updateRawMaterial,
  deleteRawMaterial,
} from "./rawMaterial.service";

/**
 * =========================================================
 * HELPER
 * =========================================================
 */

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const isCastError = (
  error: unknown
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name ===
      "CastError"
  );
};

const isDuplicateKeyError = (
  error: unknown
): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code ===
      11000
  );
};

/**
 * =========================================================
 * CREATE RAW MATERIAL
 * =========================================================
 */
export const createRawMaterialController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const rawMaterial =
        await createRawMaterial(
          req.body
        );

      return res.status(201).json({
        success: true,
        message:
          "Raw material created successfully",
        data: rawMaterial,
      });
    } catch (error) {
      console.error(
        "Create raw material error:",
        error
      );

      /**
       * Duplicate material code
       */
      if (
        isDuplicateKeyError(error)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Raw material code already exists",
        });
      }

      /**
       * Business validation error
       */
      const message =
        getErrorMessage(
          error,
          "Failed to create raw material"
        );

      return res.status(400).json({
        success: false,
        message,
      });
    }
  };

/**
 * =========================================================
 * GET ALL RAW MATERIALS
 * =========================================================
 */
export const getRawMaterialsController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const materials =
        await getRawMaterials();

      return res.status(200).json({
        success: true,
        data: materials,
      });
    } catch (error) {
      console.error(
        "Get raw materials error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get raw materials",
      });
    }
  };

/**
 * =========================================================
 * GET RAW MATERIAL BY ID
 * =========================================================
 */
export const getRawMaterialByIdController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        req.params.id as string;

      /**
       * Invalid MongoDB ObjectId
       */
      if (
        !id ||
        !/^[a-fA-F0-9]{24}$/.test(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      const material =
        await getRawMaterialById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message:
            "Raw material not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: material,
      });
    } catch (error) {
      console.error(
        "Get raw material error:",
        error
      );

      if (isCastError(error)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to get raw material",
      });
    }
  };

/**
 * =========================================================
 * UPDATE RAW MATERIAL
 * =========================================================
 */
export const updateRawMaterialController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        req.params.id as string;

      /**
       * Validate MongoDB ID
       */
      if (
        !id ||
        !/^[a-fA-F0-9]{24}$/.test(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      const material =
        await updateRawMaterial(
          id,
          req.body
        );

      if (!material) {
        return res.status(404).json({
          success: false,
          message:
            "Raw material not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Raw material updated successfully",
        data: material,
      });
    } catch (error) {
      console.error(
        "Update raw material error:",
        error
      );

      /**
       * Duplicate material code
       */
      if (
        isDuplicateKeyError(error)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Raw material code already exists",
        });
      }

      /**
       * Invalid MongoDB ID
       */
      if (isCastError(error)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      /**
       * Business validation error
       */
      const message =
        getErrorMessage(
          error,
          "Failed to update raw material"
        );

      return res.status(400).json({
        success: false,
        message,
      });
    }
  };

/**
 * =========================================================
 * DELETE RAW MATERIAL
 * =========================================================
 */
export const deleteRawMaterialController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const id =
        req.params.id as string;

      /**
       * Validate MongoDB ID
       */
      if (
        !id ||
        !/^[a-fA-F0-9]{24}$/.test(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      const material =
        await deleteRawMaterial(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message:
            "Raw material not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Raw material deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete raw material error:",
        error
      );

      /**
       * Invalid MongoDB ID
       */
      if (isCastError(error)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid raw material ID",
        });
      }

      /**
       * Business rule error.
       *
       * Example:
       * Cannot delete raw material with stock.
       */
      const message =
        getErrorMessage(
          error,
          "Failed to delete raw material"
        );

      return res.status(400).json({
        success: false,
        message,
      });
    }
  };