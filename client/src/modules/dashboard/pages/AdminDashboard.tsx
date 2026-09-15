import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Factory,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/services/api";

type Person = { fullName?: string };
type SalesOrder = { _id: string; orderNumber: string; status: string; total: number; createdAt?: string; requestedDeliveryDate?: string; customer?: Person };
type Material = { _id: string; name: string; code: string; availableQuantity: number; minimumStock: number; unit: string };
type Invoice = { _id: string; invoiceNumber: string; balance: number; dueDate?: string; customer?: Person };
type Quote = { _id: string; createdAt?: string; customer?: Person; items?: unknown[] };
type Summary = {
  products: number;
  lowStock: number;
  purchaseOrders: number;
  activeBatches: number;
  completedBatches: number;
  openSales: number;
  pendingQuotations: number;
  openProductionOrders: number;
  outstandingInvoices: number;
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
  products: 0, lowStock: 0, purchaseOrders: 0, activeBatches: 0,
  completedBatches: 0, openSales: 0, pendingQuotations: 0,
  openProductionOrders: 0, outstandingInvoices: 0, salesValue: 0,
  deliveredValue: 0, activeEquipment: 0, openCompliance: 0,
  overdueCompliance: 0, recentSales: [], lowMaterials: [],
  outstandingInvoiceList: [], recentQuotations: [], attentionOrders: [],
};

const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })} RWF`;
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en-RW", { day: "2-digit", month: "short" }) : "Not set";
const status = (value: string) => value.replaceAll("_", " ");

export default function AdminDashboard() {
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

  const metrics = [
    { label: "Quotation requests", value: data.pendingQuotations, note: "Waiting for review", to: "/management/quotations", icon: <FileText size={17} /> },
    { label: "Open sales orders", value: data.openSales, note: "Need fulfilment", to: "/management/sales", icon: <ShoppingCart size={17} /> },
    { label: "Production orders", value: data.openProductionOrders, note: `${data.activeBatches} active batches`, to: "/management/production/orders", icon: <Factory size={17} /> },
    { label: "Material risks", value: data.lowStock, note: "At or below minimum", to: "/management/raw-materials", icon: <AlertTriangle size={17} /> },
    { label: "Open procurement", value: data.purchaseOrders, note: "Orders to receive", to: "/management/purchase-orders", icon: <Truck size={17} /> },
    { label: "Outstanding invoices", value: data.outstandingInvoices, note: "Balances to collect", to: "/management/billing", icon: <CircleDollarSign size={17} /> },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="cana-section-kicker text-red-700">Management overview</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Today&apos;s operations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review demand, production, inventory and collections from one practical workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/management/quotations" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"><FileText size={16} />Review quotations</Link>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <HeadlineMetric label="Sales pipeline" value={money(data.salesValue)} />
          <HeadlineMetric label="Delivered value" value={money(data.deliveredValue)} />
          <HeadlineMetric label="Completed batches" value={String(data.completedBatches)} />
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Link key={metric.label} to={metric.to} className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{loading ? "—" : metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.note}</p>
            </div>
            <span className="rounded-lg bg-slate-100 p-2.5 text-slate-700 transition group-hover:bg-red-50 group-hover:text-red-700">{metric.icon}</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="Priority fulfilment" description="Sales orders still moving through delivery." action="View sales" to="/management/sales" icon={<ClipboardList size={17} />}>
          {data.attentionOrders.map((order) => (
            <Link to="/management/sales" key={order._id} className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-bold text-slate-900">{order.orderNumber}</p><p className="mt-0.5 text-xs text-slate-500">{order.customer?.fullName || "Customer"} · delivery {date(order.requestedDeliveryDate)}</p></div>
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
            <Link to="/management/sales" key={order._id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
              <div><p className="text-sm font-bold text-slate-900">{order.orderNumber}</p><p className="mt-0.5 text-xs text-slate-500">{order.customer?.fullName || "Customer"} · {date(order.createdAt)}</p></div>
              <div className="text-right"><p className="text-sm font-bold text-slate-900">{money(order.total)}</p><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">{status(order.status)}</span></div>
            </Link>
          ))}
          {!loading && !data.recentSales.length && <Empty text="No sales orders recorded yet." />}
        </Panel>

        <Panel title="Cash collection" description="Outstanding invoices to follow up." action="Open billing" to="/management/billing" icon={<CircleDollarSign size={17} />}>
          {data.outstandingInvoiceList.map((invoice) => (
            <Link to="/management/billing" key={invoice._id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
              <div><p className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</p><p className="mt-0.5 text-xs text-slate-500">{invoice.customer?.fullName || "Customer"} · due {date(invoice.dueDate)}</p></div>
              <strong className="text-sm text-red-700">{money(invoice.balance)}</strong>
            </Link>
          ))}
          {!loading && !data.outstandingInvoiceList.length && <Empty text="No outstanding invoices to collect." />}
        </Panel>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
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

function HeadlineMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p></div>;
}

function Panel({ title, description, action, to, icon, children }: { title: string; description: string; action: string; to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5"><div className="flex gap-2.5"><span className="mt-0.5 text-red-700">{icon}</span><div><h2 className="text-sm font-extrabold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{description}</p></div></div><Link to={to} className="shrink-0 text-xs font-bold text-red-700 hover:text-red-800">{action}</Link></div><div className="divide-y divide-slate-100">{children}</div></section>;
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-7 text-center text-sm text-slate-500">{text}</p>;
}

function Workspace({ to, title, detail }: { to: string; title: string; detail: string }) {
  return <Link to={to} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-3 transition hover:border-slate-300 hover:bg-slate-50"><div><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div><ArrowRight size={16} className="text-slate-400" /></Link>;
}
