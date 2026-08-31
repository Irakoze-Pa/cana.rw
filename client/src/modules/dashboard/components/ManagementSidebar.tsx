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
  House,
  Settings,
  Banknote,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import logo from "@/assets/logocanan.png";

type Item = {
  label: string;
  to: string;
  icon: React.ElementType;
  departments?: string[];
  companies?: string[];
  roles?: string[];
  end?: boolean;
};
type Group = {
  label: string;
  icon: React.ElementType;
  companies?: string[];
  items: Item[];
};
const groups: Group[] = [
  {
    label: "Product catalogue",
    icon: Package,
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Product catalogue",
        to: "/management/products",
        icon: Package,
        departments: ["sales", "management"],
      },
    ],
  },
  {
    label: "Inventory & stores",
    icon: Boxes,
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Raw-material stock",
        to: "/management/inventory",
        icon: Warehouse,
        end: true,
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Finished goods & transfers",
        to: "/management/inventory/finished-goods",
        icon: PackageCheck,
        departments: ["sales", "warehouse", "production", "management"],
      },
      {
        label: "Stock movements",
        to: "/management/inventory/stock",
        icon: History,
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Goods receipts",
        to: "/management/inventory/receipts",
        icon: ArrowDownToLine,
        departments: ["procurement", "warehouse", "management"],
      },
      {
        label: "Inventory reports",
        to: "/management/inventory/reports",
        icon: FileBarChart,
        departments: ["procurement", "warehouse", "production", "management"],
      },
    ],
  },
  {
    label: "Procurement & materials",
    icon: Truck,
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Suppliers",
        to: "/management/suppliers",
        icon: Truck,
        departments: ["procurement", "management"],
      },
      {
        label: "Raw-material catalogue",
        to: "/management/raw-materials",
        icon: PackageOpen,
        departments: ["procurement", "warehouse", "production", "management"],
      },
      {
        label: "Purchase orders",
        to: "/management/purchase-orders",
        icon: ClipboardList,
        departments: ["procurement", "finance", "management"],
      },
      {
        label: "Supplier material offers",
        to: "/management/supplier-materials",
        icon: PackageOpen,
        departments: ["procurement", "management"],
      },
      {
        label: "Material lots & traceability",
        to: "/management/raw-materials/lots",
        icon: Layers,
        departments: ["procurement", "warehouse", "production", "management"],
      },
    ],
  },
  {
    label: "Production",
    icon: Factory,
    companies: ["cana_paints", "cana_group"],
    items: [
      {
        label: "Overview",
        to: "/management/production",
        icon: Factory,
        end: true,
        departments: ["production", "management"],
      },
      {
        label: "Production orders",
        to: "/management/production/orders",
        icon: ClipboardList,
        departments: ["production", "management"],
      },
      {
        label: "Batches",
        to: "/management/production/batches",
        icon: Layers,
        departments: ["production", "management"],
      },
      {
        label: "Formulas",
        to: "/management/production/formulas",
        icon: FlaskConical,
        departments: ["production", "management"],
      },
      {
        label: "Material consumption",
        to: "/management/production/consumption",
        icon: PackageCheck,
        departments: ["production", "management"],
      },
      {
        label: "Quality & release queue",
        to: "/management/production/quality",
        icon: ClipboardList,
        departments: ["production", "management"],
      },
      {
        label: "Output variance",
        to: "/management/production/waste",
        icon: FileBarChart,
        departments: ["production", "management"],
      },
      {
        label: "Production history",
        to: "/management/production/history",
        icon: History,
        departments: ["production", "management"],
      },
    ],
  },
  {
    label: "Sales & finance",
    icon: ShoppingCart,
    items: [
      {
        label: "Customers",
        to: "/management/customers",
        icon: UserCog,
        departments: ["sales", "customer_service", "management"],
      },
      {
        label: "Quotation queue",
        to: "/management/quotations",
        icon: FileText,
        departments: ["sales", "customer_service", "management"],
      },
      {
        label: "Sales orders",
        to: "/management/sales",
        icon: ShoppingCart,
        departments: ["sales", "customer_service", "finance", "management"],
      },
      {
        label: "Proforma builder",
        to: "/management/sales/proforma",
        icon: FileText,
        departments: ["sales", "customer_service", "management"],
      },
      {
        label: "Invoices & payments",
        to: "/management/billing",
        icon: ReceiptText,
        departments: ["sales", "finance", "management"],
      },
    ],
  },
  {
    label: "People & payroll",
    icon: Banknote,
    items: [
      {
        label: "Staff directory & roles",
        to: "/management/staff",
        icon: UserCog,
        departments: ["management"],
      },
      {
        label: "Payroll workspace",
        to: "/management/payroll",
        icon: Banknote,
        roles: ["admin"],
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
  const isAdmin = user?.role === "admin";
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
          items: group.items.filter(
            (item) =>
              isAdmin ||
              ((!item.roles || item.roles.includes(user?.role || "")) &&
                (!item.companies ||
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
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-100 text-gray-700">
      <div
        className={`flex h-28 items-center border-b border-gray-200 ${sidebarOpen ? "justify-between px-5" : "justify-center px-3"}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={logo}
            alt="CANA"
            className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-sm"
          />
          {sidebarOpen && (
            <div>
              <p className="text-2xl font-extrabold tracking-[0.08em] text-gray-950">
                CANA
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
                Operations hub
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="hidden rounded-lg p-2 text-gray-700 hover:bg-gray-300 lg:block"
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
        <NavLink
          to="/"
          end
          title={!sidebarOpen ? "View CANA website" : undefined}
          className="mb-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-300 hover:text-gray-900"
        >
          <House size={19} />
          {sidebarOpen && "View CANA website"}
        </NavLink>
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
                    : navigate(group.items[0].to)
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
                  {group.items.map((item) => {
                    const ChildIcon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-red-600/15 font-semibold text-red-700" : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`
                        }
                      >
                        <ChildIcon size={16} />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <footer
        className={`border-t border-gray-200 px-3 py-4 ${sidebarOpen ? "" : "text-center"}`}
      >
        {sidebarOpen ? (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
              CANA Operations
            </p>
            <p className="mt-1 text-xs text-gray-400">
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
