import { useEffect, useState } from "react";
import { CalendarClock, Layers, Plus, Printer, RefreshCw, X } from "lucide-react";
import api from "@/services/api";
import { getRawMaterials } from "../services/rawMaterialService";
import type { RawMaterial } from "../types/rawMaterial.types";
import { getSuppliers } from "../../suppliers/services/supplierService";
import type { Supplier } from "../../suppliers/types/supplier.types";
import { printCanaDocument } from "../../utils/printCanaDocument";

type Lot = {
  _id: string;
  lotNumber: string;
  receivedQuantity: number;
  availableQuantity: number;
  unit: string;
  unitCost: number;
  receivedAt: string;
  expiresAt?: string;
  status: string;
  notes?: string;
  rawMaterial?: { name?: string; code?: string };
  supplier?: { name?: string };
};
const statusStyle: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700",
  quarantined: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  consumed: "bg-gray-100 text-gray-600",
};

export default function RawMaterialLotsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier: "",
    lotNumber: "",
    receivedQuantity: "",
    unitCost: "",
    receivedAt: new Date().toISOString().slice(0, 10),
    expiresAt: "",
    status: "available",
    notes: "",
  });
  const loadMaterials = async () => {
    try {
      const [materialData, supplierData] = await Promise.all([getRawMaterials(), getSuppliers()]);
      setMaterials(materialData);
      setSuppliers(supplierData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load raw materials.",
      );
    }
  };
  const loadLots = async (id = materialId) => {
    if (!id) {
      setLots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<{ data: Lot[] }>(
        `/raw-materials/${id}/lots`,
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
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!materialId) return setError("Select a raw material first.");
    try {
      await api.post(`/raw-materials/${materialId}/lots`, {
        ...form,
        receivedQuantity: Number(form.receivedQuantity),
        unitCost: Number(form.unitCost),
        expiresAt: form.expiresAt || undefined,
        lotNumber: form.lotNumber || undefined,
      });
      setOpen(false);
      setForm({
        supplier: "",
        lotNumber: "",
        receivedQuantity: "",
        unitCost: "",
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
  const printReceipt = (lot: Lot) => {
    const material = materials.find((item) => item._id === materialId);
    printCanaDocument({
      title: "Goods receipt",
      reference: lot.lotNumber,
      status: lot.status,
      details: [
        { label: "Raw material", value: material ? `${material.name} · ${material.code}` : lot.rawMaterial?.name },
        { label: "Supplier", value: lot.supplier?.name },
        { label: "Received quantity", value: `${lot.receivedQuantity} ${lot.unit}` },
        { label: "Available quantity", value: `${lot.availableQuantity} ${lot.unit}` },
        { label: "Unit cost", value: `${Number(lot.unitCost || 0).toLocaleString()} RWF` },
        { label: "Receipt value", value: `${(Number(lot.receivedQuantity || 0) * Number(lot.unitCost || 0)).toLocaleString()} RWF` },
        { label: "Received on", value: new Date(lot.receivedAt).toLocaleDateString("en-RW") },
        { label: "Expiry date", value: lot.expiresAt ? new Date(lot.expiresAt).toLocaleDateString("en-RW") : "Not specified" },
      ],
      notes: lot.notes,
    });
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Layers size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Raw-material lots
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track received batches, cost, expiry and quality status. Available
              lots post stock to Inventory.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            disabled={!materialId}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Receive lot
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="text-sm font-semibold text-gray-800">
          Raw material
        </label>
        <select
          value={materialId}
          onChange={(event) => setMaterialId(event.target.value)}
          className="mt-2 h-11 w-full max-w-xl rounded-xl border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="">Select material to view lots</option>
          {materials.map((material) => (
            <option key={material._id} value={material._id}>
              {material.name} · {material.code}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {open && (
        <form
          onSubmit={create}
          className="grid gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-5 md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <h2 className="font-bold">Receive raw-material lot</h2>
              <p className="mt-1 text-xs text-gray-500">
                Available lots are posted to Inventory as a traceable stock
                receipt.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
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
          <input
            required
            type="number"
            min="0.0001"
            step="0.01"
            value={form.receivedQuantity}
            onChange={(event) =>
              setForm({ ...form, receivedQuantity: event.target.value })
            }
            placeholder="Received quantity"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.unitCost}
            onChange={(event) =>
              setForm({ ...form, unitCost: event.target.value })
            }
            placeholder="Cost per unit (RWF)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
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
          <button className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2">
            Save lot and post receipt
          </button>
        </form>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">Lot</th>
              <th className="px-5 py-3">Received</th>
              <th className="px-5 py-3">Available</th>
              <th className="px-5 py-3">Cost</th>
              <th className="px-5 py-3">Expiry</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Select a material to load lots.
                </td>
              </tr>
            ) : (
              lots.map((lot) => (
                <tr key={lot._id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{lot.lotNumber}</p>
                    <p className="text-xs text-gray-500">
                      {lot.supplier?.name}
                    </p>
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
                    {lot.unitCost.toLocaleString()} RWF
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
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => printReceipt(lot)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"><Printer size={13} />Receipt</button></td>
                </tr>
              ))
            )}
            {!loading && lots.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No lots received for this material yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
