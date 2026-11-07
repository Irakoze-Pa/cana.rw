import { useEffect, useMemo, useRef, useState } from "react";
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
  minimumStock: number;
  replenishmentNeed: number;
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
  const grouped = new Map<string, { item: Formula["items"][number]; quantity: number }>();
  (formula.items || []).forEach((item) => {
    const id = materialId(item.rawMaterial);
    const unit = item.unit || (typeof item.rawMaterial === "object" ? item.rawMaterial.unit : "kg");
    const key = `${id}:${normalizeUnit(unit)}`;
    const required = Number(item.quantity || 0) * scale * (1 + Number(item.wastePercentage || 0) / 100);
    const current = grouped.get(key);
    grouped.set(key, { item, quantity: Number(current?.quantity || 0) + required });
  });
  return [...grouped.values()].map(({ item, quantity }) => {
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
    const required = quantity;
    const unit = item.unit || material?.unit || stock?.unit || "kg";
    const stockUnit = stock?.unit || material?.unit || unit;
    const unitMismatch = normalizeUnit(unit) !== normalizeUnit(stockUnit);
    const available = unitMismatch ? 0 : Math.max(
      0,
      Number(stock?.availableQuantity ?? stock?.quantity ?? 0),
    );
    const shortage = unitMismatch ? 0 : Math.max(0, required - available);
    const minimumStock = unitMismatch ? 0 : Math.max(0, Number(stock?.minimumStock || 0));
    const replenishmentNeed = unitMismatch ? 0 : Math.max(0, required + minimumStock - available);
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
      replenishmentNeed > 0 && supplierPack > 0 ? Math.ceil(replenishmentNeed / supplierPack) : 0;
    const proposedQuantity =
      supplierPack > 0 ? proposedPacks * supplierPack : replenishmentNeed;
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
      minimumStock,
      replenishmentNeed,
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
  const [targetCoverDays, setTargetCoverDays] = useState<15 | 30 | 45 | 60>(30);
  const [safetyPacks, setSafetyPacks] = useState(30);
  const [formulaId, setFormulaId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mode, setMode] = useState<InputMode>("kg");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const planningSectionRef = useRef<HTMLElement>(null);

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
      const activeByProduct = new Map<string, Formula>();
      (formulaData || []).filter((item) => item.status === "Active").forEach((item) => {
        const id = typeof item.product === "string" ? item.product : item.product._id;
        const current = activeByProduct.get(id);
        if (!current || Number(item.version || 0) > Number(current.version || 0) || (Number(item.version || 0) === Number(current.version || 0) && new Date(item.updatedAt).getTime() > new Date(current.updatedAt).getTime())) activeByProduct.set(id, item);
      });
      const active = [...activeByProduct.values()].sort((a, b) => {
        const aName = typeof a.product === "object" ? a.product.name : a.name;
        const bName = typeof b.product === "object" ? b.product.name : b.name;
        return aName.localeCompare(bName);
      });
      setFormulas(active);
      setInventory(inventoryData || []);
      setProducts(productResponse.data?.data || []);
      setFinishedGoods(finishedGoodsResponse.data?.data || []);
      setSalesOrders(salesResponse.data?.data || []);
      setBatches(batchResponse.data?.data || []);
      setLastLoadedAt(new Date());
      if (!formulaId && active[0]) {
        setQuantity(String(active[0].batchSize));
        setFormulaId(active[0]._id);
      }
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

  const recommendations = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - demandPeriod);
    cutoff.setHours(0, 0, 0, 0);
    const scored = formulas.flatMap((candidate) => {
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
          const configuredMinimumKg = Number(production?.minimumQuantity || 0) + Number(sales?.minimumQuantity || 0);
          const safetyTargetKg = Math.max(candidatePackSize * safetyPacks, configuredMinimumKg);
          const targetKg = Math.max(dailyDemand * targetCoverDays, safetyTargetKg);
          const productionNeeded = Math.ceil(Math.max(0, targetKg - onHandKg - openOutputKg) / candidatePackSize);
          if (productionNeeded <= 0) return [];
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
              onHandKg,
              openOutputKg,
              targetKg,
              targetPacks: Math.ceil(targetKg / candidatePackSize),
              coverDays: dailyDemand > 0 ? Math.floor(onHandKg / dailyDemand) : null,
              productionNeeded,
              materialPlan,
              missing,
              needsUnitReview,
              ready: materialPlan.length > 0 && missing.length === 0 && !needsUnitReview,
            },
          ];
        });
    const maxSales = Math.max(1, ...scored.map((item) => item.soldQuantity));
    return scored
      .map((item) => {
        const salesScore = (item.soldQuantity / maxSales) * 60;
        const stockCover = item.targetKg > 0
          ? Math.min(1, Math.max(0, item.onHandKg + item.openOutputKg) / item.targetKg)
          : 1;
        const stockUrgency = (1 - stockCover) * 40;
        return { ...item, priorityScore: Math.round((salesScore + stockUrgency) * 10) / 10 };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || b.soldQuantity - a.soldQuantity);
  }, [formulas, products, finishedGoods, inventory, salesOrders, batches, demandPeriod, safetyPacks, targetCoverDays]);

  const portfolioRequirements = useMemo(() => {
    const combined = new Map<string, Requirement>();
    recommendations.forEach((recommendation) => {
      recommendation.materialPlan.forEach((requirement) => {
        const key = `${requirement.id}:${normalizeUnit(requirement.unit)}`;
        const current = combined.get(key);
        if (!current) combined.set(key, { ...requirement });
        else current.required += requirement.required;
      });
    });
    return [...combined.values()].map((item) => {
      const shortage = item.unitMismatch ? 0 : Math.max(0, item.required - item.available);
      const replenishmentNeed = item.unitMismatch ? 0 : Math.max(0, item.required + item.minimumStock - item.available);
      const proposedPacks = replenishmentNeed > 0 && item.packSize > 0 ? Math.ceil(replenishmentNeed / item.packSize) : 0;
      return { ...item, shortage, replenishmentNeed, proposedPacks, proposedQuantity: item.packSize > 0 ? proposedPacks * item.packSize : replenishmentNeed };
    }).sort((a, b) => Number(b.shortage > 0) - Number(a.shortage > 0) || b.replenishmentNeed - a.replenishmentNeed || a.name.localeCompare(b.name));
  }, [recommendations]);

  const portfolioShortages = portfolioRequirements.filter((item) => item.shortage > 0);
  const portfolioPurchases = portfolioRequirements.filter((item) => item.replenishmentNeed > 0);
  const portfolioPurchaseValue = portfolioPurchases.reduce((sum, item) => sum + item.proposedQuantity * item.unitCost, 0);

  const reviewRecommendation = (item: (typeof recommendations)[number]) => {
    setFormulaId(item.formula._id);
    setMode("kg");
    setQuantity(String(item.productionNeeded * item.product.packSizeKg!));
    planningSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectFormula = (nextFormulaId: string) => {
    const nextFormula = formulas.find((item) => item._id === nextFormulaId);
    setFormulaId(nextFormulaId);
    setMode("kg");
    setQuantity(nextFormula ? String(nextFormula.batchSize) : "");
  };

  const shortages = requirements.filter((item) => item.shortage > 0);
  const unitReviews = requirements.filter((item) => item.unitMismatch);
  const ready = requirements.length > 0 && shortages.length === 0 && unitReviews.length === 0;
  const replenishments = requirements.filter((item) => item.replenishmentNeed > 0);
  const purchaseValue = replenishments.reduce(
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
  const prioritySummary = useMemo(() => ({
    products: recommendations.length,
    action: recommendations.length,
    ready: recommendations.filter((item) => item.ready).length,
    top: recommendations[0],
  }), [recommendations]);

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
          item.replenishmentNeed > 0
            ? item.packSize > 0
              ? `${number(item.proposedPacks)} packs × ${number(item.packSize)} ${item.unit} = ${number(item.proposedQuantity)} ${item.unit}`
              : `${number(item.proposedQuantity)} ${item.unit}`
            : "—",
          item.replenishmentNeed > 0
            ? money(item.proposedQuantity * item.unitCost)
            : "—",
          item.shortage > 0 ? "PURCHASE BEFORE PRODUCTION" : item.replenishmentNeed > 0 ? "REPLENISH SAFETY STOCK" : "AVAILABLE",
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

  const printPortfolioPlan = () => {
    if (!recommendations.length) return;
    printCanaDocument({
      title: "Consolidated Production & Material Plan",
      reference: `MRP-ALL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: portfolioShortages.length ? "PURCHASE BEFORE PRODUCTION" : portfolioPurchases.length ? "READY · REPLENISH STOCK" : "READY FOR PRODUCTION",
      brandLine: "CANA Paints · Material Requirements Planning",
      orientation: "landscape",
      details: [
        { label: "Products to produce", value: recommendations.length },
        { label: "Suggested output", value: `${number(recommendations.reduce((sum, item) => sum + item.productionNeeded, 0))} packs` },
        { label: "Materials checked", value: portfolioRequirements.length },
        { label: "Materials to purchase", value: portfolioPurchases.length },
        { label: "Estimated purchase value", value: money(portfolioPurchaseValue) },
      ],
      table: {
        headers: ["Material", "Required", "Available", "Shortage", "Purchase packs", "Purchase quantity", "Estimate"],
        rows: portfolioRequirements.map((item) => [
          `${item.name} · ${item.code}`,
          `${number(item.required)} ${item.unit}`,
          item.unitMismatch ? `CHECK UNIT (${item.stockUnit})` : `${number(item.available)} ${item.unit}`,
          item.unitMismatch ? "UNIT REVIEW" : item.shortage ? `${number(item.shortage)} ${item.unit}` : "—",
          item.proposedPacks ? `${number(item.proposedPacks)} × ${number(item.packSize)} ${item.unit}` : "—",
          item.proposedQuantity ? `${number(item.proposedQuantity)} ${item.unit}` : "—",
          item.replenishmentNeed ? money(item.proposedQuantity * item.unitCost) : "—",
        ]),
      },
      notes: "This consolidated plan checks raw-material stock once across all suggested batches. Confirm quantities, supplier pack sizes and current prices before issuing purchase orders.",
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
            <PackageSearch size={22} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-red-700">CANA · Production</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Production & materials plan</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">Prioritize finished goods, confirm material readiness and consolidate purchasing.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={printPlan}
            disabled={!requirements.length}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            <Printer size={15} />
            Print plan
          </button>
        </div>
        </div>
        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"><span className="text-xs text-slate-600">Demand, finished stock, open batches and raw-material safety levels are recalculated together.</span><label className="text-[9px] font-extrabold uppercase text-slate-500">Target cover<select value={targetCoverDays} onChange={(event)=>setTargetCoverDays(Number(event.target.value) as 15|30|45|60)} className="mt-1 h-8 rounded-lg border bg-white px-2 text-xs font-bold text-slate-800">{([15,30,45,60] as const).map(days=><option key={days} value={days}>{days} days</option>)}</select></label><label className="text-[9px] font-extrabold uppercase text-slate-500">Minimum finished stock<input type="number" min="0" step="1" value={safetyPacks} onChange={(event)=>setSafetyPacks(Math.max(0,Number(event.target.value)||0))} className="mt-1 h-8 w-24 rounded-lg border bg-white px-2 text-xs font-bold text-slate-800"/><span className="ml-1 normal-case">packs</span></label></div>
      </header>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlanningMetric label="Products below target" value={String(prioritySummary.products)} detail={`Below ${targetCoverDays}-day cover or ${number(safetyPacks)}-pack safety stock`} tone={prioritySummary.products ? "red" : "green"} />
        <PlanningMetric label="Batches to plan" value={String(prioritySummary.action)} detail="Finished stock and open batches already deducted" tone={prioritySummary.action ? "red" : "green"} />
        <PlanningMetric label="Ready to make" value={String(prioritySummary.ready)} detail="Suggested batches have required materials" tone="green" />
        <PlanningMetric label="Highest priority" value={prioritySummary.top?.product.name || "Stock covered"} detail={prioritySummary.top ? `${number(prioritySummary.top.productionNeeded)} packs suggested` : "No production required"} tone="slate" />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Step 1 · Choose what to make</p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">Production suggestions</h2>
            <p className="mt-1 text-xs text-slate-500">Urgent demand and products below the selected safety target appear first. Existing finished stock and open batches are deducted.</p>
          </div>
          <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Sales period</p><div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">{([30, 90, 180] as const).map((days) => <button key={days} aria-pressed={demandPeriod === days} onClick={() => setDemandPeriod(days)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${demandPeriod === days ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"}`}>Last {days}</button>)}</div></div>
        </div>
        {recommendations.length ? (
          <><div className="divide-y md:hidden">{recommendations.map((item,index)=><article key={item.formula._id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-black">{index+1}</span><div><strong className="text-sm">{item.product.name}</strong><span className="block text-[10px] text-slate-500">{item.product.code||item.formula.code}</span></div></div>{item.ready?<Badge text="READY" tone="success"/>:<Badge text={item.needsUnitReview?"CHECK UNITS":`${item.missing.length} SHORT`} tone="warning"/>}</div><div className="grid grid-cols-3 gap-2 text-[10px]"><div><span className="block uppercase text-slate-400">On hand</span><b>{number(item.onHandKg)} kg</b></div><div><span className="block uppercase text-slate-400">Open batches</span><b>{number(item.openOutputKg)} kg</b></div><div><span className="block uppercase text-slate-400">Suggested</span><b>{number(item.productionNeeded)} packs</b></div></div><button type="button" onClick={()=>reviewRecommendation(item)} className="w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Plan this batch</button></article>)}</div><div className="hidden overflow-x-auto md:block">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3 text-right">Sold · {demandPeriod} days</th><th className="px-4 py-3 text-right">Stock cover</th><th className="px-4 py-3 text-right">Open batches</th><th className="px-4 py-3 text-right">Suggested batch</th><th className="px-4 py-3">Material check</th><th className="px-5 py-3">Next step</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((item, index) => (
                  <tr key={item.formula._id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${item.productionNeeded > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{index + 1}</span><div><strong className="block text-sm text-slate-950">{item.product.name}</strong><span className="text-[10px] text-slate-500">{item.product.code || item.formula.code} · priority {number(item.priorityScore)}/100</span></div></div></td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold">{number(item.soldQuantity)} kg</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right"><span className={`font-bold ${item.coverDays !== null && item.coverDays <= 7 ? "text-red-700" : "text-slate-800"}`}>{item.coverDays === null ? "No recent demand" : `${item.coverDays} days`}</span><span className="block text-[10px] text-slate-400">{number(item.onHandKg)} kg · target {number(item.targetPacks)} packs</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">{number(item.openOutputKg)} kg</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-extrabold">{item.productionNeeded ? `${number(item.productionNeeded)} packs` : "Covered"}</td>
                    <td className="px-4 py-4">{item.productionNeeded <= 0 ? <Badge text="STOCK COVERED" tone="success" /> : item.ready ? <Badge text="READY TO MAKE" tone="success" /> : <Badge text={item.needsUnitReview ? "CHECK UNITS" : `${item.missing.length} MATERIAL SHORT`} tone="warning" />}</td>
                    <td className="px-5 py-4">{item.productionNeeded > 0 ? <button type="button" onClick={() => reviewRecommendation(item)} className="whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700">Plan this batch</button> : <span className="text-xs font-semibold text-slate-400">No batch needed</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></>
        ) : loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Loading product demand and stock…</div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={17} />
            <span>All formula products are covered by finished stock and open batches.</span>
          </div>
        )}
      </section>
      {recommendations.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Consolidated plan</p><h2 className="mt-1 text-base font-extrabold text-slate-950">Raw materials for all suggested batches</h2><p className="mt-1 text-xs text-slate-500">Stock is allocated once across the complete production plan, preventing the same material balance from being counted for several products.</p></div><div className="flex gap-2"><button type="button" onClick={printPortfolioPlan} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Printer size={14}/>Print combined plan</button>{portfolioPurchases.length>0&&<Link to="/management/purchase-orders" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"><ShoppingCart size={14}/>Purchase shortages</Link>}</div></div><div className="grid grid-cols-2 gap-2 border-b bg-slate-50 p-3 sm:grid-cols-5"><Metric label="Planned products" value={String(recommendations.length)}/><Metric label="Materials checked" value={String(portfolioRequirements.length)}/><Metric label="Production blockers" value={String(portfolioShortages.length)} danger={portfolioShortages.length>0}/><Metric label="Materials to buy" value={String(portfolioPurchases.length)} danger={portfolioPurchases.length>0}/><Metric label="Estimated purchase" value={money(portfolioPurchaseValue)} danger={portfolioPurchaseValue>0}/></div><div className="max-h-80 divide-y overflow-y-auto">{portfolioRequirements.map(item=><div key={`${item.id}-${item.unit}`} className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-[1.3fr_.8fr_.8fr_1fr] sm:items-center"><div><strong>{item.name}</strong><span className="block text-[10px] text-slate-500">{item.code}</span></div><span>Need <b>{number(item.required)} {item.unit}</b></span><span>Stock <b>{item.unitMismatch?`check ${item.stockUnit}`:`${number(item.available)} ${item.unit}`}</b></span><div className="sm:text-right">{item.unitMismatch?<Badge text="CHECK UNIT" tone="warning"/>:item.replenishmentNeed>0?<><strong className={item.shortage>0?"block text-red-700":"block text-amber-700"}>{item.shortage>0?"Buy before production":"Replenish"} {number(item.proposedQuantity)} {item.unit}</strong><span className="text-[10px] text-slate-500">{item.proposedPacks>0?`${number(item.proposedPacks)} packs · `:""}{money(item.proposedQuantity*item.unitCost)}</span></>:<Badge text="AVAILABLE" tone="success"/>}</div></div>)}</div></section>}
      <section ref={planningSectionRef} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Step 2 · Set the batch</p><h2 className="mt-1 text-base font-extrabold text-slate-950">Choose a product and batch size</h2><p className="mt-1 text-xs text-slate-500">Select a product formula, then enter how many packs or kilograms you plan to make.</p></div>{product && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Formula {formula?.code} · v{formula?.version}</span>}</div>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          Product and formula
          <select
            value={formulaId}
            onChange={(event) => selectFormula(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
          >
            <option value="">Choose a product</option>
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
          Planned output ({mode === "kg" ? "kg" : "packs"})
          <input
            type="number"
            min="0"
            step="any"
            aria-label="Batch size"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="decimal"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-bold"
          />
        </label>
        <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          Enter batch size in
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as InputMode)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          >
            <option value="packs">Finished packs</option>
            <option value="kg">Kilograms</option>
          </select>
        </label>
        </div>
        {formula && (
          <p className="mt-3 text-xs text-slate-500">
            Standard formula batch: <strong className="text-slate-700">{number(formula.batchSize)} {formula.batchUnit || "kg"}</strong>.
            Material requirements are scaled from this saved recipe.
          </p>
        )}
      </section>
      {formula && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          <Metric label="Production stock" value={`${number(selectedProductionPacks)} packs`} />
          <Metric label="Sales stock" value={`${number(selectedSalesPacks)} packs`} />
          <Metric
            label="Planned output"
            value={`${number(plannedOutput)} kg`}
          />
          <Metric label="Batch output" value={`${number(plannedPacks)} packs`} />
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
          <Metric label="Materials to replenish" value={String(replenishments.length)} danger={replenishments.length > 0} />
          <Metric label="Estimated materials to buy" value={money(purchaseValue)} />
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
                ? replenishments.length
                  ? `Production can proceed · replenish ${replenishments.length} material${replenishments.length === 1 ? "" : "s"} to preserve minimum stock`
                  : "All materials are available"
                : `${shortages.length} material${shortages.length === 1 ? " is" : "s are"} short${unitReviews.length ? ` · ${unitReviews.length} need a unit check` : ""}`}
            </strong>
          </div>
          {replenishments.length > 0 && (
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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><ClipboardList size={17} /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Step 3 · Check materials</p><h2 className="text-sm font-extrabold text-slate-950">Materials needed for this batch</h2><p className="mt-0.5 text-xs text-slate-500">Required quantities are scaled from the selected formula and batch size.</p></div></div>
          {formula && <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? "Ready to plan" : `${shortages.length} shortages · ${unitReviews.length} unit checks`}</span>}
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
                  className={item.shortage > 0 ? "bg-red-50/40" : item.replenishmentNeed > 0 ? "bg-amber-50/40" : ""}
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
                      : `${number(item.available)} ${item.unit} · min ${number(item.minimumStock)}`}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-black ${item.shortage > 0 ? "text-red-700" : item.replenishmentNeed > 0 ? "text-amber-700" : "text-slate-400"}`}
                  >
                    {item.unitMismatch
                      ? "Unit check required"
                      : item.shortage > 0
                        ? `${number(item.shortage)} ${item.unit}`
                        : item.replenishmentNeed > 0
                          ? `Safety gap ${number(item.replenishmentNeed)} ${item.unit}`
                          : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.unitMismatch
                      ? "Confirm conversion"
                      : item.replenishmentNeed > 0
                      ? item.packSize > 0
                        ? `${number(item.proposedPacks)} × ${number(item.packSize)} ${item.unit}`
                        : `${number(item.proposedQuantity)} ${item.unit}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {item.replenishmentNeed > 0
                      ? money(item.proposedQuantity * item.unitCost)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${item.unitMismatch ? "bg-amber-100 text-amber-800" : item.shortage > 0 ? "bg-red-100 text-red-700" : item.replenishmentNeed > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {item.unitMismatch ? "UNIT CHECK" : item.shortage > 0 ? "BUY FIRST" : item.replenishmentNeed > 0 ? "REPLENISH" : "AVAILABLE"}
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

function PlanningMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "slate" | "red" | "green" }) {
  const colors = tone === "red" ? "border-red-100 bg-red-50/70 text-red-800" : tone === "green" ? "border-emerald-100 bg-emerald-50/70 text-emerald-800" : "border-slate-200 bg-white text-slate-950";
  return <article className={`rounded-2xl border p-4 shadow-sm ${colors}`}><p className="text-[10px] font-extrabold uppercase tracking-[.13em] opacity-70">{label}</p><p className="mt-2 truncate text-xl font-extrabold" title={value}>{value}</p><p className="mt-1 truncate text-xs opacity-70" title={detail}>{detail}</p></article>;
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
