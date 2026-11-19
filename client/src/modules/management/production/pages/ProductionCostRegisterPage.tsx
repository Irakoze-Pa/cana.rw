import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Printer, RefreshCw, Search } from "lucide-react";

import type { Formula } from "@/modules/management/formula/types/formula.types";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";
import api from "@/services/api";

type Product = { _id: string; name: string; code?: string; category?: string; packSizeKg?: number; status?: string };
type ProductRef = string | { _id?: string; name?: string; code?: string; packSizeKg?: number } | null;
type Output = { product?: ProductRef; actualQuantity?: number; plannedQuantity?: number; costPerPack?: number };
type Batch = { _id: string; batchNo?: string; batchNumber?: string; status: string; product?: ProductRef; outputs?: Output[]; costPerPack?: number; costedAt?: string; completedAt?: string; updatedAt?: string };
type ActualCost = { batchNumber: string; completedAt: string; costPerPack: number };
type CostRow = {
  productId: string; product: string; code: string; formula: string; packSizeKg: number;
  currentOutputKg: number; currentPacks: number; currentMaterialCost: number;
  currentTotalCost: number; currentCostPerKg: number; currentCostPerPack: number;
  priceAsOf: string; costingComplete: boolean; fallbackCount: number; priority: number;
  actual?: ActualCost;
};

const number = (value: number, digits = 2) => Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: digits });
const money = (value: number) => `${number(value)} RWF`;
const refId = (value?: ProductRef) => typeof value === "string" ? value : String(value?._id || "");
const when = (value?: string) => value ? new Date(value).toLocaleDateString("en-RW") : "—";

function formulaRows(formula: Formula, products: Product[]): CostRow[] {
  const primaryId = typeof formula.product === "string" ? formula.product : formula.product._id;
  const primary = products.find((product) => product._id === primaryId);
  const items = formula.items || [];
  const overhead = Number(formula.laborCost || 0) + Number(formula.energyCost || 0) + Number(formula.otherCost || 0);
  const sourceDates = items
    .map((item) => typeof item.rawMaterial === "string" ? "" : item.rawMaterial.currentPriceUpdatedAt || "")
    .filter(Boolean)
    .sort();
  const priceAsOf = sourceDates.at(-1) || formula.updatedAt;
  const fallbackCount = items.filter((item) =>
    typeof item.rawMaterial !== "string" && item.rawMaterial.currentPriceSource !== "supplier_offer"
  ).length;

  if (!formula.outputs?.length) {
    const outputKg = Number(formula.batchSize || 0);
    const productName = primary?.name || (typeof formula.product === "string" ? "Finished product" : formula.product.name);
    const productCode = primary?.code || (typeof formula.product === "string" ? "—" : formula.product.code) || "—";
    const packSizeKg = Number(primary?.packSizeKg || (typeof formula.product === "string" ? 0 : formula.product.packSizeKg) || 0);
    const total = Number(formula.estimatedTotalCost || 0);
    const perKg = outputKg > 0 ? total / outputKg : 0;
    return [{ productId: primaryId, product: productName, code: productCode, formula: `${formula.code} V${formula.version}`, packSizeKg, currentOutputKg: outputKg, currentPacks: packSizeKg > 0 ? outputKg / packSizeKg : 0, currentMaterialCost: Number(formula.estimatedMaterialCost || 0), currentTotalCost: total, currentCostPerKg: perKg, currentCostPerPack: packSizeKg > 0 ? perKg * packSizeKg : 0, priceAsOf, costingComplete: formula.costingComplete !== false, fallbackCount, priority: 2 }];
  }

  const sharedMaterialCost = items.reduce((sum, item) => {
    if (item.appliesToProduct) return sum;
    const price = typeof item.rawMaterial === "string" ? 0 : Number(item.rawMaterial.costPerUnit || 0);
    return sum + Number(item.quantity || 0) * (1 + Number(item.wastePercentage || 0) / 100) * price;
  }, 0);
  const targeted = new Map<string, number>();
  items.forEach((item) => {
    if (!item.appliesToProduct) return;
    const outputId = typeof item.appliesToProduct === "string" ? item.appliesToProduct : item.appliesToProduct._id;
    const price = typeof item.rawMaterial === "string" ? 0 : Number(item.rawMaterial.costPerUnit || 0);
    const cost = Number(item.quantity || 0) * (1 + Number(item.wastePercentage || 0) / 100) * price;
    targeted.set(outputId, Number(targeted.get(outputId) || 0) + cost);
  });
  const batchSize = Number(formula.batchSize || 0);

  return formula.outputs.map((output) => {
    const outputId = typeof output.product === "string" ? output.product : output.product._id;
    const catalogue = products.find((product) => product._id === outputId);
    const outputKg = Number(output.quantity || 0);
    const packSizeKg = Number(output.packSizeKg || catalogue?.packSizeKg || 0);
    const weightShare = batchSize > 0 ? outputKg / batchSize : 0;
    const materialCost = sharedMaterialCost * weightShare + Number(targeted.get(outputId) || 0);
    const total = materialCost + overhead * weightShare;
    const perKg = outputKg > 0 ? total / outputKg : 0;
    return { productId: outputId, product: catalogue?.name || (typeof output.product === "string" ? "Finished product" : output.product.name), code: catalogue?.code || (typeof output.product === "string" ? "—" : output.product.code) || "—", formula: `${formula.code} V${formula.version}`, packSizeKg, currentOutputKg: outputKg, currentPacks: Number(output.packs || (packSizeKg > 0 ? outputKg / packSizeKg : 0)), currentMaterialCost: materialCost, currentTotalCost: total, currentCostPerKg: perKg, currentCostPerPack: packSizeKg > 0 ? perKg * packSizeKg : 0, priceAsOf, costingComplete: formula.costingComplete !== false, fallbackCount, priority: outputId === primaryId ? 2 : 1 };
  });
}

function latestActualCosts(batches: Batch[]) {
  const result = new Map<string, ActualCost>();
  const save = (productId: string, actual: ActualCost) => {
    if (!productId) return;
    const previous = result.get(productId);
    if (!previous || new Date(actual.completedAt || 0).getTime() >= new Date(previous.completedAt || 0).getTime()) result.set(productId, actual);
  };
  batches.filter((batch) => batch.status === "Completed").forEach((batch) => {
    const completedAt = batch.costedAt || batch.completedAt || batch.updatedAt || "";
    if (batch.outputs?.length) {
      batch.outputs.forEach((output) => save(refId(output.product), { batchNumber: batch.batchNo || batch.batchNumber || "—", completedAt, costPerPack: Number(output.costPerPack || 0) }));
    } else {
      save(refId(batch.product), { batchNumber: batch.batchNo || batch.batchNumber || "—", completedAt, costPerPack: Number(batch.costPerPack || 0) });
    }
  });
  return result;
}

export default function ProductionCostRegisterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [productResponse, batchResponse, formulaResponse] = await Promise.all([
        api.get<{ data: Product[] }>("/products"), api.get<{ data: Batch[] }>("/production-batches"), api.get<{ data: Formula[] }>("/formulas"),
      ]);
      setProducts(productResponse.data.data || []); setBatches(batchResponse.data.data || []); setFormulas(formulaResponse.data.data || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load production costs."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const actualCosts = latestActualCosts(batches);
    const current = new Map<string, CostRow>();
    formulas.filter((formula) => formula.status === "Active").forEach((formula) => formulaRows(formula, products).forEach((row) => {
      const previous = current.get(row.productId);
      if (!previous || row.priority > previous.priority) current.set(row.productId, row);
    }));
    products.filter((product) => !/scaffold/i.test(`${product.category || ""} ${product.name}`) && product.status !== "Inactive").forEach((product) => {
      const row = current.get(product._id);
      if (row) row.actual = actualCosts.get(product._id);
      else current.set(product._id, { productId: product._id, product: product.name, code: product.code || "—", formula: "—", packSizeKg: Number(product.packSizeKg || 0), currentOutputKg: 0, currentPacks: 0, currentMaterialCost: 0, currentTotalCost: 0, currentCostPerKg: 0, currentCostPerPack: 0, priceAsOf: "", costingComplete: false, fallbackCount: 0, priority: 0, actual: actualCosts.get(product._id) });
    });
    return [...current.values()].sort((left, right) => left.product.localeCompare(right.product));
  }, [batches, formulas, products]);

  const visible = useMemo(() => rows.filter((row) => `${row.product} ${row.code} ${row.formula} ${row.actual?.batchNumber || ""}`.toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const currentCosted = rows.filter((row) => row.currentCostPerPack > 0 && row.costingComplete);
  const fallbackProducts = rows.filter((row) => row.fallbackCount > 0);
  const print = () => printCanaDocument({
    title: "Current Production Cost Register", reference: `PCR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`, status: "OFFICIAL", brandLine: "CANA Paints · Current Purchase Cost Control", orientation: "landscape",
    details: [{ label: "Current basis", value: "Most recently updated active supplier offer" }, { label: "Products listed", value: rows.length }, { label: "Fully costed", value: currentCosted.length }, { label: "Products using fallback", value: fallbackProducts.length }, { label: "Printed", value: new Date().toLocaleDateString("en-RW") }],
    table: { headers: ["#", "Product", "Active formula", "Pack", "Current cost / pack", "Latest actual / pack", "Difference"], rows: rows.map((row, index) => { const actual = Number(row.actual?.costPerPack || 0); return [index + 1, `${row.product} · ${row.code}`, row.formula, row.packSizeKg ? `${number(row.packSizeKg)} kg` : "—", row.currentCostPerPack > 0 ? number(row.currentCostPerPack) : "Pending", actual > 0 ? `${number(actual)} · ${row.actual?.batchNumber}` : "—", actual > 0 ? number(row.currentCostPerPack - actual) : "—"]; }) },
    notes: "Current cost uses one centralized price for each raw material across every active product formula: the most recently updated active supplier offer. Inventory weighted average and material setup prices are used only where no active supplier offer exists. Latest actual cost remains the historical issued-stock cost and is not overwritten.",
  });

  return <main className="mx-auto max-w-[1500px] space-y-4 pb-8">
    <header className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white"><ClipboardList size={20}/></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-red-700">CANA · Production control</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Current product costs</h1></div></div><div className="flex gap-2"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh</button><button onClick={print} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Printer size={14}/>Print register</button></div></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200"><Metric label="Products" value={rows.length}/><Metric label="Current costs" value={currentCosted.length}/><Metric label="Offer fallbacks" value={fallbackProducts.length} danger={fallbackProducts.length > 0}/></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b bg-slate-50 p-3"><Search size={15} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, formula or batch" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"/><span className="text-xs font-bold text-slate-500">{visible.length} products</span></div><div className="max-h-[650px] overflow-auto"><table className="min-w-[1080px] w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white"><tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Active formula</th><th className="px-3 py-2.5 text-right">Reference output</th><th className="px-3 py-2.5 text-right">Current materials</th><th className="px-3 py-2.5 text-right">Current cost / pack</th><th className="px-3 py-2.5 text-right">Latest actual / pack</th><th className="px-3 py-2.5 text-right">Variance</th><th className="px-3 py-2.5">Pricing</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row) => { const actual = Number(row.actual?.costPerPack || 0); const variance = actual > 0 ? row.currentCostPerPack - actual : 0; return <tr key={row.productId} className="hover:bg-slate-50"><td className="px-3 py-3"><strong className="text-slate-950">{row.product}</strong><small className="ml-2 text-slate-400">{row.code}</small></td><td className="px-3 py-3"><b>{row.formula}</b><small className="block text-slate-400">{when(row.priceAsOf)}</small></td><td className="px-3 py-3 text-right">{row.currentPacks > 0 ? <><b>{number(row.currentPacks)} packs</b><small className="block text-slate-500">{number(row.currentOutputKg)} kg · {number(row.packSizeKg)} kg/pack</small></> : "—"}</td><td className="px-3 py-3 text-right font-semibold">{row.currentMaterialCost > 0 ? money(row.currentMaterialCost) : "—"}</td><td className="px-3 py-3 text-right font-extrabold">{row.currentCostPerPack > 0 ? money(row.currentCostPerPack) : "—"}</td><td className="px-3 py-3 text-right">{actual > 0 ? <><b>{money(actual)}</b><small className="block text-slate-400">{row.actual?.batchNumber}</small></> : "—"}</td><td className={`px-3 py-3 text-right font-bold ${variance > 0 ? "text-red-700" : variance < 0 ? "text-emerald-700" : "text-slate-500"}`}>{actual > 0 ? money(variance) : "—"}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${row.costingComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{row.costingComplete ? "CURRENT" : "REVIEW"}</span>{row.fallbackCount > 0 && <small className="mt-1 block text-amber-700">{row.fallbackCount} fallback line{row.fallbackCount === 1 ? "" : "s"}</small>}</td></tr>; })}{!loading && !visible.length && <tr><td colSpan={8} className="p-10 text-center text-slate-500">No products match this view.</td></tr>}</tbody></table></div></section>
  </main>;
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <div className="bg-white p-3"><p className="text-[9px] font-extrabold uppercase text-slate-500">{label}</p><p className={`mt-1 text-xl font-black ${danger ? "text-amber-700" : "text-slate-950"}`}>{value}</p></div>; }
