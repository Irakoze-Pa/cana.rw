import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  Printer,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getFormulas } from "../../formula/services/formula.service";
import type { Formula, RawMaterial } from "../../formula/types/formula.types";
import inventoryService from "../../inventory/services/inventoryService";
import type { Inventory } from "../../inventory/types/inventory.types";
import { printCanaDocument } from "../../utils/printCanaDocument";
import api from "@/services/api";

type Product = {
  _id: string;
  name: string;
  code?: string;
  unit?: string;
  baseUnit?: "kg" | "pcs";
  packSizeKg?: number;
};
type FinishedBalance = {
  _id: string;
  product: Product | null;
  store: "production" | "sales";
  quantity: number;
  minimumQuantity?: number;
};
type InputMode = "kg" | "packs";
type SalesOrder = { status?: string; createdAt?: string; deliveredAt?: string; statusHistory?: { status?: string; at?: string }[]; items?: { product?: string | { _id?: string }; itemType?: string; productName?: string; quantity?: number; stockQuantity?: number; packSizeKg?: number }[] };
type Batch = { product?: string | { _id?: string }; productName?: string; status?: string; plannedQuantity?: number; actualQuantity?: number };
type Requirement = {
  id: string;
  name: string;
  code: string;
  unit: string;
  stockUnit: string;
  unitMismatch: boolean;
  required: number;
  available: number;
  shortage: number;
  packSize: number;
  proposedQuantity: number;
  proposedPacks: number;
  unitCost: number;
};

const number = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });
const money = (value: number) => `${number(value)} RWF`;
const materialId = (value: string | RawMaterial) =>
  typeof value === "string" ? value : value._id;
const normalizeUnit = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, "");

const calculateRequirements = (
  formula: Formula,
  plannedOutput: number,
  inventory: Inventory[],
): Requirement[] => {
  if (plannedOutput <= 0 || Number(formula.batchSize || 0) <= 0) return [];
  const scale = plannedOutput / Number(formula.batchSize);
  return (formula.items || []).map((item) => {
    const id = materialId(item.rawMaterial);
    const material =
      typeof item.rawMaterial === "object" ? item.rawMaterial : null;
    const stock = inventory.find((entry) => {
      const stockId =
        typeof entry.rawMaterial === "object"
          ? entry.rawMaterial._id
          : entry.rawMaterial;
      return stockId === id || entry.rawMaterialCode === material?.code;
    });
    const required =
      Number(item.quantity || 0) *
      scale *
      (1 + Number(item.wastePercentage || 0) / 100);
    const unit = item.unit || material?.unit || stock?.unit || "kg";
    const stockUnit = stock?.unit || material?.unit || unit;
    const unitMismatch = normalizeUnit(unit) !== normalizeUnit(stockUnit);
    const available = unitMismatch ? 0 : Math.max(
      0,
      Number(stock?.availableQuantity ?? stock?.quantity ?? 0),
    );
    const shortage = unitMismatch ? 0 : Math.max(0, required - available);
    const sizes =
      typeof stock?.rawMaterial === "object"
        ? stock.rawMaterial.packSizes || []
        : [];
    const supplierPack =
      sizes
        .map(Number)
        .filter((size) => size > 0)
        .sort((a, b) => b - a)[0] || 0;
    const proposedPacks =
      shortage > 0 && supplierPack > 0 ? Math.ceil(shortage / supplierPack) : 0;
    const proposedQuantity =
      supplierPack > 0 ? proposedPacks * supplierPack : shortage;
    return {
      id,
      name: material?.name || stock?.rawMaterialName || "Raw material",
      code: material?.code || stock?.rawMaterialCode || "—",
      unit,
      stockUnit,
      unitMismatch,
      required,
      available,
      shortage,
      packSize: supplierPack,
      proposedQuantity,
      proposedPacks,
      unitCost: Number(stock?.averageCostPerUnit || material?.costPerUnit || 0),
    };
  });
};

export default function MaterialRequirementsPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedBalance[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [demandPeriod, setDemandPeriod] = useState<30 | 90 | 180>(90);
  const [formulaId, setFormulaId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [mode, setMode] = useState<InputMode>("packs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [
        formulaData,
        inventoryData,
        productResponse,
        finishedGoodsResponse,
        salesResponse,
        batchResponse,
      ] = await Promise.all([
        getFormulas(),
        inventoryService.getInventory(),
        api.get<{ data: Product[] }>("/products"),
        api.get<{ data: FinishedBalance[] }>("/finished-goods/balances"),
        api.get<{ data: SalesOrder[] }>("/sales-orders"),
        api.get<{ data: Batch[] }>("/production-batches"),
      ]);
      const active = (formulaData || []).filter(
        (item) => item.status === "Active",
      );
      setFormulas(active);
      setInventory(inventoryData || []);
      setProducts(productResponse.data?.data || []);
      setFinishedGoods(finishedGoodsResponse.data?.data || []);
      setSalesOrders(salesResponse.data?.data || []);
      setBatches(batchResponse.data?.data || []);
      setFormulaId((current) => current || active[0]?._id || "");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load production planning data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const formula = formulas.find((item) => item._id === formulaId) || null;
  const formulaProductId = formula
    ? typeof formula.product === "string"
      ? formula.product
      : formula.product._id
    : "";
  const product =
    products.find((item) => item._id === formulaProductId) ||
    (formula && typeof formula.product === "object"
      ? (formula.product as Product)
      : null);
  const packSize = Math.max(0.001, Number(product?.packSizeKg || 20));
  const enteredQuantity = Math.max(
    0,
    Number(quantity.replaceAll(",", "")) || 0,
  );
  const plannedOutput =
    mode === "packs" ? enteredQuantity * packSize : enteredQuantity;
  const plannedPacks = plannedOutput / packSize;

  const requirements = useMemo<Requirement[]>(() => {
    if (!formula) return [];
    return calculateRequirements(formula, plannedOutput, inventory);
  }, [formula, inventory, plannedOutput]);

  const recommendations = useMemo(
    () =>
      formulas
        .flatMap((candidate) => {
          const productId =
            typeof candidate.product === "string"
              ? candidate.product
              : candidate.product._id;
          const candidateProduct =
            products.find((item) => item._id === productId) ||
            (typeof candidate.product === "object"
              ? (candidate.product as Product)
              : null);
          const candidatePackSize = Number(candidateProduct?.packSizeKg || 0);
          if (!candidateProduct || candidatePackSize <= 0) return [];
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - demandPeriod);
          cutoff.setHours(0, 0, 0, 0);
          const soldQuantity = salesOrders.reduce((total, order) => {
            const deliveredAt = order.deliveredAt || [...(order.statusHistory || [])].reverse().find((entry) => entry.status?.toLowerCase() === "delivered")?.at || order.createdAt;
            if (order.status?.toLowerCase() !== "delivered" || !deliveredAt || new Date(deliveredAt) < cutoff) return total;
            return total + (order.items || []).reduce((subtotal, line) => {
              if (line.itemType === "raw_material") return subtotal;
              const id = typeof line.product === "string" ? line.product : line.product?._id;
              if (id !== productId && String(line.productName || "").toLowerCase() !== candidateProduct.name.toLowerCase()) return subtotal;
              return subtotal + Number(line.stockQuantity ?? (line.packSizeKg ? Number(line.quantity || 0) * line.packSizeKg : line.quantity) ?? 0);
            }, 0);
          }, 0);
          const production = finishedGoods.find(
            (item) =>
              item.store === "production" && item.product?._id === productId,
          );
          const sales = finishedGoods.find(
            (item) => item.store === "sales" && item.product?._id === productId,
          );
          const productionPacks =
            Number(production?.quantity || 0) / candidatePackSize;
          const salesPacks = Number(sales?.quantity || 0) / candidatePackSize;
          const onHandKg = Number(production?.quantity || 0) + Number(sales?.quantity || 0);
          const openOutputKg = batches.reduce((sum, batch) => {
            const id = typeof batch.product === "string" ? batch.product : batch.product?._id;
            if (id !== productId && String(batch.productName || "").toLowerCase() !== candidateProduct.name.toLowerCase()) return sum;
            if (!["Planned", "Ready", "In Progress", "Paused"].includes(String(batch.status))) return sum;
            return sum + Math.max(0, Number(batch.plannedQuantity || 0) - (batch.status === "In Progress" ? Number(batch.actualQuantity || 0) : 0));
          }, 0);
          const dailyDemand = soldQuantity / demandPeriod;
          const targetKg = Math.max(dailyDemand * 30, candidatePackSize);
          const productionNeeded = Math.ceil(Math.max(0, targetKg - onHandKg - openOutputKg) / candidatePackSize);
          if (productionNeeded <= 0 && soldQuantity <= 0) return [];
          const materialPlan = calculateRequirements(
            candidate,
            productionNeeded * candidatePackSize,
            inventory,
          );
          const missing = materialPlan.filter((item) => item.shortage > 0);
          const needsUnitReview = materialPlan.some((item) => item.unitMismatch);
          return [
            {
              formula: candidate,
              product: candidateProduct,
              productionPacks,
              salesPacks,
              soldQuantity,
              openOutputKg,
              priorityScore: dailyDemand > 0 ? Math.round((Math.min(60, dailyDemand) + Math.max(0, 1 - onHandKg / Math.max(targetKg, 1)) * 40) * 10) / 10 : 0,
              productionNeeded,
              missing,
              needsUnitReview,
              ready: materialPlan.length > 0 && missing.length === 0 && !needsUnitReview,
            },
          ];
        })
        .sort((a, b) => b.priorityScore - a.priorityScore || b.soldQuantity - a.soldQuantity),
    [formulas, products, finishedGoods, inventory, salesOrders, batches, demandPeriod],
  );

  const reviewRecommendation = (item: (typeof recommendations)[number]) => {
    setFormulaId(item.formula._id);
    setMode("packs");
    setQuantity(String(item.productionNeeded || 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shortages = requirements.filter((item) => item.shortage > 0);
  const unitReviews = requirements.filter((item) => item.unitMismatch);
  const ready = requirements.length > 0 && shortages.length === 0 && unitReviews.length === 0;
  const purchaseValue = shortages.reduce(
    (sum, item) => sum + item.proposedQuantity * item.unitCost,
    0,
  );
  const selectedProductionPacks =
    Number(
      finishedGoods.find(
        (item) =>
          item.store === "production" && item.product?._id === formulaProductId,
      )?.quantity || 0,
    ) / packSize;
  const selectedSalesPacks =
    Number(
      finishedGoods.find(
        (item) =>
          item.store === "sales" && item.product?._id === formulaProductId,
      )?.quantity || 0,
    ) / packSize;

  const printPlan = () => {
    if (!formula || !requirements.length) return;
    const productName =
      product?.name ||
      (typeof formula.product === "object"
        ? formula.product.name
        : "Finished product");
    const productCode =
      product?.code ||
      (typeof formula.product === "object" ? formula.product.code : "");
    printCanaDocument({
      title: "Production Readiness & Purchase Proposal",
      reference: `MRP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${productCode || formula.code}`,
        status: ready
        ? "Ready for production"
        : `${shortages.length} material shortage${shortages.length === 1 ? "" : "s"}${unitReviews.length ? ` · ${unitReviews.length} unit review${unitReviews.length === 1 ? "" : "s"}` : ""}`,
      brandLine: "CANA Paints · Material Requirements Planning",
      orientation: "landscape",
      details: [
        {
          label: "Finished product",
          value: `${productName}${productCode ? ` · ${productCode}` : ""}`,
        },
        {
          label: "Formula",
          value: `${formula.name} · ${formula.code} v${formula.version}`,
        },
        { label: "Planned output", value: `${number(plannedOutput)} kg` },
        {
          label: "Finished packs",
          value: `${number(plannedPacks)} × ${product?.unit || `${number(packSize)} kg`}`,
        },
        {
          label: "Production Store",
          value: `${number(selectedProductionPacks)} packs`,
        },
        { label: "Sales Store", value: `${number(selectedSalesPacks)} packs` },
          { label: "Materials checked", value: requirements.length },
        { label: "Short materials", value: shortages.length },
          { label: "Unit reviews", value: unitReviews.length },
        { label: "Estimated purchase value", value: money(purchaseValue) },
        {
          label: "Production decision",
          value: ready ? "Proceed" : "Purchase shortages first",
        },
      ],
      table: {
        headers: [
          "#",
          "Raw material",
          "Required",
          "Available",
          "Shortage",
          "Proposed purchase",
          "Estimated value",
          "Status",
        ],
        rows: requirements.map((item, index) => [
          index + 1,
          `${item.name} · ${item.code}`,
          `${number(item.required)} ${item.unit}`,
          `${number(item.available)} ${item.unit}`,
          item.shortage > 0 ? `${number(item.shortage)} ${item.unit}` : "—",
          item.shortage > 0
            ? item.packSize > 0
              ? `${number(item.proposedPacks)} packs × ${number(item.packSize)} ${item.unit} = ${number(item.proposedQuantity)} ${item.unit}`
              : `${number(item.proposedQuantity)} ${item.unit}`
            : "—",
          item.shortage > 0
            ? money(item.proposedQuantity * item.unitCost)
            : "—",
          item.shortage > 0 ? "PURCHASE" : "AVAILABLE",
        ]),
      },
      notes: ready
        ? "All formula materials are currently available. Stock is not reserved until production consumption is issued."
        : "The purchase proposal rounds shortages to configured supplier pack sizes. Confirm supplier pack size, price and delivery date before creating the purchase order.",
      approval: {
        status: ready ? "Production readiness confirmed" : "Purchase proposal",
        signatoryName: "KABANDA Fred",
        signatoryTitle: "Managing Director",
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700">
            <PackageSearch size={21} />
          </span>
          <div>
            <p className="cana-section-kicker">Production planning</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Material requirements
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={printPlan}
            disabled={!requirements.length}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            <Printer size={15} />
            Print plan
          </button>
        </div>
      </header>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-red-700">
              Demand-led production
            </p>
            <h2 className="text-sm font-black text-slate-950">
              Manufacturing priorities · demand and material readiness
            </h2>
          </div>
          <div className="flex items-center gap-2">{([30, 90, 180] as const).map((days) => <button key={days} onClick={() => setDemandPeriod(days)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${demandPeriod === days ? "bg-slate-900 text-white" : "border bg-white text-slate-600"}`}>Last {days}d</button>)}<span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white">{recommendations.length}</span></div>
        </div>
        {recommendations.length ? (
          <div className="divide-y divide-slate-100">
            {recommendations.map((item) => (
              <div
                key={item.formula._id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[1.7fr_.8fr_.8fr_1fr_auto] lg:items-center"
              >
                <div>
                  <strong className="block text-sm text-slate-950">
                    {item.product.name}
                  </strong>
                  <span className="text-[10px] text-slate-500">{item.product.code || item.formula.code} · Priority {item.priorityScore}</span>
                </div>
                <StoreCell label={`Delivered (${demandPeriod}d)`} value={item.soldQuantity / Number(item.product.packSizeKg || 1)} />
                <StoreCell label="Production" value={item.productionPacks} />
                <StoreCell label="Sales" value={item.salesPacks} />
                <StoreCell label="Open output (kg)" value={item.openOutputKg} />
                <StoreCell label="Suggested batch" value={item.productionNeeded} />
                <div>
                  {item.ready ? (
                    <Badge text="MATERIALS READY" tone="success" />
                  ) : (
                    <Badge
                      text={item.needsUnitReview
                        ? `${item.missing.length} SHORT · UNIT CHECK`
                        : `${item.missing.length} SHORT`}
                      tone="warning"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => reviewRecommendation(item)}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                >
              Review plan
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={17} />
            No formula-linked product needs replenishment in this demand window.
          </div>
        )}
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          Paint / formula
          <select
            value={formulaId}
            onChange={(event) => setFormulaId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
          >
            <option value="">Select paint</option>
            {formulas.map((item) => {
              const name =
                typeof item.product === "object"
                  ? item.product.name
                  : item.name;
              return (
                <option key={item._id} value={item._id}>
                  {name} · {item.name} v{item.version}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          Planned quantity
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="decimal"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold"
          />
        </label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          Planning unit
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as InputMode)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            <option value="packs">Finished packs</option>
            <option value="kg">Kilograms</option>
          </select>
        </label>
      </section>
      {formula && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Production Store"
            value={`${number(selectedProductionPacks)} packs`}
          />
          <Metric
            label="Sales Store"
            value={`${number(selectedSalesPacks)} packs`}
          />
          <Metric
            label="Planned output"
            value={`${number(plannedOutput)} kg`}
          />
          <Metric
            label="Finished packs"
            value={`${number(plannedPacks)} packs`}
          />
          <Metric
            label="Short materials"
            value={String(shortages.length)}
            danger={shortages.length > 0}
          />
          <Metric
            label="Unit reviews"
            value={String(unitReviews.length)}
            danger={unitReviews.length > 0}
          />
          <Metric label="Proposed purchase" value={money(purchaseValue)} />
        </section>
      )}
      {formula && requirements.length > 0 && (
        <section
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
        >
          <div className="flex items-center gap-2">
            {ready ? (
              <CheckCircle2 size={18} className="text-emerald-700" />
            ) : (
              <AlertTriangle size={18} className="text-amber-700" />
            )}
            <strong className="text-sm text-slate-950">
              {ready
                ? "All materials are available"
                : `${shortages.length} material${shortages.length === 1 ? " is" : "s are"} short${unitReviews.length ? ` · ${unitReviews.length} need a unit check` : ""}`}
            </strong>
          </div>
          {shortages.length > 0 && (
            <Link
              to="/management/purchase-orders"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
            >
              <ShoppingCart size={14} />
              Purchase orders
            </Link>
          )}
        </section>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <ClipboardList size={16} />
          <h2 className="text-sm font-black">
            Material availability & purchase proposal
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5 text-right">Required</th>
                <th className="px-3 py-2.5 text-right">Available</th>
                <th className="px-3 py-2.5 text-right">Shortage</th>
                <th className="px-3 py-2.5">Proposed purchase</th>
                <th className="px-3 py-2.5 text-right">Estimate</th>
                <th className="px-3 py-2.5">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map((item) => (
                <tr
                  key={item.id}
                  className={item.shortage > 0 ? "bg-amber-50/40" : ""}
                >
                  <td className="px-3 py-3">
                    <strong className="block text-slate-950">
                      {item.name}
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {number(item.required)} {item.unit}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.unitMismatch
                      ? `Unit check · stock in ${item.stockUnit}`
                      : `${number(item.available)} ${item.unit}`}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-black ${item.shortage > 0 ? "text-red-700" : "text-slate-400"}`}
                  >
                    {item.unitMismatch
                      ? "Unit check required"
                      : item.shortage > 0
                        ? `${number(item.shortage)} ${item.unit}`
                        : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.unitMismatch
                      ? "Confirm conversion"
                      : item.shortage > 0
                      ? item.packSize > 0
                        ? `${number(item.proposedPacks)} × ${number(item.packSize)} ${item.unit}`
                        : `${number(item.proposedQuantity)} ${item.unit}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {item.shortage > 0
                      ? money(item.proposedQuantity * item.unitCost)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${item.unitMismatch ? "bg-amber-100 text-amber-800" : item.shortage > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {item.unitMismatch ? "UNIT CHECK" : item.shortage > 0 ? "PURCHASE" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !requirements.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-slate-500"
                  >
                    Select a paint and enter the planned output.
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
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black ${danger ? "text-red-700" : "text-slate-950"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="block text-[9px] font-bold uppercase text-slate-500">
        {label}
      </span>
      <strong className="text-xs text-slate-950">{number(value)} packs</strong>
    </div>
  );
}

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "neutral" | "success" | "warning";
}) {
  const style =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black ${style}`}
    >
      {text}
    </span>
  );
}
