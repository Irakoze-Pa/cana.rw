import { Request, Response } from "express";

import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from "./purchaseOrder.service";

// =====================================================
// CREATE PURCHASE ORDER
// =====================================================

export async function createPurchaseOrderController(
  req: Request,
  res: Response
) {
  try {
    const purchaseOrder =
      await createPurchaseOrder(req.body);

    return res.status(201).json({
      success: true,
      message:
        "Purchase order created successfully.",
      data: purchaseOrder,
    });
  } catch (error: unknown) {
    console.error(
      "Create Purchase Order Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create purchase order.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

// =====================================================
// GET ALL PURCHASE ORDERS
// =====================================================

export async function getPurchaseOrdersController(
  _req: Request,
  res: Response
) {
  try {
    const purchaseOrders =
      await getPurchaseOrders();

    return res.status(200).json({
      success: true,
      data: purchaseOrders,
    });
  } catch (error: unknown) {
    console.error(
      "Get Purchase Orders Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch purchase orders.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

// =====================================================
// GET PURCHASE ORDER BY ID
// =====================================================

export async function getPurchaseOrderByIdController(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const purchaseOrder =
      await getPurchaseOrderById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error: unknown) {
    console.error(
      "Get Purchase Order Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch purchase order.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

// =====================================================
// UPDATE PURCHASE ORDER STATUS
// =====================================================

export async function updatePurchaseOrderStatusController(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const status = String(
      req.body.status ?? ""
    );

    // -------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------

    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase order ID is required.",
      });
    }

    // -------------------------------------------------
    // VALIDATE STATUS
    // -------------------------------------------------

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    // -------------------------------------------------
    // UPDATE STATUS
    // -------------------------------------------------

    const purchaseOrder =
      await updatePurchaseOrderStatus(
        id,
        status
      );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Purchase order status updated successfully.",
      data: purchaseOrder,
    });
  } catch (error: unknown) {
    console.error(
      "Update Purchase Order Status Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update purchase order status.";

    // -------------------------------------------------
    // NOT FOUND
    // -------------------------------------------------

    if (
      message ===
      "Purchase order not found."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    // -------------------------------------------------
    // INVALID MONGODB ID
    // -------------------------------------------------

    if (
      message.includes(
        "Cast to ObjectId failed"
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase order ID.",
      });
    }

    // -------------------------------------------------
    // SERVER ERROR
    // -------------------------------------------------

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

// =====================================================
// DELETE PURCHASE ORDER
// =====================================================

export async function deletePurchaseOrderController(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const purchaseOrder =
      await deletePurchaseOrder(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Purchase order deleted successfully.",
    });
  } catch (error: unknown) {
    console.error(
      "Delete Purchase Order Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete purchase order.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}