import { Router } from "express";
import { authorizeRoles, protect } from "../../middleware/auth.middleware";
import * as controller from "./billing.controller";
const router = Router();
router.use(protect);
router.get("/my", authorizeRoles("customer"), controller.mine);
router.use(authorizeRoles("admin", "staff"));
router.get("/invoices", controller.invoices);
router.post("/invoices", controller.create);
router.post("/invoices/create-missing", controller.createMissing);
router.get("/opening-balances", controller.openingBalances);
router.post("/opening-balances", controller.createOpening);
router.get("/customer-accounts", controller.customerAccounts);
router.get("/payments", controller.payments);
router.post("/payments", controller.receive);
router.post(
  "/payments/:paymentId/reverse",
  authorizeRoles("superadmin"),
  controller.reverse,
);
export default router;
