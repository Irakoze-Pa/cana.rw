import { Router } from "express";

import {
  createQuotation,
  getMyQuotations,
  getQuotationById,
} from "./quotation.controller";

import {
  protect,
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
  getMyQuotations
);

/*
==========================================
CUSTOMER GET ONE QUOTATION
==========================================
*/

router.get(
  "/:id",
  protect,
  getQuotationById
);

export default router;