import { Router } from "express";

import {
  createQuotation,
  getMyQuotations,
  getQuotationById,
  listQuotationsForSales,
  reviewQuotation,
  convertQuotationToSalesOrder,
} from "./quotation.controller";

import {
  protect,
  authorizeRoles,
} from "../../middleware/auth.middleware";

const router = Router();

/*
==========================================
CUSTOMER CREATE QUOTATION
==========================================
*/

router.post(
  "/",
  protect,
  authorizeRoles("customer"),
  createQuotation
);

/*
==========================================
CUSTOMER GET HIS QUOTATIONS
==========================================
*/

router.get(
  "/my",
  protect,
  authorizeRoles("customer"),
  getMyQuotations
);

router.get("/", protect, authorizeRoles("admin", "staff"), listQuotationsForSales);
router.patch("/:id/review", protect, authorizeRoles("admin", "staff"), reviewQuotation);
router.post("/:id/create-sales-order", protect, authorizeRoles("admin", "staff"), convertQuotationToSalesOrder);

/*
==========================================
CUSTOMER GET ONE QUOTATION
==========================================
*/

router.get(
  "/:id",
  protect,
  authorizeRoles("customer"),
  getQuotationById
);

export default router;
