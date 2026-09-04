import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";

import logo from "@/assets/logocanan.png";

function CustomerSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const mainLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "group",
      "flex",
      "items-center",
      "gap-3",
      "rounded-xl",
      "py-3",
      "text-sm",
      "font-semibold",
      "transition-all",
      "duration-200",
      sidebarOpen ? "px-4" : "justify-center px-3",
      isActive
        ? "bg-red-600 text-white shadow-sm"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    ].join(" ");

  return (
    <aside
      className={[
        "relative",
        "hidden md:flex",
        "h-screen",
        "shrink-0",
        "flex-col",
        "border-r",
        "border-gray-200",
        "bg-white",
        "transition-all",
        "duration-300",
        "ease-in-out",
        sidebarOpen ? "w-64" : "w-20",
      ].join(" ")}
    >
      {/* =================================================
          BRAND
      ================================================= */}

      <div
        className={[
          "shrink-0",
          "border-b",
          "border-gray-100",
          "py-5",
          sidebarOpen ? "px-5" : "px-3",
        ].join(" ")}
      >
        <div
          className={[
            "flex",
            "items-center",
            sidebarOpen ? "gap-3" : "justify-center",
          ].join(" ")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            <img
              src={logo}
              alt="CANA"
              className="h-full w-full object-contain"
            />
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-gray-900">
                CANA
              </h1>

              <p className="truncate text-xs text-gray-500">
                Customer Portal
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          COLLAPSE BUTTON
      ================================================= */}

      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label={
          sidebarOpen ? "Collapse sidebar" : "Expand sidebar"
        }
        title={
          sidebarOpen ? "Collapse sidebar" : "Expand sidebar"
        }
        className="absolute -right-3 top-16 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
      >
        {sidebarOpen ? (
          <ChevronLeft size={15} strokeWidth={2.5} />
        ) : (
          <ChevronRight size={15} strokeWidth={2.5} />
        )}
      </button>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-5">
        {/* Dashboard */}

        <NavLink
          to="/dashboard"
          end
          className={mainLinkClass}
          title={!sidebarOpen ? "Dashboard" : undefined}
        >
          <LayoutDashboard size={20} strokeWidth={2} />

          {sidebarOpen && <span>Dashboard</span>}
        </NavLink>

        {/* Products */}

        <NavLink
          to="/cana-paints/products"
          className={mainLinkClass}
          title={!sidebarOpen ? "Products" : undefined}
        >
          <Package size={20} strokeWidth={2} />

          {sidebarOpen && <span>Products</span>}
        </NavLink>

        <NavLink
          to="/dashboard/orders"
          className={mainLinkClass}
          title={!sidebarOpen ? "My orders" : undefined}
        >
          <ShoppingCart size={20} strokeWidth={2} />
          {sidebarOpen && <span>My orders</span>}
        </NavLink>

        {/* Quotations */}

        <NavLink
          to="/dashboard/quotations"
          className={mainLinkClass}
          title={!sidebarOpen ? "Quotations" : undefined}
        >
          <FileText size={20} strokeWidth={2} />

          {sidebarOpen && <span>Quotations</span>}
        </NavLink>

        <NavLink
          to="/cana-paints/request-quote"
          className={mainLinkClass}
          title={!sidebarOpen ? "Request a quote" : undefined}
        >
          <PackagePlus size={20} strokeWidth={2} />
          {sidebarOpen && <span>Request a quote</span>}
        </NavLink>
      </nav>


      {/* =================================================
          LOGOUT
      ================================================= */}

      <div className="shrink-0 border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={!sidebarOpen ? "Logout" : undefined}
          className={[
            "flex",
            "w-full",
            "items-center",
            "rounded-xl",
            "py-3",
            "text-sm",
            "font-semibold",
            "text-red-600",
            "transition",
            "hover:bg-red-50",
            sidebarOpen
              ? "gap-3 px-4"
              : "justify-center px-3",
          ].join(" ")}
        >
          <LogOut size={20} strokeWidth={2} />

          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default CustomerSidebar;
