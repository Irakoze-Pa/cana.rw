import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, GitBranch, Layers, PackageCheck, Plus, Printer, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import api from "@/services/api";
import { getRawMaterials } from "../services/rawMaterialService";
import type { RawMaterial } from "../types/rawMaterial.types";
import { getSuppliers } from "../../suppliers/services/supplierService";
import type { Supplier } from "../../suppliers/types/supplier.types";
import { printCanaDocument } from "../../utils/printCanaDocument";

type Lot = {
  _id: string;
  grnNumber?: string;
  lotNumber: string;
  receivedQuantity: number;
  availableQuantity: number;
  unit: string;
  unitCost: number;
  receivedAt: string;
  expiresAt?: string;
  status: string;
  notes?: string;
  rawMaterial?: { _id?: string; name?: string; code?: string };
  supplier?: { name?: string };
};
type LotTrace = { lot: Lot; summary: { receivedQuantity: number; availableQuantity: number; issuedQuantity: number; returnedQuantity: number }; transactions: Array<{ _id: string; type: string; quantity: number; unit: string; transactionDate?: string; reason?: string; notes?: string; productionBatch?: { batchNo?: string; batchNumber?: string; productName?: string; status?: string }; productionOrder?: { productionOrderNo?: string } }> };
type OpenPurchaseOrder = { _id: string; poNumber: string; status: string; supplier: string | { _id: string; name: string; code?: string }; items: Array<{ rawMaterial: string | { _id: string; name: string; code?: string; unit?: string }; quantity: number; unit: string }> };
const statusStyle: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700",
  quarantined: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  consumed: "bg-gray-100 text-gray-600",
};

export default function RawMaterialLotsPage() {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [materialId, setMaterialId] = useState(searchParams.get("material") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [trace, setTrace] = useState<LotTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<OpenPurchaseOrder[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState(searchParams.get("purchaseOrder") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    supplier: "",
    lotNumber: "",
    receivedQuantity: "",
    unitCost: "0",
    updateSupplierPrice: false,
    receivedAt: new Date().toISOString().slice(0, 10),
    expiresAt: "",
    status: "available",
    notes: "",
  });
  const loadMaterials = async () => {
    try {
      const [materialData, supplierData, purchaseOrderData] = await Promise.all([getRawMaterials(), getSuppliers(), api.get<{ data: OpenPurchaseOrder[] }>("/purchase-orders")]);
      setMaterials(materialData);
      setSuppliers(supplierData);
      setPurchaseOrders((purchaseOrderData.data.data || []).filter((order) => ["approved", "partially_received"].includes(order.status)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load raw materials.",
      );
    }
  };
  const loadLots = async (id = materialId) => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Lot[] }>(
        id ? `/raw-materials/${id}/lots` : "/raw-materials/lots",
      );
      setLots(response.data.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load material lots.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadMaterials();
    setLoading(false);
  }, []);
  useEffect(() => {
    void loadLots();
  }, [materialId]);
  useEffect(() => {
    if (!purchaseOrderId || !purchaseOrders.length) return;
    const order = purchaseOrders.find((item) => item._id === purchaseOrderId);
    if (!order) return;
    const supplier = typeof order.supplier === "string" ? order.supplier : order.supplier._id;
    const firstItem = order.items[0];
    const rawMaterial = typeof firstItem?.rawMaterial === "string" ? firstItem.rawMaterial : firstItem?.rawMaterial?._id;
    setMaterialId(rawMaterial || "");
    setForm((previous) => previous.supplier ? previous : ({ ...previous, supplier }));
  }, [purchaseOrderId, purchaseOrders]);
  const selectedPurchaseOrder = purchaseOrders.find((order) => order._id === purchaseOrderId);
  const selectPurchaseOrder = (id: string) => {
    setPurchaseOrderId(id);
    const order = purchaseOrders.find((item) => item._id === id);
    if (!order) return;
    const supplier = typeof order.supplier === "string" ? order.supplier : order.supplier._id;
    const firstItem = order.items[0];
    const rawMaterial = typeof firstItem?.rawMaterial === "string" ? firstItem.rawMaterial : firstItem?.rawMaterial?._id;
    setMaterialId(rawMaterial || "");
    setForm((previous) => ({ ...previous, supplier, receivedQuantity: "" }));
  };
  const summary = useMemo(() => {
    const now = new Date();
    const thirtyDays = new Date(now); thirtyDays.setDate(now.getDate() + 30);
    return {
      available: lots.filter((lot) => lot.status === "available").reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0),
      quarantined: lots.filter((lot) => lot.status === "quarantined").length,
      expiring: lots.filter((lot) => lot.expiresAt && new Date(lot.expiresAt) >= now && new Date(lot.expiresAt) <= thirtyDays).length,
      expired: lots.filter((lot) => lot.status === "expired" || (lot.expiresAt && new Date(lot.expiresAt) < now)).length,
    };
  }, [lots]);
  const visibleLots = useMemo(() => lots.filter((lot) => {
    const matchesStatus = statusFilter === "all" || (statusFilter === "attention" ? lot.status === "quarantined" || lot.status === "expired" || (lot.expiresAt && new Date(lot.expiresAt) < new Date()) : lot.status === statusFilter);
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || [lot.grnNumber, lot.lotNumber, lot.rawMaterial?.name, lot.rawMaterial?.code, lot.supplier?.name].some((value) => String(value || "").toLowerCase().includes(search));
    return matchesStatus && matchesSearch;
  }), [lots, query, statusFilter]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!materialId) return setError("Select a raw material first.");
    try {
      await api.post(`/raw-materials/${materialId}/lots`, {
        ...form,
        purchaseOrder: purchaseOrderId || undefined,
        receivedQuantity: form.receivedQuantity.replaceAll(",", ""),
        unitCost: form.unitCost.replaceAll(",", ""),
        expiresAt: form.expiresAt || undefined,
        lotNumber: form.lotNumber || undefined,
      });
      setOpen(false);
      setPurchaseOrderId("");
      setForm({
        supplier: "",
        lotNumber: "",
        receivedQuantity: "",
        unitCost: "0",
        updateSupplierPrice: false,
        receivedAt: new Date().toISOString().slice(0, 10),
        expiresAt: "",
        status: "available",
        notes: "",
      });
      await loadLots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to receive lot.");
    }
  };
  const release = async (lot: Lot) => {
    const rawMaterialId = materialId || lot.rawMaterial?._id;
    if (!rawMaterialId || !window.confirm(`Release ${lot.lotNumber} to available stock after quality approval?`)) return;
    try {
      await api.patch(`/raw-materials/${rawMaterialId}/lots/${lot._id}/release`);
      await loadLots();
      window.dispatchEvent(new Event("cana:stock-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not release this lot.");
    }
  };
  const openTrace = async (lot: Lot) => {
    try {
      setTraceLoading(true);
      setError("");
      const response = await api.get<{ data: LotTrace }>(`/raw-materials/lots/${lot._id}/trace`);
      setTrace(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load lot trace.");
    } finally {
      setTraceLoading(false);
    }
  };
  const printReceipt = (lot: Lot) => {
    const material = materials.find((item) => item._id === materialId);
    printCanaDocument({
      title: "Goods Received Note",
      reference: lot.grnNumber || `GRN-${lot.lotNumber}`,
      status: lot.status === "available" ? "Received and available" : "Received — quality hold",
      details: [
        { label: "Raw material", value: material ? `${material.name} · ${material.code}` : lot.rawMaterial?.name },
        { label: "Supplier lot / batch", value: lot.lotNumber },
        { label: "Supplier", value: lot.supplier?.name },
        { label: "Received quantity", value: `${lot.receivedQuantity} ${lot.unit}` },
        { label: "Available quantity", value: `${lot.availableQuantity} ${lot.unit}` },
        { label: "Received on", value: new Date(lot.receivedAt).toLocaleDateString("en-RW") },
        { label: "Expiry date", value: lot.expiresAt ? new Date(lot.expiresAt).toLocaleDateString("en-RW") : "Not specified" },
      ],
      notes: lot.notes,
    });
  };
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Layers size={21} />
          </div>
          <div>
            <p className="cana-section-kicker">Procurement / inventory</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-950">Material lots & traceability</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            disabled={!materialId}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Record delivery
          </button>
          <button
            onClick={() => void loadLots()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Raw material
            <select value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
              <option value="">All materials</option>{materials.map((material) => <option key={material._id} value={material._id}>{material.name} · {material.code}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Lot status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
              <option value="all">All statuses</option><option value="available">Available</option><option value="quarantined">Quality hold</option><option value="attention">Needs attention</option><option value="expired">Expired</option>
            </select>
          </label>
          <label className="relative text-xs font-bold uppercase tracking-wide text-slate-500">Find a receipt
            <Search className="absolute bottom-3 left-3 text-slate-400" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="GRN, lot, supplier" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium normal-case text-slate-800 placeholder:font-normal" />
          </label>
        </div>
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600 shadow-sm"><PackageCheck size={17} className="mr-2 text-red-700" />{visibleLots.length} receipt{visibleLots.length === 1 ? "" : "s"} shown</div>
      </section>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><LotMetric label="Available in lots" value={materialId ? `${summary.available.toLocaleString()} ${materials.find((item) => item._id === materialId)?.unit || ""}` : `${lots.filter((lot) => lot.status === "available").length} lots`} /><LotMetric label="Quality hold" value={String(summary.quarantined)} tone="amber" /><LotMetric label="Expiring in 30 days" value={String(summary.expiring)} tone="orange" /><LotMetric label="Expired / blocked" value={String(summary.expired)} tone="red" /></section>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"><form
          onSubmit={create}
          className="mx-auto my-4 grid max-w-2xl gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <h2 className="font-bold">Record physical delivery</h2>
              <p className="mt-1 text-sm text-slate-500">Stock is posted only after this delivery is confirmed. Select a purchase order to prefill supplier and material.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <label className="text-sm font-semibold text-gray-700 md:col-span-2">Purchase order (optional)
            <select value={purchaseOrderId} onChange={(event) => selectPurchaseOrder(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
              <option value="">Direct delivery — no purchase order</option>
              {purchaseOrders.map((order) => <option key={order._id} value={order._id}>{order.poNumber} · {typeof order.supplier === "string" ? "Supplier" : order.supplier.name}</option>)}
            </select>
          </label>
          {selectedPurchaseOrder && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 md:col-span-2">Order {selectedPurchaseOrder.poNumber}: record only the quantity physically delivered. The order will remain partially received until every item is received.</p>}
          <input
            value={form.lotNumber}
            onChange={(event) =>
              setForm({ ...form, lotNumber: event.target.value })
            }
            placeholder="Supplier lot number (optional)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <select required value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Select supplier that delivered this lot</option>
            {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.code}</option>)}
          </select>
          <label className="text-sm font-semibold text-gray-700">
            Received quantity ({materials.find((item) => item._id === materialId)?.unit || "kg"})
            <input
              required
              type="text"
              inputMode="decimal"
              value={form.receivedQuantity}
              onChange={(event) =>
                setForm({ ...form, receivedQuantity: event.target.value })
              }
              placeholder="Example: 10000"
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">Actual unit cost (RWF / {materials.find((item) => item._id === materialId)?.unit || "kg"})
            <input type="text" inputMode="decimal" value={form.unitCost === "0" ? "" : form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value || "0" })} placeholder="Use PO / latest price" className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          </label>
          <select
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="available">Available</option>
            <option value="quarantined">
              Quarantined (does not add stock)
            </option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 md:col-span-2"><input type="checkbox" checked={form.updateSupplierPrice} disabled={Number(form.unitCost || 0) <= 0} onChange={(event) => setForm({ ...form, updateSupplierPrice: event.target.checked })} className="h-4 w-4 accent-red-700 disabled:opacity-40" />Use this actual price as the supplier’s reference price for future purchase orders.</label>
          <label className="text-sm text-gray-600">
            Received date
            <input
              type="date"
              value={form.receivedAt}
              onChange={(event) =>
                setForm({ ...form, receivedAt: event.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Expiry date (optional)
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) =>
                setForm({ ...form, expiresAt: event.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <input
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="Receiving / quality notes"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm md:col-span-2"
          />
          <button className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800 md:col-span-2">
            Confirm delivery & post stock
          </button>
        </form></div>
      )}
      {trace && <LotTraceModal trace={trace} onClose={() => setTrace(null)} />}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">GRN / supplier lot</th>
              <th className="px-5 py-3">Received</th>
              <th className="px-5 py-3">Available</th>
              <th className="px-5 py-3">Expiry</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Loading goods received notes.
                </td>
              </tr>
            ) : (
              visibleLots.map((lot) => (
                <tr key={lot._id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{lot.grnNumber || "Legacy receipt"}</p>
                    <p className="text-xs text-gray-500">
                      {lot.supplier?.name} · Lot {lot.lotNumber}
                    </p>
                    <p className="text-xs text-slate-500">{lot.rawMaterial?.name || "Raw material"} · {lot.rawMaterial?.code || "—"}</p>
                  </td>
                  <td className="px-5 py-4">
                    {lot.receivedQuantity} {lot.unit}
                    <span className="block text-xs text-gray-500">
                      {new Date(lot.receivedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {lot.availableQuantity} {lot.unit}
                  </td>
                  <td className="px-5 py-4">
                    {lot.expiresAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={14} />
                        {new Date(lot.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[lot.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {lot.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2">{lot.status === "quarantined" && <button type="button" onClick={() => void release(lot)} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">Release to stock</button>}<button type="button" onClick={() => void openTrace(lot)} disabled={traceLoading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"><GitBranch size={13} />Trace</button><button type="button" onClick={() => printReceipt(lot)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"><Printer size={13} />Receipt</button></div></td>
                </tr>
              ))
            )}
            {!loading && visibleLots.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No goods received notes match this view yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">{loading ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading goods received notes.</p> : visibleLots.map((lot) => <article key={lot._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold text-slate-950">{lot.grnNumber || "Legacy receipt"}</p><p className="mt-1 text-xs text-slate-500">{lot.rawMaterial?.name || "Raw material"} · {lot.rawMaterial?.code || "—"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[lot.status] || "bg-slate-100 text-slate-600"}`}>{lot.status}</span></div><div className="mt-3 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-sm"><div><p className="text-xs text-slate-500">Received</p><p className="mt-0.5 font-bold">{Number(lot.receivedQuantity).toLocaleString()} {lot.unit}</p></div><div><p className="text-xs text-slate-500">Available</p><p className="mt-0.5 font-bold">{Number(lot.availableQuantity).toLocaleString()} {lot.unit}</p></div></div><p className="mt-3 text-xs text-slate-500">{lot.supplier?.name || "Supplier"} · Lot {lot.lotNumber}</p><div className="mt-3 flex flex-wrap gap-2">{lot.status === "quarantined" && <button type="button" onClick={() => void release(lot)} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800">Release</button>}<button type="button" onClick={() => void openTrace(lot)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700">Trace</button><button type="button" onClick={() => printReceipt(lot)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700">Print GRN</button></div></article>)}{!loading && !visibleLots.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No receipts match these filters.</p>}</div>
    </div>
  );
}

function LotTraceModal({ trace, onClose }: { trace: LotTrace; onClose: () => void }) {
  const { lot, summary, transactions } = trace;
  const unit = lot.unit || "kg";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="cana-section-kicker text-red-700">Lot traceability</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">{lot.lotNumber}</h2><p className="mt-1 text-sm text-slate-500">{lot.rawMaterial?.name} · {lot.grnNumber || "Goods receipt"}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-3 sm:grid-cols-4"><TraceMetric label="Received" value={`${summary.receivedQuantity.toLocaleString()} ${unit}`} /><TraceMetric label="Issued" value={`${summary.issuedQuantity.toLocaleString()} ${unit}`} /><TraceMetric label="Returned" value={`${summary.returnedQuantity.toLocaleString()} ${unit}`} /><TraceMetric label="Available" value={`${summary.availableQuantity.toLocaleString()} ${unit}`} /></div><div className="mt-5 overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-100 px-4 py-3"><h3 className="font-extrabold text-slate-900">Movement history</h3></div>{transactions.length ? <div className="divide-y divide-slate-100">{transactions.map((transaction) => <div key={transaction._id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{transaction.type}</p><p className="mt-0.5 text-xs text-slate-500">{transaction.productionBatch?.batchNo ? `${transaction.productionBatch.batchNo} · ${transaction.productionBatch.productName || "Production batch"}` : transaction.reason || "Goods receipt"}</p><p className="mt-0.5 text-xs text-slate-400">{transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleString("en-RW") : "—"}</p></div><strong className={`text-sm ${transaction.type === "Production Return" ? "text-emerald-700" : "text-slate-900"}`}>{transaction.type === "Production Return" ? "+" : ""}{Number(transaction.quantity || 0).toLocaleString()} {transaction.unit || unit}</strong></div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No movement is recorded against this lot yet.</p>}</div></div></section></div>;
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold text-slate-950">{value}</p></div>;
}

function LotMetric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "amber" | "orange" | "red" }) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    orange: "border-orange-200 bg-orange-50 text-orange-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone];
  return <div className={`rounded-2xl border p-4 shadow-sm ${styles}`}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><ShieldCheck size={16} className={tone === "red" ? "text-red-600" : tone === "amber" || tone === "orange" ? "text-amber-600" : "text-slate-500"} /></div><p className="mt-2 text-xl font-extrabold tracking-tight">{value}</p></div>;
}
