import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Package,
  PackageOpen,
  Factory,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Layers,
  FlaskConical,
  PackageCheck,
  History,
  Warehouse,
  ArrowDownToLine,
  FileBarChart,
  Gauge,
} from "lucide-react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "@/context/authContext";
import logo from "@/assets/logocanan.png";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

interface ManagementSidebarProps {
  sidebarOpen: boolean;
  onToggle: () => void;
}

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ElementType;
  end?: boolean;
}

/* ========================================================================== */
/* INVENTORY                                                                  */
/* ========================================================================== */

const inventoryItems: SidebarItem[] = [
  {
    name: "Current Stock",
    path: "/management/inventory",
    icon: Warehouse,
    end: true,
  },
  {
    name: "Stock Movements",
    path: "/management/inventory/stock",
    icon: History,
  },
  {
    name: "Goods Receipts",
    path: "/management/inventory/receipts",
    icon: ArrowDownToLine,
  },
  {
    name: "Inventory Reports",
    path: "/management/inventory/reports",
    icon: FileBarChart,
  },
];

/* ========================================================================== */
/* PRODUCTION                                                                 */
/* ========================================================================== */

const productionItems: SidebarItem[] = [
  {
    name: "Overview",
    path: "/management/production",
    icon: Gauge,
    end: true,
  },
  {
    name: "Production Orders",
    path: "/management/production/orders",
    icon: ClipboardList,
  },
  {
    name: "Active Batches",
    path: "/management/production/batches",
    icon: Layers,
  },
  {
    name: "Formulas / Recipes",
    path: "/management/production/formulas",
    icon: FlaskConical,
  },
  {
    name: "Material Consumption",
    path: "/management/production/consumption",
    icon: PackageCheck,
  },
  {
    name: "Production History",
    path: "/management/production/history",
    icon: History,
  },
];

/* ========================================================================== */
/* PROCUREMENT                                                                */
/* ========================================================================== */

const procurementItems: SidebarItem[] = [
  {
    name: "Suppliers",
    path: "/management/suppliers",
    icon: Truck,
  },
  {
    name: "Purchase Orders",
    path: "/management/purchase-orders",
    icon: ClipboardList,
  },
];

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

function ManagementSidebar({
  sidebarOpen,
  onToggle,
}: ManagementSidebarProps) {
  const { logout, user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  /* ------------------------------------------------------------------------ */
  /* SECTION STATES                                                           */
  /* ------------------------------------------------------------------------ */

  const [inventoryOpen, setInventoryOpen] = useState(
    location.pathname.startsWith("/management/inventory"),
  );

  const [productionOpen, setProductionOpen] = useState(
    location.pathname.startsWith("/management/production"),
  );

  const [procurementOpen, setProcurementOpen] = useState(
    location.pathname.startsWith("/management/suppliers") ||
      location.pathname.startsWith("/management/purchase-orders"),
  );

  useEffect(() => {
    if (location.pathname.startsWith("/management/inventory")) {
      setInventoryOpen(true);
    }

    if (location.pathname.startsWith("/management/production")) {
      setProductionOpen(true);
    }

    if (
      location.pathname.startsWith("/management/suppliers") ||
      location.pathname.startsWith("/management/purchase-orders")
    ) {
      setProcurementOpen(true);
    }
  }, [location.pathname]);

  /* ------------------------------------------------------------------------ */
  /* ACTIVE STATES                                                            */
  /* ------------------------------------------------------------------------ */

  const isDashboardActive = location.pathname === "/management";

  const isProductsActive = location.pathname.startsWith(
    "/management/products",
  );

  const isRawMaterialsActive = location.pathname.startsWith(
    "/management/raw-materials",
  );

  const isInventoryActive = location.pathname.startsWith(
    "/management/inventory",
  );

  const isProductionActive = location.pathname.startsWith(
    "/management/production",
  );

  const isSalesActive = location.pathname.startsWith(
    "/management/sales",
  );

  const isCustomersActive = location.pathname.startsWith(
    "/management/customers",
  );

  const isStaffActive = location.pathname.startsWith(
    "/management/staff",
  );

  const isReportsActive = location.pathname.startsWith(
    "/management/reports",
  );

  const isSettingsActive = location.pathname.startsWith(
    "/management/settings",
  );

  const isProcurementActive =
    location.pathname.startsWith("/management/suppliers") ||
    location.pathname.startsWith("/management/purchase-orders");

  /* ------------------------------------------------------------------------ */
  /* MAIN LINK                                                                */
  /* ------------------------------------------------------------------------ */

  const mainLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "group",
      "relative",
      "flex",
      "items-center",
      "gap-3",
      "rounded-xl",
      "py-3",
      "text-sm",
      "font-semibold",
      "select-none",
      "transition-all",
      "duration-200",
      sidebarOpen ? "px-4" : "justify-center px-3",
      isActive
        ? "bg-gray-950 text-white shadow-sm shadow-gray-950/15"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-950",
    ].join(" ");

  /* ------------------------------------------------------------------------ */
  /* SUB LINK                                                                 */
  /* ------------------------------------------------------------------------ */

  const subLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "group",
      "flex",
      "items-center",
      "gap-3",
      "rounded-lg",
      "px-3",
      "py-2.5",
      "text-sm",
      "font-medium",
      "transition-all",
      "duration-200",
      isActive
        ? "bg-red-50 text-red-700 font-semibold"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
    ].join(" ");

  /* ------------------------------------------------------------------------ */
  /* SECTION LABEL                                                             */
  /* ------------------------------------------------------------------------ */

  const sectionLabelClass =
    "mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400";

  /* ------------------------------------------------------------------------ */
  /* LOGOUT                                                                    */
  /* ------------------------------------------------------------------------ */

  const handleLogout = () => {
    logout();

    navigate("/", {
      replace: true,
    });
  };

  /* ------------------------------------------------------------------------ */
  /* COLLAPSIBLE SECTION                                                       */
  /* ------------------------------------------------------------------------ */

  const renderSection = (
    label: string,
    icon: React.ElementType,
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    active: boolean,
    items: SidebarItem[],
  ) => {
    const SectionIcon = icon;

    return (
      <div>
        <button
          type="button"
          onClick={() => {
            if (!sidebarOpen) {
              navigate(items[0].path);
              return;
            }

            setOpen((previous) => !previous);
          }}
          aria-expanded={sidebarOpen ? open : undefined}
          title={!sidebarOpen ? label : undefined}
          className={[
            "flex",
            "w-full",
            "items-center",
            "rounded-xl",
            "py-3",
            "text-sm",
            "font-semibold",
            "transition-all",
            "duration-200",
            sidebarOpen ? "justify-between px-4" : "justify-center px-3",
            active
              ? "bg-gray-950 text-white shadow-sm shadow-gray-950/15"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-950",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <SectionIcon size={20} strokeWidth={2} />

            {sidebarOpen && <span>{label}</span>}
          </div>

          {sidebarOpen && (
            <ChevronDown
              size={17}
              strokeWidth={2}
              className={[
                "transition-transform",
                "duration-200",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          )}
        </button>

        {sidebarOpen && open && (
          <div className="ml-4 mt-2 flex flex-col gap-1 border-l border-gray-200 pl-3">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={subLinkClass}
                >
                  <Icon size={17} strokeWidth={2} />

                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <aside
      className={[
        "relative",
        "flex",
        "h-screen",
        "shrink-0",
        "flex-col",
        "overflow-hidden",
        "border-r",
        "border-gray-200/80",
        "bg-white",
        "transition-all",
        "duration-300",
        "ease-in-out",
        sidebarOpen ? "w-72" : "w-20",
      ].join(" ")}
    >
      {/* ================================================================== */}
      {/* BRAND                                                               */}
      {/* ================================================================== */}

      <div
        className={[
          "shrink-0",
          "border-b",
          "border-gray-100",
          "bg-white",
          "py-5",
          "transition-all",
          "duration-300",
          sidebarOpen ? "px-5" : "px-3",
        ].join(" ")}
      >
        <div
          className={[
            "flex",
            "items-center",
            sidebarOpen ? "gap-4" : "justify-center",
          ].join(" ")}
        >
          <div
            className={[
              "flex",
              "shrink-0",
              "items-center",
              "justify-center",
              "overflow-hidden",
              "rounded-2xl",
              "bg-white",
              "transition-all",
              "duration-300",
              sidebarOpen ? "h-14 w-14" : "h-12 w-12",
            ].join(" ")}
          >
            <img
              src={logo}
              alt="CANA"
              className="h-full w-full object-contain"
            />
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-gray-950">
                CANA
              </h3>

              <p className="mt-0.5 truncate text-xs font-medium text-gray-500">
                Operations workspace
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* COLLAPSE BUTTON                                                     */}
      {/* ================================================================== */}

      <button
        type="button"
        onClick={onToggle}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        className="
          absolute
          -right-3
          top-[76px]
          z-50
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-full
          border
          border-gray-200
          bg-white
          text-gray-600
          shadow-sm
          transition-all
          hover:border-gray-300
          hover:bg-gray-50
          hover:text-gray-950
        "
      >
        <ChevronLeft
          size={16}
          strokeWidth={2.5}
          className={[
            "transition-transform",
            "duration-300",
            sidebarOpen ? "rotate-0" : "rotate-180",
          ].join(" ")}
        />
      </button>

      {/* ================================================================== */}
      {/* NAVIGATION                                                          */}
      {/* ================================================================== */}

      <nav
        className="
          flex
          flex-1
          flex-col
          overflow-y-auto
          px-3
          py-5
          scrollbar-thin
          scrollbar-thumb-gray-200
          scrollbar-track-transparent
        "
      >
        {/* ---------------------------------------------------------------- */}
        {/* CORE                                                              */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={sectionLabelClass}>Core</p>
        )}

        {/* DASHBOARD */}

        <NavLink
          to="/management"
          end
          className={() =>
            mainLinkClass({
              isActive: isDashboardActive,
            })
          }
          title={!sidebarOpen ? "Dashboard" : undefined}
        >
          <LayoutDashboard size={20} strokeWidth={2} />

          {sidebarOpen && <span>Dashboard</span>}
        </NavLink>

        {/* PRODUCTS */}

        <NavLink
          to="/management/products"
          className={() =>
            mainLinkClass({
              isActive: isProductsActive,
            })
          }
          title={!sidebarOpen ? "Products" : undefined}
        >
          <Package size={20} strokeWidth={2} />

          {sidebarOpen && <span>Products</span>}
        </NavLink>

        {/* RAW MATERIALS */}

        <NavLink
          to="/management/raw-materials"
          className={() =>
            mainLinkClass({
              isActive: isRawMaterialsActive,
            })
          }
          title={!sidebarOpen ? "Raw Materials" : undefined}
        >
          <PackageOpen size={20} strokeWidth={2} />

          {sidebarOpen && <span>Raw Materials</span>}
        </NavLink>

        {/* ---------------------------------------------------------------- */}
        {/* OPERATIONS                                                        */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={`${sectionLabelClass} mt-6`}>
            Operations
          </p>
        )}

        {/* INVENTORY */}

        {renderSection(
          "Inventory",
          Boxes,
          inventoryOpen,
          setInventoryOpen,
          isInventoryActive,
          inventoryItems,
        )}

        {/* PRODUCTION */}

        <div className="mt-1">
          {renderSection(
            "Production",
            Factory,
            productionOpen,
            setProductionOpen,
            isProductionActive,
            productionItems,
          )}
        </div>

        {/* SALES */}

        <NavLink
          to="/management/sales"
          className={() =>
            mainLinkClass({
              isActive: isSalesActive,
            })
          }
          title={!sidebarOpen ? "Sales & Orders" : undefined}
        >
          <ShoppingCart size={20} strokeWidth={2} />

          {sidebarOpen && <span>Sales & Orders</span>}
        </NavLink>

        {/* ---------------------------------------------------------------- */}
        {/* PROCUREMENT                                                       */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={`${sectionLabelClass} mt-6`}>
            Procurement
          </p>
        )}

        {renderSection(
          "Procurement",
          Truck,
          procurementOpen,
          setProcurementOpen,
          isProcurementActive,
          procurementItems,
        )}

        {/* ---------------------------------------------------------------- */}
        {/* PEOPLE                                                            */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={`${sectionLabelClass} mt-6`}>
            People
          </p>
        )}

        {/* CUSTOMERS */}

        <NavLink
          to="/management/customers"
          className={() =>
            mainLinkClass({
              isActive: isCustomersActive,
            })
          }
          title={!sidebarOpen ? "Customers" : undefined}
        >
          <Users size={20} strokeWidth={2} />

          {sidebarOpen && <span>Customers</span>}
        </NavLink>

        {/* STAFF */}

        <NavLink
          to="/management/staff"
          className={() =>
            mainLinkClass({
              isActive: isStaffActive,
            })
          }
          title={!sidebarOpen ? "Staff Management" : undefined}
        >
          <UserCog size={20} strokeWidth={2} />

          {sidebarOpen && <span>Staff Management</span>}
        </NavLink>

        {/* ---------------------------------------------------------------- */}
        {/* REPORTING                                                         */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={`${sectionLabelClass} mt-6`}>
            Reporting
          </p>
        )}

        <NavLink
          to="/management/reports"
          className={() =>
            mainLinkClass({
              isActive: isReportsActive,
            })
          }
          title={!sidebarOpen ? "Reports" : undefined}
        >
          <BarChart3 size={20} strokeWidth={2} />

          {sidebarOpen && <span>Reports</span>}
        </NavLink>

        {/* ---------------------------------------------------------------- */}
        {/* ADMINISTRATION                                                    */}
        {/* ---------------------------------------------------------------- */}

        {sidebarOpen && (
          <p className={`${sectionLabelClass} mt-6`}>
            Administration
          </p>
        )}

        <NavLink
          to="/management/settings"
          className={() =>
            mainLinkClass({
              isActive: isSettingsActive,
            })
          }
          title={!sidebarOpen ? "Settings" : undefined}
        >
          <Settings size={20} strokeWidth={2} />

          {sidebarOpen && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* ================================================================== */}
      {/* USER / LOGOUT                                                       */}
      {/* ================================================================== */}

      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        {sidebarOpen && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-700">
              {user?.fullName?.trim().charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-gray-900">
                {user?.fullName || "Management user"}
              </p>
              <p className="truncate text-[11px] capitalize text-gray-500">
                {user?.role || "Account"}
              </p>
            </div>
          </div>
        )}
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
            "transition-all",
            "duration-200",
            "hover:bg-red-50",
            sidebarOpen ? "gap-3 px-4" : "justify-center px-3",
          ].join(" ")}
        >
          <LogOut size={20} strokeWidth={2} />

          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default ManagementSidebar;
