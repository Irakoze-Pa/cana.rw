import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";

import api from "@/services/api";
import { getSuppliers } from "../../suppliers/services/supplierService";
import { getRawMaterials } from "../services/rawMaterialService";
import type { Supplier } from "../../suppliers/types/supplier.types";
import type { RawMaterial } from "../types/rawMaterial.types";

type Offer = {
  _id: string;
  supplierCode?: string;
  unitPrice: number;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  supplier?: { name?: string; code?: string };
  rawMaterial?: { name?: string; code?: string; unit?: string };
};

const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW")} RWF`;
const emptyForm = { supplier: "", rawMaterial: "", supplierCode: "", unitPrice: "", leadTimeDays: "0", minimumOrderQuantity: "0" };

export default function SupplierMaterialOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material._id === form.rawMaterial),
    [materials, form.rawMaterial],
  );

  const load = async () => {
    try {
      setError("");
      const [offerData, supplierData, materialData] = await Promise.all([
        api.get<{ data: Offer[] }>("/supplier-materials"),
        getSuppliers(),
        getRawMaterials(),
      ]);
      setOffers(offerData.data.data || []);
      setSuppliers(supplierData);
      setMaterials(materialData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load supplier offers.");
    }
  };

  useEffect(() => { void load(); }, []);

  const selectMaterial = (rawMaterial: string) => {
    const material = materials.find((item) => item._id === rawMaterial);
    setForm((current) => ({ ...current, rawMaterial, unitPrice: material ? String(material.costPerUnit || 0) : "" }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError("");
      await api.post("/supplier-materials", { ...form, unitPrice: Number(form.unitPrice), leadTimeDays: Number(form.leadTimeDays), minimumOrderQuantity: Number(form.minimumOrderQuantity) });
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save supplier offer.");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="cana-section-kicker">Procurement</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Supplier material offers</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"><Plus size={16} />Add offer</button>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-gray-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Refresh offers"><RefreshCw size={17} /></button>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {open && (
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2"><h2 className="text-sm font-bold text-gray-900">Supplier offer</h2><button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X size={18} /></button></div>
          <select required value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="">Supplier</option>{suppliers.filter((supplier) => supplier.status === "Active").map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.code}</option>)}</select>
          <select required value={form.rawMaterial} onChange={(event) => selectMaterial(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="">Raw material</option>{materials.filter((material) => material.status === "Active").map((material) => <option key={material._id} value={material._id}>{material.name} · {material.code} · {material.unit}</option>)}</select>
          <input value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required type="number" min="0" step="0.01" placeholder={`Unit price${selectedMaterial ? ` · ${selectedMaterial.unit}` : ""}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input value={form.supplierCode} onChange={(event) => setForm({ ...form, supplierCode: event.target.value })} placeholder="Supplier item code · optional" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input type="number" min="0" value={form.leadTimeDays} onChange={(event) => setForm({ ...form, leadTimeDays: event.target.value })} placeholder="Lead time · days" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input type="number" min="0" step="0.01" value={form.minimumOrderQuantity} onChange={(event) => setForm({ ...form, minimumOrderQuantity: event.target.value })} placeholder="Minimum order quantity" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2">Save offer</button>
        </form>
      )}

      <div className="cana-panel overflow-x-auto">
        <table className="min-w-[780px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th>Supplier</th><th>Raw material</th><th>Item code</th><th>Unit price</th><th>Lead time</th><th>MOQ</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {offers.map((offer) => <tr key={offer._id}><td className="font-semibold">{offer.supplier?.name}<span className="block text-xs font-normal text-gray-500">{offer.supplier?.code}</span></td><td>{offer.rawMaterial?.name}<span className="block text-xs text-gray-500">{offer.rawMaterial?.code}</span></td><td>{offer.supplierCode || "—"}</td><td className="font-semibold">{money(offer.unitPrice)}</td><td>{offer.leadTimeDays || 0} days</td><td>{offer.minimumOrderQuantity || 0} {offer.rawMaterial?.unit}</td></tr>)}
            {offers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No supplier offers.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
