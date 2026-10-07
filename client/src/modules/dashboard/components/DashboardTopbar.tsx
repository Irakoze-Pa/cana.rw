import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShoppingCart,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import api from "@/services/api";

type Notice = {
  id: string;
  title: string;
  description: string;
  to: string;
  tone: "red" | "amber" | "blue" | "green";
  kind: "quote" | "order" | "production" | "stock" | "billing";
};
type RecordData = Record<string, unknown>;
const titles: Record<string, string> = {
  "/management": "Operations overview",
  "/management/raw-materials": "Raw materials",
  "/management/inventory/finished-goods": "Finished goods & transfers",
  "/management/inventory": "Inventory control",
  "/management/production": "Production workspace",
  "/management/purchase-orders": "Procurement",
  "/management/sales": "Sales & orders",
  "/management/sales/orders": "Sales orders",
  "/management/sales/fulfilment": "Fulfilment & delivery",
  "/management/billing": "Invoices & payments",
  "/management/accounting": "Finance & accounting",
  "/management/reports": "Operational reports",
  "/management/general-report": "General activity report",
  "/management/staff": "Staff & access",
  "/management/payroll": "Payroll workspace",
  "/management/sites": "Site management",
  "/management/compliance": "Factory compliance",
  "/management/profile": "Profile & settings",
  "/dashboard": "My workspace",
  "/dashboard/quotations": "My quotations",
  "/dashboard/orders": "My orders",
  "/dashboard/products": "Products",
  "/dashboard/request-quote": "Request quotation",
};
const icons = {
  quote: FileText,
  order: ShoppingCart,
  production: Settings2,
  stock: TriangleAlert,
  billing: ReceiptText,
};
const tones = {
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-slate-50 text-slate-700",
  green: "bg-emerald-50 text-emerald-700",
};
const rows = (payload: unknown): RecordData[] =>
  Array.isArray((payload as { data?: unknown[] })?.data)
    ? (payload as { data: RecordData[] }).data
    : [];
const countText = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export default function DashboardTopbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [now, setNow] = useState(new Date());
  const noticeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isManagement =
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "staff";
  const title = useMemo(
    () =>
      Object.entries(titles)
        .sort(([left], [right]) => right.length - left.length)
        .find(
          ([path]) =>
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`),
        )?.[1] || (isManagement ? "CANA operations" : "My workspace"),
    [location.pathname, isManagement],
  );
  const initials =
    user?.fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const storageKey = `cana-notice-dismissed:${user?._id || "anonymous"}`;

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch {
      setDismissed([]);
    }
  }, [storageKey]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const closeOpenMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (noticeOpen && !noticeRef.current?.contains(target)) {
        setNoticeOpen(false);
      }
      if (profileOpen && !profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNoticeOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOpenMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOpenMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [noticeOpen, profileOpen]);
  useEffect(() => {
    setNoticeOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const loadNotices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!isManagement) {
        const [quoteResult, orderResult] = await Promise.allSettled([
          api.get("/quotations/my"),
          api.get("/sales-orders/my"),
        ]);
        const quotes =
          quoteResult.status === "fulfilled"
            ? rows(quoteResult.value.data)
            : [];
        const orders =
          orderResult.status === "fulfilled"
            ? rows(orderResult.value.data)
            : [];
        const reviewed = quotes.filter((quote) =>
          ["Reviewed", "Approved", "Rejected"].includes(String(quote.status)),
        );
        const activeOrders = orders.filter(
          (order) =>
            !["delivered", "cancelled"].includes(
              String(order.status).toLowerCase(),
            ),
        );
        setNotices([
          ...(reviewed.length
            ? [
                {
                  id: `customer-quotes-${reviewed.map((quote) => `${quote._id}:${quote.status}`).join(",")}`,
                  title: "Quotation update",
                  description: `${countText(reviewed.length, "quotation")} has been reviewed.`,
                  to: "/dashboard/quotations",
                  tone: "blue" as const,
                  kind: "quote" as const,
                },
              ]
            : []),
          ...(activeOrders.length
            ? [
                {
                  id: `customer-orders-${activeOrders.map((order) => `${order._id}:${order.status}`).join(",")}`,
                  title: "Order in progress",
                  description: `${countText(activeOrders.length, "order")} is being processed.`,
                  to: "/dashboard/orders",
                  tone: "green" as const,
                  kind: "order" as const,
                },
              ]
            : []),
        ]);
        return;
      }
      const results = await Promise.allSettled([
        api.get("/quotations"),
        api.get("/sales-orders"),
        api.get("/production-orders"),
        api.get("/production-batches"),
        api.get("/raw-materials"),
        api.get("/billing/invoices"),
        api.get("/finished-goods/balances"),
      ]);
      const [
        quotes,
        orders,
        productionOrders,
        batches,
        materials,
        invoices,
        finishedGoodsBalances,
      ] = results.map((result) =>
        result.status === "fulfilled" ? rows(result.value.data) : [],
      );
      const pendingQuotes = quotes.filter(
        (quote) => quote.status === "Pending",
      );
      const newCustomerOrders = orders.filter(
        (order) => String(order.status).toLowerCase() === "submitted",
      );
      const incompleteOrders = orders.filter(
        (order) =>
          !["submitted", "delivered", "cancelled"].includes(
            String(order.status).toLowerCase(),
          ),
      );
      const openProduction = productionOrders.filter(
        (order) => !["Completed", "Cancelled"].includes(String(order.status)),
      );
      const activeBatches = batches.filter((batch) =>
        ["Ready", "In Progress", "Paused"].includes(String(batch.status)),
      );
      const lowStock = materials.filter(
        (material) =>
          Boolean(material.isLowStock) ||
          (String(material.status) === "Active" &&
            Number(material.availableQuantity ?? material.quantity ?? 0) <=
              Number(material.minimumStock ?? 0)),
      );
      const lowProductionPacks = finishedGoodsBalances.filter((balance) => {
        const product = balance.product as RecordData | undefined;
        const packSizeKg = Number(product?.packSizeKg || 0);
        return (
          balance.store === "production" &&
          product?.baseUnit !== "pcs" &&
          Number.isFinite(packSizeKg) &&
          packSizeKg > 0 &&
          Number(balance.quantity || 0) / packSizeKg < 30
        );
      });
      const unpaidInvoices = invoices.filter(
        (invoice) =>
          Number(invoice.balance || 0) > 0 &&
          String(invoice.status).toLowerCase() !== "void",
      );
      setNotices([
        ...(pendingQuotes.length
          ? [
              {
                id: `quotes-${pendingQuotes.map((quote) => quote._id).join(",")}`,
                title: "New quotation requests",
                description: `${countText(pendingQuotes.length, "customer quotation")} awaiting sales review.`,
                to: "/management/quotations",
                tone: "red" as const,
                kind: "quote" as const,
              },
            ]
          : []),
        ...(newCustomerOrders.length
          ? [
              {
                id: `new-customer-orders-${newCustomerOrders.map((order) => `${order._id}:${order.createdAt}`).join(",")}`,
                title: "New customer orders",
                description: `${countText(newCustomerOrders.length, "customer order")} submitted for sales review.`,
                to: "/management/sales/orders",
                tone: "red" as const,
                kind: "order" as const,
              },
            ]
          : []),
        ...(incompleteOrders.length
          ? [
              {
                id: `orders-${incompleteOrders.map((order) => `${order._id}:${order.status}`).join(",")}`,
                title: "Sales orders need follow-up",
                description: `${countText(incompleteOrders.length, "order")} not yet completed or delivered.`,
                to: "/management/sales",
                tone: "amber" as const,
                kind: "order" as const,
              },
            ]
          : []),
        ...(lowProductionPacks.length
          ? [
              {
                id: `production-packs-${lowProductionPacks.map((balance) => `${balance._id}:${balance.quantity}`).join(",")}`,
                title: "Production store below 30 packs",
                description: `${lowProductionPacks
                  .slice(0, 3)
                  .map((balance) =>
                    String(
                      (balance.product as RecordData | undefined)?.name ||
                        "Product",
                    ),
                  )
                  .join(
                    ", ",
                  )}${lowProductionPacks.length > 3 ? ` and ${lowProductionPacks.length - 3} more` : ""} ${lowProductionPacks.length === 1 ? "has" : "have"} fewer than 30 packs.`,
                to: "/management/inventory/finished-goods",
                tone: "red" as const,
                kind: "stock" as const,
              },
            ]
          : []),
        ...(openProduction.length
          ? [
              {
                id: `production-${openProduction.map((order) => `${order._id}:${order.status}`).join(",")}`,
                title: "Production work is open",
                description: `${countText(openProduction.length, "production order")} requires planning or execution.`,
                to: "/management/production/orders",
                tone: "blue" as const,
                kind: "production" as const,
              },
            ]
          : []),
        ...(activeBatches.length
          ? [
              {
                id: `batches-${activeBatches.map((batch) => `${batch._id}:${batch.status}`).join(",")}`,
                title: "Batches require attention",
                description: `${countText(activeBatches.length, "batch")} is ready, running, or paused.`,
                to: "/management/production/batches",
                tone: "amber" as const,
                kind: "production" as const,
              },
            ]
          : []),
        ...(lowStock.length
          ? [
              {
                id: `stock-${lowStock.map((material) => `${material._id}:${material.availableQuantity}`).join(",")}`,
                title: "Raw-material stock risk",
                description: `${countText(lowStock.length, "material")} at or below its minimum stock level.`,
                to: "/management/raw-materials",
                tone: "red" as const,
                kind: "stock" as const,
              },
            ]
          : []),
        ...(unpaidInvoices.length
          ? [
              {
                id: `billing-${unpaidInvoices.map((invoice) => `${invoice._id}:${invoice.balance}`).join(",")}`,
                title: "Outstanding client payments",
                description: `${countText(unpaidInvoices.length, "invoice")} still has a balance to collect.`,
                to: "/management/billing",
                tone: "red" as const,
                kind: "billing" as const,
              },
            ]
          : []),
      ]);
    } finally {
      setLoading(false);
    }
  }, [isManagement, user]);

  useEffect(() => {
    void loadNotices();
    const timer = window.setInterval(() => void loadNotices(), 60000);
    return () => window.clearInterval(timer);
  }, [loadNotices]);
  const visible = notices.filter((notice) => !dismissed.includes(notice.id));
  const dismissAll = () => {
    const next = Array.from(
      new Set([...dismissed, ...notices.map((notice) => notice.id)]),
    );
    setDismissed(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const follow = (notice: Notice) => {
    const next = Array.from(new Set([...dismissed, notice.id]));
    setDismissed(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setNoticeOpen(false);
    navigate(notice.to);
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-300 bg-white/95 px-4 py-2.5 backdrop-blur-xl sm:px-6">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-500">
          CANAN Business Group ·{" "}
          {isManagement ? "Operations" : "Customer portal"}
        </p>
        <h1 className="mt-0.5 truncate text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center gap-2 border-r border-slate-200 pr-3 text-xs font-medium text-slate-500 lg:flex">
          <CalendarDays size={15} />
          {now.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          <span className="mx-1 h-4 border-l border-slate-300" />
          <Clock3 size={15} />
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <button
          type="button"
          onClick={() => navigate(isManagement ? "/management" : "/dashboard")}
          className="hidden h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-950 hover:bg-slate-50 md:inline-flex"
        >
          <LayoutDashboard size={16} />
          Overview
        </button>
        <a
          href="/"
          className="hidden h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-red-700 hover:text-red-700 xl:inline-flex"
        >
          <ExternalLink size={15} />
          Website
        </a>
        <button
          type="button"
          onClick={() => navigate(isManagement ? "/management" : "/dashboard")}
          aria-label="Go to dashboard"
          title="Dashboard"
          className="border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 md:hidden"
        >
          <LayoutDashboard size={19} />
        </button>
        <div ref={noticeRef} className="relative">
          <button
            type="button"
            aria-label="Open notifications"
            aria-haspopup="dialog"
            aria-expanded={noticeOpen}
            onClick={() => {
              setNoticeOpen((value) => !value);
              setProfileOpen(false);
            }}
            className="relative border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-950 hover:bg-slate-50"
          >
            <Bell size={19} />
            {visible.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {visible.length > 9 ? "9+" : visible.length}
              </span>
            )}
          </button>
          {noticeOpen && (
            <section className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="font-bold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">
                    Live operational follow-up
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void loadNotices()}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    title="Refresh"
                  >
                    <RefreshCw
                      size={15}
                      className={loading ? "animate-spin" : ""}
                    />
                  </button>
                  {visible.length > 0 && (
                    <button
                      type="button"
                      onClick={dismissAll}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      title="Mark all read"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNoticeOpen(false)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[28rem] overflow-y-auto p-2">
                {loading && !notices.length ? (
                  <p className="p-5 text-center text-sm text-slate-500">
                    Checking operations…
                  </p>
                ) : visible.length ? (
                  visible.map((notice) => {
                    const Icon = icons[notice.kind];
                    return (
                      <button
                        type="button"
                        key={notice.id}
                        onClick={() => follow(notice)}
                        className="flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[notice.tone]}`}
                        >
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {notice.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                            {notice.description}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-7 text-center">
                    <CheckCheck
                      className="mx-auto text-emerald-500"
                      size={26}
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      You are up to date
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      No current follow-up requires attention.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((value) => !value);
              setNoticeOpen(false);
            }}
            className={`flex h-9 items-center gap-2 border bg-white px-1.5 pr-2.5 transition hover:border-slate-950 hover:bg-slate-50 ${profileOpen ? "border-slate-950" : "border-slate-200"}`}
          >
            <span className="flex h-7 w-7 items-center justify-center bg-slate-950 text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-28 truncate text-sm font-semibold text-slate-900">
                {user?.fullName}
              </span>
              <span className="block text-xs capitalize text-slate-500">
                {user?.role}
              </span>
            </span>
            <ChevronDown
              size={15}
              className={`text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>
          {profileOpen && (
            <div className="absolute right-0 z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="menu">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-950 text-sm font-extrabold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-950">
                      {user?.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {user?.email || user?.phone}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="border border-slate-300 bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                    {user?.role}
                  </span>
                  {(user?.jobTitle || user?.department) && (
                    <span className="truncate border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold capitalize text-slate-500">
                      {user?.jobTitle || user?.department?.replaceAll("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-2">
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/management/profile");
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2.5">
                      <Settings2 size={16} />
                      Profile & settings
                    </span>
                    <span className="text-slate-400">›</span>
                  </button>
                )}
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate("/", { replace: true });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    Sign out securely
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
