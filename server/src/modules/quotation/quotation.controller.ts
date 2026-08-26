import { Response } from "express";
import mongoose from "mongoose";

import Quotation from "./quotation.model";

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