import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CalendarRange, Printer, RefreshCw } from "lucide-react";
import api from "@/services/api";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type Row = { date: string; area: string; activity: string; reference: string; details: string; amount?: number; quantity?: string };
type ReportMode = "daily" | "range";
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const money = (n: number) => Number(n || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const responseRows = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) return (value as { data: any[] }).data;
  return [];
};

export default function GeneralActivityReportPage() {
  const today = localDate(new Date());
  const [mode, setMode] = useState<ReportMode>("daily");
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [lots, orders, payments, supplierPayments, expenses, batches] = await Promise.all([
        api.get("/raw-materials/lots"), api.get("/sales-orders"), api.get("/billing/payments"),
        api.get("/supplier-payments"), api.get("/expenses"), api.get("/production-batches"),
      ]);
      const dateOnly = (value?: string) => String(value || "").slice(0, 10);
      setRows([
        ...responseRows(lots.data).map((x) => ({ date: x.receivedAt, area: "Raw materials", activity: "Goods received", reference: x.grnNumber || x.lotNumber || "—", details: `${x.rawMaterial?.name || "Raw material"} · ${x.supplier?.name || "Supplier"} · Lot ${x.lotNumber || "—"}`, quantity: `${x.receivedQuantity ?? 0} ${x.unit || ""}` })),
        ...responseRows(batches.data).filter((x) => x.status === "Completed").map((x) => ({ date: x.completedAt || x.updatedAt, area: "Production", activity: "Batch completed", reference: x.batchNo || "—", details: x.productName || x.product?.name || "Production batch", quantity: `${x.actualQuantity ?? 0} ${x.unit || "kg"}` })),
        ...responseRows(orders.data).map((x) => ({ date: x.createdAt, area: "Sales", activity: "Sales order", reference: x.orderNumber || "—", details: x.customer?.fullName || x.customer?.businessName || "Customer", amount: Number(x.total || 0) })),
        ...responseRows(payments.data).map((x) => ({ date: x.receivedAt, area: "Customer finance", activity: "Payment received", reference: x.receiptNumber || "—", details: `${x.customer?.fullName || "Customer"} · ${x.invoice?.invoiceNumber || "Invoice"}`, amount: Number(x.amount || 0) })),
        ...responseRows(supplierPayments.data).map((x) => ({ date: x.paidAt, area: "Procurement finance", activity: "Supplier payment", reference: x.paymentNumber || "—", details: `${x.supplier?.name || "Supplier"} · ${x.purchaseOrder?.poNumber || "Purchase order"}`, amount: -Number(x.amount || 0) })),
        ...responseRows(expenses.data).map((x) => ({ date: x.date, area: "Expenses", activity: String(x.category || "Expense").replaceAll("_", " "), reference: x.expenseNumber || "—", details: x.description || "Operational expense", amount: -Number(x.amount || 0) })),
      ].filter((x) => dateOnly(x.date)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load general report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const start = mode === "daily" ? day : from;
  const end = mode === "daily" ? day : to;
  const invalidRange = mode === "range" && from > to;
  const filtered = useMemo(() => rows.filter((x) => {
    const date = String(x.date || "").slice(0, 10);
    return !invalidRange && date >= start && date <= end;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date))), [rows, start, end, invalidRange]);
  const totals = useMemo(() => ({
    in: filtered.filter((x) => (x.amount || 0) > 0).reduce((sum, x) => sum + (x.amount || 0), 0),
    out: filtered.filter((x) => (x.amount || 0) < 0).reduce((sum, x) => sum + Math.abs(x.amount || 0), 0),
    receipts: filtered.filter((x) => x.activity === "Goods received").length,
    production: filtered.filter((x) => x.activity === "Batch completed").length,
  }), [filtered]);
  const setPreset = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    setMode("range");
    setFrom(localDate(startDate));
    setTo(localDate(endDate));
  };
  const print = () => printCanaDocument({
    title: mode === "daily" ? "Daily activity report" : "General activity report",
    reference: `${mode === "daily" ? "DAR" : "GAR"}-${start.replaceAll("-", "")}-${end.replaceAll("-", "")}`,
    status: "Management report",
    details: [
      { label: "Period", value: mode === "daily" ? `Daily · ${start}` : `${start} to ${end}` },
      { label: "Raw-material receipts", value: totals.receipts }, { label: "Completed batches", value: totals.production },
      { label: "Cash received", value: `${money(totals.in)} RWF` }, { label: "Cash paid out", value: `${money(totals.out)} RWF` },
    ],
    table: { headers: ["Date", "Area", "Activity", "Reference", "Details", "Quantity / value"], rows: filtered.map((x) => [String(x.date).slice(0, 10), x.area, x.activity, x.reference, x.details, x.quantity || `${money(x.amount || 0)} RWF`]) },
    notes: "This consolidated register lists goods received, production output, sales, customer receipts, supplier payments, and operational expenses recorded during the selected period.",
  });

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
      <div className="flex gap-3"><span className="rounded-xl bg-slate-100 p-3 text-slate-700"><BarChart3 size={20}/></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Management reporting</p><h1 className="mt-1 text-2xl font-extrabold">Activity report</h1><p className="mt-1 text-sm text-slate-500">Review operations, inventory movement, sales, and finance for any period.</p></div></div>
      <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"><RefreshCw size={16}/>Refresh</button><button onClick={print} disabled={!filtered.length || invalidRange || loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Printer size={16}/>Print report</button></div>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="space-y-4 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report period">
        <button onClick={() => { setMode("daily"); setDay(today); }} aria-pressed={mode === "daily"} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${mode === "daily" ? "bg-slate-900 text-white" : "border text-slate-700 hover:bg-slate-50"}`}><CalendarDays size={16}/>Daily</button>
        <button onClick={() => setMode("range")} aria-pressed={mode === "range"} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${mode === "range" ? "bg-slate-900 text-white" : "border text-slate-700 hover:bg-slate-50"}`}><CalendarRange size={16}/>Custom period</button>
        {mode === "range" && <div className="flex flex-wrap gap-2 sm:ml-2"><button onClick={() => setPreset(7)} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Last 7 days</button><button onClick={() => setPreset(30)} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Last 30 days</button><button onClick={() => { const now = new Date(); setMode("range"); setFrom(localDate(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(today); }} className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">This month</button></div>}
      </div>
      <div className="flex flex-wrap items-end gap-4 border-t pt-4">
        {mode === "daily" ? <label className="text-xs font-bold uppercase text-slate-500">Report date<input aria-label="Report date" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className="mt-1 block rounded-xl border p-2 text-sm text-slate-900"/></label> : <>
          <label className="text-xs font-bold uppercase text-slate-500">From<input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-xl border p-2 text-sm text-slate-900"/></label>
          <label className="text-xs font-bold uppercase text-slate-500">To<input aria-label="To date" type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-xl border p-2 text-sm text-slate-900"/></label>
        </>}
        <p className="ml-auto text-sm font-semibold text-slate-500">{loading ? "Loading report…" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}</p>
      </div>
      {invalidRange && <p role="alert" className="text-sm font-semibold text-red-700">The end date must be on or after the start date.</p>}
      <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4"><div><p className="text-xs font-semibold text-slate-500">Goods received</p><b>{totals.receipts}</b></div><div><p className="text-xs font-semibold text-slate-500">Batches completed</p><b>{totals.production}</b></div><div><p className="text-xs font-semibold text-slate-500">Cash received</p><b>{money(totals.in)} RWF</b></div><div><p className="text-xs font-semibold text-slate-500">Cash paid out</p><b>{money(totals.out)} RWF</b></div></div>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Details</th><th className="px-4 py-3 text-right">Quantity / value</th></tr></thead><tbody className="divide-y">{filtered.map((x, i) => <tr key={`${x.reference}-${i}`}><td className="whitespace-nowrap px-4 py-3">{new Date(x.date).toLocaleDateString("en-RW")}</td><td className="px-4 py-3">{x.area}</td><td className="px-4 py-3">{x.activity}</td><td className="whitespace-nowrap px-4 py-3 font-bold">{x.reference}</td><td className="px-4 py-3">{x.details}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{x.quantity || `${money(x.amount || 0)} RWF`}</td></tr>)}{!loading && !filtered.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">No recorded activity matches this period.</td></tr>}</tbody></table></div></section>
  </div>;
}
