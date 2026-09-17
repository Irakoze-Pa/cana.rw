import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/authContext";

const access: Record<string, string[]> = {
  procurement: ["/management", "/management/suppliers", "/management/supplier-materials", "/management/purchase-orders", "/management/supplier-payments", "/management/procurement-report", "/management/raw-materials", "/management/inventory"],
  warehouse: ["/management", "/management/raw-materials", "/management/inventory"],
  production: ["/management", "/management/raw-materials", "/management/inventory", "/management/production"],
  sales: ["/management", "/management/products", "/management/quotations", "/management/sales", "/management/billing", "/management/inventory/finished-goods", "/management/customers", "/management/sites"],
  customer_service: ["/management", "/management/quotations", "/management/sales", "/management/customers", "/management/sites"],
  finance: ["/management", "/management/sales", "/management/billing", "/management/purchase-orders", "/management/supplier-payments", "/management/expenses", "/management/reports", "/management/general-report"],
  marketing: ["/management", "/management/quotations", "/management/customers", "/management/sites", "/management/reports"],
  management: ["/management", "/management/sites"],
};

export default function AdminRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "admin" || user.role === "superadmin") return <Outlet />;
  if (user.role !== "staff") return <Navigate to="/dashboard" replace />;
  const servicePaths = ["/management", "/management/profile", "/management/staff-payments", "/management/quotations", "/management/sales", "/management/customers", "/management/sites"];
  if (user.company === "cana_services" && !servicePaths.some((path) => path === "/management" ? location.pathname === path : location.pathname.startsWith(path))) return <Navigate to="/management" replace />;
  const allowed = access[user.department || ""] || ["/management"];
  const permitted = ["/management/profile", "/management/staff-payments"].includes(location.pathname) || allowed.some((path) => path === "/management" ? location.pathname === path : location.pathname.startsWith(path));
  return permitted ? <Outlet /> : <Navigate to="/management" replace />;
}
