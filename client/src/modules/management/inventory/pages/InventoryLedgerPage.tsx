import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FileBarChart, PackageCheck, RefreshCw } from "lucide-react";
import { apiBaseUrl } from "@/services/api";

type View = "movements" | "receipts" | "reports";
type Transaction = { _id: string; rawMaterialName: string; rawMaterialCode: string; type: string; quantity: number; unit: string; unitCost: number; quantityBefore: number; quantityAfter: number; transactionDate: string; referenceType?: string };

const content: Record<View, { title: string; description: string; icon: typeof ClipboardList }> = {
  movements: { title: "Stock Movements", description: "Immutable record of every raw-material receipt, issue, return, and adjustment.", icon: ClipboardList },
  receipts: { title: "Goods Receipts", description: "Review supplier deliveries recorded as purchase stock receipts.", icon: PackageCheck },
  reports: { title: "Inventory Reports", description: "Review stock movement values and material activity before exporting reports.", icon: FileBarChart },
};

export default function InventoryLedgerPage({ view }: { view: View }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = content[view];
  const Icon = config.icon;

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/inventory/transactions`);
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || result?.message || "Unable to load inventory transactions.");
      const all = Array.isArray(result?.data) ? result.data : [];
      setTransactions(view === "receipts" ? all.filter((item: Transaction) => item.type === "Purchase") : all);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load inventory transactions."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [view]);
  const totalValue = useMemo(() => transactions.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), [transactions]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon size={21} /></div><div><h1 className="text-2xl font-bold text-gray-900">{config.title}</h1><p className="mt-1 text-sm text-gray-500">{config.description}</p></div></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"><RefreshCw size={16} /> Refresh</button></div>
    {view === "reports" && <div className="grid gap-4 sm:grid-cols-3"><Metric label="Transactions" value={String(transactions.length)} /><Metric label="Material value moved" value={totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} /><Metric label="Materials affected" value={String(new Set(transactions.map((item) => item.rawMaterialCode)).size)} /></div>}
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{loading ? <p className="p-8 text-sm text-gray-500">Loading transactions…</p> : error ? <p className="p-8 text-sm text-red-600">{error}</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Material</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">Reference</th></tr></thead><tbody className="divide-y divide-gray-100">{transactions.map((item) => <tr key={item._id}><td className="px-5 py-4 text-gray-500">{new Date(item.transactionDate).toLocaleDateString()}</td><td className="px-5 py-4"><p className="font-semibold text-gray-900">{item.rawMaterialName}</p><p className="text-xs text-gray-500">{item.rawMaterialCode}</p></td><td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{item.type}</span></td><td className="px-5 py-4 font-medium text-gray-800">{item.quantity} {item.unit}</td><td className="px-5 py-4 text-gray-600">{item.quantityBefore} → {item.quantityAfter}</td><td className="px-5 py-4 text-gray-500">{item.referenceType || "Manual"}</td></tr>)}{transactions.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500">No transactions match this view.</td></tr>}</tbody></table></div>}</div>
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{value}</p></div>; }
