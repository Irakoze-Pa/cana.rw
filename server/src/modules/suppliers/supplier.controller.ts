import { Request, Response } from "express";

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "./supplier.service";

type SupplierIdParams = {
  id: string;
};

export const createSupplierController = async (
  req: Request,
  res: Response
) => {
  try {
    const supplier = await createSupplier(req.body);

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSuppliersController = async (
  req: Request,
  res: Response
) => {
  try {
    const suppliers = await getSuppliers();

    return res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSupplierByIdController = async (
  req: Request<SupplierIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const supplier = await getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSupplierController = async (
  req: Request<SupplierIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const supplier = await updateSupplier(
      id,
      req.body
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSupplierController = async (
  req: Request<SupplierIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const supplier = await deleteSupplier(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
      data: supplier,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};