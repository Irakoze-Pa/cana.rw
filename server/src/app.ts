import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";

import productRoutes from "./modules/product/product.routes";
import quotationRoutes from "./modules/quotation/quotation.routes";

import supplierRoutes from "./modules/suppliers/supplier.routes";
import rawMaterialRoutes from "./modules/raw-materials/rawMaterial.routes";
import purchaseOrderRoutes from "./modules/purchaseOrders/purchaseOrder.routes";
import formulaRoutes from "./modules/formula/formula.routes";

import productionOrderRoutes from "./modules/production/productionOrder/productionOrder.routes";
import productionBatchRoutes from "./modules/production/productionBatch/productionBatch.routes";
import materialConsumptionRoutes from "./modules/production/materialConsumption/materialConsumption.routes";

import inventoryRoutes from "./modules/inventory/inventory.routes";
import contactRoutes from "./modules/contact/contact.routes";

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// =====================================================
// BODY PARSERS
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// TEST API
// =====================================================

app.get("/api/test", (_req, res) => {
  res.json({
    success: true,
    message: "API is working",
  });
});

// =====================================================
// AUTH
// =====================================================

app.use("/api/auth", authRoutes);

// =====================================================
// PRODUCTS
// =====================================================

app.use("/api/products", productRoutes);

// =====================================================
// QUOTATIONS
// =====================================================

app.use("/api/quotations", quotationRoutes);

// =====================================================
// CONTACT ENQUIRIES
// =====================================================

app.use("/api/contact", contactRoutes);

// =====================================================
// SUPPLIERS
// =====================================================

app.use("/api/suppliers", supplierRoutes);

// =====================================================
// RAW MATERIALS
// =====================================================

app.use("/api/raw-materials", rawMaterialRoutes);

// =====================================================
// PURCHASE ORDERS
// =====================================================

app.use("/api/purchase-orders", purchaseOrderRoutes);

// =====================================================
// FORMULAS
// =====================================================

app.use("/api/formulas", formulaRoutes);

// =====================================================
// PRODUCTION ORDERS
// =====================================================

app.use(
  "/api/production-orders",
  productionOrderRoutes
);

// =====================================================
// PRODUCTION BATCHES
// =====================================================

app.use(
  "/api/production-batches",
  productionBatchRoutes
);

// =====================================================
// MATERIAL CONSUMPTION
// =====================================================

app.use(
  "/api/material-consumptions",
  materialConsumptionRoutes
);

// =====================================================
// INVENTORY
// =====================================================

app.use(
  "/api/inventory",
  inventoryRoutes
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    path: req.originalUrl,
    method: req.method,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Server Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error.";

    const status =
      error instanceof SyntaxError ||
      (error instanceof Error && /image files|file too large/i.test(error.message))
        ? 400
        : 500;

    res.status(status).json({
      success: false,
      message,
    });
  }
);

export default app;
