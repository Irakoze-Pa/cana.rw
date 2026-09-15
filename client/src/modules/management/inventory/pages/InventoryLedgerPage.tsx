import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, ClipboardList, FileBarChart, PackageCheck, Printer, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { printCanaDocument } from "../../utils/printCanaDocument";

type View = "movements" | "receipts" | "reports";
type Transaction = { _id: string; rawMaterialName: string; rawMaterialCode: string; type: string; quantity: number; unit: string; unitCost: number; totalCost?: number; quantityBefore: number; quantityAfter: number; transactionDate: string; referenceType?: string; lotNumber?: string; reason?: string };

const content: Record<View, { title: string; icon: typeof ClipboardList }> = {
  movements: { title: "Stock movements", icon: ClipboardList },
  receipts: { title: "Goods receipts", icon: PackageCheck },
  reports: { title: "Inventory activity report", icon: FileBarChart },
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
      const date = item.transactionDate.slice(0, 10);
      const matchesDate = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
      const matchesSearch = !query || [item.rawMaterialName, item.rawMaterialCode, item.type, item.lotNumber, item.referenceType].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return matchesView && matchesType && matchesDate && matchesSearch;
    });
  }, [fromDate, search, toDate, transactions, typeFilter, view]);

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

  return <div className="space-y-4">
    <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon size={21} /></div><div><p className="cana-section-kicker">Inventory & stores</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{config.title}</h1></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={printRegister} disabled={loading || records.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer size={16} />Print register</button><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></div></div>

    {view === "reports" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Recorded movements" value={number(metrics.movements)} /><Metric label="Materials affected" value={number(metrics.materials)} /><Metric label="Receipt value" value={money(metrics.receiptValue)} /><Metric label="Issued to production" value={number(metrics.issuedQuantity)} /></div>}

    <div className="cana-panel p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative w-full xl:max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search material, code, lot, reference" className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100" /></div><div className="flex flex-wrap items-center gap-2"><input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"/><input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"/>{view !== "receipts" && <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-red-400"><option value="All">All types</option><option value="Purchase">Purchase</option><option value="Production Issue">Production issue</option><option value="Production Return">Production return</option><option value="Adjustment">Adjustment</option><option value="Opening Balance">Opening balance</option></select>}<span className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-500"><strong className="text-gray-900">{records.length}</strong></span></div></div></div>

    <div className="cana-panel overflow-hidden">{loading ? <p className="p-8 text-sm text-gray-500">Loading…</p> : error ? <div className="p-8"><p className="text-sm text-red-600">{error}</p><button type="button" onClick={() => void load()} className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700">Try again</button></div> : records.length === 0 ? <EmptyState view={view} onOpen={() => navigate(workflow.to)} label={workflow.label} /> : <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500"><tr><th>Date</th><th>Material</th><th>Movement</th><th>Quantity</th><th>Balance</th><th>Lot / reference</th></tr></thead><tbody className="divide-y divide-gray-100">{records.map((item) => <tr key={item._id} className="transition hover:bg-gray-50/70"><td className="whitespace-nowrap text-gray-500">{new Date(item.transactionDate).toLocaleDateString()}</td><td><p className="font-semibold text-gray-900">{item.rawMaterialName}</p><p className="mt-0.5 text-xs text-gray-500">{item.rawMaterialCode}</p></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone(item.type)}`}>{item.type}</span></td><td className="whitespace-nowrap font-semibold text-gray-800">{number(item.quantity)} {item.unit}</td><td className="whitespace-nowrap text-gray-600">{number(item.quantityBefore)} → {number(item.quantityAfter)}</td><td className="text-gray-500">{item.lotNumber || item.referenceType || "Manual"}</td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="cana-panel p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p></div>; }

function EmptyState({ view, onOpen, label }: { view: View; onOpen: () => void; label: string }) {
  const receipts = view === "receipts";
  return <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">{receipts ? <ArrowDownToLine size={21} /> : <ClipboardList size={21} />}</div><h2 className="mt-5 text-base font-semibold text-gray-900">No records</h2><button type="button" onClick={onOpen} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">{label}<ArrowRight size={16} /></button></div>;
}
