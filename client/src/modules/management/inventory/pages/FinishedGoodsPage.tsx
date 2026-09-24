import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRightLeft,
  Factory,
  PencilLine,
  PackageCheck,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Store,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { useToast } from "@/context/toastContext";
import { useAuth } from "@/context/authContext";

type Product = {
  _id: string;
  name: string;
  code: string;
  unit: string;
  baseUnit?: string;
  packSizeKg?: number;
  category?: string;
  status?: string;
};
type Balance = {
  _id: string;
  product: Product | null;
  store: "production" | "sales";
  quantity: number;
  minimumQuantity?: number;
};
type Transfer = {
  _id: string;
  reference: string;
  product: Product | null;
  fromStore: "production" | "sales";
  toStore: "production" | "sales";
  quantity: number;
  unit: string;
  notes?: string;
  performedBy?: { fullName: string };
  createdAt: string;
};
type Adjustment = { _id: string; reference: string; product: Product | null; store: "production" | "sales"; quantityChange: number; quantityBefore: number; quantityAfter: number; unit: string; reason: string; performedBy?: { fullName: string }; createdAt: string };
const number = (value: number) => Number(value || 0).toLocaleString("en-RW");
const storeName = (store: string) =>
  store === "production" ? "Production Store" : "Sales Store";
const packs = (quantity: number, product?: Product | null) => {
  if (product?.baseUnit === "pcs") return null;
  const packSizeKg = Number(product?.packSizeKg || 0);
  if (!Number.isFinite(packSizeKg) || packSizeKg <= 0) return null;
  const packCount = quantity / packSizeKg;
  return `${number(packCount)} ${packCount === 1 ? "pack" : "packs"}`;
};
const stockWithPacks = (quantity: number, product?: Product | null) =>
  `${number(quantity)} ${product?.baseUnit || "kg"}${packs(quantity, product) ? ` · ${packs(quantity, product)}` : ""}`;
const isScaffolding = (product?: Product | null) => product?.category === "Scaffolding" || /scaffold/i.test(product?.name || "");

export default function FinishedGoodsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [catalogue, setCatalogue] = useState<"paint" | "scaffold">("paint");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showMinimum, setShowMinimum] = useState(false);
  const [adjustment, setAdjustment] = useState({ product: "", store: "production", quantityChange: "", reason: "" });
  const [minimumForm, setMinimumForm] = useState({ product: "", store: "sales", minimumQuantity: "" });
  const [form, setForm] = useState({
    product: "",
    fromStore: "production",
    toStore: "sales",
    quantityInput: "",
    quantityMode: "packs" as "packs" | "kg" | "pcs",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSuperAdmin = user?.role === "superadmin";
  const canManageMinimums = user?.role === "superadmin" || user?.role === "admin";
  const load = useCallback(async () => {
    try {
      setError("");
      const [balanceResponse, transferResponse, adjustmentResponse] = await Promise.all([
        api.get<{ data: Balance[] }>("/finished-goods/balances"),
        api.get<{ data: Transfer[] }>("/finished-goods/transfers"),
        isSuperAdmin ? api.get<{ data: Adjustment[] }>("/finished-goods/adjustments") : Promise.resolve({ data: { data: [] as Adjustment[] } }),
      ]);
      setBalances(balanceResponse.data.data || []);
      setTransfers(transferResponse.data.data || []);
      setAdjustments(adjustmentResponse.data.data || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load finished goods stores.",
      );
    }
  }, [isSuperAdmin]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const refreshStockRows = () => {
      void load();
    };

    window.addEventListener(
      "cana:stock-updated",
      refreshStockRows,
    );
    window.addEventListener(
      "focus",
      refreshStockRows,
    );

    return () => {
      window.removeEventListener(
        "cana:stock-updated",
        refreshStockRows,
      );
      window.removeEventListener(
        "focus",
        refreshStockRows,
      );
    };
  }, [load]);
  const allProducts = useMemo(() => {
    const seen = new Map<string, Product>();
    balances.forEach(
      (balance) =>
        balance.product && seen.set(balance.product._id, balance.product),
    );
    return [...seen.values()];
  }, [balances]);
  const products = useMemo(() => allProducts.filter((product) => catalogue === "scaffold" ? isScaffolding(product) : !isScaffolding(product)), [allProducts, catalogue]);
  const balanceFor = (productId: string, store: string) =>
    Number(
      balances.find(
        (balance) =>
          balance.product?._id === productId && balance.store === store,
      )?.quantity || 0,
    );
  const selected = products.find((product) => product._id === form.product);
  const selectedAdjustmentProduct = products.find((product) => product._id === adjustment.product);
  const isPieceProduct = selected?.baseUnit === "pcs" || isScaffolding(selected);
  const transferQuantity = Number(form.quantityInput) * (form.quantityMode === "packs" ? Number(selected?.packSizeKg || 0) : 1);
  const sendTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.fromStore === form.toStore)
      return setError("Select two different stores.");
    if (!selected) return setError("Select a finished product to transfer.");
    if (!Number.isFinite(transferQuantity) || transferQuantity <= 0) return setError(form.quantityMode === "packs" ? "Enter a valid number of packs. This product must have a pack size before packs can be transferred." : `Enter a valid quantity in ${isPieceProduct ? "pieces" : "kg"}.`);
    try {
      setBusy(true);
      setError("");
      await api.post("/finished-goods/transfers", {
        ...form,
        quantity: transferQuantity,
      });
      toast("Store transfer recorded.", "success");
      setForm({
        product: "",
        fromStore: "production",
        toStore: "sales",
        quantityInput: "",
        quantityMode: catalogue === "scaffold" ? "pcs" : "packs",
        notes: "",
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record transfer.",
      );
    } finally {
      setBusy(false);
    }
  };
  const submitAdjustment = async (event: React.FormEvent) => { event.preventDefault(); const change = Number(adjustment.quantityChange); const unit = selectedAdjustmentProduct?.baseUnit === "pcs" || isScaffolding(selectedAdjustmentProduct) ? "pieces" : "kg"; if (!Number.isFinite(change) || change === 0) return setError(`Enter a non-zero adjustment in ${unit}. Use a positive value to add stock or a negative value to remove stock.`); try { setBusy(true); setError(""); await api.post("/finished-goods/adjustments", { ...adjustment, quantityChange: change }); toast("Stock adjustment recorded with an audit reference.", "success"); setAdjustment({ product: "", store: "production", quantityChange: "", reason: "" }); setShowAdjustment(false); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record stock adjustment."); } finally { setBusy(false); } };
  const saveMinimum = async (event: React.FormEvent) => { event.preventDefault(); const minimumQuantity = Number(minimumForm.minimumQuantity); if (!minimumForm.product || !Number.isFinite(minimumQuantity) || minimumQuantity < 0) return setError("Select a product and enter a zero or positive minimum balance."); try { setBusy(true); setError(""); await api.patch("/finished-goods/balances/minimum", { ...minimumForm, minimumQuantity }); toast("Finished-goods minimum balance saved.", "success"); setShowMinimum(false); setMinimumForm({ product: "", store: "sales", minimumQuantity: "" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the minimum balance."); } finally { setBusy(false); } };
  const scopedBalances = balances.filter((balance) => balance.product && products.some((product) => product._id === balance.product?._id));
  const scopedTransfers = transfers.filter((transfer) => transfer.product && (catalogue === "scaffold" ? isScaffolding(transfer.product) : !isScaffolding(transfer.product)));
  const totalProduction = scopedBalances
    .filter((balance) => balance.store === "production")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  const totalSales = scopedBalances
    .filter((balance) => balance.store === "sales")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  const lowBalances = scopedBalances.filter((balance) => Number(balance.minimumQuantity || 0) > 0 && Number(balance.quantity || 0) <= Number(balance.minimumQuantity || 0));
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <PackageCheck size={21} />
          </span>
          <div>
            <p className="cana-section-kicker">Inventory & stores</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              {catalogue === "scaffold" ? "Scaffolding equipment stores" : "Finished-goods stores"}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageMinimums && <button onClick={() => setShowMinimum(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><SlidersHorizontal size={16} />Minimum balances</button>}
          {isSuperAdmin && <button onClick={() => setShowAdjustment(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><SlidersHorizontal size={16} />Adjust stock</button>}
          <Link to="/management/products" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"><PencilLine size={16} />Product catalogue</Link>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold"><RefreshCw size={16} />Refresh</button>
        </div>
      </header>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setCatalogue("paint"); setForm((current) => ({ ...current, product: "", quantityInput: "", quantityMode: "packs" })); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${catalogue === "paint" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>Paint finished goods</button>
        <button type="button" onClick={() => { setCatalogue("scaffold"); setForm((current) => ({ ...current, product: "", quantityInput: "", quantityMode: "pcs" })); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${catalogue === "scaffold" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>Scaffolding equipment</button>
      </div>
      {showAdjustment && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><form onSubmit={submitAdjustment} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-red-600">SuperAdmin control</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Adjust finished-goods stock</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use only for a verified physical count or correction. This creates an immutable adjustment record.</p></div><button type="button" onClick={() => setShowAdjustment(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-bold text-slate-700">Finished product<select required value={adjustment.product} onChange={(event) => setAdjustment({ ...adjustment, product: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.code}</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Store<select value={adjustment.store} onChange={(event) => setAdjustment({ ...adjustment, store: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="production">Production Store</option><option value="sales">Sales Store</option></select></label>{selectedAdjustmentProduct && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Current balance: <strong>{stockWithPacks(balanceFor(selectedAdjustmentProduct._id, adjustment.store), selectedAdjustmentProduct)}</strong></p>}<label className="block text-sm font-bold text-slate-700">Adjustment in kg<input required step="any" type="number" value={adjustment.quantityChange} onChange={(event) => setAdjustment({ ...adjustment, quantityChange: event.target.value })} placeholder="Example: 80 or -20" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label><label className="block text-sm font-bold text-slate-700">Reason for correction<textarea required minLength={3} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} rows={3} placeholder="Example: Physical stock count correction" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label></div><button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300"><SlidersHorizontal size={16}/>{busy ? "Recording…" : "Record adjustment"}</button></form></div>}
      {showMinimum && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><form onSubmit={saveMinimum} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-red-600">SuperAdmin control</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Set minimum balance</h2><p className="mt-2 text-sm leading-6 text-slate-500">The store is marked low when its balance reaches this quantity.</p></div><button type="button" onClick={() => setShowMinimum(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-bold text-slate-700">Finished product<select required value={minimumForm.product} onChange={(event) => { const product = event.target.value; const existing = balances.find((balance) => balance.product?._id === product && balance.store === minimumForm.store); setMinimumForm({ ...minimumForm, product, minimumQuantity: existing ? String(existing.minimumQuantity || "") : "" }); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.code}</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Store<select value={minimumForm.store} onChange={(event) => setMinimumForm({ ...minimumForm, store: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="sales">Sales Store</option><option value="production">Production Store</option></select></label><label className="block text-sm font-bold text-slate-700">Minimum balance<input required min="0" step="any" type="number" value={minimumForm.minimumQuantity} onChange={(event) => setMinimumForm({ ...minimumForm, minimumQuantity: event.target.value })} placeholder="Example: 100" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/></label></div><button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300">{busy ? "Saving…" : "Save minimum balance"}</button></form></div>}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={<Factory size={19} />}
          label="Production Store"
          value={number(totalProduction)}
          unit={catalogue === "scaffold" ? "pcs" : "kg"}
        />
        <Metric
          icon={<Store size={19} />}
          label="Sales Store"
          value={number(totalSales)}
          unit={catalogue === "scaffold" ? "pcs" : "kg"}
        />
        <Metric
          icon={<ArrowRightLeft size={19} />}
          label="Recorded transfers"
          value={String(scopedTransfers.length)}
          unit=""
        />
        <Metric icon={<PackageCheck size={19} />} label="Low balance alerts" value={String(lowBalances.length)} unit="stores" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[.95fr_1.55fr]">
        <form
          onSubmit={sendTransfer}
          className="cana-panel p-5"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <ArrowRightLeft size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">
                {catalogue === "scaffold" ? "Transfer scaffolding equipment" : "Transfer finished goods"}
              </h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Product
              <select
                required
                value={form.product}
                onChange={(event) =>
                  setForm({ ...form, product: event.target.value })
                }
                className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
              >
                <option value="">Select {catalogue === "scaffold" ? "scaffolding equipment" : "finished product"}</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-gray-700">
                From
                <select
                  value={form.fromStore}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fromStore: event.target.value,
                      toStore:
                        event.target.value === form.toStore
                          ? event.target.value === "production"
                            ? "sales"
                            : "production"
                          : form.toStore,
                    })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
                >
                  <option value="production">Production Store</option>
                  <option value="sales">Sales Store</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                To
                <select
                  value={form.toStore}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      toStore: event.target.value,
                      fromStore:
                        event.target.value === form.fromStore
                          ? event.target.value === "production"
                            ? "sales"
                            : "production"
                          : form.fromStore,
                    })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
                >
                  <option value="sales">Sales Store</option>
                  <option value="production">Production Store</option>
                </select>
              </label>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">Transfer quantity</p>{isPieceProduct ? <span className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">By piece</span> : <select value={form.quantityMode} onChange={(event) => setForm({ ...form, quantityMode: event.target.value as "packs" | "kg", quantityInput: "" })} className="h-10 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-800"><option value="packs">By pack</option><option value="kg">By kg</option></select>}</div><label className="mt-3 block text-sm font-semibold text-gray-700">{isPieceProduct ? "Number of pieces" : form.quantityMode === "packs" ? `Number of packs${selected?.packSizeKg ? ` (${selected.packSizeKg} kg)` : ""}` : "Quantity in kg"}<input required min="0.0001" step="any" type="number" disabled={form.quantityMode === "packs" && !selected?.packSizeKg} value={form.quantityInput} onChange={(event) => setForm({ ...form, quantityMode: isPieceProduct ? "pcs" : form.quantityMode, quantityInput: event.target.value })} placeholder={isPieceProduct ? "10" : form.quantityMode === "packs" ? "12" : "240"} className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm disabled:bg-slate-100"/></label>{selected && form.quantityInput && <p className="mt-2 text-xs font-semibold text-slate-600">{number(transferQuantity)} {isPieceProduct ? "pcs" : "kg"}</p>}</div>
            {selected && (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Available in {storeName(form.fromStore)}:{" "}
                <strong>
                  {stockWithPacks(balanceFor(selected._id, form.fromStore), selected)}
                </strong>
              </p>
            )}
            <label className="block text-sm font-semibold text-gray-700">
              Reason / notes{" "}
              <span className="font-normal text-gray-400">(optional)</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 text-sm"
                placeholder="Example: Replenishment for Kigali sales outlet"
              />
            </label>
            <button
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300"
            >
              <Send size={16} />
              {busy ? "Recording…" : "Record transfer"}
            </button>
          </div>
        </form>
        <div className="cana-panel overflow-hidden">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-bold text-slate-900">
              Store balances by product
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Production Store</th>
                  <th className="px-5 py-3 text-right">Sales Store</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => {
                  const production = balanceFor(product._id, "production"),
                    sales = balanceFor(product._id, "sales");
                  const productionMinimum = Number(balances.find((balance) => balance.product?._id === product._id && balance.store === "production")?.minimumQuantity || 0);
                  const salesMinimum = Number(balances.find((balance) => balance.product?._id === product._id && balance.store === "sales")?.minimumQuantity || 0);
                  const productionLow = productionMinimum > 0 && production <= productionMinimum;
                  const salesLow = salesMinimum > 0 && sales <= salesMinimum;
                  return (
                    <tr key={product._id} className={productionLow || salesLow ? "bg-red-50/40" : ""}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isScaffolding(product) ? `${product.code} · Equipment · counted in pieces` : `${product.code} · ${product.unit} pack · ${number(product.packSizeKg || 0)} kg per pack`}
                        </p>
                      </td>
                      <td className={`px-5 py-4 text-right font-semibold ${productionLow ? "text-red-700" : ""}`}>
                        <span>{number(production)} {isScaffolding(product) ? "pcs" : "kg"}</span>
                        {!isScaffolding(product) && <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(production, product) || "Pack size not set"}</p>}
                        {productionMinimum > 0 && <p className={`mt-1 text-xs font-bold ${productionLow ? "text-red-700" : "text-slate-500"}`}>Min. {number(productionMinimum)} {isScaffolding(product) ? "pcs" : "kg"}{productionLow ? " · Low" : ""}</p>}
                      </td>
                      <td className={`px-5 py-4 text-right font-semibold ${salesLow ? "text-red-700" : ""}`}>
                        <span>{number(sales)} {isScaffolding(product) ? "pcs" : "kg"}</span>
                        {!isScaffolding(product) && <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(sales, product) || "Pack size not set"}</p>}
                        {salesMinimum > 0 && <p className={`mt-1 text-xs font-bold ${salesLow ? "text-red-700" : "text-slate-500"}`}>Min. {number(salesMinimum)} {isScaffolding(product) ? "pcs" : "kg"}{salesLow ? " · Low" : ""}</p>}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {number(production + sales)} {isScaffolding(product) ? "pcs" : "kg"}
                        {!isScaffolding(product) && <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(production + sales, product) || "Pack size not set"}</p>}
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-500">
                      No {catalogue === "scaffold" ? "scaffolding equipment" : "finished paint products"} are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="cana-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-100 p-5">
          <Truck size={19} className="text-slate-600" />
          <div>
            <h2 className="font-bold text-slate-900">Transfer history</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Movement</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scopedTransfers.map((transfer) => (
                <tr key={transfer._id}>
                  <td className="px-5 py-4 font-semibold">
                    {transfer.reference}
                    <p className="mt-0.5 text-xs font-normal text-gray-500">
                      {new Date(transfer.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {transfer.product?.name || "Deleted product"}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {storeName(transfer.fromStore)} →{" "}
                    {storeName(transfer.toStore)}
                  </td>
                  <td className="px-5 py-4 text-right font-bold">
                    {stockWithPacks(transfer.quantity, transfer.product)}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {transfer.performedBy?.fullName || "—"}
                  </td>
                </tr>
              ))}
              {scopedTransfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
                    No store transfers recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  unit = "kg",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <article className="cana-panel p-4">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-700">{icon}</span><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-500">{label}</p><p className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-950">{value}{unit ? ` ${unit}` : ""}</p></div></div>
    </article>
  );
}
