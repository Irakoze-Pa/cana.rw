import { Response } from "express";
import mongoose from "mongoose";

import Quotation from "./quotation.model";
import { createSalesOrder } from "../sales/salesOrder.service";

import type {
  AuthRequest,
} from "../../middleware/auth.middleware";

/*
==========================================
CREATE QUOTATION
==========================================
*/

export const createQuotation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    const {
      items,
      message,
    } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product is required.",
      });
    }

    for (const item of items) {
      if (
        !item.product ||
        !mongoose.isValidObjectId(
          item.product
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      if (
        !item.quantity ||
        Number(item.quantity) < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be at least 1.",
        });
      }

      if (!item.unit) {
        return res.status(400).json({
          success: false,
          message:
            "Product unit is required.",
        });
      }
    }

    const quotation =
      await Quotation.create({
        customer: req.user.id,

        items: items.map(
          (item: {
            product: string;
            quantity: number;
            unit: string;
          }) => ({
            product: item.product,
            quantity:
              Number(item.quantity),
            unit: item.unit,
          })
        ),

        message:
          typeof message === "string"
            ? message.trim()
            : "",

        status: "Pending",
      });

    const populatedQuotation =
      await quotation.populate([
        {
          path: "customer",
          select:
            "name email phone",
        },

        {
          path: "items.product",
          select:
            "name category price image unit",
        },
      ]);

    return res.status(201).json({
      success: true,
      message:
        "Quotation request submitted successfully.",
      data: populatedQuotation,
    });
  } catch (error) {
    console.error(
      "Create quotation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create quotation.",
    });
  }
};

/*
==========================================
GET MY QUOTATIONS
==========================================
*/

export const getMyQuotations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message:
          "You must be logged in.",
      });
    }

    const quotations =
      await Quotation.find({
        customer: req.user.id,
      })
        .populate(
          "items.product",
          "name category price image unit"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    console.error(
      "Get my quotations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load quotations.",
    });
  }
};

/*
==========================================
GET ONE QUOTATION
==========================================
*/

export const getQuotationById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message:
          "You must be logged in.",
      });
    }

    const quotationId =
      req.params.id;

    if (
      !quotationId ||
      !mongoose.isValidObjectId(
        quotationId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid quotation ID.",
      });
    }

    const quotation =
      await Quotation.findOne({
        _id: quotationId,
        customer: req.user.id,
      })
        .populate(
          "items.product",
          "name category price image unit"
        )
        .populate(
          "customer",
          "name email phone"
        );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          "Quotation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error(
      "Get quotation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load quotation.",
    });
  }
};

const quotePopulation = [
  { path: "customer", select: "fullName name email phone company" },
  { path: "items.product", select: "name category price image unit code" },
  { path: "reviewedBy", select: "fullName name" },
  { path: "salesOrder", select: "orderNumber status total" },
];

export const listQuotationsForSales = async (_req: AuthRequest, res: Response) => {
  try {
    const quotations = await Quotation.find()
      .populate(quotePopulation)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: quotations });
  } catch (error) {
    console.error("List sales quotations error:", error);
    return res.status(500).json({ success: false, message: "Failed to load quotation requests." });
  }
};

export const reviewQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const quotationId = req.params.id;
    const { status, reviewNotes } = req.body as { status?: string; reviewNotes?: string };
    const allowedStatuses = ["Reviewed", "Approved", "Rejected"];

    if (!quotationId || !mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ success: false, message: "Invalid quotation ID." });
    }
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Choose Reviewed, Approved, or Rejected." });
    }
    if (reviewNotes !== undefined && typeof reviewNotes !== "string") {
      return res.status(400).json({ success: false, message: "Review notes must be text." });
    }

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found." });
    const allowedTransitions: Record<string, string[]> = {
      Pending: ["Reviewed", "Approved", "Rejected"],
      Reviewed: ["Approved", "Rejected"],
      Approved: ["Approved"],
      Rejected: ["Rejected"],
    };
    if (!allowedTransitions[quotation.status].includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot change a ${quotation.status.toLowerCase()} quotation to ${status.toLowerCase()}.` });
    }
    if (quotation.salesOrder && status !== "Approved") {
      return res.status(400).json({ success: false, message: "A converted quotation must remain approved." });
    }

    quotation.status = status as "Reviewed" | "Approved" | "Rejected";
    quotation.reviewedBy = new mongoose.Types.ObjectId(req.user!.id);
    if (reviewNotes !== undefined) quotation.reviewNotes = reviewNotes.trim();
    await quotation.save();
    await quotation.populate(quotePopulation);

    return res.status(200).json({ success: true, data: quotation });
  } catch (error) {
    console.error("Review quotation error:", error);
    return res.status(500).json({ success: false, message: "Failed to update quotation." });
  }
};

export const convertQuotationToSalesOrder = async (req: AuthRequest, res: Response) => {
  try {
    const quotationId = req.params.id;
    if (!quotationId || !mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ success: false, message: "Invalid quotation ID." });
    }

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found." });
    if (quotation.salesOrder) {
      return res.status(400).json({ success: false, message: "This quotation has already been converted to an order." });
    }
    if (quotation.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Approve the quotation before creating a sales order." });
    }

    const salesOrder = await createSalesOrder({
      customer: quotation.customer.toString(),
      quotation: quotation._id.toString(),
      items: quotation.items.map((item) => ({ product: item.product.toString(), quantity: item.quantity, unit: item.unit })),
      notes: quotation.reviewNotes || quotation.message || "Created from customer quotation.",
      allowInactiveProducts: true,
    });
    quotation.salesOrder = salesOrder._id;
    await quotation.save();
    await quotation.populate(quotePopulation);

    return res.status(201).json({ success: true, data: quotation, salesOrder });
  } catch (error) {
    console.error("Convert quotation error:", error);
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Failed to create the sales order." });
  }
};
