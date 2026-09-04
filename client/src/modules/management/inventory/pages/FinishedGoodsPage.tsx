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
  Store,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { useToast } from "@/context/toastContext";

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
const number = (value: number) => Number(value || 0).toLocaleString("en-RW");
const storeName = (store: string) =>
  store === "production" ? "Production Store" : "Sales Store";
const packs = (quantity: number, product?: Product | null) => {
  const packSizeKg = Number(product?.packSizeKg || 0);
  if (!Number.isFinite(packSizeKg) || packSizeKg <= 0) return null;
  const packCount = quantity / packSizeKg;
  return `${number(packCount)} ${packCount === 1 ? "pack" : "packs"}`;
};
const stockWithPacks = (quantity: number, product?: Product | null) =>
  `${number(quantity)} ${product?.baseUnit || "kg"}${packs(quantity, product) ? ` · ${packs(quantity, product)}` : ""}`;

export default function FinishedGoodsPage() {
  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [form, setForm] = useState({
    product: "",
    fromStore: "production",
    toStore: "sales",
    quantityInput: "",
    quantityMode: "packs" as "packs" | "kg",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const [balanceResponse, transferResponse] = await Promise.all([
        api.get<{ data: Balance[] }>("/finished-goods/balances"),
        api.get<{ data: Transfer[] }>("/finished-goods/transfers"),
      ]);
      setBalances(balanceResponse.data.data || []);
      setTransfers(transferResponse.data.data || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load finished goods stores.",
      );
    }
  }, []);
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
  const products = useMemo(() => {
    const seen = new Map<string, Product>();
    balances.forEach(
      (balance) =>
        balance.product && seen.set(balance.product._id, balance.product),
    );
    return [...seen.values()];
  }, [balances]);
  const balanceFor = (productId: string, store: string) =>
    Number(
      balances.find(
        (balance) =>
          balance.product?._id === productId && balance.store === store,
      )?.quantity || 0,
    );
  const selected = products.find((product) => product._id === form.product);
  const transferQuantityKg = Number(form.quantityInput) * (form.quantityMode === "packs" ? Number(selected?.packSizeKg || 0) : 1);
  const sendTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.fromStore === form.toStore)
      return setError("Select two different stores.");
    if (!selected) return setError("Select a finished product to transfer.");
    if (!Number.isFinite(transferQuantityKg) || transferQuantityKg <= 0) return setError(form.quantityMode === "packs" ? "Enter a valid number of packs. This product must have a pack size before packs can be transferred." : "Enter a valid quantity in kg.");
    try {
      setBusy(true);
      setError("");
      await api.post("/finished-goods/transfers", {
        ...form,
        quantity: transferQuantityKg,
      });
      toast("Store transfer recorded.", "success");
      setForm({
        product: "",
        fromStore: "production",
        toStore: "sales",
        quantityInput: "",
        quantityMode: "packs",
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
  const totalProduction = balances
    .filter((balance) => balance.store === "production")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  const totalSales = balances
    .filter((balance) => balance.store === "sales")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <PackageCheck size={21} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Finished goods stores
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Finished products only. Production Store holds completed output in kg; transfer to Sales Store before delivery.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/management/products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"><PencilLine size={16} />Product catalogue</Link>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold"><RefreshCw size={16} />Refresh</button>
        </div>
      </header>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <p className="text-sm font-semibold text-slate-900">Finished-goods store workflow</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
              Completed production batches add stock to Production Store. Transfer it to Sales Store before delivery; confirmed sales then reduce Sales Store only.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric
          icon={<Factory size={19} />}
          label="Production Store"
          value={number(totalProduction)}
          hint="Produced goods available for transfer"
        />
        <Metric
          icon={<Store size={19} />}
          label="Sales Store"
          value={number(totalSales)}
          hint="Goods available for customer delivery"
        />
        <Metric
          icon={<ArrowRightLeft size={19} />}
          label="Recorded transfers"
          value={String(transfers.length)}
          hint="Latest 100 movement records"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[.95fr_1.55fr]">
        <form
          onSubmit={sendTransfer}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <ArrowRightLeft size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">
                Transfer finished goods
              </h2>
              <p className="text-sm text-gray-500">
                Move stock between the two stores without changing total
                finished stock.
              </p>
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
                <option value="">Select finished product</option>
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
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-3.5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Transfer quantity</p><p className="mt-0.5 text-xs text-slate-600">Use packs for normal dispatch; kilograms remain available for partial stock movements.</p></div><select value={form.quantityMode} onChange={(event) => setForm({ ...form, quantityMode: event.target.value as "packs" | "kg", quantityInput: "" })} className="h-10 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-800"><option value="packs">By pack</option><option value="kg">By kg</option></select></div><label className="mt-3 block text-sm font-semibold text-gray-700">{form.quantityMode === "packs" ? `Number of packs${selected?.packSizeKg ? ` (${selected.packSizeKg} kg each)` : ""}` : "Quantity in kg"}<input required min="0.0001" step="any" type="number" disabled={form.quantityMode === "packs" && !selected?.packSizeKg} value={form.quantityInput} onChange={(event) => setForm({ ...form, quantityInput: event.target.value })} placeholder={form.quantityMode === "packs" ? "Example: 12 packs" : "Example: 240 kg"} className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm disabled:bg-slate-100"/></label>{selected && <p className="mt-2 text-xs text-slate-600">{form.quantityInput ? <><strong>{number(transferQuantityKg)} kg</strong> will be transferred{form.quantityMode === "kg" && selected.packSizeKg ? ` · equivalent to ${number(transferQuantityKg / selected.packSizeKg)} packs` : ""}.</> : <>Pack size: <strong>{selected.packSizeKg ? `${number(selected.packSizeKg)} kg per pack` : "not configured"}</strong>.</>}</p>}</div>
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-bold text-slate-900">
              Store balances by product
            </h2>
            <p className="text-sm text-gray-500">
              Total stock remains the sum of both stores.
            </p>
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
                  return (
                    <tr key={product._id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.code} · {product.unit} pack · {number(product.packSizeKg || 0)} kg per pack
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        <span>{number(production)} kg</span>
                        <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(production, product) || "Pack size not set"}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        <span>{number(sales)} kg</span>
                        <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(sales, product) || "Pack size not set"}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {number(production + sales)} kg
                        <p className="mt-0.5 text-xs font-normal text-gray-500">{packs(production + sales, product) || "Pack size not set"}</p>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-500">
                      No finished products are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 p-5">
          <Truck size={19} className="text-slate-600" />
          <div>
            <h2 className="font-bold text-slate-900">Transfer history</h2>
            <p className="text-sm text-gray-500">
              Every movement is recorded with its reference and operator.
            </p>
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
              {transfers.map((transfer) => (
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
              {transfers.length === 0 && (
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
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-700">
        {icon}
      </span>
      <p className="mt-4 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </article>
  );
}
