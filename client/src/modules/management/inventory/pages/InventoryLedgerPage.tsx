import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, ClipboardList, FileBarChart, PackageCheck, Printer, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { printCanaDocument } from "../../utils/printCanaDocument";

type View = "movements" | "receipts" | "reports";
type Transaction = { _id: string; rawMaterialName: string; rawMaterialCode: string; type: string; quantity: number; unit: string; unitCost: number; totalCost?: number; quantityBefore: number; quantityAfter: number; transactionDate: string; referenceType?: string; lotNumber?: string; reason?: string };

const content: Record<View, { title: string; description: string; icon: typeof ClipboardList }> = {
  movements: { title: "Stock movements", description: "An immutable audit trail of every raw-material receipt, issue, return, and adjustment.", icon: ClipboardList },
  receipts: { title: "Goods receipts", description: "Supplier deliveries posted from approved purchase orders into raw-material stock.", icon: PackageCheck },
  reports: { title: "Inventory activity report", description: "Review material movements, values, and stock activity before printing a report.", icon: FileBarChart },
};

const number = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const money = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const tone = (type: string) => type === "Purchase" || type === "Opening Balance" ? "bg-emerald-50 text-emerald-700" : type === "Production Issue" ? "bg-amber-50 text-amber-700" : type === "Production Return" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-700";

export default function InventoryLedgerPage({ view }: { view: View }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const config = content[view];
  const Icon = config.icon;
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get<{
        data?: Transaction[] | { transactions?: Transaction[]; total?: number };
      }>("/inventory/transactions");
      const payload = response.data?.data;
      setTransactions(
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.transactions)
            ? payload.transactions
            : [],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load inventory transactions.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("cana:stock-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("cana:stock-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  const records = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesView = view !== "receipts" || item.type === "Purchase";
      const matchesType = typeFilter === "All" || item.type === typeFilter;
      const matchesSearch = !query || [item.rawMaterialName, item.rawMaterialCode, item.type, item.lotNumber, item.referenceType].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return matchesView && matchesType && matchesSearch;
    });
  }, [search, transactions, typeFilter, view]);

  const metrics = useMemo(() => {
    const purchases = records.filter((item) => item.type === "Purchase");
    const issues = records.filter((item) => item.type === "Production Issue");
    return { movements: records.length, materials: new Set(records.map((item) => item.rawMaterialCode)).size, receiptValue: purchases.reduce((sum, item) => sum + Number(item.totalCost ?? item.quantity * item.unitCost), 0), issuedQuantity: issues.reduce((sum, item) => sum + Number(item.quantity || 0), 0) };
  }, [records]);

  const printRegister = () => printCanaDocument({
    title: view === "receipts" ? "Goods receipt register" : "Inventory activity report",
    reference: `INV-${new Date().toISOString().slice(0, 10)}`,
    details: [{ label: "Transactions", value: metrics.movements }, { label: "Materials affected", value: metrics.materials }, { label: "Receipt value", value: money(metrics.receiptValue) }, { label: "Production issued", value: number(metrics.issuedQuantity) }],
    table: { headers: ["Date", "Material", "Movement", "Quantity", "Balance", "Reference"], rows: records.map((item) => [new Date(item.transactionDate).toLocaleDateString(), `${item.rawMaterialName} (${item.rawMaterialCode})`, item.type, `${number(item.quantity)} ${item.unit}`, `${number(item.quantityBefore)} → ${number(item.quantityAfter)}`, item.lotNumber || item.referenceType || "Manual"]) },
    notes: "This register is generated from immutable inventory transactions. Corrections are recorded as new adjustments, never by changing historical movements.",
  });

  const workflow = view === "receipts" ? { label: "Open purchase orders", to: "/management/purchase-orders" } : { label: "Open raw-material stock", to: "/management/inventory" };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon size={21} /></div><div><h1 className="text-2xl font-bold tracking-tight text-gray-900">{config.title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{config.description}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={printRegister} disabled={loading || records.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer size={16} />Print register</button><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></div></div>

    {view === "reports" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Recorded movements" value={number(metrics.movements)} /><Metric label="Materials affected" value={number(metrics.materials)} /><Metric label="Receipt value" value={money(metrics.receiptValue)} /><Metric label="Issued to production" value={number(metrics.issuedQuantity)} /></div>}

    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-lg"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search material, code, lot, or reference..." className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100" /></div><div className="flex flex-wrap items-center gap-3">{view !== "receipts" && <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-red-400"><option value="All">All movement types</option><option value="Purchase">Purchase receipt</option><option value="Production Issue">Production issue</option><option value="Production Return">Production return</option><option value="Adjustment">Adjustment</option><option value="Opening Balance">Opening balance</option></select>}<span className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-500"><strong className="text-gray-900">{records.length}</strong> records</span></div></div></div>

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{loading ? <p className="p-8 text-sm text-gray-500">Loading inventory records…</p> : error ? <div className="p-8"><p className="text-sm text-red-600">{error}</p><button type="button" onClick={() => void load()} className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700">Try again</button></div> : records.length === 0 ? <EmptyState view={view} onOpen={() => navigate(workflow.to)} label={workflow.label} /> : <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Material</th><th className="px-5 py-3">Movement</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">Lot / reference</th></tr></thead><tbody className="divide-y divide-gray-100">{records.map((item) => <tr key={item._id} className="transition hover:bg-gray-50/70"><td className="whitespace-nowrap px-5 py-4 text-gray-500">{new Date(item.transactionDate).toLocaleDateString()}</td><td className="px-5 py-4"><p className="font-semibold text-gray-900">{item.rawMaterialName}</p><p className="mt-0.5 text-xs text-gray-500">{item.rawMaterialCode}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(item.type)}`}>{item.type}</span></td><td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-800">{number(item.quantity)} {item.unit}</td><td className="whitespace-nowrap px-5 py-4 text-gray-600">{number(item.quantityBefore)} → {number(item.quantityAfter)}</td><td className="px-5 py-4 text-gray-500"><p>{item.lotNumber || item.referenceType || "Manual"}</p>{item.reason && <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400">{item.reason}</p>}</td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p></div>; }

function EmptyState({ view, onOpen, label }: { view: View; onOpen: () => void; label: string }) {
  const receipts = view === "receipts";
  return <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">{receipts ? <ArrowDownToLine size={21} /> : <ClipboardList size={21} />}</div><h2 className="mt-5 text-base font-semibold text-gray-900">No records match this view</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{receipts ? "Receive an approved purchase order to post a supplier delivery and create a traceable goods receipt." : "Inventory activity appears automatically when stock is received, issued to production, returned, or adjusted."}</p><button type="button" onClick={onOpen} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">{label}<ArrowRight size={16} /></button></div>;
}
