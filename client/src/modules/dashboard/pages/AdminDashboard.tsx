import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Factory,
  FileText,
  MapPinned,
  Megaphone,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/authContext";
import api from "@/services/api";

type Person = { fullName?: string; phone?: string; businessName?: string };
type SalesOrderItem = { productName: string; productCode?: string; quantity: number; unit: string; packLabel?: string; unitPrice: number; total: number };
type SalesOrder = { _id: string; orderNumber: string; status: string; total: number; createdAt?: string; requestedDeliveryDate?: string; deliveryAddress?: string; customer?: Person; items?: SalesOrderItem[] };
type Material = { _id: string; name: string; code: string; availableQuantity: number; minimumStock: number; unit: string };
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
  openProductionOrders: number;
  outstandingInvoices: number;
  outstandingBalance: number;
  overdueInvoices: number;
  salesValue: number;
  deliveredValue: number;
  activeEquipment: number;
  openCompliance: number;
  overdueCompliance: number;
  recentSales: SalesOrder[];
  lowMaterials: Material[];
  outstandingInvoiceList: Invoice[];
  recentQuotations: Quote[];
  attentionOrders: SalesOrder[];
};

const empty: Summary = {
  products: 0, lowStock: 0, lowRawMaterials: 0, lowFinishedGoods: 0, purchaseOrders: 0, activeBatches: 0,
  completedBatches: 0, openSales: 0, pendingQuotations: 0,
  openProductionOrders: 0, outstandingInvoices: 0, outstandingBalance: 0, overdueInvoices: 0, salesValue: 0,
  deliveredValue: 0, activeEquipment: 0, openCompliance: 0,
  overdueCompliance: 0, recentSales: [], lowMaterials: [],
  outstandingInvoiceList: [], recentQuotations: [], attentionOrders: [],
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
  if (isMarketing) {
    return <MarketingOverview data={data} loading={loading} error={error} onRefresh={load} />;
  }

  const metrics = [
    { label: "Quotation requests", value: data.pendingQuotations, note: "Waiting for review", to: "/management/quotations", icon: <FileText size={17} /> },
    { label: "Open sales orders", value: data.openSales, note: "Need fulfilment", to: "/management/sales", icon: <ShoppingCart size={17} /> },
    { label: "Production orders", value: data.openProductionOrders, note: `${data.activeBatches} active batches`, to: "/management/production/orders", icon: <Factory size={17} /> },
    { label: "Raw-material risks", value: data.lowRawMaterials, note: "At or below minimum", to: "/management/raw-materials", icon: <AlertTriangle size={17} /> },
    { label: "Finished-goods risks", value: data.lowFinishedGoods, note: "Store balance below minimum", to: "/management/inventory/finished-goods", icon: <Package size={17} /> },
    { label: "Open procurement", value: data.purchaseOrders, note: "Orders to receive", to: "/management/purchase-orders", icon: <Truck size={17} /> },
    { label: "Outstanding invoices", value: data.outstandingInvoices, note: `${data.overdueInvoices} overdue · ${money(data.outstandingBalance)} due`, to: "/management/billing", icon: <CircleDollarSign size={17} /> },
    { label: "Factory actions", value: data.openCompliance, note: `${data.overdueCompliance} overdue`, to: "/management/compliance", icon: <ShieldCheck size={17} /> },
  ];
  const attentionTotal = data.pendingQuotations + data.openSales + data.openProductionOrders + data.lowRawMaterials + data.lowFinishedGoods + data.purchaseOrders + data.outstandingInvoices + data.overdueCompliance;
  const workload = [
    { label: "Quotations", value: data.pendingQuotations, to: "/management/quotations" },
    { label: "Sales orders", value: data.openSales, to: "/management/sales/orders" },
    { label: "Production", value: data.openProductionOrders, to: "/management/production/orders" },
    { label: "Procurement", value: data.purchaseOrders, to: "/management/purchase-orders" },
    { label: "Collections", value: data.outstandingInvoices, to: "/management/billing" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-6">
      <header className="border-b-2 border-slate-950 bg-white pb-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="cana-section-kicker text-red-700">Management overview</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Operations command center</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Sales, production, stock, procurement and collections.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
            <Link to="/management/sales" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 sm:px-4 sm:text-sm"><ShoppingCart size={16} />Sales workspace</Link>
            <button type="button" onClick={() => void load()} aria-label="Refresh dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden border border-slate-200 bg-slate-200">
          <HeadlineMetric label="Sales pipeline" value={money(data.salesValue)} compactValue={compactMoney(data.salesValue)} />
          <HeadlineMetric label="Delivered value" value={money(data.deliveredValue)} compactValue={compactMoney(data.deliveredValue)} />
          <HeadlineMetric label="Items requiring attention" value={String(attentionTotal)} />
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link key={metric.label} to={metric.to} className="group flex min-w-0 items-start justify-between gap-2 bg-white p-3 transition hover:bg-slate-50 sm:p-4">
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 sm:text-xs">{metric.label}</p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">{loading ? "—" : metric.value}</p>
              <p className="mt-1 hidden truncate text-xs text-slate-500 sm:block">{metric.note}</p>
            </div>
            <span className="hidden border border-slate-200 bg-slate-50 p-2.5 text-slate-700 transition group-hover:border-slate-950 group-hover:bg-white sm:block">{metric.icon}</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <SalesRealizationChart pipeline={data.salesValue} delivered={data.deliveredValue} outstanding={data.outstandingBalance} loading={loading} />
        <WorkloadChart items={workload} loading={loading} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="Priority fulfilment" description="Sales orders still moving through delivery." action="View sales" to="/management/sales" icon={<ClipboardList size={17} />}>
          {data.attentionOrders.map((order) => (
            <Link to="/management/sales/orders" key={order._id} className="flex flex-col gap-3 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><p className="text-sm font-bold text-slate-900">{order.orderNumber}</p><p className="mt-0.5 text-xs text-slate-500">{order.customer?.businessName || order.customer?.fullName || "Customer"}{order.customer?.phone ? ` · ${order.customer.phone}` : ""} · delivery {date(order.requestedDeliveryDate)}</p><OrderLines items={order.items} /></div>
              <div className="flex items-center gap-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold capitalize text-amber-700">{status(order.status)}</span><strong className="text-sm text-slate-900">{money(order.total)}</strong></div>
            </Link>
          ))}
          {!loading && !data.attentionOrders.length && <Empty text="No sales orders need fulfilment right now." />}
        </Panel>

        <Panel title="Material watchlist" description="Replenish items before production is affected." action="View materials" to="/management/raw-materials" icon={<Package size={17} />}>
          {data.lowMaterials.map((material) => (
            <Link to="/management/raw-materials" key={material._id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
              <div><p className="text-sm font-bold text-slate-900">{material.name}</p><p className="mt-0.5 text-xs text-slate-500">{material.code} · minimum {material.minimumStock} {material.unit}</p></div>
              <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">{material.availableQuantity} {material.unit}</span>
            </Link>
          ))}
          {!loading && !data.lowMaterials.length && <Empty text="No raw materials are below their minimum level." />}
        </Panel>
      </section>

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

function SalesRealizationChart({ pipeline, delivered, outstanding, loading }: { pipeline: number; delivered: number; outstanding: number; loading: boolean }) {
  const safePipeline = Math.max(0, Number(pipeline || 0));
  const safeDelivered = Math.max(0, Number(delivered || 0));
  const deliveryRate = safePipeline > 0 ? Math.min(100, (safeDelivered / safePipeline) * 100) : 0;
  return (
    <section className="border border-slate-200 bg-white p-4" aria-label="Sales realization chart">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Commercial performance</p><h2 className="mt-1 text-base font-extrabold text-slate-950">Sales realization</h2></div>
        <BarChart3 size={18} className="text-slate-500" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold text-slate-500">Delivered value</p><p className="mt-1 text-2xl font-extrabold text-slate-950"><span className="sm:hidden">{loading ? "—" : compactMoney(safeDelivered)}</span><span className="hidden sm:inline">{loading ? "—" : money(safeDelivered)}</span></p></div><p className="text-right text-sm font-extrabold text-red-700">{loading ? "—" : `${deliveryRate.toFixed(1)}%`}<span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">realized</span></p></div>
      <div className="mt-4 h-3 overflow-hidden bg-slate-200" role="img" aria-label={`${deliveryRate.toFixed(1)} percent of sales pipeline delivered`}><div className="h-full bg-red-700 transition-all" style={{ width: `${deliveryRate}%` }} /></div>
      <div className="mt-4 grid grid-cols-2 gap-px bg-slate-200"><div className="bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total pipeline</p><p className="mt-1 text-sm font-extrabold text-slate-950">{loading ? "—" : money(safePipeline)}</p></div><div className="bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Receivables due</p><p className="mt-1 text-sm font-extrabold text-slate-950">{loading ? "—" : money(outstanding)}</p></div></div>
    </section>
  );
}

function WorkloadChart({ items, loading }: { items: Array<{ label: string; value: number; to: string }>; loading: boolean }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  return (
    <section className="border border-slate-200 bg-white p-4" aria-label="Current workload chart">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Current workload</p><h2 className="mt-1 text-base font-extrabold text-slate-950">Open work by function</h2></div><span className="text-xs font-bold text-slate-500">Live records</span></div>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const width = loading ? 0 : Math.max(item.value > 0 ? 5 : 0, (Number(item.value || 0) / maximum) * 100);
          return <Link key={item.label} to={item.to} className="group grid grid-cols-[92px_1fr_32px] items-center gap-3"><span className="truncate text-xs font-bold text-slate-600">{item.label}</span><span className="h-2.5 overflow-hidden bg-slate-100"><span className="block h-full bg-slate-950 transition-all group-hover:bg-red-700" style={{ width: `${width}%` }} /></span><strong className="text-right text-xs text-slate-950">{loading ? "—" : item.value}</strong></Link>;
        })}
      </div>
    </section>
  );
}

function HeadlineMetric({ label, value, compactValue }: { label: string; value: string; compactValue?: string }) {
  return <div className="min-w-0 bg-white px-2.5 py-3 sm:px-4"><p className="truncate text-[8px] font-extrabold uppercase tracking-[.1em] text-slate-500 sm:text-[10px] sm:tracking-[.13em]">{label}</p><p className="mt-1 truncate text-sm font-extrabold text-slate-950 sm:text-xl"><span className="sm:hidden">{compactValue || value}</span><span className="hidden sm:inline">{value}</span></p></div>;
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
