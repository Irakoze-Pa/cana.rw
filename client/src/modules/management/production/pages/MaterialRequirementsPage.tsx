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
type Requirement = {
  id: string;
  name: string;
  code: string;
  unit: string;
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
    const available = Math.max(
      0,
      Number(stock?.availableQuantity ?? stock?.quantity ?? 0),
    );
    const shortage = Math.max(0, required - available);
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
      unit: item.unit || stock?.unit || material?.unit || "kg",
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
      ] = await Promise.all([
        getFormulas(),
        inventoryService.getInventory(),
        api.get<{ data: Product[] }>("/products"),
        api.get<{ data: FinishedBalance[] }>("/finished-goods/balances"),
      ]);
      const active = (formulaData || []).filter(
        (item) => item.status === "Active",
      );
      setFormulas(active);
      setInventory(inventoryData || []);
      setProducts(productResponse.data?.data || []);
      setFinishedGoods(finishedGoodsResponse.data?.data || []);
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
          if (
            !candidateProduct ||
            candidateProduct.baseUnit === "pcs" ||
            candidatePackSize <= 0
          )
            return [];
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
          const totalPacks = productionPacks + salesPacks;
          if (totalPacks >= 30) return [];
          const productionNeeded = Math.ceil(30 - totalPacks);
          if (productionNeeded <= 0) return [];
          const materialPlan = calculateRequirements(
            candidate,
            productionNeeded * candidatePackSize,
            inventory,
          );
          const missing = materialPlan.filter((item) => item.shortage > 0);
          return [
            {
              formula: candidate,
              product: candidateProduct,
              productionPacks,
              salesPacks,
              productionNeeded,
              missing,
              ready: materialPlan.length > 0 && missing.length === 0,
            },
          ];
        })
        .sort((a, b) => b.productionNeeded - a.productionNeeded),
    [formulas, products, finishedGoods, inventory],
  );

  const reviewRecommendation = (item: (typeof recommendations)[number]) => {
    setFormulaId(item.formula._id);
    setMode("packs");
    setQuantity(String(item.productionNeeded || 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shortages = requirements.filter((item) => item.shortage > 0);
  const ready = requirements.length > 0 && shortages.length === 0;
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
        : `${shortages.length} material shortage${shortages.length === 1 ? "" : "s"}`,
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
              Stock control
            </p>
            <h2 className="text-sm font-black text-slate-950">
              Production recommendations · below 30 packs
            </h2>
          </div>
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white">
            {recommendations.length}
          </span>
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
                  <span className="text-[10px] text-slate-500">
                    {item.product.code || item.formula.code} ·{" "}
                    {number(item.product.packSizeKg || 0)} kg/pack
                  </span>
                </div>
                <StoreCell label="Production" value={item.productionPacks} />
                <StoreCell label="Sales" value={item.salesPacks} />
                <div>
                  {item.ready ? (
                    <Badge text="MATERIALS READY" tone="success" />
                  ) : (
                    <Badge
                      text={`${item.missing.length} SHORT`}
                      tone="warning"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => reviewRecommendation(item)}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={17} />
            Every formula-linked product has at least 30 packs in total stock.
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
                : `${shortages.length} material${shortages.length === 1 ? " is" : "s are"} short`}
            </strong>
          </div>
          {!ready && (
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
                    {number(item.available)} {item.unit}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-black ${item.shortage > 0 ? "text-red-700" : "text-slate-400"}`}
                  >
                    {item.shortage > 0
                      ? `${number(item.shortage)} ${item.unit}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.shortage > 0
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
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${item.shortage > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {item.shortage > 0 ? "PURCHASE" : "AVAILABLE"}
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
