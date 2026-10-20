import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CircleDollarSign,
  Factory,
  PencilLine,
  PackageCheck,
  RefreshCw,
  Printer,
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
import { useConfirmation } from "@/context/confirmationContext";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

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
  valuation?: {
    costPerUnit: number;
    costPerKg: number;
    costPerPack: number;
    inventoryValue: number;
    sourceBatch?: string;
    status: "costed" | "missing_cost";
  };
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
type Adjustment = {
  _id: string;
  reference: string;
  product: Product | null;
  store: "production" | "sales";
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unit: string;
  reason: string;
  performedBy?: { fullName: string };
  createdAt: string;
};
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
  `${packs(quantity, product) || `${number(quantity)} ${product?.baseUnit || "kg"}`} ${packs(quantity, product) ? `· ${number(quantity)} ${product?.baseUnit || "kg"}` : ""}`;
const isScaffolding = (product?: Product | null) =>
  product?.category === "Scaffolding" || /scaffold/i.test(product?.name || "");

export default function FinishedGoodsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [catalogue, setCatalogue] = useState<"paint" | "scaffold">("paint");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showMinimum, setShowMinimum] = useState(false);
  const [adjustment, setAdjustment] = useState({
    product: "",
    store: "production",
    quantityChange: "",
    quantityMode: "packs" as "packs" | "kg" | "pcs",
    reason: "",
  });
  const [minimumForm, setMinimumForm] = useState({
    product: "",
    store: "sales",
    minimumQuantity: "",
  });
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
  const [stockSearch, setStockSearch] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const isSuperAdmin = user?.role === "superadmin";
  const canManageMinimums =
    user?.role === "superadmin" || user?.role === "admin";
  const load = useCallback(async () => {
    try {
      setError("");
      const [balanceResponse, transferResponse, adjustmentResponse] =
        await Promise.all([
          api.get<{ data: Balance[] }>("/finished-goods/balances"),
          api.get<{ data: Transfer[] }>("/finished-goods/transfers"),
          isSuperAdmin
            ? api.get<{ data: Adjustment[] }>("/finished-goods/adjustments")
            : Promise.resolve({ data: { data: [] as Adjustment[] } }),
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

    window.addEventListener("cana:stock-updated", refreshStockRows);
    window.addEventListener("focus", refreshStockRows);

    return () => {
      window.removeEventListener("cana:stock-updated", refreshStockRows);
      window.removeEventListener("focus", refreshStockRows);
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
  const products = useMemo(
    () =>
      allProducts.filter((product) =>
        catalogue === "scaffold"
          ? isScaffolding(product)
          : !isScaffolding(product),
      ),
    [allProducts, catalogue],
  );
  const balanceFor = (productId: string, store: string) =>
    Number(
      balances.find(
        (balance) =>
          balance.product?._id === productId && balance.store === store,
      )?.quantity || 0,
    );
  const selected = products.find((product) => product._id === form.product);
  const selectedAdjustmentProduct = products.find(
    (product) => product._id === adjustment.product,
  );
  const isPieceProduct =
    selected?.baseUnit === "pcs" || isScaffolding(selected);
  const transferQuantity =
    Number(form.quantityInput) *
    (form.quantityMode === "packs" ? Number(selected?.packSizeKg || 0) : 1);
  const sourceQuantity = selected
    ? balanceFor(selected._id, form.fromStore)
    : 0;
  const projectedSourceQuantity = sourceQuantity - transferQuantity;
  const sendTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.fromStore === form.toStore)
      return setError("Select two different stores.");
    if (!selected) return setError("Select a finished product to transfer.");
    if (!Number.isFinite(transferQuantity) || transferQuantity <= 0)
      return setError(
        form.quantityMode === "packs"
          ? "Enter a valid number of packs. This product must have a pack size before packs can be transferred."
          : `Enter a valid quantity in ${isPieceProduct ? "pieces" : "kg"}.`,
      );
    if (transferQuantity > sourceQuantity)
      return setError(
        `Only ${stockWithPacks(sourceQuantity, selected)} is available in ${storeName(form.fromStore)}.`,
      );
    const approved = await confirm({
      title: "Confirm store transfer",
      description: `Transfer ${stockWithPacks(transferQuantity, selected)} of ${selected.name} from ${storeName(form.fromStore)} to ${storeName(form.toStore)}? The source balance will become ${stockWithPacks(projectedSourceQuantity, selected)}.`,
      confirmLabel: "Post transfer",
      tone: "warning",
    });
    if (!approved) return;
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
  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    const isPiece =
      selectedAdjustmentProduct?.baseUnit === "pcs" ||
      isScaffolding(selectedAdjustmentProduct);
    const packSizeKg = Number(selectedAdjustmentProduct?.packSizeKg || 0);
    const rawChange = Number(adjustment.quantityChange);
    const change =
      adjustment.quantityMode === "packs" ? rawChange * packSizeKg : rawChange;
    const unit =
      adjustment.quantityMode === "packs" ? "packs" : isPiece ? "pieces" : "kg";
    if (
      adjustment.quantityMode === "packs" &&
      (!Number.isFinite(packSizeKg) || packSizeKg <= 0)
    )
      return setError(
        "Set this product's pack weight before adjusting it by pack.",
      );
    if (
      !Number.isFinite(rawChange) ||
      rawChange === 0 ||
      !Number.isFinite(change)
    )
      return setError(
        `Enter a non-zero adjustment in ${unit}. Use a positive value to add stock or a negative value to remove stock.`,
      );
    try {
      setBusy(true);
      setError("");
      await api.post("/finished-goods/adjustments", {
        product: adjustment.product,
        store: adjustment.store,
        quantityChange: change,
        reason: adjustment.reason,
      });
      toast(
        `Stock adjustment recorded: ${rawChange > 0 ? "+" : ""}${rawChange} ${unit}.`,
        "success",
      );
      setAdjustment({
        product: "",
        store: "production",
        quantityChange: "",
        quantityMode: "packs",
        reason: "",
      });
      setShowAdjustment(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to record stock adjustment.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveMinimum = async (event: React.FormEvent) => {
    event.preventDefault();
    const minimumQuantity = Number(minimumForm.minimumQuantity);
    if (
      !minimumForm.product ||
      !Number.isFinite(minimumQuantity) ||
      minimumQuantity < 0
    )
      return setError(
        "Select a product and enter a zero or positive minimum balance.",
      );
    try {
      setBusy(true);
      setError("");
      await api.patch("/finished-goods/balances/minimum", {
        ...minimumForm,
        minimumQuantity,
      });
      toast("Finished-goods minimum balance saved.", "success");
      setShowMinimum(false);
      setMinimumForm({ product: "", store: "sales", minimumQuantity: "" });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the minimum balance.",
      );
    } finally {
      setBusy(false);
    }
  };
  const scopedBalances = balances.filter(
    (balance) =>
      balance.product &&
      products.some((product) => product._id === balance.product?._id),
  );
  const scopedTransfers = transfers.filter(
    (transfer) =>
      transfer.product &&
      (catalogue === "scaffold"
        ? isScaffolding(transfer.product)
        : !isScaffolding(transfer.product)),
  );
  const visibleProducts = products.filter((product) => {
    const query = stockSearch.trim().toLowerCase();
    return !query || `${product.name} ${product.code}`.toLowerCase().includes(query);
  });
  const visibleTransfers = scopedTransfers.filter((transfer) => {
    const query = transferSearch.trim().toLowerCase();
    return (
      !query ||
      `${transfer.reference} ${transfer.product?.name || ""} ${transfer.product?.code || ""} ${transfer.performedBy?.fullName || ""}`
        .toLowerCase()
        .includes(query)
    );
  });
  const productionPacks = products.reduce((sum, product) => {
    const packSize = Number(product.packSizeKg || 0);
    return sum + (packSize > 0 ? balanceFor(product._id, "production") / packSize : 0);
  }, 0);
  const salesPacks = products.reduce((sum, product) => {
    const packSize = Number(product.packSizeKg || 0);
    return sum + (packSize > 0 ? balanceFor(product._id, "sales") / packSize : 0);
  }, 0);
  const totalProduction = scopedBalances
    .filter((balance) => balance.store === "production")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  const totalSales = scopedBalances
    .filter((balance) => balance.store === "sales")
    .reduce((sum, balance) => sum + balance.quantity, 0);
  const productionValue = scopedBalances
    .filter((balance) => balance.store === "production")
    .reduce(
      (sum, balance) => sum + Number(balance.valuation?.inventoryValue || 0),
      0,
    );
  const salesValue = scopedBalances
    .filter((balance) => balance.store === "sales")
    .reduce(
      (sum, balance) => sum + Number(balance.valuation?.inventoryValue || 0),
      0,
    );
  const totalFinishedGoodsValue = productionValue + salesValue;
  const missingCostProducts = products.filter(
    (product) =>
      !balances.some(
        (balance) =>
          balance.product?._id === product._id &&
          balance.valuation?.status === "costed",
      ),
  );
  const valuationFor = (productId: string) =>
    balances.find((balance) => balance.product?._id === productId)?.valuation;
  const printFinishedGoodsValuation = () =>
    printCanaDocument({
      title:
        catalogue === "scaffold"
          ? "Scaffolding equipment valuation"
          : "Finished-goods inventory valuation",
      reference: `FGV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: "Official store valuation",
      details: [
        {
          label: "Report date",
          value: new Date().toLocaleDateString("en-RW"),
        },
        { label: "Products", value: String(products.length) },
        {
          label: "Production Store",
          value: `${number(productionValue)} RWF`,
        },
        { label: "Sales Store", value: `${number(salesValue)} RWF` },
        {
          label: "Total inventory value",
          value: `${number(totalFinishedGoodsValue)} RWF`,
        },
      ],
      table: {
        headers: [
          "Code",
          "Finished product",
          "Production Store",
          "Sales Store",
          "Total stock",
          "Production cost",
          "Stock value (RWF)",
        ],
        rows: products.map((product) => {
          const production = balanceFor(product._id, "production");
          const sales = balanceFor(product._id, "sales");
          const valuation = valuationFor(product._id);
          return [
            product.code,
            product.name,
            stockWithPacks(production, product),
            stockWithPacks(sales, product),
            stockWithPacks(production + sales, product),
            valuation?.status === "costed"
              ? `${number(valuation.costPerUnit)} RWF / ${product.baseUnit === "pcs" ? "pc" : "kg"}`
              : "Cost pending",
            valuation?.status === "costed"
              ? number(
                  (production + sales) * Number(valuation.costPerUnit || 0),
                )
              : "—",
          ];
        }),
      },
      notes:
        "Paint inventory is valued at the latest completed production-batch cost per kg. Transfers between stores do not change total company inventory value. Products without a completed costed batch are shown as cost pending.",
    });
  const lowBalances = scopedBalances.filter(
    (balance) =>
      Number(balance.minimumQuantity || 0) > 0 &&
      Number(balance.quantity || 0) <= Number(balance.minimumQuantity || 0),
  );
  return (
    <div className="mx-auto max-w-[1480px] space-y-3 pb-5">
      <header className="border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-700">Inventory & stores</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {catalogue === "scaffold"
                ? "Scaffolding equipment stores"
                : "Finished-goods stores"}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">Production stock, sales stock, valuation and internal transfers.</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {canManageMinimums && (
            <button
              onClick={() => setShowMinimum(true)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400"
            >
              <SlidersHorizontal size={16} />
              Minimum balances
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setShowAdjustment(true)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400"
            >
              <SlidersHorizontal size={16} />
              Adjust stock
            </button>
          )}
          <Link
            to="/management/products"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400"
          >
            <PencilLine size={16} />
            Product catalogue
          </Link>
          <button
            onClick={printFinishedGoodsValuation}
            disabled={!products.length}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white hover:bg-black disabled:opacity-40"
          >
            <Printer size={16} />
            Print valuation
          </button>
          <button
            onClick={() => void load()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          </div>
        </div>
        <div className="flex gap-1 p-1.5">
        <button
          type="button"
          onClick={() => {
            setCatalogue("paint");
            setForm((current) => ({
              ...current,
              product: "",
              quantityInput: "",
              quantityMode: "packs",
            }));
          }}
          className={`rounded-md px-3 py-2 text-xs font-extrabold transition ${catalogue === "paint" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Paint finished goods
        </button>
        <button
          type="button"
          onClick={() => {
            setCatalogue("scaffold");
            setForm((current) => ({
              ...current,
              product: "",
              quantityInput: "",
              quantityMode: "pcs",
            }));
          }}
          className={`rounded-md px-3 py-2 text-xs font-extrabold transition ${catalogue === "scaffold" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Scaffolding equipment
        </button>
        </div>
      </header>
      {showAdjustment && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <form
            onSubmit={submitAdjustment}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-red-600">
                  SuperAdmin control
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Adjust finished-goods stock
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter packs for paint products. The system records the
                  matching kg movement automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustment(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Finished product
                <select
                  required
                  value={adjustment.product}
                  onChange={(event) => {
                    const product = products.find(
                      (item) => item._id === event.target.value,
                    );
                    setAdjustment({
                      ...adjustment,
                      product: event.target.value,
                      quantityChange: "",
                      quantityMode:
                        product?.baseUnit === "pcs" || isScaffolding(product)
                          ? "pcs"
                          : "packs",
                    });
                  }}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} · {product.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Store
                <select
                  value={adjustment.store}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, store: event.target.value })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="production">Production Store</option>
                  <option value="sales">Sales Store</option>
                </select>
              </label>
              {selectedAdjustmentProduct && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Current balance:{" "}
                  <strong>
                    {stockWithPacks(
                      balanceFor(
                        selectedAdjustmentProduct._id,
                        adjustment.store,
                      ),
                      selectedAdjustmentProduct,
                    )}
                  </strong>
                </p>
              )}
              <div className="rounded-xl border border-red-100 bg-red-50/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">
                    Adjustment quantity
                  </p>
                  {selectedAdjustmentProduct?.baseUnit === "pcs" ||
                  isScaffolding(selectedAdjustmentProduct) ? (
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                      By piece
                    </span>
                  ) : (
                    <select
                      value={adjustment.quantityMode}
                      onChange={(event) =>
                        setAdjustment({
                          ...adjustment,
                          quantityMode: event.target.value as "packs" | "kg",
                        })
                      }
                      className="h-9 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-slate-700"
                    >
                      <option value="packs">By pack</option>
                      <option value="kg">By kg</option>
                    </select>
                  )}
                </div>
                <label className="mt-3 block text-sm font-bold text-slate-700">
                  {adjustment.quantityMode === "packs"
                    ? `Packs to add or remove${selectedAdjustmentProduct?.packSizeKg ? ` (${selectedAdjustmentProduct.packSizeKg} kg per pack)` : ""}`
                    : adjustment.quantityMode === "pcs"
                      ? "Pieces to add or remove"
                      : "Kilograms to add or remove"}
                  <input
                    required
                    step="any"
                    type="number"
                    value={adjustment.quantityChange}
                    onChange={(event) =>
                      setAdjustment({
                        ...adjustment,
                        quantityChange: event.target.value,
                      })
                    }
                    placeholder={
                      adjustment.quantityMode === "packs"
                        ? "Example: 4 or -2"
                        : "Example: 80 or -20"
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                {adjustment.quantityMode === "packs" &&
                  adjustment.quantityChange &&
                  selectedAdjustmentProduct?.packSizeKg && (
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Stock movement:{" "}
                      {Number(adjustment.quantityChange) *
                        Number(selectedAdjustmentProduct.packSizeKg)}{" "}
                      kg
                    </p>
                  )}
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Reason for correction
                <textarea
                  required
                  minLength={3}
                  value={adjustment.reason}
                  onChange={(event) =>
                    setAdjustment({ ...adjustment, reason: event.target.value })
                  }
                  rows={3}
                  placeholder="Example: Physical stock count correction"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </label>
            </div>
            <button
              disabled={busy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300"
            >
              <SlidersHorizontal size={16} />
              {busy ? "Recording…" : "Record adjustment"}
            </button>
          </form>
        </div>
      )}
      {showMinimum && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveMinimum}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-red-600">
                  SuperAdmin control
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Set minimum balance
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The store is marked low when its balance reaches this
                  quantity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMinimum(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Finished product
                <select
                  required
                  value={minimumForm.product}
                  onChange={(event) => {
                    const product = event.target.value;
                    const existing = balances.find(
                      (balance) =>
                        balance.product?._id === product &&
                        balance.store === minimumForm.store,
                    );
                    setMinimumForm({
                      ...minimumForm,
                      product,
                      minimumQuantity: existing
                        ? String(existing.minimumQuantity || "")
                        : "",
                    });
                  }}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} · {product.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Store
                <select
                  value={minimumForm.store}
                  onChange={(event) =>
                    setMinimumForm({
                      ...minimumForm,
                      store: event.target.value,
                    })
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="sales">Sales Store</option>
                  <option value="production">Production Store</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Minimum balance
                <input
                  required
                  min="0"
                  step="any"
                  type="number"
                  value={minimumForm.minimumQuantity}
                  onChange={(event) =>
                    setMinimumForm({
                      ...minimumForm,
                      minimumQuantity: event.target.value,
                    })
                  }
                  placeholder="Example: 100"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
            </div>
            <button
              disabled={busy}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {busy ? "Saving…" : "Save minimum balance"}
            </button>
          </form>
        </div>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid overflow-hidden border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-slate-200">
        <Metric
          icon={<Factory size={19} />}
          label="Production Store"
          value={number(catalogue === "scaffold" ? totalProduction : productionPacks)}
          unit={catalogue === "scaffold" ? "pcs" : "packs"}
          helper={catalogue === "paint" ? `${number(totalProduction)} kg` : undefined}
        />
        <Metric
          icon={<Store size={19} />}
          label="Sales Store"
          value={number(catalogue === "scaffold" ? totalSales : salesPacks)}
          unit={catalogue === "scaffold" ? "pcs" : "packs"}
          helper={catalogue === "paint" ? `${number(totalSales)} kg` : undefined}
        />
        <Metric
          icon={<ArrowRightLeft size={19} />}
          label="Recorded transfers"
          value={String(scopedTransfers.length)}
          unit=""
        />
        <Metric
          icon={<CircleDollarSign size={19} />}
          label="Finished-goods value"
          value={number(totalFinishedGoodsValue)}
          unit="RWF"
        />
        <Metric
          icon={<PackageCheck size={19} />}
          label="Low balance alerts"
          value={String(lowBalances.length)}
          unit="stores"
        />
      </section>
      {catalogue === "paint" && missingCostProducts.length > 0 && (
        <section className="flex flex-col gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong>
              {missingCostProducts.length} product
              {missingCostProducts.length === 1 ? "" : "s"}
            </strong>{" "}
            have stock but no completed costed production batch. Their value is
            excluded until production cost is available.
          </p>
          <Link
            to="/management/production/batches"
            className="shrink-0 font-extrabold text-amber-950 underline"
          >
            Review batches
          </Link>
        </section>
      )}
      <section className="grid gap-4 xl:grid-cols-[.95fr_1.55fr]">
        <form onSubmit={sendTransfer} className="border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <ArrowRightLeft size={17} className="text-red-700" />
            <div>
              <h2 className="font-bold text-slate-900">
                {catalogue === "scaffold"
                  ? "Transfer scaffolding equipment"
                  : "Transfer finished goods"}
              </h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Product
              <select
                required
                value={form.product}
                onChange={(event) =>
                  setForm({ ...form, product: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950"
              >
                <option value="">
                  Select{" "}
                  {catalogue === "scaffold"
                    ? "scaffolding equipment"
                    : "finished product"}
                </option>
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950"
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
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950"
                >
                  <option value="sales">Sales Store</option>
                  <option value="production">Production Store</option>
                </select>
              </label>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">
                  Transfer quantity
                </p>
                {isPieceProduct ? (
                  <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                    By piece
                  </span>
                ) : (
                  <select
                    value={form.quantityMode}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        quantityMode: event.target.value as "packs" | "kg",
                        quantityInput: "",
                      })
                    }
                    className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700"
                  >
                    <option value="packs">By pack</option>
                    <option value="kg">By kg</option>
                  </select>
                )}
              </div>
              <label className="mt-3 block text-sm font-semibold text-gray-700">
                {isPieceProduct
                  ? "Number of pieces"
                  : form.quantityMode === "packs"
                    ? `Number of packs${selected?.packSizeKg ? ` (${selected.packSizeKg} kg)` : ""}`
                    : "Quantity in kg"}
                <input
                  required
                  min="0.0001"
                  step="any"
                  type="number"
                  disabled={
                    form.quantityMode === "packs" && !selected?.packSizeKg
                  }
                  value={form.quantityInput}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      quantityMode: isPieceProduct ? "pcs" : form.quantityMode,
                      quantityInput: event.target.value,
                    })
                  }
                  placeholder={
                    isPieceProduct
                      ? "10"
                      : form.quantityMode === "packs"
                        ? "12"
                        : "240"
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950 disabled:bg-slate-100"
                />
              </label>
              {selected && form.quantityInput && (
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  {number(transferQuantity)} {isPieceProduct ? "pcs" : "kg"}
                </p>
              )}
            </div>
            {selected && (
              <p className="border-l-2 border-red-700 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Available in {storeName(form.fromStore)}:{" "}
                <strong>
                  {stockWithPacks(
                    balanceFor(selected._id, form.fromStore),
                    selected,
                  )}
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
                className="mt-1 w-full rounded-md border border-slate-200 p-2.5 text-sm outline-none focus:border-slate-950"
                placeholder="Example: Replenishment for Kigali sales outlet"
              />
            </label>
            <button
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-extrabold text-white hover:bg-red-800 disabled:bg-slate-300"
            >
              <Send size={16} />
              {busy ? "Recording…" : "Record transfer"}
            </button>
          </div>
        </form>
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Store balances by product</h2>
              <p className="text-[10px] font-semibold text-slate-500">{visibleProducts.length} of {products.length} products</p>
            </div>
            <input
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
              placeholder="Search product or code"
              aria-label="Search finished goods"
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-slate-950 sm:w-56"
            />
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5 text-right">Production</th>
                  <th className="px-3 py-2.5 text-right">Sales</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProducts.map((product) => {
                  const production = balanceFor(product._id, "production"),
                    sales = balanceFor(product._id, "sales");
                  const productionMinimum = Number(
                    balances.find(
                      (balance) =>
                        balance.product?._id === product._id &&
                        balance.store === "production",
                    )?.minimumQuantity || 0,
                  );
                  const salesMinimum = Number(
                    balances.find(
                      (balance) =>
                        balance.product?._id === product._id &&
                        balance.store === "sales",
                    )?.minimumQuantity || 0,
                  );
                  const productionLow =
                    productionMinimum > 0 && production <= productionMinimum;
                  const salesLow = salesMinimum > 0 && sales <= salesMinimum;
                  return (
                    <tr
                      key={product._id}
                      className={
                        productionLow || salesLow ? "bg-red-50/40" : ""
                      }
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-extrabold text-slate-950">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {isScaffolding(product)
                            ? `${product.code} · Equipment · counted in pieces`
                            : `${product.code} · ${product.unit} pack · ${number(product.packSizeKg || 0)} kg per pack`}
                        </p>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${productionLow ? "text-red-700" : ""}`}
                      >
                        <p className="font-extrabold text-slate-950">
                          {isScaffolding(product)
                            ? `${number(production)} pcs`
                            : packs(production, product) || "Pack size not set"}
                        </p>
                        {!isScaffolding(product) && (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            {number(production)} kg
                          </p>
                        )}
                        {productionMinimum > 0 && (
                          <p
                            className={`mt-1 text-[9px] font-bold ${productionLow ? "text-red-700" : "text-slate-500"}`}
                          >
                            Min. {number(productionMinimum)}{" "}
                            {isScaffolding(product) ? "pcs" : "kg"}
                            {productionLow ? " · Low" : ""}
                          </p>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${salesLow ? "text-red-700" : ""}`}
                      >
                        <p className="font-extrabold text-slate-950">
                          {isScaffolding(product)
                            ? `${number(sales)} pcs`
                            : packs(sales, product) || "Pack size not set"}
                        </p>
                        {!isScaffolding(product) && (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            {number(sales)} kg
                          </p>
                        )}
                        {salesMinimum > 0 && (
                          <p
                            className={`mt-1 text-[9px] font-bold ${salesLow ? "text-red-700" : "text-slate-500"}`}
                          >
                            Min. {number(salesMinimum)}{" "}
                            {isScaffolding(product) ? "pcs" : "kg"}
                            {salesLow ? " · Low" : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-900">
                        <p className="font-extrabold">
                          {isScaffolding(product)
                            ? `${number(production + sales)} pcs`
                            : packs(production + sales, product) ||
                              "Pack size not set"}
                        </p>
                        {!isScaffolding(product) && (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            {number(production + sales)} kg
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-500">
                      No{" "}
                      {catalogue === "scaffold"
                        ? "scaffolding equipment"
                        : "finished paint products"}{" "}
                      are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-slate-600" />
            <div><h2 className="font-bold text-slate-900">Transfer history</h2><p className="text-[10px] font-semibold text-slate-500">Click a transfer to view its details</p></div>
          </div>
          <input
            value={transferSearch}
            onChange={(event) => setTransferSearch(event.target.value)}
            placeholder="Search transfer or product"
            aria-label="Search store transfers"
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-slate-950 sm:w-64"
          />
        </div>
        <div className="max-h-[390px] overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Movement</th>
                <th className="px-3 py-2.5 text-right">Quantity</th>
                <th className="px-3 py-2.5">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTransfers.map((transfer) => (
                <tr key={transfer._id} onClick={() => setSelectedTransfer(transfer)} className="cursor-pointer transition hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-extrabold text-slate-950">
                    {transfer.reference}
                    <p className="mt-0.5 text-[9px] font-normal text-slate-500">
                      {new Date(transfer.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 font-semibold">
                    {transfer.product?.name || "Deleted product"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {storeName(transfer.fromStore)} →{" "}
                    {storeName(transfer.toStore)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-extrabold">
                    {stockWithPacks(transfer.quantity, transfer.product)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {transfer.performedBy?.fullName || "—"}
                  </td>
                </tr>
              ))}
              {visibleTransfers.length === 0 && (
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
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm" onMouseDown={() => setSelectedTransfer(null)}>
          <section role="dialog" aria-modal="true" aria-label="Store transfer details" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Store transfer</p><h2 className="mt-0.5 text-lg font-black text-slate-950">{selectedTransfer.reference}</h2><p className="text-xs text-slate-500">{new Date(selectedTransfer.createdAt).toLocaleString("en-RW")}</p></div>
              <button type="button" onClick={() => setSelectedTransfer(null)} aria-label="Close transfer details" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"><X size={16} /></button>
            </header>
            <div className="space-y-4 p-5">
              <div><p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">Product</p><p className="mt-1 font-extrabold text-slate-950">{selectedTransfer.product?.name || "Deleted product"}</p><p className="text-xs text-slate-500">{selectedTransfer.product?.code || "—"}</p></div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div><p className="text-[9px] font-extrabold uppercase text-slate-500">From</p><p className="mt-1 text-xs font-black text-slate-950">{storeName(selectedTransfer.fromStore)}</p></div>
                <ArrowRightLeft size={17} className="text-red-700" />
                <div><p className="text-[9px] font-extrabold uppercase text-slate-500">To</p><p className="mt-1 text-xs font-black text-slate-950">{storeName(selectedTransfer.toStore)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-[9px] font-extrabold uppercase text-slate-500">Quantity moved</p><p className="mt-1 text-sm font-black text-slate-950">{stockWithPacks(selectedTransfer.quantity, selectedTransfer.product)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-[9px] font-extrabold uppercase text-slate-500">Recorded by</p><p className="mt-1 truncate text-sm font-black text-slate-950">{selectedTransfer.performedBy?.fullName || "—"}</p></div>
              </div>
              {selectedTransfer.notes && <div className="rounded-xl border border-slate-200 p-3"><p className="text-[9px] font-extrabold uppercase text-slate-500">Notes</p><p className="mt-1 text-sm text-slate-700">{selectedTransfer.notes}</p></div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  unit = "kg",
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  helper?: string;
}) {
  return (
    <article className="min-w-0 border-b border-slate-200 px-3 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:[&:nth-child(odd)]:border-r-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-500">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-950">
            {value}
            {unit ? ` ${unit}` : ""}
          </p>
          {helper && <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{helper}</p>}
        </div>
      </div>
    </article>
  );
}
