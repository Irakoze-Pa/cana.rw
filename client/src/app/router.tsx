import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";

// =====================================================
// PUBLIC PAGES
// =====================================================

import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import AppErrorPage from "@/pages/AppErrorPage";
import ProtectedRoutes from "@/routes/ProtectedRoutes";
import AdminRoutes from "@/routes/AdminRoutes";
import ServicesRoutes from "@/routes/ServicesRoutes";

// =====================================================
// CANA GROUP FEATURES
// =====================================================

import About from "@/features/about";
import Team from "@/features/team";
import Projects from "@/features/projects";
import Contact from "@/features/contact";

// =====================================================
// DASHBOARD LAYOUTS
// =====================================================

import CustomerDashboardLayout from "@/modules/dashboard/layouts/CustomerDashboardLayout";
import ManagementLayout from "@/modules/dashboard/layouts/ManagementLayout";
import ServicesManagementLayout from "@/modules/cana-services/layouts/ServicesManagementLayout";

// =====================================================
// DASHBOARD PAGES
// =====================================================

import CustomerDashboard from "@/modules/dashboard/pages/CustomerDashboard";
import CustomerQuotationsPage from "@/modules/dashboard/pages/CustomerQuotationsPage";
import CustomerOrdersPage from "@/modules/dashboard/pages/CustomerOrdersPage";
import CustomerOrderRequestPage from "@/modules/dashboard/pages/CustomerOrderRequestPage";
import AdminDashboard from "@/modules/dashboard/pages/AdminDashboard";
import ServicesDashboardPage from "@/modules/management/services/ServicesDashboardPage";
import TransportOperationsPage from "@/modules/cana-services/pages/TransportOperationsPage";
import ServiceCustomersPage from "@/modules/cana-services/pages/ServiceCustomersPage";
import ServicesReportsPage from "@/modules/cana-services/pages/ServicesReportsPage";
import ServicesFinancePage from "@/modules/cana-services/pages/ServicesFinancePage";
import ServicesStaffPage from "@/modules/cana-services/pages/ServicesStaffPage";

// =====================================================
// MANAGEMENT PAGES
// =====================================================

// Products
import ProductsPage from "@/modules/management/products/ProductsPage";

// Suppliers
import SuppliersPage from "@/modules/management/suppliers/pages/SuppliersPage";

// Raw Materials
import RawMaterialsPage from "@/modules/management/rawMaterial/pages/RawMaterialsPage";
import RawMaterialLotsPage from "@/modules/management/rawMaterial/pages/RawMaterialLotsPage";
import SupplierMaterialOffersPage from "@/modules/management/rawMaterial/pages/SupplierMaterialOffersPage";

// =====================================================
// INVENTORY MODULE
// =====================================================

import InventoryPage from "@/modules/management/inventory/pages/InventoryPage";
import InventoryLedgerPage from "@/modules/management/inventory/pages/InventoryLedgerPage";
import FinishedGoodsPage from "@/modules/management/inventory/pages/FinishedGoodsPage";

// =====================================================
// FORMULA MODULE
// =====================================================

import FormulasPage from "@/modules/management/formula/pages/FormulaPage";

// =====================================================
// PRODUCTION MODULE
// =====================================================

import ProductionBatchesPage from "@/modules/management/production/pages/ProductionBatchesPage";
import ProductionWorkspacePage from "@/modules/management/production/pages/ProductionWorkspacePage";
import MaterialRequirementsPage from "@/modules/management/production/pages/MaterialRequirementsPage";
import SalesOrdersPage from "@/modules/management/sales/SalesOrdersPage";
import SalesWorkspacePage from "@/modules/management/sales/SalesWorkspacePage";
import QuotationsPage from "@/modules/management/sales/QuotationsPage";
import ProformaBuilderPage from "@/modules/management/sales/ProformaBuilderPage";
import BillingPage from "@/modules/management/billing/BillingPage";
import UsersPage from "@/modules/management/users/UsersPage";
import ProfileSettingsPage from "@/modules/management/users/ProfileSettingsPage";
import SettingsHubPage from "@/modules/management/users/SettingsHubPage";
import StaffPaymentsPage from "@/modules/management/users/StaffPaymentsPage";
import CustomersPage from "@/modules/management/users/CustomersPage";
import PayrollPage from "@/modules/management/users/PayrollPage";
import FactoryCompliancePage from "@/modules/management/compliance/FactoryCompliancePage";
import OperationalReportsPage from "@/modules/management/reports/OperationalReportsPage";

// =====================================================
// RAW MATERIAL CONSUMPTION MODULE
// =====================================================

import RawMaterialConsumptionPage from "@/modules/management/rawMaterialConsumption/pages/RawMaterialConsumptionPage";
import RawMaterialConsumptionDetailsPage from "@/modules/management/rawMaterialConsumption/pages/RawMaterialConsumptionDetailsPage";

// =====================================================
// PURCHASE ORDERS
// =====================================================

import PurchaseOrders from "@/modules/management/purchaseOrder/pages/PurchaseOrders";
import SupplierPaymentsPage from "@/modules/management/purchaseOrder/pages/SupplierPaymentsPage";
import ExpensesPage from "@/modules/management/expenses/ExpensesPage";
import GeneralActivityReportPage from "@/modules/management/reports/GeneralActivityReportPage";
import ProcurementReportPage from "@/modules/management/reports/ProcurementReportPage";
import SiteManagementPage from "@/modules/management/sites/SiteManagementPage";
import AccountingPage from "@/modules/management/accounting/AccountingPage";
import ChequeRegisterPage from "@/modules/management/accounting/ChequeRegisterPage";

// =====================================================
// CANA PAINTS
// =====================================================

import PaintsHome from "@/modules/cana-paints/pages/PaintsHome";
import Products from "@/modules/cana-paints/pages/Products";
import PaintingServices from "@/modules/cana-paints/pages/PaintingServices";
import RequestQuote from "@/modules/cana-paints/quotations/RequestQuote";
import EstimatedCostCalculator from "@/modules/cana-paints/pages/EstimatedCostCalculator";

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
  {
    path: "*",
    errorElement: <AppErrorPage />,
  },
  // =====================================================
  // PUBLIC WEBSITE
  // =====================================================

  {
    path: "/",
    element: <MainLayout />,
    errorElement: <AppErrorPage />,
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
        path: "team",
        element: <Team />,
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
      {
        path: "cana-paints/estimate-cost",
        element: <EstimatedCostCalculator />,
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
    errorElement: <AppErrorPage />,
    children: [
      {
        path: "/dashboard",
        element: <CustomerDashboardLayout />,
        children: [
          {
            index: true,
            element: <CustomerDashboard />,
          },
          {
            path: "quotations",
            element: <CustomerQuotationsPage />,
          },
          {
            path: "quotations/:id",
            element: <CustomerQuotationsPage />,
          },
          {
            path: "orders",
            element: <CustomerOrdersPage />,
          },
          {
            path: "orders/new",
            element: <CustomerOrderRequestPage />,
          },
          {
            path: "products",
            element: <Products />,
          },
          {
            path: "request-quote",
            element: <RequestQuote />,
          },
        ],
      },

  // =====================================================
  // CANA SERVICES WORKSPACE
  // =====================================================

      {
        element: <ServicesRoutes />,
        children: [
          {
            path: "/cana-services-workspace",
            element: <ServicesManagementLayout />,
            children: [
              { index: true, element: <ServicesDashboardPage dashboardOnly /> },
              { path: "clients", element: <ServiceCustomersPage /> },
              { path: "scaffolding", element: <ServicesDashboardPage /> },
              { path: "transport", element: <TransportOperationsPage /> },
              { path: "staff", element: <ServicesStaffPage /> },
              { path: "finance", element: <ServicesFinancePage /> },
              { path: "reports", element: <ServicesReportsPage /> },
            ],
          },
        ],
      },

  // =====================================================
  // CANAN MANAGEMENT DASHBOARD
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

      {
        path: "raw-materials/lots",
        element: <RawMaterialLotsPage />,
      },
      {
        path: "supplier-materials",
        element: <SupplierMaterialOffersPage />,
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
      {
        path: "supplier-payments",
        element: <SupplierPaymentsPage />,
      },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "accounting", element: <AccountingPage /> },
      { path: "cheques", element: <ChequeRegisterPage /> },
      { path: "general-report", element: <GeneralActivityReportPage /> },
      { path: "procurement-report", element: <ProcurementReportPage /> },

      // =================================================
      // INVENTORY
      // =================================================

      {
        path: "inventory",
        element: <InventoryPage />,
      },

      {
        path: "inventory/stock",
        element: <InventoryLedgerPage view="movements" />,
      },

      {
        path: "inventory/finished-goods",
        element: <FinishedGoodsPage />,
      },

      {
        path: "inventory/receipts",
        element: <InventoryLedgerPage view="receipts" />,
      },

      {
        path: "inventory/reports",
        element: <InventoryLedgerPage view="reports" />,
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
        element: <ProductionWorkspacePage view="overview" />,
      },

      {
        path: "production/formulas",
        element: <FormulasPage />,
      },

      {
        path: "production/orders",
        element: <Navigate to="/management/production/batches" replace />,
      },

      {
        path: "production/batches",
        element: <ProductionBatchesPage />,
      },

      {
        path: "production/priorities",
        element: <Navigate to="/management/production/material-planning" replace />,
      },

      {
        path: "production/material-planning",
        element: <MaterialRequirementsPage />,
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
        element: <ProductionWorkspacePage view="quality" />,
      },

      // =================================================
      // PRODUCTION HISTORY
      // =================================================

      {
        path: "production/history",
        element: <ProductionWorkspacePage view="history" />,
      },

      // =================================================
      // WASTE & REWORK
      // =================================================

      {
        path: "production/waste",
        element: <ProductionWorkspacePage view="waste" />,
      },

      // =================================================
      // SALES
      // =================================================

      {
        path: "quotations",
        element: <QuotationsPage />,
      },

      {
        path: "sales",
        element: <SalesWorkspacePage />,
      },

      {
        path: "sales/orders",
        element: <SalesOrdersPage view="orders" />,
      },

      {
        path: "sales/fulfilment",
        element: <SalesOrdersPage view="fulfilment" />,
      },

      {
        path: "sales/proforma",
        element: <ProformaBuilderPage />,
      },

      {
        path: "billing",
        element: <BillingPage />,
      },

      // =================================================
      // CUSTOMERS
      // =================================================

      {
        path: "customers",
        element: <CustomersPage />,
      },
      { path: "sites", element: <SiteManagementPage /> },

      // =================================================
      // STAFF MANAGEMENT
      // =================================================

      {
        path: "staff",
        element: <UsersPage />,
      },
      {
        path: "profile",
        element: <ProfileSettingsPage />,
      },
      { path: "staff-payments", element: <StaffPaymentsPage /> },
      { path: "payroll", element: <PayrollPage /> },

      // =================================================
      // FACTORY COMPLIANCE, SAFETY & SETTINGS
      // =================================================
      { path: "compliance", element: <FactoryCompliancePage view="overview" /> },
      { path: "compliance/equipment", element: <FactoryCompliancePage view="equipment" /> },
      { path: "compliance/cleaning", element: <FactoryCompliancePage view="cleaning" /> },
      { path: "compliance/maintenance", element: <FactoryCompliancePage view="maintenance" /> },
      { path: "compliance/safety", element: <FactoryCompliancePage view="safety" /> },

      // =================================================
      // REPORTS
      // =================================================

      {
        path: "reports",
        element: <OperationalReportsPage />,
      },

      // =================================================
      // SETTINGS
      // =================================================

      {
        path: "settings",
        element: <SettingsHubPage />,
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
