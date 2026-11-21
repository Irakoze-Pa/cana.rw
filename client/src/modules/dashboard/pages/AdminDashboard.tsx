import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  MapPinned,
  Megaphone,
  Landmark,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/authContext";
import api from "@/services/api";

type Person = { fullName?: string; phone?: string; businessName?: string };
type SalesOrderItem = { productName: string; productCode?: string; quantity: number; unit: string; packLabel?: string; unitPrice: number; total: number };
type SalesOrder = { _id: string; orderNumber: string; status: string; total: number; createdAt?: string; requestedDeliveryDate?: string; deliveryAddress?: string; customer?: Person; items?: SalesOrderItem[] };
type Invoice = { _id: string; invoiceNumber: string; balance: number; dueDate?: string; customer?: Person };
type Quote = { _id: string; createdAt?: string; customer?: Person; items?: unknown[] };
type Summary = {
  products: number;
  lowStock: number;
  lowRawMaterials: number;
  lowFinishedGoods: number;
  purchaseOrders: number;
  activeBatches: number;
  completedBatches: number;
  openSales: number;
  pendingQuotations: number;
  outstandingInvoices: number;
  outstandingBalance: number;
  overdueInvoices: number;
  salesValue: number;
  deliveredValue: number;
  salesCollectedValue: number;
  salesTrend: Array<{ key: string; label: string; sales: number; delivered: number; collected: number }>;
  monthSalesOrders: number;
  monthDeliveredOrders: number;
  activeEquipment: number;
  openCompliance: number;
  overdueCompliance: number;
  treasuryBalance: number;
  activeTreasuryAccounts: number;
  periodRevenue: number;
  periodExpenses: number;
  netProfit: number;
  supplierPayables: number;
  customerReceivables: number;
  recentSales: SalesOrder[];
  outstandingInvoiceList: Invoice[];
  recentQuotations: Quote[];
  reportingPeriod?: { from: string; to: string };
};

const empty: Summary = {
  products: 0, lowStock: 0, lowRawMaterials: 0, lowFinishedGoods: 0, purchaseOrders: 0, activeBatches: 0,
  completedBatches: 0, openSales: 0, pendingQuotations: 0,
  outstandingInvoices: 0, outstandingBalance: 0, overdueInvoices: 0, salesValue: 0,
  deliveredValue: 0, salesCollectedValue: 0, salesTrend: [], monthSalesOrders: 0, monthDeliveredOrders: 0, activeEquipment: 0, openCompliance: 0,
  overdueCompliance: 0, recentSales: [],
  treasuryBalance: 0, activeTreasuryAccounts: 0, periodRevenue: 0,
  periodExpenses: 0, netProfit: 0, supplierPayables: 0, customerReceivables: 0,
  outstandingInvoiceList: [], recentQuotations: [],
};

const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })} RWF`;
const compactMoney = (value: number) => `${new Intl.NumberFormat("en-RW", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0))} RWF`;
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en-RW", { day: "2-digit", month: "short" }) : "Not set";
const status = (value: string) => value.replaceAll("_", " ");
const isOverdue = (value?: string) => Boolean(value && new Date(value).getTime() < new Date().setHours(0, 0, 0, 0));

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Summary>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ data: Partial<Summary> }>("/dashboard/summary");
      setData({ ...empty, ...response.data.data });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the management overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const isMarketing = user?.role === "staff" && user.department === "marketing";
  const canViewFinance = user?.role === "admin" || user?.role === "superadmin" || (user?.role === "staff" && ["finance", "management"].includes(String(user.department)));
  if (isMarketing) {
    return <MarketingOverview data={data} loading={loading} error={error} onRefresh={load} />;
  }

  const monthLabel = new Date().toLocaleDateString("en-RW", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="overflow-hidden border border-slate-950 bg-slate-950 text-white shadow-[0_18px_50px_-35px_rgba(15,23,42,.8)]">
        <div className="h-1 bg-red-700" />
        <div className="flex flex-col justify-between gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:px-7 lg:py-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-red-400">Executive overview</p>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">{monthLabel}</p>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">Business performance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A clear view of sales, collections, supplier balances and production activity.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
            <Link to="/management/sales" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 sm:px-4 sm:text-sm"><ShoppingCart size={16} />Record a sale</Link>
            <button type="button" onClick={() => void load()} aria-label="Refresh dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-slate-500 sm:px-4 sm:text-sm"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh data</span></button>
          </div>
        </div>
        <div className={`grid border-t border-slate-800 ${canViewFinance ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
          {canViewFinance ? <>
            <HeadlineMetric label="Delivered sales · month" value={money(data.deliveredValue)} compactValue={compactMoney(data.deliveredValue)} detail={`${data.monthDeliveredOrders} delivered order${data.monthDeliveredOrders === 1 ? "" : "s"}`} />
            <HeadlineMetric label="Sales payments · month" value={money(data.salesCollectedValue)} compactValue={compactMoney(data.salesCollectedValue)} detail="Received and cleared" />
            <HeadlineMetric label="Supplier debt" value={money(data.supplierPayables)} compactValue={compactMoney(data.supplierPayables)} detail="Outstanding payables" />
            <HeadlineMetric label="Unpaid sales balance" value={money(data.outstandingBalance)} compactValue={compactMoney(data.outstandingBalance)} detail={`${data.outstandingInvoices} open invoices`} />
          </> : <>
            <HeadlineMetric label="Sales booked · month" value={money(data.salesValue)} compactValue={compactMoney(data.salesValue)} />
            <HeadlineMetric label="Delivered sales · month" value={money(data.deliveredValue)} compactValue={compactMoney(data.deliveredValue)} detail={`${data.monthDeliveredOrders} delivered order${data.monthDeliveredOrders === 1 ? "" : "s"}`} />
          </>}
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-4 bg-slate-100 p-3 sm:p-4">
        <SalesPerformanceChart trend={data.salesTrend} loading={loading} />
      </section>

      {canViewFinance && <FinanceSnapshot data={data} loading={loading} />}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="Recent sales" description="Latest orders entering the commercial workflow." action="All sales" to="/management/sales" icon={<ShoppingCart size={17} />}>
          {data.recentSales.map((order) => (
            <Link to="/management/sales/orders" key={order._id} className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
              <div className="min-w-0"><p className="text-sm font-bold text-slate-900">{order.orderNumber}</p><p className="mt-0.5 text-xs text-slate-500">{order.customer?.businessName || order.customer?.fullName || "Customer"} · {date(order.createdAt)}</p><OrderLines items={order.items} /></div>
              <div className="text-right"><p className="text-sm font-bold text-slate-900">{money(order.total)}</p><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">{status(order.status)}</span></div>
            </Link>
          ))}
          {!loading && !data.recentSales.length && <Empty text="No sales orders recorded yet." />}
        </Panel>

        <Panel title="Cash collection" description="Outstanding invoices to follow up." action="Open billing" to="/management/billing" icon={<CircleDollarSign size={17} />}>
          {data.outstandingInvoiceList.map((invoice) => (
            <Link to="/management/billing" key={invoice._id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
              <div><p className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</p><p className={`mt-0.5 text-xs ${isOverdue(invoice.dueDate) ? "font-bold text-red-700" : "text-slate-500"}`}>{invoice.customer?.businessName || invoice.customer?.fullName || "Customer"} · {isOverdue(invoice.dueDate) ? "overdue" : "due"} {date(invoice.dueDate)}</p></div>
              <strong className="whitespace-nowrap text-sm text-red-700">{money(invoice.balance)}</strong>
            </Link>
          ))}
          {!loading && !data.outstandingInvoiceList.length && <Empty text="No outstanding invoices to collect." />}
        </Panel>
      </section>

      <section className="border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="cana-section-kicker text-slate-500">Workspaces</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">Continue a workflow</h2></div><Boxes size={19} className="text-slate-400" /></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Workspace to="/management/production" title="Production" detail={`${data.activeBatches} active batches`} />
          <Workspace to="/management/purchase-orders" title="Procurement" detail={`${data.purchaseOrders} open purchase orders`} />
          <Workspace to="/management/compliance" title="Factory compliance" detail={data.overdueCompliance ? `${data.overdueCompliance} overdue actions` : `${data.openCompliance} open actions`} />
        </div>
      </section>
    </div>
  );
}

function MarketingOverview({ data, loading, error, onRefresh }: { data: Summary; loading: boolean; error: string; onRefresh: () => void }) {
  const cards = [
    { label: "Quotation requests", value: data.pendingQuotations, note: "Need first response", to: "/management/quotations", icon: FileText },
    { label: "Active customer orders", value: data.openSales, note: "Pipeline to follow", to: "/management/quotations", icon: Megaphone },
    { label: "Active products", value: data.products, note: "Reference products in quotations", to: "/management/quotations", icon: Package },
  ];
  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="cana-section-kicker text-red-700">Marketing workspace</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Leads, quotations and site follow-up</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage customer enquiries, keep project sites current and monitor the commercial pipeline.</p>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>
      </header>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, note, to, icon: Icon }) => <Link key={label} to={to} className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-red-50 group-hover:text-red-700"><Icon size={17} /></span><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-950">{loading ? "—" : value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></Link>)}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel title="Recent quotation requests" description="Start with new customer enquiries." action="Open queue" to="/management/quotations" icon={<FileText size={17} />}>
          {data.recentQuotations.map((quote) => <Link to="/management/quotations" key={quote._id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"><div><p className="text-sm font-bold text-slate-900">{quote.customer?.fullName || "Customer enquiry"}</p><p className="mt-0.5 text-xs text-slate-500">Received {date(quote.createdAt)}</p></div><ArrowRight size={16} className="text-slate-400" /></Link>)}
          {!loading && !data.recentQuotations.length && <Empty text="No pending quotation requests right now." />}
        </Panel>
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700"><MapPinned size={18} /></span><div><p className="text-sm font-extrabold text-slate-950">Field follow-up</p><p className="mt-1 text-xs leading-5 text-slate-500">Keep customer sites, contacts and project progress up to date.</p></div></div><div className="mt-5 space-y-2"><Workspace to="/management/customers" title="Customers" detail="Create and maintain customer contacts" /><Workspace to="/management/sites" title="Site management" detail="Manage locations and field follow-up" /><Workspace to="/management/reports" title="Performance report" detail="Review commercial activity" /></div></section>
      </section>
    </div>
  );
}

function OrderLines({ items = [] }: { items?: SalesOrderItem[] }) {
  if (!items.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1.5">{items.slice(0, 3).map((item, index) => <span key={`${item.productName}-${index}`} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 sm:text-[11px]"><span className="sm:hidden">{item.productName} · {item.quantity} {item.unit === "packs" ? "pack" : item.unit}</span><span className="hidden sm:inline">{item.productName} · {item.quantity} {item.unit === "packs" ? (item.quantity === 1 ? "pack" : "packs") : item.unit}{item.packLabel ? ` (${item.packLabel})` : ""} · {money(item.unitPrice)} each · {money(item.total)}</span></span>)}{items.length > 3 && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:text-[11px]">+{items.length - 3} more</span>}</div>;
}

function FinanceSnapshot({ data, loading }: { data: Summary; loading: boolean }) {
  const items = [
    { label: "Cash, bank & Mobile Money", value: data.treasuryBalance, note: `${data.activeTreasuryAccounts} active account${data.activeTreasuryAccounts === 1 ? "" : "s"}`, icon: Landmark, to: "/management/accounting" },
    { label: "Customer receivables", value: data.customerReceivables, note: `${data.overdueInvoices} overdue invoice${data.overdueInvoices === 1 ? "" : "s"}`, icon: TrendingUp, to: "/management/billing" },
    { label: "Supplier payables", value: data.supplierPayables, note: "Outstanding supplier obligations", icon: WalletCards, to: "/management/supplier-payments" },
    { label: "P&L costs", value: data.periodExpenses, note: "Direct, operating & finance costs this month", icon: TrendingDown, to: "/management/expenses" },
  ];
  return (
    <section className="overflow-hidden border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">Financial position</p><h2 className="mt-0.5 text-base font-extrabold text-slate-950">Cash and obligations</h2></div>
        <Link to="/management/accounting" className="inline-flex items-center gap-1 text-xs font-bold text-red-700">Finance & accounting <ArrowRight size={13} /></Link>
      </div>
      <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ label, value, note, icon: Icon, to }) => (
          <Link key={label} to={to} className="group min-w-0 bg-white p-3.5 transition hover:bg-slate-50 sm:p-4">
            <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p><Icon size={16} className="shrink-0 text-slate-400 group-hover:text-red-700" /></div>
            <p className="mt-2 truncate text-lg font-extrabold text-slate-950 sm:text-xl">{loading ? "—" : money(value)}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{note}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SalesPerformanceChart({ trend, loading }: { trend: Summary["salesTrend"]; loading: boolean }) {
  const [focusedMonthKey, setFocusedMonthKey] = useState("");
  const width = 720;
  const height = 260;
  const left = 62;
  const right = 20;
  const top = 18;
  const bottom = 36;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const max = Math.max(1, ...trend.flatMap((item) => [item.sales, item.delivered, item.collected]));
  const x = (index: number) => left + (trend.length <= 1 ? chartWidth / 2 : (index / (trend.length - 1)) * chartWidth);
  const y = (value: number) => top + chartHeight - (Math.max(0, value) / max) * chartHeight;
  const focusedMonth = trend.find((item) => item.key === focusedMonthKey) || trend[trend.length - 1];
  const series = [
    { key: "sales" as const, name: "Sales booked", color: "#111827" },
    { key: "delivered" as const, name: "Delivered", color: "#b91c1c" },
    { key: "collected" as const, name: "Payments received", color: "#64748b" },
  ];
  const yTicks = [0, 1 / 3, 2 / 3, 1];
  return (
    <section className="overflow-hidden border border-slate-200 bg-white" aria-label="Sales performance chart">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-700">Commercial performance</p><h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">Sales performance</h2><p className="mt-1 text-xs text-slate-500">Six months · values in RWF</p></div>
        <span className="hidden h-10 w-10 items-center justify-center border border-slate-200 bg-slate-50 text-slate-600 sm:flex"><BarChart3 size={18} /></span>
      </div>
      <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
        {series.map((item) => <div key={item.key} className="min-w-0 bg-white px-3 py-3 sm:px-5"><p className="flex items-center gap-1.5 truncate text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[10px]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</p><p className="mt-1.5 truncate text-sm font-extrabold text-slate-950 sm:text-lg">{loading || !focusedMonth ? "—" : <><span className="sm:hidden">{compactMoney(focusedMonth[item.key])}</span><span className="hidden sm:inline">{money(focusedMonth[item.key])}</span></>}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{focusedMonth?.label || "Selected month"}</p></div>)}
      </div>
      <div className="p-3 sm:p-5">
        <div className="hidden sm:block">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2" aria-label="Chart legend">{series.map((item) => <span key={item.key} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><span className="h-[3px] w-5" style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Six-month trend comparing sales booked, delivered sales, and payments received, in RWF" className="h-[260px] w-full">
          <title>Sales performance for the last six months</title>
          {yTicks.map((fraction) => {
            const value = max * fraction;
            const yy = y(value);
            return <g key={fraction}><line x1={left} y1={yy} x2={width - right} y2={yy} stroke="#e2e8f0" strokeDasharray={fraction === 0 ? undefined : "3 5"} /><text x={left - 10} y={yy + 4} textAnchor="end" fill="#64748b" fontSize="10">{new Intl.NumberFormat("en-RW", { notation: "compact", maximumFractionDigits: 0 }).format(value)}</text></g>;
          })}
          {focusedMonth && <line x1={x(trend.findIndex((row) => row.key === focusedMonth.key))} y1={top} x2={x(trend.findIndex((row) => row.key === focusedMonth.key))} y2={height - bottom} stroke="#cbd5e1" strokeDasharray="3 4" />}
          {series.map((item) => {
            const points = trend.map((row, index) => `${x(index)},${y(Number(row[item.key] || 0))}`).join(" ");
            return <g key={item.key}><polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{trend.map((row, index) => <circle key={row.key} cx={x(index)} cy={y(Number(row[item.key] || 0))} r={focusedMonth?.key === row.key ? "5" : "3.5"} fill="white" stroke={item.color} strokeWidth={focusedMonth?.key === row.key ? "3" : "2"}><title>{`${row.label}: ${item.name} ${money(Number(row[item.key] || 0))}`}</title></circle>)}</g>;
          })}
          {trend.map((row, index) => <text key={row.key} x={x(index)} y={height - 10} textAnchor="middle" fill={focusedMonth?.key === row.key ? "#111827" : "#64748b"} fontSize="11" fontWeight={focusedMonth?.key === row.key ? "800" : "600"} className="cursor-pointer" role="button" tabIndex={0} onMouseEnter={() => setFocusedMonthKey(row.key)} onFocus={() => setFocusedMonthKey(row.key)} onClick={() => setFocusedMonthKey(row.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setFocusedMonthKey(row.key); }}>{row.label}</text>)}
          {loading && <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="12">Loading sales trend…</text>}
          </svg>
        </div>
        <div className="sm:hidden" aria-label="Monthly sales performance chart">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Chart legend">{series.map((item) => <span key={item.key} className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>)}</div>
          {trend.length > 0 ? <div className="relative mt-3 h-36">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">{yTicks.map((tick) => <span key={tick} className="border-t border-dashed border-slate-200" />)}</div>
            <div className="relative grid h-full grid-cols-6 gap-1">
              {trend.map((row) => {
                const focused = focusedMonth?.key === row.key;
                return <button key={row.key} type="button" onClick={() => setFocusedMonthKey(row.key)} aria-pressed={focused} aria-label={`${row.label}. Sales booked ${money(row.sales)}, delivered ${money(row.delivered)}, payments received ${money(row.collected)}`} className={`flex min-w-0 flex-col items-center rounded-md px-0.5 pt-1 transition ${focused ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-slate-50"}`}>
                  <span className="flex w-full flex-1 items-end justify-center gap-0.5 pb-2">
                    {series.map((item) => {
                      const amount = Number(row[item.key] || 0);
                      const barHeight = amount > 0 ? Math.max(2, (amount / max) * 100) : 0;
                      return <span key={item.key} title={`${item.name}: ${money(amount)}`} className="w-1.5 max-w-[5px] rounded-t-sm" style={{ height: `${barHeight}%`, backgroundColor: item.color }} />;
                    })}
                  </span>
                  <span className={`mb-1 truncate text-[9px] font-bold ${focused ? "text-slate-950" : "text-slate-500"}`}>{row.label}</span>
                </button>;
              })}
            </div>
          </div> : <p className="mt-3 border border-slate-200 px-3 py-5 text-center text-xs text-slate-500">{loading ? "Loading sales trend…" : "No sales recorded in this period."}</p>}
          {focusedMonth && <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">Tap a month to update the totals above</p>}
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-500">Payments include cash and cleared cheques. Select a month to review its totals.</p>
      </div>
    </section>
  );
}

function HeadlineMetric({ label, value, compactValue, detail, tone = "default" }: { label: string; value: string; compactValue?: string; detail?: string; tone?: "default" | "positive" | "negative" }) {
  const valueTone = tone === "negative" ? "text-red-400" : "text-white";
  return <div className="min-w-0 border-r border-slate-800 px-3 py-3.5 last:border-r-0 sm:px-4 sm:py-4"><p className="truncate text-[8px] font-extrabold uppercase tracking-[.1em] text-slate-500 sm:text-[10px] sm:tracking-[.13em]">{label}</p><p className={`mt-1.5 truncate text-sm font-extrabold tracking-tight sm:text-lg ${valueTone}`}><span className="sm:hidden">{compactValue || value}</span><span className="hidden sm:inline">{value}</span></p>{detail && <p className="mt-1 truncate text-[9px] font-medium text-slate-400 sm:text-[10px]">{detail}</p>}</div>;
}

function Panel({ title, description, action, to, icon, children }: { title: string; description: string; action: string; to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden border border-slate-200 bg-white"><div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4"><div className="flex gap-2.5"><span className="mt-0.5 text-slate-700">{icon}</span><div><h2 className="text-sm font-extrabold text-slate-950">{title}</h2><p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{description}</p></div></div><Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800 sm:text-xs">{action}<ArrowRight size={13} /></Link></div><div className="max-h-[300px] divide-y divide-slate-100 overflow-y-auto sm:max-h-[360px]">{children}</div></section>;
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-7 text-center text-sm text-slate-500">{text}</p>;
}

function Workspace({ to, title, detail }: { to: string; title: string; detail: string }) {
  return <Link to={to} className="flex items-center justify-between gap-3 border border-slate-200 px-3.5 py-3 transition hover:border-slate-950 hover:bg-slate-50"><div><p className="text-sm font-bold text-slate-950">{title}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div><ArrowRight size={16} className="text-slate-400" /></Link>;
}
