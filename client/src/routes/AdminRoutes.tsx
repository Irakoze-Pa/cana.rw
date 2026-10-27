import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/authContext";

const access: Record<string, string[]> = {
  procurement: ["/management", "/management/suppliers", "/management/supplier-materials", "/management/purchase-orders", "/management/supplier-payments", "/management/cheques", "/management/procurement-report", "/management/raw-materials", "/management/inventory"],
  warehouse: ["/management", "/management/raw-materials", "/management/inventory", "/management/services"],
  production: ["/management", "/management/raw-materials", "/management/inventory", "/management/production"],
  sales: ["/management", "/management/products", "/management/quotations", "/management/sales", "/management/billing", "/management/cheques", "/management/inventory/finished-goods", "/management/customers", "/management/sites", "/management/services"],
  customer_service: ["/management", "/management/quotations", "/management/sales", "/management/customers", "/management/sites", "/management/services"],
  finance: ["/management", "/management/sales", "/management/billing", "/management/cheques", "/management/purchase-orders", "/management/supplier-payments", "/management/expenses", "/management/accounting", "/management/reports", "/management/general-report"],
  marketing: ["/management", "/management/quotations", "/management/customers", "/management/sites", "/management/reports"],
  management: ["/management", "/management/sites", "/management/services"],
  sites: ["/management", "/management/sites", "/management/services"],
};
const permissionAccess: Record<string, string[]> = {
  sales: ["/management/products", "/management/quotations", "/management/sales", "/management/billing", "/management/cheques", "/management/customers", "/management/services"],
  production: ["/management/production", "/management/raw-materials", "/management/inventory", "/management/compliance"],
  inventory: ["/management/inventory", "/management/raw-materials", "/management/services"],
  procurement: ["/management/suppliers", "/management/supplier-materials", "/management/purchase-orders", "/management/supplier-payments", "/management/cheques", "/management/procurement-report", "/management/raw-materials", "/management/inventory"],
  finance: ["/management/accounting", "/management/billing", "/management/cheques", "/management/sales", "/management/supplier-payments", "/management/expenses", "/management/purchase-orders"],
  staff: ["/management/payroll"],
  reports: ["/management/reports", "/management/general-report", "/management/procurement-report"],
  sites: ["/management/sites", "/management/services"],
};

export default function AdminRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/" replace />;
  if (user.company === "cana_services") return <Navigate to="/cana-services-workspace" replace />;
  if (user.role === "admin" || user.role === "superadmin") return <Outlet />;
  if (user.role !== "staff") return <Navigate to="/dashboard" replace />;
  const allowed = user.permissions?.length
    ? ["/management", ...Array.from(new Set(user.permissions.flatMap((permission) => permissionAccess[permission] || [])))]
    : access[user.department || ""] || ["/management"];
  const permitted = ["/management/profile", "/management/staff-payments"].includes(location.pathname) || allowed.some((path) => path === "/management" ? location.pathname === path : location.pathname.startsWith(path));
  return permitted ? <Outlet /> : <Navigate to="/management" replace />;
}
