import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  Factory,
  LayoutDashboard,
  Package,
  PackageOpen,
  ShoppingCart,
  Truck,
  UserCog,
  Warehouse,
  History,
  ArrowDownToLine,
  FileBarChart,
  ClipboardList,
  Layers,
  FlaskConical,
  PackageCheck,
  ShieldCheck,
  FileText,
  ReceiptText,
  Settings,
  Banknote,
  HardHat,
  Wrench,
  ClipboardCheck,
  MapPinned,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import logo from "@/assets/logocanan.png";

type Item = {
  label: string;
  to: string;
  icon: React.ElementType;
  category?: string;
  departments?: string[];
  companies?: string[];
  roles?: string[];
  end?: boolean;
};
type Group = {
  label: string;
  icon: React.ElementType;
  shortcutTo?: string;
  companies?: string[];
  items: Item[];
};
const groups: Group[] = [
  {
    label: "Inventory & procurement",
    icon: Boxes,
    shortcutTo: "/management/inventory",
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Raw Material Inventory",
        to: "/management/inventory",
        icon: Warehouse,
        category: "Stock & stores",
        end: true,
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Finished goods & transfers",
        to: "/management/inventory/finished-goods",
        icon: PackageCheck,
        category: "Stock & stores",
        departments: ["sales", "warehouse", "production", "management"],
      },
      {
        label: "Stock movements",
        to: "/management/inventory/stock",
        icon: History,
        category: "Stock & stores",
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Goods receipts",
        to: "/management/inventory/receipts",
        icon: ArrowDownToLine,
        category: "Stock & stores",
        departments: ["procurement", "warehouse", "management"],
      },
      {
        label: "Inventory reports",
        to: "/management/inventory/reports",
        icon: FileBarChart,
        category: "Stock & stores",
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Suppliers",
        to: "/management/suppliers",
        icon: Truck,
        category: "Procurement",
        departments: ["procurement", "management"],
      },
      {
        label: "Materials Setup",
        to: "/management/raw-materials",
        icon: PackageOpen,
        category: "Procurement",
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Purchase orders",
        to: "/management/purchase-orders",
        icon: ClipboardList,
        category: "Procurement",
        departments: ["procurement", "finance", "management"],
      },
      {
        label: "Supplier material offers",
        to: "/management/supplier-materials",
        icon: PackageOpen,
        category: "Procurement",
        departments: ["procurement", "management"],
      },
      {
        label: "Material lots & traceability",
        to: "/management/raw-materials/lots",
        icon: Layers,
        category: "Procurement",
        departments: ["procurement", "warehouse", "production", "management"],
      },
    ],
  },
  {
    label: "Production",
    icon: Factory,
    shortcutTo: "/management/production",
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Overview",
        to: "/management/production",
        icon: Factory,
        category: "Production operations",
        end: true,
        departments: ["production", "management"],
      },
      {
        label: "Batches",
        to: "/management/production/batches",
        icon: Layers,
        category: "Production operations",
        departments: ["production", "management"],
      },
      {
        label: "Formulas",
        to: "/management/production/formulas",
        icon: FlaskConical,
        category: "Formulation & control",
        departments: ["production", "management"],
      },
      {
        label: "Material consumption",
        to: "/management/production/consumption",
        icon: PackageCheck,
        category: "Formulation & control",
        departments: ["production", "management"],
      },
      {
        label: "Quality & release queue",
        to: "/management/production/quality",
        icon: ClipboardList,
        category: "Formulation & control",
        departments: ["production", "management"],
      },
      {
        label: "Output variance",
        to: "/management/production/waste",
        icon: FileBarChart,
        category: "Review & history",
        departments: ["production", "management"],
      },
      {
        label: "Production history",
        to: "/management/production/history",
        icon: History,
        category: "Review & history",
        departments: ["production", "management"],
      },
    ],
  },
  {
    label: "Sales & finance",
    icon: ShoppingCart,
    shortcutTo: "/management/sales",
    items: [
      {
        label: "Product catalogue",
        to: "/management/products",
        icon: Package,
        category: "Catalogue",
        companies: ["cana_paints", "cana_group"],
        departments: ["sales", "management"],
      },
      {
        label: "Customers",
        to: "/management/customers",
        icon: UserCog,
        category: "Customer pipeline",
        departments: ["sales", "customer_service", "marketing", "management"],
      },
      {
        label: "Quotation queue",
        to: "/management/quotations",
        icon: FileText,
        category: "Customer pipeline",
        departments: ["sales", "customer_service", "marketing", "management"],
      },
      {
        label: "Sales & orders",
        to: "/management/sales",
        icon: ShoppingCart,
        category: "Sales operations",
        end: true,
        departments: ["sales", "customer_service", "finance", "management"],
      },
      {
        label: "Fulfilment & delivery",
        to: "/management/sales/fulfilment",
        icon: Truck,
        category: "Sales operations",
        departments: [
          "sales",
          "customer_service",
          "production",
          "warehouse",
          "management",
        ],
      },
      {
        label: "Proforma builder",
        to: "/management/sales/proforma",
        icon: FileText,
        category: "Billing & documents",
        departments: ["sales", "customer_service", "management"],
      },
      {
        label: "Invoices & receipts",
        to: "/management/billing",
        icon: ReceiptText,
        category: "Billing & documents",
        departments: ["sales", "finance", "management"],
      },
    ],
  },
  {
    label: "Finance & reports",
    icon: ReceiptText,
    shortcutTo: "/management/general-report",
    items: [
      {
        label: "Supplier payments",
        to: "/management/supplier-payments",
        icon: Banknote,
        category: "Payables & expenses",
        departments: ["procurement", "finance", "management"],
      },
      {
        label: "Expenses",
        to: "/management/expenses",
        icon: ClipboardList,
        category: "Payables & expenses",
        departments: ["finance", "management"],
      },
      {
        label: "General activity report",
        to: "/management/general-report",
        icon: FileBarChart,
        category: "Reports",
        departments: ["finance", "management"],
      },
      {
        label: "Profit & loss",
        to: "/management/reports",
        icon: FileBarChart,
        category: "Reports",
        departments: [
          "sales",
          "finance",
          "marketing",
          "production",
          "management",
        ],
      },
      {
        label: "Materials & payments report",
        to: "/management/procurement-report",
        icon: FileBarChart,
        category: "Reports",
        departments: ["procurement", "finance", "management"],
      },
    ],
  },
  {
    label: "People & payroll",
    icon: Banknote,
    items: [
      {
        label: "Users & access",
        to: "/management/staff",
        icon: UserCog,
        roles: ["superadmin"],
      },
      {
        label: "Payroll workspace",
        to: "/management/payroll",
        icon: Banknote,
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    label: "Sites & field work",
    icon: MapPinned,
    items: [
      {
        label: "Site management",
        to: "/management/sites",
        icon: MapPinned,
        departments: ["sales", "customer_service", "marketing", "management"],
      },
    ],
  },
  {
    label: "Factory Compliance",
    icon: ShieldCheck,
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Records overview",
        to: "/management/compliance",
        icon: ShieldCheck,
        end: true,
        departments: ["production", "management", "warehouse"],
      },
      {
        label: "Daily cleaning register",
        to: "/management/compliance/cleaning",
        icon: ClipboardCheck,
        departments: ["production", "management", "warehouse"],
      },
      {
        label: "Maintenance register",
        to: "/management/compliance/maintenance",
        icon: Wrench,
        departments: ["production", "management"],
      },
      {
        label: "Safety & HSE register",
        to: "/management/compliance/safety",
        icon: HardHat,
        departments: ["production", "management", "warehouse"],
      },
    ],
  },
];

export default function ManagementSidebar({
  sidebarOpen,
  onToggle,
}: {
  sidebarOpen: boolean;
  onToggle: () => void;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const visibleGroups = useMemo(
    () =>
      groups
        .filter(
          (group) =>
            isAdmin ||
            !group.companies ||
            group.companies.includes(user?.company || ""),
        )
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.roles
              ? item.roles.includes(user?.role || "")
              : isAdmin ||
                ((!item.companies ||
                  item.companies.includes(user?.company || "")) &&
                  (!item.departments ||
                    item.departments.includes(user?.department || ""))),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [isAdmin, user?.company, user?.department, user?.role],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const active = visibleGroups.find((group) =>
      group.items.some(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/management" &&
            location.pathname.startsWith(`${item.to}/`)),
      ),
    );
    if (active) setOpen((current) => ({ ...current, [active.label]: true }));
  }, [location.pathname, visibleGroups]);
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-slate-100 text-slate-700 shadow-[4px_0_20px_rgba(15,23,42,.025)]">
      <div
        className={`flex h-28 items-center border-b border-slate-200 ${sidebarOpen ? "justify-between px-5" : "justify-center px-3"}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={logo}
            alt="CANA"
            className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-sm"
          />
          {sidebarOpen && (
            <div>
              <p className="text-2xl font-extrabold tracking-[0.08em] text-slate-950">
                CANA
              </p>
              <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                CANAN Operations
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-200 lg:block"
        >
          {sidebarOpen ? "‹" : "›"}
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <NavLink
          to="/management"
          end
          title={!sidebarOpen ? "Overview" : undefined}
          className={({ isActive }) =>
            `mb-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-300 hover:text-gray-900"}`
          }
        >
          <LayoutDashboard size={19} />
          {sidebarOpen && "Overview"}
        </NavLink>
        {!isAdmin && (
          <NavLink
            to="/management/staff-payments"
            title={!sidebarOpen ? "My pay & advances" : undefined}
            className={({ isActive }) =>
              `mb-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-300 hover:text-gray-900"}`
            }
          >
            <Banknote size={19} />
            {sidebarOpen && "My pay & advances"}
          </NavLink>
        )}
        {visibleGroups.map((group) => {
          const Icon = group.icon;
          const expanded = open[group.label] ?? false;
          const active = group.items.some(
            (item) =>
              location.pathname === item.to ||
              location.pathname.startsWith(`${item.to}/`),
          );
          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() =>
                  sidebarOpen
                    ? setOpen((current) => ({
                        ...current,
                        [group.label]: !expanded,
                      }))
                    : navigate(group.shortcutTo || group.items[0].to)
                }
                title={!sidebarOpen ? group.label : undefined}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-gray-300 text-gray-900" : "text-gray-700 hover:bg-gray-300 hover:text-gray-900"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  {sidebarOpen && group.label}
                </span>
                {sidebarOpen && (
                  <ChevronDown
                    size={16}
                    className={`transition ${expanded ? "rotate-180" : ""}`}
                  />
                )}
              </button>
              {sidebarOpen && expanded && (
                <div className="ml-5 mt-1 space-y-1 border-l border-gray-200 pl-3">
                  {group.items.map((item, index) => {
                    const ChildIcon = item.icon;
                    const showCategory =
                      Boolean(item.category) &&
                      (index === 0 ||
                        group.items[index - 1]?.category !== item.category);
                    return (
                      <div key={item.to}>
                        {showCategory && (
                          <p className="px-3 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                            {item.category}
                          </p>
                        )}
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-red-600/15 font-semibold text-red-700" : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`
                          }
                        >
                          <ChildIcon size={15} />
                          {item.label}
                        </NavLink>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <footer
        className={`border-t border-slate-200 px-3 py-4 ${sidebarOpen ? "" : "text-center"}`}
      >
        <NavLink
          to="/management/profile"
          title={!sidebarOpen ? "My profile & settings" : undefined}
          className={({ isActive }) =>
            `mb-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-red-600 text-white" : "text-gray-700 hover:bg-gray-300 hover:text-gray-900"}`
          }
        >
          <Settings size={19} />
          {sidebarOpen && "My profile & settings"}
        </NavLink>
        {sidebarOpen ? (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              CANAN Business Group Ltd
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Inventory · Production · Sales
            </p>
          </>
        ) : (
          <span className="text-xs font-bold text-gray-400">v1</span>
        )}
      </footer>
    </div>
  );
}
