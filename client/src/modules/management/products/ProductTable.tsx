import { useEffect, useState } from "react";
import { CircleDollarSign, Loader2, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

import type { Product } from "./product.types";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
type Catalogue = "paint" | "scaffold";
type Summary = { total: number; active: number; stockKg: number };

type ProductTableProps = {
  onEdit: (product: Product) => void;
  search?: string;
  category?: string;
  status?: string;
  catalogue?: Catalogue;
  onSummary?: (summary: Summary) => void;
  refreshToken?: number;
};

const isScaffolding = (product: Product) => product.category === "Scaffolding" || /scaffold/i.test(product.name || "");
const money = (value: number) => `${Number(value || 0).toLocaleString()} RWF`;

export default function ProductTable({ onEdit, search = "", category = "", status = "", catalogue = "paint", onSummary, refreshToken = 0 }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const scoped = (items: Product[]) => items.filter((product) => catalogue === "scaffold" ? isScaffolding(product) : !isScaffolding(product));
  const publishSummary = (items: Product[]) => {
    const current = scoped(items);
    onSummary?.({ total: current.length, active: current.filter((product) => product.status === "Active").length, stockKg: current.reduce((sum, product) => sum + Number(product.stock || 0), 0) });
  };
  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error("Failed to load the catalogue.");
      const result = await response.json();
      const next = (result.data || []) as Product[];
      setProducts(next); publishSummary(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to load the catalogue."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [refreshToken, catalogue]);

  const filtered = scoped(products).filter((product) => {
    const text = [product.name, product.code, product.category].filter(Boolean).join(" ").toLowerCase();
    return text.includes(search.toLowerCase()) && (!category || product.category === category) && (!status || product.status === status);
  });
  const equipment = catalogue === "scaffold";

  const deleteProduct = async (product: Product) => {
    setMenuOpen(null);
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    setDeletingId(product._id);
    try {
      const response = await fetch(`${API_URL}/products/${product._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete this item.");
      setProducts((previous) => { const next = previous.filter((item) => item._id !== product._id); publishSummary(next); return next; });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete this item."); }
    finally { setDeletingId(null); }
  };
  const priceSaved = (updated: Product) => {
    setProducts((previous) => { const next = previous.map((item) => item._id === updated._id ? updated : item); publishSummary(next); return next; });
    setPriceProduct(null);
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" />Loading catalogue…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 font-bold underline">Try again</button></div>;
  if (!filtered.length) return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><h2 className="font-extrabold text-slate-950">No {equipment ? "equipment" : "paint products"} found</h2><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p></div>;

  return <><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><p className="cana-section-kicker">Catalogue records</p><h2 className="mt-1 font-extrabold text-slate-950">{equipment ? "Scaffolding equipment" : "Paint product list"}</h2></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{filtered.length} items</span></header><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px]"><thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">{equipment ? "Selling price" : "Pack / kg price"}</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((product) => <tr key={product._id} className="hover:bg-slate-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">No image</span>}<div><p className="font-bold text-slate-950">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{product.code} · {equipment ? "Counted in pcs" : `${product.unit} · ${Number(product.packSizeKg || 0).toLocaleString()} kg net`}</p></div></div></td><td className="px-5 py-3.5 text-sm text-slate-600">{product.category}</td><td className="px-5 py-3.5"><p className="text-sm font-bold text-slate-950">{money(product.price)} / {equipment ? "piece" : "pack"}</p>{!equipment && <p className="mt-0.5 text-xs text-emerald-700">{product.pricePerKg == null ? "Set pack weight" : `${money(product.pricePerKg)} / kg`}</p>}</td><td className="px-5 py-3.5"><p className="text-sm font-bold text-slate-900">{Number(product.stock || 0).toLocaleString()} {equipment ? "pcs" : "kg"}</p>{!equipment && Number(product.packSizeKg || 0) > 0 && <p className="mt-0.5 text-xs text-slate-500">{(Number(product.stock || 0) / Number(product.packSizeKg)).toLocaleString("en-RW", { maximumFractionDigits: 2 })} packs</p>}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.status}</span></td><td className="relative px-5 py-3.5 text-right"><button type="button" onClick={() => setMenuOpen(menuOpen === product._id ? null : product._id)} disabled={deletingId === product._id} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18} /></button>{menuOpen === product._id && <div className="absolute right-5 top-12 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg"><button type="button" onClick={() => { setMenuOpen(null); setPriceProduct(product); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CircleDollarSign size={15} />Update price</button><button type="button" onClick={() => { setMenuOpen(null); onEdit(product); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={15} />Edit</button><button type="button" onClick={() => void deleteProduct(product)} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} />Delete</button></div>}</td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{filtered.map((product) => <article key={product._id} className="p-4"><div className="flex gap-3">{product.image ? <img src={product.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">No image</span>}<div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><h3 className="font-extrabold text-slate-950">{product.name}</h3><p className="mt-0.5 text-xs text-slate-500">{product.code} · {product.category}</p></div><span className={`h-fit rounded-full px-2 py-1 text-[10px] font-bold ${product.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.status}</span></div><div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3"><div><p className="text-xs font-bold text-slate-500">{money(product.price)} / {equipment ? "piece" : "pack"}</p><p className="mt-1 text-xs text-slate-500">{Number(product.stock || 0).toLocaleString()} {equipment ? "pcs" : "kg"}</p></div><div className="flex gap-3"><button type="button" onClick={() => setPriceProduct(product)} className="text-sm font-bold text-red-700">Price</button><button type="button" onClick={() => onEdit(product)} className="text-sm font-bold text-slate-700">Edit</button></div></div></div></div></article>)}</div></section>{priceProduct && <PriceEditor product={priceProduct} onClose={() => setPriceProduct(null)} onSaved={priceSaved} />}</>;
}

function PriceEditor({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: (product: Product) => void }) {
  const [price, setPrice] = useState(String(product.price || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const equipment = isScaffolding(product);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount < 0) return setError("Enter a valid selling price.");
    setSaving(true); setError("");
    try { const response = await fetch(`${API_URL}/products/${product._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, body: JSON.stringify({ price: amount }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to update the price."); onSaved(result.data as Product); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the price."); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"><form onSubmit={save} className="w-full max-w-md rounded-xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className="cana-section-kicker text-red-700">Commercial price</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">Update {product.name}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></header><div className="space-y-4 p-5"><p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Current price: <strong className="text-slate-950">{money(product.price)} / {equipment ? "piece" : "pack"}</strong></p><label className="block text-xs font-bold uppercase tracking-wide text-slate-600">New selling price (RWF)<input autoFocus required min="0" step="1" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-bold text-slate-950 outline-none focus:border-slate-950" /></label>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save price"}</button></footer></form></div>;
}
