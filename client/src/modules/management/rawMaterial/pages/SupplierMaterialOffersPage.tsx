import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Tags, X } from "lucide-react";

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
  supplier?: { _id?: string; name?: string; code?: string };
  rawMaterial?: { _id?: string; name?: string; code?: string; unit?: string };
};

const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW")} RWF`;
const emptyForm = { supplier: "", rawMaterial: "", supplierCode: "", unitPrice: "", leadTimeDays: "0", minimumOrderQuantity: "0" };

export default function SupplierMaterialOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [open, setOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material._id === form.rawMaterial),
    [materials, form.rawMaterial],
  );
  const visibleOffers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return offers;
    return offers.filter((offer) => [offer.supplier?.name, offer.supplier?.code, offer.rawMaterial?.name, offer.rawMaterial?.code, offer.supplierCode].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [offers, query]);

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
      const payload = { ...form, unitPrice: Number(form.unitPrice), leadTimeDays: Number(form.leadTimeDays), minimumOrderQuantity: Number(form.minimumOrderQuantity) };
      if (editingOffer) await api.patch(`/supplier-materials/${editingOffer._id}`, payload);
      else await api.post("/supplier-materials", payload);
      setOpen(false);
      setForm(emptyForm);
      setEditingOffer(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save supplier offer.");
    }
  };

  const startEdit = (offer: Offer) => {
    const supplier = offer.supplier?._id;
    const rawMaterial = offer.rawMaterial?._id;
    if (!supplier || !rawMaterial) return setError("This offer is missing a supplier or raw-material reference and cannot be edited.");
    setEditingOffer(offer);
    setForm({ supplier, rawMaterial, supplierCode: offer.supplierCode || "", unitPrice: String(offer.unitPrice || 0), leadTimeDays: String(offer.leadTimeDays || 0), minimumOrderQuantity: String(offer.minimumOrderQuantity || 0) });
    setOpen(true);
  };

  const closeForm = () => { setOpen(false); setEditingOffer(null); setForm(emptyForm); };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><Tags size={21} /></span><div>
          <p className="cana-section-kicker">Procurement</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Supplier material offers</h1>
        </div></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setEditingOffer(null); setForm(emptyForm); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"><Plus size={16} />Add offer</button>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-gray-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Refresh offers"><RefreshCw size={17} /></button>
        </div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3"><OfferMetric label="Active offers" value={offers.length} /><OfferMetric label="Suppliers covered" value={new Set(offers.map((offer) => offer.supplier?.name).filter(Boolean)).size} /><OfferMetric label="Materials covered" value={new Set(offers.map((offer) => offer.rawMaterial?.name).filter(Boolean)).size} /></div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="relative max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier, material, code" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"/></div></section>

      {open && (<div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6">
        <form onSubmit={save} className="mx-auto my-4 grid max-w-2xl gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2"><div><h2 className="text-sm font-bold text-gray-900">{editingOffer ? "Update supplier offer" : "Supplier offer"}</h2><p className="mt-0.5 text-xs text-gray-500">{editingOffer ? "This updates future purchase-order pricing; existing orders remain unchanged." : "Set the supplier’s raw-material price reference."}</p></div><button type="button" onClick={closeForm} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X size={18} /></button></div>
          <select required disabled={Boolean(editingOffer)} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Supplier</option>{suppliers.filter((supplier) => supplier.status === "Active").map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.code}</option>)}</select>
          <select required disabled={Boolean(editingOffer)} value={form.rawMaterial} onChange={(event) => selectMaterial(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Raw material</option>{materials.filter((material) => material.status === "Active").map((material) => <option key={material._id} value={material._id}>{material.name} · {material.code} · {material.unit}</option>)}</select>
          <input value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required type="number" min="0" step="0.01" placeholder={`Unit price${selectedMaterial ? ` · ${selectedMaterial.unit}` : ""}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input value={form.supplierCode} onChange={(event) => setForm({ ...form, supplierCode: event.target.value })} placeholder="Supplier item code · optional" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input type="number" min="0" value={form.leadTimeDays} onChange={(event) => setForm({ ...form, leadTimeDays: event.target.value })} placeholder="Lead time · days" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <input type="number" min="0" step="0.01" value={form.minimumOrderQuantity} onChange={(event) => setForm({ ...form, minimumOrderQuantity: event.target.value })} placeholder="Minimum order quantity" className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2">{editingOffer ? "Update offer" : "Save offer"}</button>
        </form></div>
      )}

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-[780px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th>Supplier</th><th>Raw material</th><th>Item code</th><th>Unit price</th><th>Lead time</th><th>MOQ</th><th className="text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {visibleOffers.map((offer) => <tr key={offer._id}><td className="font-semibold">{offer.supplier?.name}<span className="block text-xs font-normal text-gray-500">{offer.supplier?.code}</span></td><td>{offer.rawMaterial?.name}<span className="block text-xs text-gray-500">{offer.rawMaterial?.code}</span></td><td>{offer.supplierCode || "—"}</td><td className="font-semibold">{money(offer.unitPrice)}</td><td>{offer.leadTimeDays || 0} days</td><td>{offer.minimumOrderQuantity || 0} {offer.rawMaterial?.unit}</td><td className="text-right"><button type="button" onClick={() => startEdit(offer)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Pencil size={13} />Edit</button></td></tr>)}
            {visibleOffers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No supplier offers match this view.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">{visibleOffers.map((offer) => <article key={offer._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold text-slate-950">{offer.rawMaterial?.name || "Raw material"}</p><p className="mt-0.5 text-xs text-slate-500">{offer.rawMaterial?.code || "—"} · {offer.supplier?.name || "Supplier"}</p></div><button type="button" onClick={() => startEdit(offer)} className="rounded-lg border border-slate-200 p-2 text-slate-600"><Pencil size={15}/></button></div><div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><p className="text-xs text-slate-500">Unit price</p><p className="mt-0.5 font-extrabold">{money(offer.unitPrice)}</p></div><div><p className="text-xs text-slate-500">Lead time</p><p className="mt-0.5 font-bold">{offer.leadTimeDays || 0} days</p></div></div></article>)}{!visibleOffers.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No supplier offers match this view.</p>}</div>
    </div>
  );
}

function OfferMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p></div>; }
