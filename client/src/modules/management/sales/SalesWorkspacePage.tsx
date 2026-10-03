import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CreditCard, FileText, PackageCheck, ReceiptText, RefreshCw, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/services/api";

type Order = { _id: string; status: string };
type Quote = { _id: string; status: string };
type Invoice = { _id: string; balance?: number; status?: string };

const money = (value: number) => Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });

function Metric({ label, value, icon: Icon, to }: { label: string; value: string | number; icon: typeof FileText; to: string }) {
  return <Link to={to} className="cana-panel group p-4 transition hover:border-slate-300 hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p></div><span className="rounded-lg bg-slate-100 p-2 text-slate-600 transition group-hover:bg-white"><Icon size={17}/></span></div></Link>;
}

function ActionRow({ number, title, detail, to }: { number: number; title: string; detail: string; to: string }) {
  return <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"><span className="grid h-8 min-w-8 place-items-center rounded-lg bg-slate-950 text-xs font-extrabold text-white">{number}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span><ArrowRight size={16} className="text-slate-400"/></Link>;
}

export default function SalesWorkspacePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [orderData, quoteData, invoiceData] = await Promise.all([
        api.get<{ data: Order[] }>("/sales-orders"),
        api.get<{ data: Quote[] }>("/quotations"),
        api.get<{ data: Invoice[] }>("/billing/invoices"),
      ]);
      setOrders(orderData.data.data || []);
      setQuotes(quoteData.data.data || []);
      setInvoices(invoiceData.data.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load sales activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    quotes: quotes.filter((item) => item.status.toLowerCase() === "pending").length,
    submitted: orders.filter((item) => ["draft", "submitted"].includes(item.status)).length,
    ready: orders.filter((item) => item.status === "ready_for_delivery").length,
    outstanding: invoices.filter((item) => item.status !== "void").reduce((sum, item) => sum + Number(item.balance || 0), 0),
  }), [orders, quotes, invoices]);

  return <div className="mx-auto max-w-6xl space-y-4 pb-6">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="cana-section-kicker">Sales & finance</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Sales & order desk</h1></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</button><Link to="/management/sales/orders" className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800"><ShoppingCart size={15}/>Order register</Link></div></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Quotes to review" value={loading ? "—" : summary.quotes} icon={FileText} to="/management/quotations"/><Metric label="Orders to confirm" value={loading ? "—" : summary.submitted} icon={ShoppingCart} to="/management/sales/orders"/><Metric label="Ready for delivery" value={loading ? "—" : summary.ready} icon={PackageCheck} to="/management/sales/fulfilment"/><Metric label="Customer balance due" value={loading ? "—" : `${money(summary.outstanding)} RWF`} icon={ReceiptText} to="/management/billing"/></section>
    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="cana-panel p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Work queue</p><h2 className="mt-1 text-base font-extrabold text-slate-950">What needs attention</h2></div><Link to="/management/sales/orders" className="text-xs font-bold text-red-700 hover:text-red-800">View orders</Link></div><div className="mt-4 space-y-2"><ActionRow number={summary.quotes} title="Review quotation requests" detail="Approve, decline, or convert a customer request into an order." to="/management/quotations"/><ActionRow number={summary.submitted} title="Confirm customer orders" detail="Set agreed prices and prepare confirmed orders for fulfilment." to="/management/sales/orders"/><ActionRow number={summary.ready} title="Arrange delivery or pickup" detail="Complete ready orders and keep finished-goods stock accurate." to="/management/sales/fulfilment"/></div></div><div className="cana-panel p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Finance</p><h2 className="mt-1 text-base font-extrabold text-slate-950">Invoices & payments</h2><p className="mt-2 text-sm leading-6 text-slate-600">Issue invoices from confirmed orders, record payments, and track balances by customer.</p><Link to="/management/billing" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800"><CreditCard size={15}/>Open finance workspace</Link><div className="mt-3 grid grid-cols-2 gap-2"><Link to="/management/sales/proforma" className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">Proformas</Link><Link to="/management/reports" className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">Reports</Link></div></div></section>
  </div>;
}
