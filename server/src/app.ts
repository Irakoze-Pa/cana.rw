import express, { Router } from "express";
import cors from "cors";
import { errorHandler, notFound } from "./core/http";

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
import salesOrderRoutes from "./modules/sales/salesOrder.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import userRoutes from "./modules/users/user.routes";
import billingRoutes from "./modules/billing/billing.routes";
import supplierMaterialRoutes from "./modules/raw-materials/supplierMaterial.routes";
import staffPaymentRoutes from "./modules/staffFinance/staffPayment.routes";
import finishedGoodsTransferRoutes from "./modules/finishedGoods/storeTransfer.routes";
import payrollRoutes from "./modules/payroll/payroll.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import complianceRoutes from "./modules/compliance/compliance.routes";
import supplierPaymentRoutes from "./modules/supplierPayments/supplierPayment.routes";
import expenseRoutes from "./modules/expenses/expense.routes";

const app = express();
const api = Router();

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

export const serviceStatus = (_req: express.Request, res: express.Response) => {
  res.status(200).json({ data: { status: "ok", service: "cana-api", timestamp: new Date().toISOString() } });
};

api.get("/", serviceStatus);
api.get("/health", serviceStatus);

// =====================================================
// AUTH
// =====================================================

api.use("/auth", authRoutes);

// =====================================================
// PRODUCTS
// =====================================================

api.use("/products", productRoutes);

// =====================================================
// QUOTATIONS
// =====================================================

api.use("/quotations", quotationRoutes);

// =====================================================
// CONTACT ENQUIRIES
// =====================================================

api.use("/contact", contactRoutes);
api.use("/sales-orders", salesOrderRoutes);
api.use("/dashboard", dashboardRoutes);
api.use("/users", userRoutes);
api.use("/billing", billingRoutes);
api.use("/supplier-materials", supplierMaterialRoutes);
api.use("/staff-payments", staffPaymentRoutes);
api.use("/finished-goods", finishedGoodsTransferRoutes);
api.use("/payroll", payrollRoutes);
api.use("/attendance", attendanceRoutes);
api.use("/compliance", complianceRoutes);
api.use("/supplier-payments", supplierPaymentRoutes);
api.use("/expenses", expenseRoutes);

// =====================================================
// SUPPLIERS
// =====================================================

api.use("/suppliers", supplierRoutes);

// =====================================================
// RAW MATERIALS
// =====================================================

api.use("/raw-materials", rawMaterialRoutes);

// =====================================================
// PURCHASE ORDERS
// =====================================================

api.use("/purchase-orders", purchaseOrderRoutes);

// =====================================================
// FORMULAS
// =====================================================

api.use("/formulas", formulaRoutes);

// =====================================================
// PRODUCTION ORDERS
// =====================================================

api.use("/production-orders", productionOrderRoutes);

// =====================================================
// PRODUCTION BATCHES
// =====================================================

api.use("/production-batches", productionBatchRoutes);

// =====================================================
// MATERIAL CONSUMPTION
// =====================================================

api.use("/material-consumptions", materialConsumptionRoutes);

// =====================================================
// INVENTORY
// =====================================================

api.use("/inventory", inventoryRoutes);

app.use("/api/v1", api);
app.use("/api", api);

// =====================================================
// 404 HANDLER
// =====================================================

app.use(notFound);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(errorHandler);

export default app;
