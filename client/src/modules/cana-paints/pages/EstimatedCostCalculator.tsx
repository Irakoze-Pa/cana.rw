import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Loader2, Paintbrush, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";

type Product = { _id: string; name: string; category: string; unit: string; price: number; packSizeKg?: number; pricePerKg?: number | null; status: string };
type Line = { id: number; finish: "Interior" | "Exterior"; product: string; area: string; coats: string; coverage: string; waste: string };
const emptyLine = (id: number): Line => ({ id, finish: "Interior", product: "", area: "", coats: "2", coverage: "10", waste: "10" });
const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })} RWF`;
const measure = (product?: Product) => {
  return { label: "kg", packSize: Math.max(0.001, Number(product?.packSizeKg || 1)) };
};

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-bold text-gray-600">{label}<input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-base sm:h-10 sm:text-sm" /></label>;
}

export default function EstimatedCostCalculator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  useEffect(() => {
    void api.get<{ data: Product[] }>("/products").then((response) => setProducts((response.data.data || []).filter((product) => product.status === "Active"))).finally(() => setLoading(false));
  }, []);
  const update = (id: number, change: Partial<Line>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...change } : line));
  const results = useMemo(() => lines.map((line) => {
    const product = products.find((item) => item._id === line.product);
    const unit = measure(product);
    const quantity = Number(line.area || 0) * Number(line.coats || 0) * (1 + Number(line.waste || 0) / 100) / Math.max(0.1, Number(line.coverage || 10));
    const packs = Math.ceil(quantity / unit.packSize);
    return { ...line, product, unit, quantity, packs, cost: packs * Number(product?.price || 0) };
  }), [lines, products]);
  const selectedIds = results.flatMap((line) => line.product ? [line.product._id] : []).filter((id, index, all) => all.indexOf(id) === index);
  const total = results.reduce((sum, line) => sum + line.cost, 0);
  const quoteUrl = selectedIds.length ? `/cana-paints/request-quote?products=${selectedIds.join(",")}` : "/cana-paints/request-quote";

  return <main className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
    <section className="bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-16"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-red-300">CANA Paints tool</p><h1 className="mt-2 text-3xl font-extrabold sm:mt-3 sm:text-5xl">Estimate products, packs, and cost.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:mt-4">All material and finished-product calculations use kilograms. Each sales pack uses its registered net weight and price.</p></div></section>
    <section className="mx-auto grid max-w-6xl gap-4 px-3 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-2xl bg-white p-3 shadow-sm sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3"><div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><span className="rounded-xl bg-red-50 p-2.5 text-red-600 sm:p-3"><Calculator size={20} /></span><div className="min-w-0"><h2 className="font-bold text-gray-900">Product plan</h2><p className="truncate text-xs text-gray-500 sm:text-sm">Choose catalogue products for each surface.</p></div></div><button type="button" onClick={() => setLines((current) => [...current, emptyLine(Date.now())])} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gray-900 px-3 py-2.5 text-xs font-bold text-white"><Plus size={15} />Add</button></div>
        {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div> : <div className="mt-6 space-y-4">{lines.map((line, index) => {
          const result = results.find((item) => item.id === line.id)!;
          return <div key={line.id} className="rounded-2xl border border-gray-200 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-gray-900">Product line {index + 1}</p><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="rounded-lg p-2 text-red-600 disabled:text-gray-300" aria-label={`Remove product line ${index + 1}`}><Trash2 size={16} /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-gray-600">Surface type<select value={line.finish} onChange={(event) => update(line.id, { finish: event.target.value as Line["finish"] })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base sm:h-10 sm:text-sm"><option>Interior</option><option>Exterior</option></select></label><label className="text-xs font-bold text-gray-600">CANA product<select value={line.product} onChange={(event) => update(line.id, { product: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base sm:h-10 sm:text-sm"><option value="">Select a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.category} · {money(product.price)} per {product.unit} pack</option>)}</select></label><Input label="Surface area (m²)" value={line.area} onChange={(value) => update(line.id, { area: value })} /><Input label="Coats" value={line.coats} onChange={(value) => update(line.id, { coats: value })} /><Input label={`Coverage (m²/${result.unit.label})`} value={line.coverage} onChange={(value) => update(line.id, { coverage: value })} /><Input label="Wastage (%)" value={line.waste} onChange={(value) => update(line.id, { waste: value })} /></div><div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-gray-50 p-3 text-xs sm:flex-row sm:flex-wrap sm:justify-between sm:gap-2"><span><strong>{result.quantity.toFixed(1)} {result.unit.label}</strong> required incl. {line.waste || 0}% wastage</span>{result.product && <><span><strong>{result.packs || 0}</strong> × {result.product.unit} pack{result.packs === 1 ? "" : "s"}</span><span className="font-bold text-gray-900">{money(result.cost)}</span></>}</div></div>;
        })}</div>}</div>
      <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm sm:sticky sm:top-6 sm:rounded-3xl sm:p-7"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Paintbrush size={22} /></span><div><h2 className="font-bold text-gray-900">Estimate summary</h2><p className="text-sm text-gray-500">Indicative, tax-inclusive pack cost.</p></div></div><div className="mt-5 space-y-3 sm:mt-6">{results.filter((line) => line.product).map((line) => <div key={line.id} className="rounded-xl bg-gray-50 p-3 text-sm"><p className="font-bold text-gray-900">{line.product?.name}</p><p className="mt-1 text-xs text-gray-500">{line.finish} · {line.quantity.toFixed(1)} {line.unit.label} · {line.packs} × {line.product?.unit} pack</p><p className="mt-2 font-bold">{money(line.cost)}</p></div>)}{!selectedIds.length && <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Select a product on each line to see your estimate.</p>}</div><div className="mt-5 flex justify-between border-t border-gray-100 pt-4"><span className="font-semibold text-gray-700">Estimated pack cost</span><strong className="text-xl text-gray-950">{money(total)}</strong></div><Link to={quoteUrl} className="mt-6 hidden w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-red-700 lg:flex"><Plus size={17} />Request final quote</Link><p className="mt-3 flex gap-2 text-xs leading-5 text-gray-500"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />CANA confirms availability, technical coverage, and final pricing before ordering.</p></aside>
    </section>
    {selectedIds.length > 0 && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,.12)] backdrop-blur lg:hidden"><div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-gray-500">{selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected</p><p className="truncate text-base font-extrabold text-gray-950">{money(total)}</p></div><Link to={quoteUrl} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"><Plus size={16} />Quote</Link></div></div>}
  </main>;
}
