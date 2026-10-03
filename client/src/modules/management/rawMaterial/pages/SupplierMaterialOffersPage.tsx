import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, RefreshCw, Search, Tags, X } from "lucide-react";

import { useToast } from "@/context/toastContext";
import api from "@/services/api";
import { getSuppliers } from "../../suppliers/services/supplierService";
import type { Supplier } from "../../suppliers/types/supplier.types";
import { getRawMaterials } from "../services/rawMaterialService";
import type { RawMaterial } from "../types/rawMaterial.types";

type Offer = {
  _id: string;
  supplierCode?: string;
  unitPrice: number;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  status?: "Active" | "Inactive";
  supplier?: { _id?: string; name?: string; code?: string; status?: string };
  rawMaterial?: { _id?: string; name?: string; code?: string; unit?: string; category?: string };
};

type OfferLine = {
  rawMaterial: string;
  supplierCode: string;
  unitPrice: string;
  leadTimeDays: string;
  minimumOrderQuantity: string;
};

type OfferForm = { supplier: string; offers: OfferLine[] };

const emptyLine = (): OfferLine => ({
  rawMaterial: "",
  supplierCode: "",
  unitPrice: "",
  leadTimeDays: "0",
  minimumOrderQuantity: "0",
});

const emptyForm = (): OfferForm => ({ supplier: "", offers: [emptyLine()] });
const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW")} RWF`;

export default function SupplierMaterialOffersPage() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [open, setOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<OfferForm>(emptyForm);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === "Active"),
    [suppliers],
  );
  const activeMaterials = useMemo(
    () => materials.filter((material) => material.status === "Active"),
    [materials],
  );
  const existingOfferKeys = useMemo(
    () => new Set(offers.map((offer) => `${offer.supplier?._id}:${offer.rawMaterial?._id}`)),
    [offers],
  );
  const supplierGroups = useMemo(() => {
    const grouped = new Map<string, { supplier: NonNullable<Offer["supplier"]>; offers: Offer[] }>();
    offers.forEach((offer) => {
      const id = offer.supplier?._id || "unknown";
      const current = grouped.get(id) || { supplier: offer.supplier || { name: "Unknown supplier" }, offers: [] };
      current.offers.push(offer);
      grouped.set(id, current);
    });
    const needle = query.trim().toLowerCase();
    return [...grouped.entries()]
      .map(([id, group]) => ({
        id,
        ...group,
        offers: !needle
          ? group.offers
          : group.offers.filter((offer) => [group.supplier.name, group.supplier.code, offer.rawMaterial?.name, offer.rawMaterial?.code, offer.supplierCode]
            .some((value) => String(value || "").toLowerCase().includes(needle))),
      }))
      .filter((group) => group.offers.length > 0)
      .sort((left, right) => String(left.supplier.name).localeCompare(String(right.supplier.name)));
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

  const openCreate = (supplier = "") => {
    setError("");
    setEditingOffer(null);
    setForm({ supplier, offers: [emptyLine()] });
    setOpen(true);
  };
  const closeForm = () => {
    if (saving) return;
    setOpen(false);
    setEditingOffer(null);
    setForm(emptyForm());
  };
  const updateLine = (index: number, field: keyof OfferLine, value: string) => {
    setForm((current) => {
      const offers = [...current.offers];
      const next = { ...offers[index], [field]: value };
      if (field === "rawMaterial") {
        const material = materials.find((item) => item._id === value);
        next.unitPrice = material ? String(material.costPerUnit || 0) : "";
      }
      offers[index] = next;
      return { ...current, offers };
    });
  };
  const removeLine = (index: number) => {
    setForm((current) => ({
      ...current,
      offers: current.offers.length === 1 ? current.offers : current.offers.filter((_, lineIndex) => lineIndex !== index),
    }));
  };
  const startEdit = (offer: Offer) => {
    const supplier = offer.supplier?._id;
    const rawMaterial = offer.rawMaterial?._id;
    if (!supplier || !rawMaterial) {
      setError("This offer is missing its supplier or material reference and cannot be edited.");
      return;
    }
    setError("");
    setEditingOffer(offer);
    setForm({
      supplier,
      offers: [{
        rawMaterial,
        supplierCode: offer.supplierCode || "",
        unitPrice: String(offer.unitPrice || 0),
        leadTimeDays: String(offer.leadTimeDays || 0),
        minimumOrderQuantity: String(offer.minimumOrderQuantity || 0),
      }],
    });
    setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const preparedOffers = form.offers.map((line) => ({
      ...line,
      unitPrice: Number(line.unitPrice),
      leadTimeDays: Number(line.leadTimeDays),
      minimumOrderQuantity: Number(line.minimumOrderQuantity),
    }));
    if (!form.supplier || preparedOffers.some((line) => !line.rawMaterial || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
      setError("Select a supplier and material for every line, then enter a valid unit price.");
      return;
    }
    if (new Set(preparedOffers.map((line) => line.rawMaterial)).size !== preparedOffers.length) {
      setError("A material can appear only once in this supplier workspace.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      if (editingOffer) {
        await api.patch(`/supplier-materials/${editingOffer._id}`, preparedOffers[0]);
        toast("Supplier offer updated.", "success");
      } else {
        await api.post("/supplier-materials/bulk", { supplier: form.supplier, offers: preparedOffers });
        toast(`${preparedOffers.length} material offer${preparedOffers.length === 1 ? "" : "s"} saved for this supplier.`, "success");
      }
      closeForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save supplier offers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><Tags size={21} /></span><div><p className="cana-section-kicker">Procurement</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Supplier material offers</h1></div></div>
        <div className="flex gap-2"><button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"><Plus size={16} />Supplier offers</button><button type="button" onClick={() => void load()} className="rounded-lg border border-gray-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Refresh offers"><RefreshCw size={17} /></button></div>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3"><OfferMetric label="Active offers" value={offers.filter((offer) => offer.status !== "Inactive").length} /><OfferMetric label="Suppliers covered" value={supplierGroups.length} /><OfferMetric label="Materials covered" value={new Set(offers.map((offer) => offer.rawMaterial?._id).filter(Boolean)).size} /></div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="relative max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier, material, or code" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"/></div></section>

      <div className="space-y-3">
        {supplierGroups.map((group) => <section key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-600 shadow-sm"><Building2 size={17}/></span><div><h2 className="text-sm font-extrabold text-slate-950">{group.supplier.name}</h2><p className="mt-0.5 text-xs text-slate-500">{group.supplier.code || "Supplier"} · {group.offers.length} material{group.offers.length === 1 ? "" : "s"}</p></div></div><button type="button" onClick={() => openCreate(group.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Plus size={14}/>Add material</button></div>
          <div className="divide-y divide-slate-100">{group.offers.sort((left, right) => String(left.rawMaterial?.name).localeCompare(String(right.rawMaterial?.name))).map((offer) => <div key={offer._id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,1.5fr)_minmax(120px,1fr)_100px_120px_auto] sm:items-center"><div><p className="text-sm font-bold text-slate-900">{offer.rawMaterial?.name || "Raw material"}</p><p className="mt-0.5 text-xs text-slate-500">{offer.rawMaterial?.code || "—"}{offer.supplierCode ? ` · ${offer.supplierCode}` : ""}</p></div><p className="text-sm font-extrabold text-slate-950">{money(offer.unitPrice)} <span className="text-xs font-medium text-slate-400">/ {offer.rawMaterial?.unit}</span></p><p className="text-xs font-semibold text-slate-600">{offer.leadTimeDays || 0} days</p><p className="text-xs font-semibold text-slate-600">MOQ {offer.minimumOrderQuantity || 0} {offer.rawMaterial?.unit}</p><button type="button" onClick={() => startEdit(offer)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Pencil size={13}/>Edit</button></div>)}</div>
        </section>)}
        {!supplierGroups.length && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No supplier offers match this view.</div>}
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"><form onSubmit={save} className="mx-auto my-4 max-w-5xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><h2 className="text-base font-extrabold text-slate-950">{editingOffer ? "Update supplier material" : "Supplier materials"}</h2><p className="mt-1 text-xs text-slate-500">{editingOffer ? "Update this supplier’s future purchasing terms." : "Add several raw materials to one supplier. An existing supplier/material pair is updated instead of duplicated."}</p></div><button type="button" onClick={closeForm} disabled={saving} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X size={18}/></button></div>
        <div className="mt-4 max-w-lg"><label className="mb-1.5 block text-xs font-bold text-slate-700">Supplier</label><select required disabled={Boolean(editingOffer) || saving} value={form.supplier} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"><option value="">Select supplier</option>{activeSuppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.code}</option>)}</select></div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><div className="min-w-[820px]"><div className="grid grid-cols-[minmax(210px,1.5fr)_130px_150px_110px_130px_36px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Raw material</span><span>Unit price</span><span>Supplier item code</span><span>Lead time</span><span>MOQ</span><span/></div>{form.offers.map((line, index) => { const selectedMaterial = materials.find((material) => material._id === line.rawMaterial); const existing = Boolean(form.supplier && line.rawMaterial && existingOfferKeys.has(`${form.supplier}:${line.rawMaterial}`)); return <div key={index} className="grid grid-cols-[minmax(210px,1.5fr)_130px_150px_110px_130px_36px] gap-2 border-b border-slate-100 px-3 py-3 last:border-0"><div><select required disabled={Boolean(editingOffer) || saving} value={line.rawMaterial} onChange={(event) => updateLine(index, "rawMaterial", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-50"><option value="">Choose material</option>{activeMaterials.map((material) => <option key={material._id} value={material._id} disabled={form.offers.some((other, otherIndex) => otherIndex !== index && other.rawMaterial === material._id)}>{material.name} · {material.code}</option>)}</select>{existing && <p className="mt-1 text-[10px] font-bold text-amber-700">Existing offer will be updated</p>}</div><input required type="number" min="0" step="0.01" disabled={saving} value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} placeholder={selectedMaterial ? `RWF / ${selectedMaterial.unit}` : "RWF"} className="h-10 rounded-lg border border-slate-200 px-2 text-sm"/><input disabled={saving} value={line.supplierCode} onChange={(event) => updateLine(index, "supplierCode", event.target.value)} placeholder="Optional" className="h-10 rounded-lg border border-slate-200 px-2 text-sm"/><input type="number" min="0" disabled={saving} value={line.leadTimeDays} onChange={(event) => updateLine(index, "leadTimeDays", event.target.value)} className="h-10 rounded-lg border border-slate-200 px-2 text-sm"/><input type="number" min="0" step="0.01" disabled={saving} value={line.minimumOrderQuantity} onChange={(event) => updateLine(index, "minimumOrderQuantity", event.target.value)} placeholder={selectedMaterial?.unit || "Qty"} className="h-10 rounded-lg border border-slate-200 px-2 text-sm"/><button type="button" onClick={() => removeLine(index)} disabled={saving || form.offers.length === 1} className="grid h-10 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label="Remove material line"><X size={16}/></button></div>; })}</div></div>
        {!editingOffer && <button type="button" disabled={saving} onClick={() => setForm((current) => ({ ...current, offers: [...current.offers, emptyLine()] }))} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-red-700 hover:text-red-800"><Plus size={15}/>Add another material</button>}
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : editingOffer ? "Update offer" : `Save ${form.offers.length} material ${form.offers.length === 1 ? "offer" : "offers"}`}</button></div>
      </form></div>}
    </div>
  );
}

function OfferMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p></div>;
}
