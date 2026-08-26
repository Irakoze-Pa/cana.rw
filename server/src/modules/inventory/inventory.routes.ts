import { Router } from "express";

import inventoryController from "./inventory.controller";

const router = Router();

/* =========================================================
   SUMMARY / DASHBOARD
   IMPORTANT: These routes must come before /:id
========================================================= */

router.get(
  "/summary",
  inventoryController.getInventorySummary
);

router.get(
  "/low-stock",
  inventoryController.getLowStockInventory
);

router.get(
  "/out-of-stock",
  inventoryController.getOutOfStockInventory
);

router.get(
  "/recent-transactions",
  inventoryController.getRecentTransactions
);

/* =========================================================
   TRANSACTIONS
========================================================= */

router.get(
  "/transactions",
  inventoryController.getInventoryTransactions
);

/* =========================================================
   STOCK OPERATIONS
========================================================= */

router.post(
  "/stock/add",
  inventoryController.addStock
);

router.post(
  "/stock/remove",
  inventoryController.removeStock
);

router.post(
  "/stock/adjust",
  inventoryController.adjustStock
);

router.post(
  "/stock/reserve",
  inventoryController.reserveStock
);

router.post(
  "/stock/release",
  inventoryController.releaseReservedStock
);

/* =========================================================
   RAW MATERIAL INVENTORY
========================================================= */

router.get(
  "/raw-material/:rawMaterialId",
  inventoryController.getInventoryByRawMaterial
);

/* =========================================================
   INVENTORY CRUD
========================================================= */

router.post(
  "/",
  inventoryController.createInventory
);

router.get(
  "/",
  inventoryController.getInventory
);

router.get(
  "/:id",
  inventoryController.getInventoryById
);

export default router;