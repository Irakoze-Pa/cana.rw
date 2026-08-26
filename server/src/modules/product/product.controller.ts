import { Request, Response } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.service";

/* =========================================================
   CREATE PRODUCT
========================================================= */

export const createProductController = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("CREATE PRODUCT BODY:", req.body);
    console.log("CREATE PRODUCT FILE:", req.file);

    const product = await createProduct(
      req.body,
      req.file
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create product",
    });
  }
};

/* =========================================================
   GET ALL PRODUCTS
========================================================= */

export const getProductsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const products = await getProducts();

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(
      "Get products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get products",
    });
  }
};

/* =========================================================
   GET PRODUCT BY ID
========================================================= */

export const getProductByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    const product =
      await getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(
      "Get product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get product",
    });
  }
};

/* =========================================================
   UPDATE PRODUCT
========================================================= */

export const updateProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    console.log(
      "UPDATE PRODUCT BODY:",
      req.body
    );

    console.log(
      "UPDATE PRODUCT FILE:",
      req.file
    );

    const product = await updateProduct(
      id,
      req.body,
      req.file
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update product",
    });
  }
};

/* =========================================================
   DELETE PRODUCT
========================================================= */

export const deleteProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    const product =
      await deleteProduct(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};