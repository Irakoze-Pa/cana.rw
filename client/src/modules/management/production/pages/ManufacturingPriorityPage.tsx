import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Factory, Flame, Package, RefreshCw, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";

type ProductRef = string | { _id?: string; name?: string; code?: string; unit?: string; baseUnit?: string; packSizeKg?: number } | null;
type SalesItem = { product?: ProductRef; itemType?: string; productName?: string; quantity?: number; stockQuantity?: number; stockUnit?: string; unit?: string; packSizeKg?: number };
type SalesOrder = { _id?: string; orderNumber?: string; status?: string; createdAt?: string; deliveredAt?: string; statusHistory?: { status?: string; at?: string }[]; items?: SalesItem[] };
type Balance = { product?: ProductRef; store?: string; quantity?: number; minimumQuantity?: number };
type Batch = { product?: ProductRef; productName?: string; status?: string; plannedQuantity?: number; actualQuantity?: number };
type Product = { _id: string; name: string; code?: string; baseUnit?: string; unit?: string; packSizeKg?: number; minimumStock?: number };
type Recommendation = { id: string; name: string; code: string; unit: string; sold: number; stock: number; active: number; target: number; priority: number; reason: string };
type Period = 30 | 90 | 180;
const unwrap = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "products", "orders", "balances", "batches"]) {
      if (Array.isArray(record[key])) return record[key] as any[];
      if (record[key] && typeof record[key] === "object") {
        const nested = record[key] as Record<string, unknown>;
        for (const nestedKey of ["data", "products", "orders", "balances", "batches"]) if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as any[];
      }
    }
  }
  return [];
};
const refId = (value?: ProductRef) => typeof value === "string" ? value : String(value?._id || "");
const fmt = (value: number) => Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 1 });
const unitFor = (product: Product) => product.baseUnit === "kg" ? "kg" : product.unit || "units";
const deliveredOn = (order: SalesOrder) => order.deliveredAt || [...(order.statusHistory || [])].reverse().find((entry) => entry.status?.toLowerCase() === "delivered")?.at || order.createdAt || "";

export default function ManufacturingPriorityPage() {
  const [period, setPeriod] = useState<Period>(90);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const [productResponse, orderResponse, balanceResponse, batchResponse] = await Promise.all([
        api.get("/products"), api.get("/sales-orders"), api.get("/finished-goods/balances"), api.get("/production-batches"),
      ]);
      setProducts(unwrap(productResponse.data)); setOrders(unwrap(orderResponse.data));
      setBalances(unwrap(balanceResponse.data)); setBatches(unwrap(batchResponse.data));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load product demand and stock."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const recommendations = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - period); cutoff.setHours(0, 0, 0, 0);
    const soldByProduct = new Map<string, number>();
    for (const order of orders) {
      if (order.status?.toLowerCase() !== "delivered") continue;
      const delivered = new Date(deliveredOn(order)); if (Number.isNaN(delivered.getTime()) || delivered < cutoff) continue;
      for (const item of order.items || []) {
        if (item.itemType === "raw_material") continue;
        const key = refId(item.product) || String(item.productName || "").trim().toLowerCase();
        if (!key) continue;
        const quantity = Number(item.stockQuantity ?? (item.packSizeKg ? Number(item.quantity || 0) * item.packSizeKg : item.quantity) ?? 0);
        soldByProduct.set(key, (soldByProduct.get(key) || 0) + Math.max(0, quantity));
      }
    }
    const stockByProduct = new Map<string, number>();
    for (const balance of balances) {
      const key = refId(balance.product); if (!key) continue;
      stockByProduct.set(key, (stockByProduct.get(key) || 0) + Math.max(0, Number(balance.quantity || 0)));
    }
    const activeByProduct = new Map<string, number>();
    for (const batch of batches) {
      if (!["Planned", "Ready", "In Progress", "Paused"].includes(String(batch.status))) continue;
      const key = refId(batch.product) || String(batch.productName || "").trim().toLowerCase(); if (!key) continue;
      const remaining = Math.max(0, Number(batch.plannedQuantity || 0) - (batch.status === "In Progress" ? Number(batch.actualQuantity || 0) : 0));
      activeByProduct.set(key, (activeByProduct.get(key) || 0) + remaining);
    }
    const scored = products.map((product) => {
      const key = product._id;
      const nameKey = product.name.trim().toLowerCase();
      const sold = soldByProduct.get(key) ?? soldByProduct.get(nameKey) ?? 0;
      const stock = stockByProduct.get(key) || 0;
      const active = activeByProduct.get(key) ?? activeByProduct.get(nameKey) ?? 0;
      const demandPerDay = sold / period;
      const target = Math.max(Number(product.minimumStock || 0), demandPerDay * 30);
      const netShortfall = Math.max(0, target - stock - active);
      const coverageDays = demandPerDay > 0 ? stock / demandPerDay : Infinity;
      const stockUrgency = demandPerDay > 0 ? Math.max(0, 1 - coverageDays / 30) : 0;
      const demandScore = sold > 0 ? Math.min(sold / Math.max(...Array.from(soldByProduct.values(), (v) => v || 0), 1), 1) : 0;
      const priority = Math.round((demandScore * 60 + stockUrgency * 40) * 10) / 10;
      const reason = sold === 0 ? "No delivered sales in this period" : stock <= 0 ? "No finished stock; replenish from recent demand" : coverageDays <= 7 ? "Less than one week of stock at recent sales pace" : coverageDays <= 30 ? "Stock below a 30-day demand target" : "Demand leader; stock currently covers over 30 days";
      return { id: key, name: product.name, code: product.code || "—", unit: unitFor(product), sold, stock, active, target, priority, reason };
    }).filter((row) => row.sold > 0 || row.stock > 0 || row.active > 0);
    return scored.sort((a, b) => b.priority - a.priority || b.sold - a.sold);
  }, [products, orders, balances, batches, period]);
  const topSeller = [...recommendations].sort((a, b) => b.sold - a.sold)[0];
  const urgentCount = recommendations.filter((item) => item.sold > 0 && item.target > item.stock + item.active).length;

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end"><div className="flex gap-3"><span className="rounded-xl bg-red-50 p-3 text-red-700"><Factory size={21}/></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Production planning</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">Manufacturing priorities</h1><p className="mt-1 text-sm text-slate-500">Use delivered demand, available stock, and open batches to decide what to manufacture next.</p></div></div><div className="flex flex-wrap gap-2"><Link to="/management/production/batches" className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800">Open batch planning<ArrowUpRight size={16}/></Link><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Refresh</button></div></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><h2 className="font-extrabold">Demand window</h2><p className="mt-1 text-sm text-slate-500">Only delivered sales count as realized demand.</p></div><div className="flex rounded-xl border p-1" role="group" aria-label="Demand period">{([30, 90, 180] as Period[]).map((days) => <button key={days} onClick={() => setPeriod(days)} aria-pressed={period === days} className={`rounded-lg px-3 py-2 text-sm font-bold ${period === days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Last {days} days</button>)}</div></section>
    <section className="grid gap-3 sm:grid-cols-3"><Metric icon={<Flame size={18}/>} label="Top seller" value={loading ? "Loading…" : topSeller?.name || "No sales yet"} detail={topSeller ? `${fmt(topSeller.sold)} ${topSeller.unit} delivered` : "In selected period"}/><Metric icon={<AlertTriangle size={18}/>} label="Need replenishment" value={loading ? "—" : urgentCount} detail="Demand target above stock and open batches"/><Metric icon={<TrendingUp size={18}/>} label="Products ranked" value={loading ? "—" : recommendations.filter((item) => item.sold > 0).length} detail={`Ranked by sales in the last ${period} days`}/></section>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center gap-2 border-b px-5 py-4"><Package size={18} className="text-slate-500"/><div><h2 className="font-extrabold">Manufacturing recommendation queue</h2><p className="text-xs text-slate-500">Priority combines sales pace (60%) and stock urgency (40%). Replenishment target is 30 days of average demand.</p></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Rank / product</th><th className="px-4 py-3 text-right">Sold</th><th className="px-4 py-3 text-right">Finished stock</th><th className="px-4 py-3 text-right">Open batch output</th><th className="px-4 py-3 text-right">Suggested quantity</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{recommendations.map((item, index) => { const suggestion = Math.max(0, Math.ceil(item.target - item.stock - item.active)); const urgent = suggestion > 0 && item.sold > 0; return <tr key={item.id} className={urgent && index === 0 ? "bg-red-50/60" : ""}><td className="px-4 py-3"><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-red-700 text-white" : "bg-slate-100 text-slate-600"}`}>{index + 1}</span><div><p className="font-bold text-slate-950">{item.name}</p><p className="text-xs text-slate-500">{item.code}</p></div></div></td><td className="whitespace-nowrap px-4 py-3 text-right font-bold">{fmt(item.sold)} {item.unit}</td><td className="whitespace-nowrap px-4 py-3 text-right">{fmt(item.stock)} {item.unit}</td><td className="whitespace-nowrap px-4 py-3 text-right">{fmt(item.active)} {item.unit}</td><td className="whitespace-nowrap px-4 py-3 text-right">{urgent ? <span className="font-extrabold text-red-700">{fmt(suggestion)} {item.unit}</span> : <span className="text-slate-400">0 {item.unit}</span>}</td><td className="min-w-56 px-4 py-3 text-xs text-slate-600">{item.reason}</td><td className="px-4 py-3"><Link to="/management/production/batches" className="whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Plan batch</Link></td></tr>; })}{!loading && !recommendations.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">No product sales, stock, or open batch data found for this period.</td></tr>}</tbody></table></div></section>
    <p className="text-xs leading-5 text-slate-500">Planning aid: the suggested quantity fills the gap to a 30-day demand target after subtracting finished stock and planned or in-progress output. Confirm formula, raw-material availability, and batch sizing before release.</p>
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return <article className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">{icon}{label}</div><p className="mt-3 truncate text-xl font-extrabold text-slate-950" title={String(value)}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}
