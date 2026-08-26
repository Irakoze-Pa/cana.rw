import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";

// =====================================================
// PUBLIC PAGES
// =====================================================

import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import ManagementPlaceholderPage from "@/pages/ManagementPlaceholderPage";
import ProtectedRoutes from "@/routes/ProtectedRoutes";
import AdminRoutes from "@/routes/AdminRoutes";

// =====================================================
// CANA GROUP FEATURES
// =====================================================

import About from "@/features/about";
import Projects from "@/features/projects";
import Contact from "@/features/contact";

// =====================================================
// DASHBOARD LAYOUTS
// =====================================================

import CustomerDashboardLayout from "@/modules/dashboard/layouts/CustomerDashboardLayout";
import ManagementLayout from "@/modules/dashboard/layouts/ManagementLayout";

// =====================================================
// DASHBOARD PAGES
// =====================================================

import CustomerDashboard from "@/modules/dashboard/pages/CustomerDashboard";
import AdminDashboard from "@/modules/dashboard/pages/AdminDashboard";

// =====================================================
// MANAGEMENT PAGES
// =====================================================

// Products
import ProductsPage from "@/modules/management/products/ProductsPage";

// Suppliers
import SuppliersPage from "@/modules/management/suppliers/pages/SuppliersPage";

// Raw Materials
import RawMaterialsPage from "@/modules/management/rawMaterial/pages/RawMaterialsPage";

// =====================================================
// INVENTORY MODULE
// =====================================================

import InventoryPage from "@/modules/management/inventory/pages/InventoryPage";

// =====================================================
// FORMULA MODULE
// =====================================================

import FormulasPage from "@/modules/management/formula/pages/FormulaPage";

// =====================================================
// PRODUCTION MODULE
// =====================================================

import ProductionOrdersPage from "@/modules/management/production/pages/ProductionOrdersPage";
import ProductionBatchesPage from "@/modules/management/production/pages/ProductionBatchesPage";

// =====================================================
// RAW MATERIAL CONSUMPTION MODULE
// =====================================================

import RawMaterialConsumptionPage from "@/modules/management/rawMaterialConsumption/pages/RawMaterialConsumptionPage";
import RawMaterialConsumptionDetailsPage from "@/modules/management/rawMaterialConsumption/pages/RawMaterialConsumptionDetailsPage";

// =====================================================
// PURCHASE ORDERS
// =====================================================

import PurchaseOrders from "@/modules/management/purchaseOrder/pages/PurchaseOrders";

// =====================================================
// CANA PAINTS
// =====================================================

import PaintsHome from "@/modules/cana-paints/pages/PaintsHome";
import Products from "@/modules/cana-paints/pages/Products";
import PaintingServices from "@/modules/cana-paints/pages/PaintingServices";
import RequestQuote from "@/modules/cana-paints/quotations/RequestQuote";

// =====================================================
// CANA SERVICES
// =====================================================

import ServicesHome from "@/modules/cana-services/pages/ServicesHome";
import ScaffoldRental from "@/modules/cana-services/pages/ScaffoldRental";
import Transport from "@/modules/cana-services/pages/Transport";

// =====================================================
// ROUTER
// =====================================================

const router = createBrowserRouter([
  // =====================================================
  // PUBLIC WEBSITE
  // =====================================================

  {
    path: "/",
    element: <MainLayout />,
    children: [
      // -------------------------------------------------
      // HOME
      // -------------------------------------------------

      {
        index: true,
        element: <Home />,
      },

      // -------------------------------------------------
      // CANA GROUP
      // -------------------------------------------------

      {
        path: "about",
        element: <About />,
      },

      {
        path: "projects",
        element: <Projects />,
      },

      {
        path: "contact",
        element: <Contact />,
      },

      // -------------------------------------------------
      // CANA PAINTS
      // -------------------------------------------------

      {
        path: "cana-paints",
        element: <PaintsHome />,
      },

      {
        path: "cana-paints/products",
        element: <Products />,
      },

      {
        path: "cana-paints/painting-services",
        element: <PaintingServices />,
      },

      {
        path: "cana-paints/request-quote",
        element: <RequestQuote />,
      },

      // -------------------------------------------------
      // CANA SERVICES
      // -------------------------------------------------

      {
        path: "cana-services",
        element: <ServicesHome />,
      },

      {
        path: "cana-services/scaffolds",
        element: <ScaffoldRental />,
      },

      {
        path: "cana-services/transport",
        element: <Transport />,
      },
    ],
  },

  // =====================================================
  // CUSTOMER DASHBOARD
  // =====================================================

  {
    element: <ProtectedRoutes />,
    children: [
      {
        path: "/dashboard",
        element: <CustomerDashboardLayout />,
        children: [
          {
            index: true,
            element: <CustomerDashboard />,
          },
        ],
      },

  // =====================================================
  // MANAGEMENT DASHBOARD
  // =====================================================

      {
        element: <AdminRoutes />,
        children: [
          {
            path: "/management",
            element: <ManagementLayout />,
            children: [
      // =================================================
      // DASHBOARD
      // =================================================

      {
        index: true,
        element: <AdminDashboard />,
      },

      // =================================================
      // PRODUCTS
      // =================================================

      {
        path: "products",
        element: <ProductsPage />,
      },

      // =================================================
      // RAW MATERIALS
      // =================================================

      {
        path: "raw-materials",
        element: <RawMaterialsPage />,
      },

      // =================================================
      // PROCUREMENT
      // =================================================

      {
        path: "suppliers",
        element: <SuppliersPage />,
      },

      {
        path: "purchase-orders",
        element: <PurchaseOrders />,
      },

      // =================================================
      // INVENTORY
      // =================================================

      {
        path: "inventory",
        element: <InventoryPage />,
      },

      {
        path: "inventory/stock",
        element: <ManagementPlaceholderPage title="Stock Movements" description="Review stock receipts, issues, adjustments, and transfers in one operational ledger." />,
      },

      {
        path: "inventory/receipts",
        element: <ManagementPlaceholderPage title="Goods Receipts" description="Record and verify deliveries from suppliers before they become available inventory." />,
      },

      {
        path: "inventory/reports",
        element: <ManagementPlaceholderPage title="Inventory Reports" description="Export stock valuations, reorder indicators, and movement summaries." />,
      },

      // -------------------------------------------------
      // Future Inventory Pages
      // -------------------------------------------------
      //
      // These routes should be enabled when their pages
      // are created:
      //
      // "inventory/movements"
      // "inventory/receipts"
      // "inventory/issues"
      // "inventory/adjustments"
      // "inventory/reports"
      //
      // Do NOT point them to InventoryPage permanently.
      // Each one should have its own workflow.
      // -------------------------------------------------

      // =================================================
      // PRODUCTION
      // =================================================

      {
        path: "production",
        element: <ManagementPlaceholderPage title="Production Overview" description="Track current production health, capacity, and exceptions across orders and batches." />,
      },

      {
        path: "production/formulas",
        element: <FormulasPage />,
      },

      {
        path: "production/orders",
        element: <ProductionOrdersPage />,
      },

      {
        path: "production/batches",
        element: <ProductionBatchesPage />,
      },

      // =================================================
      // RAW MATERIAL CONSUMPTION
      // =================================================

      {
        path: "production/consumption",
        element: <RawMaterialConsumptionPage />,
      },

      {
        path: "production/consumption/:id",
        element: <RawMaterialConsumptionDetailsPage />,
      },

      // =================================================
      // QUALITY CONTROL
      // =================================================

      {
        path: "production/quality",
        element: <ManagementPlaceholderPage title="Quality Control" description="Capture product inspections, approvals, and corrective actions for each production batch." />,
      },

      // =================================================
      // PRODUCTION HISTORY
      // =================================================

      {
        path: "production/history",
        element: <ManagementPlaceholderPage title="Production History" description="Review completed batches, material usage, yield, and production performance over time." />,
      },

      // =================================================
      // WASTE & REWORK
      // =================================================

      {
        path: "production/waste",
        element: <ManagementPlaceholderPage title="Waste & Rework" description="Record material losses and rework activities to improve production yield." />,
      },

      // =================================================
      // SALES
      // =================================================

      {
        path: "sales",
        element: <ManagementPlaceholderPage title="Sales" description="Manage customer orders, invoices, and sales performance in one workspace." />,
      },

      // =================================================
      // CUSTOMERS
      // =================================================

      {
        path: "customers",
        element: <ManagementPlaceholderPage title="Customers" description="Maintain customer profiles, account history, and quotation activity." />,
      },

      // =================================================
      // STAFF MANAGEMENT
      // =================================================

      {
        path: "staff",
        element: <ManagementPlaceholderPage title="Staff Management" description="Manage staff accounts, roles, departments, and operational permissions." />,
      },

      // =================================================
      // REPORTS
      // =================================================

      {
        path: "reports",
        element: <ManagementPlaceholderPage title="Reports" description="Access operational summaries for procurement, inventory, production, and sales." />,
      },

      // =================================================
      // SETTINGS
      // =================================================

      {
        path: "settings",
        element: <ManagementPlaceholderPage title="Settings" description="Configure organization details, workflows, and application preferences." />,
      },
            ],
          },
        ],
      },
    ],
  },

  // =====================================================
  // 404
  // =====================================================

  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
