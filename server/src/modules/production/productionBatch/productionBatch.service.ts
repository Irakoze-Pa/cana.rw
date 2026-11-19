import mongoose from "mongoose";

import ProductionBatch from "./productionBatch.model";
import ProductionOrder from "../productionOrder/productionOrder.model";
import Formula from "../../formula/formula.model";
import Product from "../../product/product.model";
import FinishedGoodsStoreBalance from "../../finishedGoods/storeBalance.model";
import InventoryTransaction from "../../inventory/inventoryTransaction.model";
import { resolveCurrentMaterialPrices } from "../../raw-materials/materialPrice.service";
import RawMaterialLot from "../../raw-materials/rawMaterialLot.model";
import { getPackagingMaterialsForProduct } from "../productionPackaging.service";
import RawMaterialConsumption from "../materialConsumption/materialConsumption.model";
import {
  completeMaterialConsumption,
  createMaterialConsumption,
  updateMaterialConsumption,
} from "../materialConsumption/materialConsumption.service";

// =====================================================
// TYPES
// =====================================================

export interface CreateProductionBatchData {
  /** Existing order is retained for legacy/planned workflows. */
  productionOrder?: string;

  /** Direct production workflow: select product and formula instead of an order. */
  product?: string;
  formula?: string;

  plannedQuantity?: number;

  batchNumber?: string;

  lotNumber?: string;

  startDate?: string | Date;

  supervisor?: string;

  supervisorName?: string;

  notes?: string;
}

export interface UpdateProductionBatchData {
  plannedQuantity?: number;

  actualQuantity?: number;

  status?:
    "Planned" | "Ready" | "In Progress" | "Paused" | "Completed" | "Cancelled";

  batchNumber?: string;

  lotNumber?: string;

  startDate?: string | Date;

  endDate?: string | Date;

  supervisor?: string;

  supervisorName?: string;

  notes?: string;
}

// =====================================================
// ERROR
// =====================================================

export class ProductionBatchServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);

    this.name = "ProductionBatchServiceError";

    this.statusCode = statusCode;
  }
}

async function snapshotCompletedBatchCost(
  batch: any,
  productionOrder?: any,
  forceRevalue = false,
) {
  if (batch.costedAt && !forceRevalue) return;

  const [transactions, product] = await Promise.all([
    InventoryTransaction.find({
      productionBatch: batch._id,
      type: { $in: ["Production Issue", "Production Return"] },
    })
      .select("type rawMaterial rawMaterialName rawMaterialCode quantity unit unitCost totalCost lotNumber transactionDate")
      .lean(),
    Product.findById(batch.product).select("name packSizeKg baseUnit").lean(),
  ]);
  const movementMaterialIds = [...new Set(
    transactions.map((transaction: any) => String(transaction.rawMaterial)),
  )].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const batchOutputs = Array.isArray(batch.outputs) ? batch.outputs : [];
  const rawPackCount = batchOutputs.length
    ? batchOutputs.reduce((sum: number, item: any) => {
        const packSize = Number(item.packSizeKg || 0);
        return sum + Number(item.actualPacks || (packSize > 0 ? Number(item.actualQuantity || item.plannedQuantity || 0) / packSize : 0));
      }, 0)
    : Number(product?.packSizeKg || 0) > 0
      ? Number(batch.actualQuantity || 0) / Number(product?.packSizeKg || 1)
      : 0;
  const finishedPackCount = Math.max(0, Math.round(rawPackCount));
  const packaging = await getPackagingMaterialsForProduct(String(product?.name || batch.productName || ""));
  const packagingMaterialIds = packaging.required.map((item: any) => String(item._id));
  const packagingMaterialIdSet = new Set(packagingMaterialIds);
  const materialIds = [...new Set([...movementMaterialIds, ...packagingMaterialIds])];
  const transactionDates = transactions
    .map((transaction: any) => new Date(transaction.transactionDate || 0).getTime())
    .filter((value: number) => Number.isFinite(value) && value > 0);
  const historicalAsOf = new Date(transactionDates.length
    ? Math.max(...transactionDates)
    : new Date(batch.endDate || batch.createdAt || Date.now()).getTime());
  const [pricingByMaterial, historicalPurchases, historicalLots] = await Promise.all([
    resolveCurrentMaterialPrices(materialIds),
    InventoryTransaction.find({
      rawMaterial: { $in: materialIds },
      type: { $in: ["Purchase", "Opening Balance"] },
      transactionDate: { $lte: historicalAsOf },
      $or: [{ unitCost: { $gt: 0 } }, { totalCost: { $gt: 0 } }],
    }).sort({ transactionDate: -1, _id: -1 }).lean(),
    RawMaterialLot.find({
      rawMaterial: { $in: materialIds },
      receivedAt: { $lte: historicalAsOf },
      unitCost: { $gt: 0 },
    }).sort({ receivedAt: -1, _id: -1 }).lean(),
  ]);
  const historicalPriceByMaterial = new Map<string, { unitPrice: number; supplier?: any }>();
  historicalPurchases.forEach((transaction: any) => {
    const id = String(transaction.rawMaterial);
    if (historicalPriceByMaterial.has(id)) return;
    const unitPrice = Number(transaction.unitCost || 0) > 0
      ? Number(transaction.unitCost)
      : Number(transaction.quantity || 0) > 0
        ? Number(transaction.totalCost || 0) / Number(transaction.quantity)
        : 0;
    if (unitPrice > 0) historicalPriceByMaterial.set(id, { unitPrice });
  });
  historicalLots.forEach((lot: any) => {
    const id = String(lot.rawMaterial);
    if (!historicalPriceByMaterial.has(id) && Number(lot.unitCost || 0) > 0) {
      historicalPriceByMaterial.set(id, { unitPrice: Number(lot.unitCost), supplier: lot.supplier });
    }
  });
  const targetByRawMaterial = new Map<string, string>(
    ((batch as any).formulaSnapshot || [])
      .filter((item: any) => item.appliesToProduct)
      .map((item: any) => [String(item.rawMaterial?._id || item.rawMaterial), String(item.appliesToProduct?._id || item.appliesToProduct)]),
  );
  const fallbackMaterials = new Set<string>();
  const netQuantityByRawMaterial = new Map<string, number>();
  const netValueByRawMaterial = new Map<string, number>();
  const transactionSnapshotByRawMaterial = new Map<string, any>();
  transactions.forEach((transaction: any) => {
    const key = String(transaction.rawMaterial);
    const sign = transaction.type === "Production Return" ? -1 : 1;
    const transactionQuantity = Number(transaction.quantity || 0);
    const transactionValue = Number(transaction.totalCost || 0) > 0
      ? Number(transaction.totalCost)
      : transactionQuantity * Number(transaction.unitCost || 0);
    const signedQuantity = sign * transactionQuantity;
    netQuantityByRawMaterial.set(key, Number(netQuantityByRawMaterial.get(key) || 0) + signedQuantity);
    netValueByRawMaterial.set(key, Number(netValueByRawMaterial.get(key) || 0) + sign * transactionValue);
    if (!transactionSnapshotByRawMaterial.has(key)) transactionSnapshotByRawMaterial.set(key, transaction);
  });
  const missingPrices = materialIds.filter((id) => {
    const isPackaging = packagingMaterialIdSet.has(id);
    const issuedQuantity = Math.max(0, Number(netQuantityByRawMaterial.get(id) || 0));
    const costQuantity = isPackaging ? finishedPackCount : issuedQuantity;
    if (costQuantity <= 0) return false;
    const issuedValue = Math.max(0, Number(netValueByRawMaterial.get(id) || 0));
    const issuedPrice = issuedQuantity > 0 && issuedValue > 0 ? issuedValue / issuedQuantity : 0;
    return issuedPrice <= 0
      && Number(historicalPriceByMaterial.get(id)?.unitPrice || 0) <= 0
      && Number(pricingByMaterial.get(id)?.unitPrice || 0) <= 0;
  });
  if (missingPrices.length) {
    const missingNames = missingPrices.map((id) => {
      const transaction = transactionSnapshotByRawMaterial.get(id);
      return transaction?.rawMaterialName || transaction?.rawMaterialCode || id;
    });
    throw new ProductionBatchServiceError(
      `Current cost is missing for: ${missingNames.join(", ")}. Add an active supplier offer or a fallback material price before recosting.`,
      409,
    );
  }
  const materialCostLines = materialIds
    .map((id) => {
      const isPackaging = packagingMaterialIdSet.has(id);
      const issuedQuantity = Math.max(0, Number(netQuantityByRawMaterial.get(id) || 0));
      const issuedValue = Math.max(0, Number(netValueByRawMaterial.get(id) || 0));
      const issuedUnitPrice = issuedQuantity > 0 && issuedValue > 0
        ? issuedValue / issuedQuantity
        : 0;
      const quantity = isPackaging ? finishedPackCount : issuedQuantity;
      const pricing = pricingByMaterial.get(id);
      const historical = historicalPriceByMaterial.get(id);
      const transaction = transactionSnapshotByRawMaterial.get(id);
      const usesIssuedCost = issuedUnitPrice > 0;
      const usesHistoricalCost = !usesIssuedCost && Number(historical?.unitPrice || 0) > 0;
      const unitPrice = usesIssuedCost
        ? issuedUnitPrice
        : usesHistoricalCost
          ? Number(historical!.unitPrice)
          : Number(pricing?.unitPrice || 0);
      const priceSource = usesIssuedCost
        ? "production_issue"
        : usesHistoricalCost
          ? "historical_receipt"
          : pricing!.source;
      const materialName = pricing?.materialName || transaction?.rawMaterialName || "Raw material";
      const materialCode = pricing?.materialCode || transaction?.rawMaterialCode || "RM";
      if (!usesIssuedCost) {
        const source = usesHistoricalCost
          ? "historical receipt"
          : pricing!.source === "supplier_offer"
            ? "current supplier offer"
            : pricing!.source === "inventory_average"
              ? "inventory average"
              : "material setup";
        fallbackMaterials.add(`${materialName} (${materialCode}) · ${source}`);
      }
      return {
        rawMaterial: id,
        rawMaterialName: materialName,
        rawMaterialCode: materialCode,
        ...(targetByRawMaterial.get(id) ? { appliesToProduct: targetByRawMaterial.get(id) } : {}),
        quantity: roundNumber(quantity),
        unit: transaction?.unit || pricing?.unit || "kg",
        unitPrice: roundNumber(unitPrice),
        totalCost: roundNumber(!isPackaging && usesIssuedCost ? issuedValue : quantity * unitPrice),
        priceSource,
        quantitySource: isPackaging ? "pack_output" : "actual_issue",
        ...(usesHistoricalCost && historical?.supplier ? { supplier: historical.supplier } : {}),
        ...(!usesIssuedCost && !usesHistoricalCost && pricing?.supplier ? { supplier: pricing.supplier } : {}),
        ...(!usesIssuedCost && !usesHistoricalCost && pricing?.supplierName ? { supplierName: pricing.supplierName } : {}),
        ...(!usesIssuedCost && !usesHistoricalCost && pricing?.offerUpdatedAt ? { offerUpdatedAt: pricing.offerUpdatedAt } : {}),
      };
    })
    .filter((line) => line.quantity > 0);
  const materialCost = materialCostLines.reduce((sum, line) => sum + Number(line.totalCost || 0), 0);
  const costByRawMaterial = new Map<string, number>(
    materialCostLines.map((line) => [String(line.rawMaterial), Number(line.totalCost || 0)]),
  );
  const targetedMaterialCost = new Map<string, number>();
  let sharedMaterialCost = 0;
  costByRawMaterial.forEach((cost, rawMaterialId) => {
    const target = targetByRawMaterial.get(rawMaterialId);
    if (target) targetedMaterialCost.set(target, Number(targetedMaterialCost.get(target) || 0) + cost);
    else sharedMaterialCost += cost;
  });
  // Current/replacement costing follows the newest approved version in the
  // saved batch's formula family. The saved recipe and material quantities
  // remain untouched for production traceability.
  const savedFormula = await Formula.findById(batch.formula)
    .select("product code")
    .lean();
  const formula = await Formula.findOne({
    product: savedFormula?.product || batch.product?._id || batch.product,
    code: savedFormula?.code || batch.formulaCode,
    status: "Active",
  })
    .sort({ version: -1, updatedAt: -1, _id: -1 })
    .select("name code version batchSize laborCost energyCost otherCost items outputs")
    .populate("items.rawMaterial", "name code unit status")
    .lean()
    || await Formula.findById(batch.formula)
      .select("name code version batchSize laborCost energyCost otherCost items outputs")
      .populate("items.rawMaterial", "name code unit status")
      .lean();
  // Production orders are legacy. Current costing is owned by the formula
  // attached to the batch, and its overhead values apply once per batch.
  const labor = Number(formula?.laborCost ?? productionOrder?.laborCost ?? 0);
  const energy = Number(formula?.energyCost ?? productionOrder?.energyCost ?? 0);
  const other = Number(formula?.otherCost ?? productionOrder?.otherCost ?? 0);
  const total = Math.max(0, materialCost + labor + energy + other);
  const output = Number(batch.actualQuantity || 0);
  const perKg = output > 0 ? total / output : 0;
  // CANA paint and compound packs are costed from their configured kilogram
  // weight even when an older product record still carries a legacy unit flag.
  const packSizeKg = Number(product?.packSizeKg || 0);

  const currentFormulaItems: any[] = Array.isArray(formula?.items) ? formula.items : [];
  const currentFormulaMaterialIds = [...new Set(currentFormulaItems.map((item: any) =>
    String(item.rawMaterial?._id || item.rawMaterial),
  ))].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const currentFormulaPrices = await resolveCurrentMaterialPrices(currentFormulaMaterialIds);
  const formulaOutput = Number(formula?.batchSize || output || 0);
  const formulaScale = formulaOutput > 0 && output > 0 ? output / formulaOutput : 1;
  const currentMaterialCostLines = currentFormulaItems.map((item: any) => {
    const rawMaterialId = String(item.rawMaterial?._id || item.rawMaterial);
    const price = currentFormulaPrices.get(rawMaterialId);
    const quantity = Number(item.quantity || 0)
      * (1 + Number(item.wastePercentage || 0) / 100)
      * formulaScale;
    const unitPrice = Number(price?.unitPrice || 0);
    if (!(unitPrice > 0)) {
      throw new ProductionBatchServiceError(
        `Current supplier price is missing for ${item.rawMaterial?.name || rawMaterialId}.`,
        409,
      );
    }
    return {
      rawMaterial: rawMaterialId,
      rawMaterialName: price?.materialName || item.rawMaterial?.name || "Raw material",
      rawMaterialCode: price?.materialCode || item.rawMaterial?.code || "RM",
      ...(item.appliesToProduct ? { appliesToProduct: item.appliesToProduct } : {}),
      quantity: roundNumber(quantity),
      unit: price?.unit || item.rawMaterial?.unit || item.unit || "kg",
      unitPrice: roundNumber(unitPrice),
      totalCost: roundNumber(quantity * unitPrice),
      priceSource: price!.source,
      ...(price?.supplier ? { supplier: price.supplier } : {}),
      ...(price?.supplierName ? { supplierName: price.supplierName } : {}),
      ...(price?.offerUpdatedAt ? { offerUpdatedAt: price.offerUpdatedAt } : {}),
    };
  }).filter((line) => line.quantity > 0);
  const currentMaterialCost = currentMaterialCostLines.reduce(
    (sum, line) => sum + Number(line.totalCost || 0),
    0,
  );
  const currentTotalCost = Math.max(0, currentMaterialCost + labor + energy + other);
  const currentCostPerKg = output > 0 ? currentTotalCost / output : 0;
  const currentCostPerPack = packSizeKg > 0 ? currentCostPerKg * packSizeKg : 0;
  const currentOfferDates = currentMaterialCostLines
    .map((line) => line.offerUpdatedAt ? new Date(line.offerUpdatedAt).getTime() : 0)
    .filter((value) => value > 0);
  const currentCostedAt = new Date();
  const currentPriceAsOf = currentOfferDates.length
    ? new Date(Math.max(...currentOfferDates))
    : currentCostedAt;

  const costedAt = new Date();
  const outputs = batchOutputs.length
    ? batchOutputs.map((item: any) =>
        typeof item?.toObject === "function" ? item.toObject() : { ...item },
      )
    : [];
  if (outputs.length > 0) {
    const sharedProductionCost = Math.max(0, sharedMaterialCost + labor + energy + other);
    outputs.forEach((item: any) => {
      const quantity = Number(item.actualQuantity || item.plannedQuantity || 0);
      const outputPackSize = Number(item.packSizeKg || 30);
      const weightShare = output > 0 ? quantity / output : 0;
      const allocatedCost = sharedProductionCost * weightShare + Number(targetedMaterialCost.get(String(item.product?._id || item.product)) || 0);
      const outputCostPerKg = quantity > 0 ? allocatedCost / quantity : 0;
      item.allocatedCost = roundNumber(allocatedCost);
      item.costPerPack = roundNumber(outputPackSize * outputCostPerKg);
      item.actualPacks = roundNumber(quantity / outputPackSize);
    });
  }
  const costSnapshot = {
    actualMaterialCost: roundNumber(Math.max(0, materialCost)),
    allocatedLaborCost: roundNumber(labor),
    allocatedEnergyCost: roundNumber(energy),
    allocatedOtherCost: roundNumber(other),
    totalActualCost: roundNumber(total),
    costPerKg: roundNumber(perKg),
    costPerPack: roundNumber(packSizeKg > 0 ? perKg * packSizeKg : 0),
    outputs,
    costedAt,
    costingBasis: "actual_issue_cost",
    costPriceAsOf: costedAt,
    costPriceFallbackMaterials: [...fallbackMaterials].sort(),
    materialCostLines,
    currentMaterialCost: roundNumber(currentMaterialCost),
    currentTotalCost: roundNumber(currentTotalCost),
    currentCostPerKg: roundNumber(currentCostPerKg),
    currentCostPerPack: roundNumber(currentCostPerPack),
    currentCostedAt: currentPriceAsOf,
    currentMaterialCostLines,
    ...(formula?._id ? {
      costFormula: formula._id,
      costFormulaName: formula.name || "",
      costFormulaCode: formula.code || "",
      costFormulaVersion: Number(formula.version || 1),
    } : {}),
  };
  // Stock posting updates the batch through a separate transaction. Use an
  // atomic cost update instead of saving the earlier in-memory document,
  // otherwise Mongoose can reject a valid completion with VersionError.
  await ProductionBatch.updateOne({ _id: batch._id }, { $set: costSnapshot });
  Object.assign(batch, costSnapshot);
  return batch;
}

export async function revalueProductionBatchCost(id: string) {
  validateObjectId(id, "production batch ID");
  const batch: any = await ProductionBatch.findById(id);
  if (!batch) {
    throw new ProductionBatchServiceError("Production batch not found.", 404);
  }
  if (batch.status !== "Completed") {
    throw new ProductionBatchServiceError(
      "Only a completed production batch can be revalued.",
      409,
    );
  }
  const productionOrder = batch.productionOrder
    ? await ProductionOrder.findById(batch.productionOrder).lean()
    : undefined;
  await snapshotCompletedBatchCost(batch, productionOrder, true);
  return getProductionBatchById(id);
}

// =====================================================
// TYPES
// =====================================================

export type ProductionBatchStatus =
  "Planned" | "Ready" | "In Progress" | "Paused" | "Completed" | "Cancelled";

// =====================================================
// STATUS TRANSITIONS
// =====================================================

const allowedStatusTransitions: Record<
  ProductionBatchStatus,
  ProductionBatchStatus[]
> = {
  Planned: ["Planned", "Ready", "Cancelled"],

  Ready: ["Ready", "In Progress", "Cancelled"],

  "In Progress": ["In Progress", "Paused", "Completed"],

  Paused: ["Paused", "In Progress", "Cancelled"],

  Completed: ["Completed"],

  Cancelled: ["Cancelled"],
};

// =====================================================
// OBJECT ID
// =====================================================

function validateObjectId(id: string, fieldName: string) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ProductionBatchServiceError(`Invalid ${fieldName}.`, 400);
  }
}

// =====================================================
// ROUND
// =====================================================

function roundNumber(value: number, decimals = 4) {
  const factor = Math.pow(10, decimals);

  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Active batches reserve their planned quantity. Completed batches count only
 * their actual output, which permits a short-yield batch to be followed by a
 * make-up batch while retaining the original plan for audit purposes.
 */
function getOrderCommittedQuantity(
  batches: Array<{
    status?: string;
    plannedQuantity?: number;
    actualQuantity?: number;
  }>,
) {
  return roundNumber(
    batches.reduce((total, batch) => {
      if (batch.status === "Cancelled") {
        return total;
      }

      return (
        total +
        Number(
          batch.status === "Completed"
            ? batch.actualQuantity || 0
            : batch.plannedQuantity || 0,
        )
      );
    }, 0),
  );
}

// =====================================================
// DATE
// =====================================================

function parseDate(value: string | Date | undefined, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ProductionBatchServiceError(`Invalid ${fieldName}.`, 400);
  }

  return date;
}

// =====================================================
// STATUS TRANSITION
// =====================================================

function validateStatusTransition(
  current: ProductionBatchStatus,
  next: ProductionBatchStatus,
) {
  const allowed = allowedStatusTransitions[current];

  if (!allowed || !allowed.includes(next)) {
    throw new ProductionBatchServiceError(
      `Invalid production batch status transition: ${current} → ${next}.`,
      400,
    );
  }
}

// =====================================================
// GENERATE BATCH NUMBER
// =====================================================

async function generateBatchNo() {
  const year = new Date().getFullYear();

  const latestBatch = await ProductionBatch.findOne({
    batchNo: {
      $regex: `^PB-${year}-`,
    },
  })
    .sort({
      batchNo: -1,
    })
    .select("batchNo")
    .lean();

  let nextNumber = 1;

  if (latestBatch?.batchNo) {
    const match = latestBatch.batchNo.match(/PB-\d{4}-(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `PB-${year}-${String(nextNumber).padStart(4, "0")}`;
}

// =====================================================
// CREATE BATCH
// =====================================================

export async function createProductionBatch(data: CreateProductionBatchData) {
  if (!data) {
    throw new ProductionBatchServiceError(
      "Production batch data is required.",
      400,
    );
  }

  let productionOrder: any;

  if (data.productionOrder) {
    validateObjectId(data.productionOrder, "production order ID");
    productionOrder = await ProductionOrder.findById(data.productionOrder);
  } else {
    validateObjectId(String(data.product || ""), "product ID");
    if (data.formula) validateObjectId(String(data.formula), "formula ID");

    // The backend is authoritative: even if a browser submits an older
    // formula ID, a new batch is created from the newest active version in
    // that formula family.
    const requestedFormula: any = data.formula
      ? await Formula.findById(data.formula).select("product code").lean()
      : null;
    if (requestedFormula && String(requestedFormula.product) !== String(data.product)) {
      throw new ProductionBatchServiceError(
        "The selected formula does not belong to this product.",
        400,
      );
    }
    const formula: any = await Formula.findOne({
      product: data.product,
      status: "Active",
      ...(requestedFormula?.code ? { code: requestedFormula.code } : {}),
    })
      .sort({ version: -1, updatedAt: -1, _id: -1 })
      .select("product name code version batchSize batchUnit status items outputs")
      .populate("items.rawMaterial", "name code unit")
      .populate("outputs.product", "name code sku packSizeKg unit baseUnit")
      .lean();

    if (!formula) {
      throw new ProductionBatchServiceError(
        "No active formula is available for this product. Approve the latest formula before creating a batch.",
        404,
      );
    }

    const formulaBatchSize = Number(formula.batchSize || 0);
    if (!Number.isFinite(formulaBatchSize) || formulaBatchSize <= 0) {
      throw new ProductionBatchServiceError(
        "The selected formula needs a valid batch size.",
        400,
      );
    }

    const product = await Product.findById(data.product)
      .select("name code sku unit baseUnit")
      .lean();
    if (!product) {
      throw new ProductionBatchServiceError("Product not found.", 404);
    }
    // A lightweight source snapshot replaces the old hidden Production Order.
    productionOrder = {
      _id: new mongoose.Types.ObjectId(),
      isDirectBatch: true,
      status: "Released",
      quantity: formulaBatchSize,
      product: product._id,
      productName: product.name,
      productCode: product.code || "",
      formula: formula._id,
      formulaName: formula.name,
      formulaCode: formula.code,
      formulaVersion: formula.version,
      formulaSnapshot: (formula.items || []).map((item: any) => ({
        rawMaterial: item.rawMaterial?._id || item.rawMaterial,
        rawMaterialName: item.rawMaterial?.name || "Raw material",
        rawMaterialCode: item.rawMaterial?.code || "RM",
        ...(item.appliesToProduct ? { appliesToProduct: item.appliesToProduct } : {}),
        quantity: Number(item.quantity || 0) *
          (1 + Number(item.wastePercentage || 0) / 100),
        unit: item.rawMaterial?.unit || item.unit || "kg",
        wastePercentage: Number(item.wastePercentage || 0),
        notes: item.notes || "",
      })),
      outputs: (formula.outputs || []).map((output: any) => ({
        product: output.product?._id || output.product,
        productName: output.product?.name || "Finished product",
        productCode: output.product?.code || output.product?.sku || "",
        quantity: Number(output.quantity || 0),
        packSizeKg: Number(output.packSizeKg || output.product?.packSizeKg || 30),
        packs: Number(output.packs || 0),
      })),
      unit: formula.batchUnit || product.baseUnit || product.unit || "kg",
      items: [{}],
      directBatchRecord: true,
      save: async () => undefined,
    };
  }

  if (!productionOrder) {
    throw new ProductionBatchServiceError("Production order not found.", 404);
  }

  // ---------------------------------------------------
  // ORDER STATUS
  // ---------------------------------------------------

  if (
    productionOrder.status !== "Draft" &&
    productionOrder.status !== "Planned" &&
    productionOrder.status !== "Released" &&
    productionOrder.status !== "In Production"
  ) {
    throw new ProductionBatchServiceError(
      `A production batch can only be created for a Draft, Planned, Released or In Production production order. Current status: ${productionOrder.status}.`,
      409,
    );
  }

  if (
    (productionOrder.status === "Draft" ||
      productionOrder.status === "Planned") &&
    (!Array.isArray(productionOrder.items) ||
      productionOrder.items.length === 0)
  ) {
    throw new ProductionBatchServiceError(
      "A production order must have raw-material requirements before its first batch can be created.",
      400,
    );
  }

  // ---------------------------------------------------
  // ORDER MUST HAVE POSITIVE QUANTITY
  // ---------------------------------------------------

  const orderQuantity = Number(productionOrder.quantity);

  if (!Number.isFinite(orderQuantity) || orderQuantity <= 0) {
    throw new ProductionBatchServiceError(
      "Production order quantity must be greater than 0.",
      400,
    );
  }

  // ---------------------------------------------------
  // PLANNED QUANTITY
  // ---------------------------------------------------

  const plannedQuantity = Number(data.plannedQuantity ?? orderQuantity);

  if (!Number.isFinite(plannedQuantity) || plannedQuantity <= 0) {
    throw new ProductionBatchServiceError(
      "Batch planned quantity must be greater than 0.",
      400,
    );
  }

  // ---------------------------------------------------
  // EXISTING BATCHES
  // ---------------------------------------------------

  // Direct batches use the formula output only as a scaling reference. It is
  // not a production ceiling: an operator may produce any positive quantity
  // and the saved batch recipe is scaled proportionally. The remaining-order
  // guard is retained only for legacy batches created from a production order.
  if (!productionOrder.isDirectBatch) {
    const existingBatches = await ProductionBatch.find({
      productionOrder: productionOrder._id,
      status: {
        $ne: "Cancelled",
      },
    })
      .select("plannedQuantity actualQuantity status")
      .lean();

    const plannedAlready = getOrderCommittedQuantity(existingBatches);

    const remainingQuantity = roundNumber(orderQuantity - plannedAlready);

    if (remainingQuantity <= 0) {
      throw new ProductionBatchServiceError(
        "No remaining quantity is available for another production batch.",
        409,
      );
    }

    if (plannedQuantity > remainingQuantity) {
      throw new ProductionBatchServiceError(
        `Batch quantity (${plannedQuantity}) exceeds the remaining production order quantity (${remainingQuantity}).`,
        409,
      );
    }
  }

  // ---------------------------------------------------
  // BATCH NUMBER
  // ---------------------------------------------------

  const batchNo = await generateBatchNo();

  // ---------------------------------------------------
  // START DATE
  // ---------------------------------------------------

  const startDate = parseDate(data.startDate, "start date");

  // ---------------------------------------------------
  // CREATE
  // ---------------------------------------------------

  try {
    const batch = await ProductionBatch.create({
      batchNo,

      productionOrder: data.productionOrder ? productionOrder._id : undefined,

      product: productionOrder.product,

      productName: productionOrder.productName,

      productCode: productionOrder.productCode,

      formula: productionOrder.formula,

      formulaName: productionOrder.formulaName,

      formulaCode: productionOrder.formulaCode,

      formulaVersion: productionOrder.formulaVersion,

      formulaSnapshot: Array.isArray(productionOrder.formulaSnapshot)
        ? productionOrder.formulaSnapshot.map((item: any) => ({
            ...item,
            quantity: Number(
              (
                Number(item.quantity || 0) *
                (plannedQuantity / Number(productionOrder.quantity || plannedQuantity))
              ).toFixed(4),
            ),
          }))
        : [],

      outputs: Array.isArray(productionOrder.outputs)
        ? productionOrder.outputs.map((output: any) => {
            const scale = plannedQuantity / Number(productionOrder.quantity || plannedQuantity);
            const outputQuantity = Number((Number(output.quantity || 0) * scale).toFixed(4));
            const packSizeKg = Number(output.packSizeKg || 30);
            return {
              product: output.product,
              productName: output.productName,
              productCode: output.productCode,
              plannedQuantity: outputQuantity,
              actualQuantity: 0,
              packSizeKg,
              plannedPacks: Number((outputQuantity / packSizeKg).toFixed(4)),
              actualPacks: 0,
              allocatedCost: 0,
              costPerPack: 0,
            };
          })
        : [],

      plannedQuantity,

      actualQuantity: 0,

      unit: productionOrder.unit,

      status: "Planned",

      batchNumber: data.batchNumber?.trim() || batchNo,

      lotNumber: data.lotNumber?.trim() || batchNo,

      startDate,

      supervisor: data.supervisor
        ? new mongoose.Types.ObjectId(data.supervisor)
        : undefined,

      supervisorName: data.supervisorName?.trim() || "",

      notes: data.notes?.trim() || "",
    });

    // -------------------------------------------------
    // DRAFT / PLANNED → RELEASED
    //
    // Creating a batch commits a prepared order to production. The order
    // becomes In Production only when one of its batches actually starts.
    // -------------------------------------------------

    // Materialize the scaled recipe immediately. This draft consumption is
    // the batch-specific formula: operators may review or edit it before
    // production starts, while the approved master formula stays unchanged.
    try {
      await createMaterialConsumption({
        productionOrder: data.productionOrder
          ? String(productionOrder._id)
          : undefined,
        productionBatch: String(batch._id),
        notes: `Batch-specific formula created for ${batch.batchNo}.`,
      });
    } catch (error) {
      await ProductionBatch.deleteOne({ _id: batch._id });
      throw new ProductionBatchServiceError(
        `The batch formula could not be prepared: ${error instanceof Error ? error.message : "review the selected master formula."}`,
        400,
      );
    }

    if (
      productionOrder.status === "Draft" ||
      productionOrder.status === "Planned"
    ) {
      productionOrder.status = "Released";

      await productionOrder.save();
    }

    return batch;
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ProductionBatchServiceError(
        "A production batch with the same batch number already exists.",
        409,
      );
    }

    throw error;
  }
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionBatches() {
  return ProductionBatch.find()
    .populate(
      "productionOrder",
      "productionOrderNo productName productCode quantity unit status",
    )
    .populate("product", "name code category unit baseUnit packSizeKg")
    .populate("outputs.product", "name code category unit baseUnit packSizeKg")
    .populate("formula", "name code version batchSize batchUnit")
    .sort({
      createdAt: -1,
    });
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionBatchById(id: string) {
  validateObjectId(id, "production batch ID");

  const batch: any = await ProductionBatch.findById(id)
    .populate(
      "productionOrder",
      "productionOrderNo productName productCode quantity unit status",
    )
    .populate("product", "name code category unit baseUnit packSizeKg")
    .populate("outputs.product", "name code category unit baseUnit packSizeKg")
    .populate("formula", "name code version batchSize batchUnit")
    .lean();
  if (!batch) return null;

  // Historical batches created before formula snapshots were introduced
  // already retain their recipe in material consumption. Materialize that
  // snapshot onto the batch so the past formula remains independently visible.
  if (!Array.isArray(batch.formulaSnapshot) || !batch.formulaSnapshot.length) {
    const consumption: any = await RawMaterialConsumption.findOne({
      productionBatch: batch._id,
      status: { $ne: "Cancelled" },
    })
      .select("items")
      .lean();
    if (Array.isArray(consumption?.items) && consumption.items.length) {
      batch.formulaSnapshot = consumption.items.map((item: any) => ({
        rawMaterial: item.rawMaterial,
        rawMaterialName: item.rawMaterialName,
        rawMaterialCode: item.rawMaterialCode,
        quantity: Number(item.standardQuantity || 0),
        unit: item.unit,
        wastePercentage: 0,
        notes: item.notes || "",
      }));
      await ProductionBatch.updateOne(
        { _id: batch._id, $or: [{ formulaSnapshot: { $exists: false } }, { formulaSnapshot: { $size: 0 } }] },
        { $set: { formulaSnapshot: batch.formulaSnapshot } },
      );
    }
  }
  return batch;
}

// =====================================================
// GET BY ORDER
// =====================================================

export async function getBatchesByProductionOrder(productionOrderId: string) {
  validateObjectId(productionOrderId, "production order ID");

  return ProductionBatch.find({
    productionOrder: productionOrderId,
  }).sort({
    createdAt: -1,
  });
}

// =====================================================
// GET ACTIVE
// =====================================================

export async function getActiveProductionBatches() {
  return ProductionBatch.find({
    status: {
      $in: ["Planned", "Ready", "In Progress", "Paused"],
    },
  })
    .populate(
      "productionOrder",
      "productionOrderNo productName productCode quantity unit status",
    )
    .populate("product", "name code category unit")
    .populate("outputs.product", "name code category unit baseUnit packSizeKg")
    .sort({
      createdAt: -1,
    });
}

// =====================================================
// UPDATE BATCH
// =====================================================

export async function updateProductionBatch(
  id: string,
  data: UpdateProductionBatchData,
) {
  validateObjectId(id, "production batch ID");

  const batch = await ProductionBatch.findById(id);

  if (!batch) {
    throw new ProductionBatchServiceError("Production batch not found.", 404);
  }

  const wasCompleted = batch.status === "Completed";
  const previousEndDate = batch.endDate;

  const currentStatus = batch.status as ProductionBatchStatus;

  // ---------------------------------------------------
  // TERMINAL STATES
  // ---------------------------------------------------

  if (
    currentStatus === "Completed" &&
    data.status === "Completed" &&
    batch.finishedGoodsPostedAt
  ) {
    if (!batch.costedAt) await snapshotCompletedBatchCost(batch);
    return ProductionBatch.findById(batch._id)
      .populate("product", "name code category unit baseUnit packSizeKg")
      .populate("outputs.product", "name code category unit baseUnit packSizeKg")
      .populate("formula", "name code version batchSize batchUnit");
  }

  if (currentStatus === "Completed" || currentStatus === "Cancelled") {
    throw new ProductionBatchServiceError(
      `A ${currentStatus} production batch cannot be modified.`,
      409,
    );
  }

  // ---------------------------------------------------
  // CALCULATE NEXT STATUS
  // ---------------------------------------------------

  const nextStatus = (data.status ?? currentStatus) as ProductionBatchStatus;

  validateStatusTransition(currentStatus, nextStatus);

  const isCompletingBatch = nextStatus === "Completed";

  let consumptionToFinalize: any = null;
  let finishedProductToPost: any = null;

  if (isCompletingBatch) {
    consumptionToFinalize = await RawMaterialConsumption.findOne({
      productionBatch: batch._id,
      status: { $ne: "Cancelled" },
    });

    if (!consumptionToFinalize) {
      throw new ProductionBatchServiceError(
        "Raw materials have not been issued for this batch. Start the batch first, then issue materials before recording finished output.",
        409,
      );
    }

    if (consumptionToFinalize.status === "Draft") {
      throw new ProductionBatchServiceError(
        "Raw materials are still in Draft. Review the batch recipe and issue the materials before completing production.",
        409,
      );
    }

    const issuedQuantity = (consumptionToFinalize.items || []).reduce(
      (total: number, item: any) =>
        total + Number(item.issuedQuantity || 0),
      0,
    );
    if (!Number.isFinite(issuedQuantity) || issuedQuantity <= 0) {
      throw new ProductionBatchServiceError(
        "No raw materials have been issued for this batch.",
        409,
      );
    }

    finishedProductToPost = await Product.findById(batch.product);
    if (!finishedProductToPost) {
      throw new ProductionBatchServiceError(
        "The finished product linked to this batch no longer exists.",
        404,
      );
    }
  }

  // ---------------------------------------------------
  // LOAD ORDER
  // ---------------------------------------------------

  const productionOrder = batch.productionOrder
    ? await ProductionOrder.findById(batch.productionOrder)
    : null;

  // ---------------------------------------------------
  // FIELD PERMISSIONS
  // ---------------------------------------------------

  const canEditPlannedQuantity =
    currentStatus === "Planned" || currentStatus === "Ready";

  const canEditActualQuantity =
    currentStatus === "In Progress" || currentStatus === "Paused";

  const productionStarted =
    currentStatus === "In Progress" || currentStatus === "Paused";

  // ---------------------------------------------------
  // PLANNED QUANTITY
  // ---------------------------------------------------

  if (data.plannedQuantity !== undefined) {
    if (!canEditPlannedQuantity) {
      throw new ProductionBatchServiceError(
        "Planned batch quantity can only be changed while the batch is Planned or Ready.",
        409,
      );
    }

    const quantity = Number(data.plannedQuantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ProductionBatchServiceError(
        "Planned quantity must be greater than 0.",
        400,
      );
    }

    if (productionOrder) {
      const otherBatches = await ProductionBatch.find({
        productionOrder: batch.productionOrder,
        _id: { $ne: batch._id },
        status: { $ne: "Cancelled" },
      }).select("plannedQuantity actualQuantity status").lean();
      const remainingForThisBatch = roundNumber(
        Number(productionOrder.quantity) - getOrderCommittedQuantity(otherBatches),
      );
      if (quantity > remainingForThisBatch) {
        throw new ProductionBatchServiceError(
          `The new batch quantity (${quantity}) exceeds the remaining historical production order quantity (${remainingForThisBatch}).`,
          409,
        );
      }
    }

    const previousQuantity = Number(batch.plannedQuantity || 0);

    // A batch owns its formula snapshot. Rescale that snapshot when its output
    // changes so the master formula and all historical batches remain intact.
    if (
      previousQuantity > 0 &&
      quantity !== previousQuantity &&
      Array.isArray((batch as any).formulaSnapshot)
    ) {
      const scale = quantity / previousQuantity;
      (batch as any).formulaSnapshot = (batch as any).formulaSnapshot.map(
        (item: any) => ({
          ...(typeof item?.toObject === "function" ? item.toObject() : item),
          quantity: roundNumber(Number(item.quantity || 0) * scale),
        }),
      );
      if (Array.isArray((batch as any).outputs)) {
        (batch as any).outputs = (batch as any).outputs.map((output: any) => {
          const plannedOutput = roundNumber(Number(output.plannedQuantity || 0) * scale);
          return {
            ...(typeof output?.toObject === "function" ? output.toObject() : output),
            plannedQuantity: plannedOutput,
            plannedPacks: roundNumber(plannedOutput / Number(output.packSizeKg || 30)),
          };
        });
      }

      const draftConsumption: any = await RawMaterialConsumption.findOne({
        productionBatch: batch._id,
        status: "Draft",
      });

      if (draftConsumption) {
        await updateMaterialConsumption(String(draftConsumption._id), {
          items: (draftConsumption.items || []).map((item: any) => ({
            standardQuantity: roundNumber(
              Number(item.standardQuantity || 0) * scale,
            ),
          })),
        });
      }
    }

    batch.plannedQuantity = quantity;
  }

  // ---------------------------------------------------
  // ACTUAL QUANTITY
  // ---------------------------------------------------

  if (data.actualQuantity !== undefined) {
    if (!canEditActualQuantity) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity can only be recorded while the batch is In Progress or Paused.",
        409,
      );
    }

    const actual = Number(data.actualQuantity);

    if (!Number.isFinite(actual) || actual < 0) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity cannot be negative.",
        400,
      );
    }

    if (
      productionOrder &&
      !productionOrder.directBatchRecord &&
      actual > Number(batch.plannedQuantity)
    ) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity cannot exceed planned batch quantity.",
        400,
      );
    }

    // -------------------------------------------------
    // ORDER TOTAL SAFETY
    // -------------------------------------------------

    if (productionOrder && !productionOrder.directBatchRecord) {
      const otherActualBatches = await ProductionBatch.find({
        productionOrder: batch.productionOrder,
        _id: { $ne: batch._id },
        status: { $ne: "Cancelled" },
      }).select("actualQuantity").lean();
      const otherActual = otherActualBatches.reduce(
        (total, item) => total + Number(item.actualQuantity || 0),
        0,
      );
      const maximumAllowedActual = roundNumber(
        Number(productionOrder.quantity) - otherActual,
      );
      if (actual > maximumAllowedActual) {
        throw new ProductionBatchServiceError(
          `Actual produced quantity cannot exceed the remaining historical production order quantity (${maximumAllowedActual}).`,
          409,
        );
      }
    }

    batch.actualQuantity = actual;
  }

  // ---------------------------------------------------
  // COMPLETION VALIDATION
  // ---------------------------------------------------

  if (nextStatus === "Completed") {
    const finalActual = Number(batch.plannedQuantity);

    if (!Number.isFinite(finalActual) || finalActual <= 0) {
      throw new ProductionBatchServiceError(
        "A completed batch must have a planned quantity greater than 0.",
        400,
      );
    }

    batch.actualQuantity = finalActual;
    if (Array.isArray((batch as any).outputs)) {
      (batch as any).outputs.forEach((output: any) => {
        output.actualQuantity = Number(output.plannedQuantity || 0);
        output.actualPacks = roundNumber(Number(output.actualQuantity || 0) / Number(output.packSizeKg || 30));
      });
    }
    batch.endDate = new Date();
  }

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  batch.status = nextStatus;

  if (nextStatus === "In Progress" && productionOrder?.status === "Released") {
    productionOrder.status = "In Production";
  }

  if (
    nextStatus === "In Progress" &&
    currentStatus !== "In Progress" &&
    !batch.startDate
  ) {
    batch.startDate = new Date();
  }

  // ---------------------------------------------------
  // START DATE
  // ---------------------------------------------------

  if (data.startDate !== undefined) {
    if (productionStarted) {
      throw new ProductionBatchServiceError(
        "Start date cannot be changed after production starts.",
        409,
      );
    }

    batch.startDate = parseDate(data.startDate, "start date");
  }

  // ---------------------------------------------------
  // END DATE
  // ---------------------------------------------------

  if (data.endDate !== undefined) {
    throw new ProductionBatchServiceError(
      "End date is managed automatically by the production batch workflow.",
      409,
    );
  }

  // ---------------------------------------------------
  // BATCH NUMBER
  // ---------------------------------------------------

  if (data.batchNumber !== undefined) {
    if (productionStarted) {
      throw new ProductionBatchServiceError(
        "Batch number cannot be changed after production starts.",
        409,
      );
    }

    const value = data.batchNumber.trim();

    if (!value) {
      throw new ProductionBatchServiceError(
        "Batch number cannot be empty.",
        400,
      );
    }

    batch.batchNumber = value;
  }

  // ---------------------------------------------------
  // LOT NUMBER
  // ---------------------------------------------------

  if (data.lotNumber !== undefined) {
    if (productionStarted) {
      throw new ProductionBatchServiceError(
        "Lot number cannot be changed after production starts.",
        409,
      );
    }

    const value = data.lotNumber.trim();

    if (!value) {
      throw new ProductionBatchServiceError("Lot number cannot be empty.", 400);
    }

    batch.lotNumber = value;
  }

  // ---------------------------------------------------
  // SUPERVISOR
  // ---------------------------------------------------

  if (data.supervisor !== undefined) {
    if (productionStarted) {
      throw new ProductionBatchServiceError(
        "Supervisor cannot be changed after production starts.",
        409,
      );
    }

    validateObjectId(data.supervisor, "supervisor ID");

    batch.supervisor = new mongoose.Types.ObjectId(data.supervisor);
  }

  // ---------------------------------------------------
  // SUPERVISOR NAME
  // ---------------------------------------------------

  if (data.supervisorName !== undefined) {
    if (productionStarted) {
      throw new ProductionBatchServiceError(
        "Supervisor cannot be changed after production starts.",
        409,
      );
    }

    batch.supervisorName = data.supervisorName.trim();
  }

  // ---------------------------------------------------
  // NOTES
  // ---------------------------------------------------

  if (data.notes !== undefined) {
    batch.notes = data.notes.trim();
  }

  // ---------------------------------------------------
  // SAVE
  // ---------------------------------------------------

  await batch.save();

  if (productionOrder) await productionOrder.save();

  // Create the formula-based material issue list when actual production starts.
  // This is intentionally done once per batch and remains Draft until the
  // storekeeper selects receipt lots and issues the materials.
  if (nextStatus === "In Progress" && currentStatus !== "In Progress") {
    const existingConsumption = await RawMaterialConsumption.exists({
      productionBatch: batch._id,
      status: { $ne: "Cancelled" },
    });

    if (!existingConsumption) {
      await createMaterialConsumption({
        productionOrder: batch.productionOrder
          ? String(batch.productionOrder)
          : undefined,
        productionBatch: String(batch._id),
        notes: `Created automatically when batch ${batch.batchNo} started.`,
      });
    }
  }

  // At batch completion, quantities already issued to production are treated
  // as used unless the operator recorded a specific waste or return amount.
  // The resulting consumption record is locked as an audit trail.
  if (isCompletingBatch && consumptionToFinalize) {
    const consumptionItems = Array.isArray(consumptionToFinalize.items)
      ? consumptionToFinalize.items
      : [];

    // A Consumed record means a previous completion attempt already locked
    // materials but failed later while posting finished stock. Keep the path
    // idempotent so the operator can retry without changing inventory twice.
    if (consumptionToFinalize.status !== "Consumed") {
      try {
        await updateMaterialConsumption(String(consumptionToFinalize._id), {
          items: consumptionItems.map((item: any) => ({
            actualQuantity: Math.max(
              0,
              Number(item.issuedQuantity || 0) -
                Number(item.wasteQuantity || 0) -
                Number(item.returnQuantity || 0),
            ),
          })),
        });

        await completeMaterialConsumption(String(consumptionToFinalize._id), {
          notes: `Closed automatically when production batch ${batch.batchNo} was completed.`,
        });
      } catch (error) {
        batch.status = currentStatus;
        batch.endDate = previousEndDate;
        await batch.save();
        throw new ProductionBatchServiceError(
          `Material consumption could not be closed for ${batch.batchNo}: ${error instanceof Error ? error.message : "review the material issue."}`,
          409,
        );
      }
    }
  }

  if (
    batch.status === "Completed" &&
    !wasCompleted &&
    !batch.finishedGoodsPostedAt
  ) {
    const product = finishedProductToPost || (await Product.findById(batch.product));
    if (!product) throw new ProductionBatchServiceError("Finished product not found.", 404);
    const postingSession = await mongoose.startSession();
    try {
      await postingSession.withTransaction(async () => {
        const postingMarker = new Date();
        const markedBatch = await ProductionBatch.findOneAndUpdate(
          {
            _id: batch._id,
            $or: [
              { finishedGoodsPostedAt: { $exists: false } },
              { finishedGoodsPostedAt: null },
            ],
          },
          { $set: { finishedGoodsPostedAt: postingMarker } },
          { new: true, session: postingSession },
        );
        if (!markedBatch) return;

        const outputLines = Array.isArray((batch as any).outputs) && (batch as any).outputs.length > 0
          ? (batch as any).outputs.map((output: any) => ({
              product: output.product,
              quantity: Number(output.actualQuantity || output.plannedQuantity || 0),
            }))
          : [{ product: product._id, quantity: Number(batch.actualQuantity) }];

        for (const output of outputLines) {
          if (!Number.isFinite(output.quantity) || output.quantity <= 0) {
            throw new Error("Every finished output must have a quantity greater than zero.");
          }
          const productUpdate = await Product.updateOne(
            { _id: output.product },
            { $inc: { stock: output.quantity } },
            { session: postingSession },
          );
          if (productUpdate.matchedCount !== 1) {
            throw new Error("A finished output product could not be updated.");
          }
          await FinishedGoodsStoreBalance.findOneAndUpdate(
            { product: output.product, store: "production" },
            { $inc: { quantity: output.quantity } },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              session: postingSession,
            },
          );
        }
        batch.finishedGoodsPostedAt = postingMarker;
      });
    } catch (error) {
      batch.status = currentStatus;
      batch.endDate = previousEndDate;
      batch.finishedGoodsPostedAt = undefined;
      await batch.save();
      throw new ProductionBatchServiceError(
        `Finished stock could not be posted for ${batch.batchNo}: ${error instanceof Error ? error.message : "retry the completion."}`,
        409,
      );
    } finally {
      await postingSession.endSession();
    }
  }

  if (batch.status === "Completed" && !wasCompleted) {
    await snapshotCompletedBatchCost(batch, productionOrder);
  }

  // ---------------------------------------------------
  // SYNC ORDER
  // ---------------------------------------------------

  if (batch.productionOrder) {
    await syncProductionOrderFromBatches(String(batch.productionOrder));
  }

  return ProductionBatch.findById(batch._id)
    .populate("product", "name code category unit baseUnit packSizeKg")
    .populate("outputs.product", "name code category unit baseUnit packSizeKg")
    .populate("formula", "name code version batchSize batchUnit");
}

// =====================================================
// SYNC PRODUCTION ORDER
// =====================================================

export async function syncProductionOrderFromBatches(
  productionOrderId: string,
) {
  validateObjectId(productionOrderId, "production order ID");

  const productionOrder = await ProductionOrder.findById(productionOrderId);

  if (!productionOrder) {
    throw new ProductionBatchServiceError("Production order not found.", 404);
  }

  const batches = await ProductionBatch.find({
    productionOrder: productionOrderId,

    status: {
      $ne: "Cancelled",
    },
  })
    .select("actualQuantity status")
    .lean();

  const actualProducedQuantity = batches.reduce(
    (total, batch) =>
      batch.status === "Completed"
        ? total + Number(batch.actualQuantity || 0)
        : total,
    0,
  );

  const actualProduced = roundNumber(actualProducedQuantity);

  productionOrder.actualProducedQuantity = actualProduced;

  const hasCompletedBatch = batches.some(
    (batch) => batch.status === "Completed",
  );

  // ---------------------------------------------------
  // ORDER COMPLETION
  // ---------------------------------------------------

  if (
    actualProduced === Number(productionOrder.quantity) &&
    hasCompletedBatch
  ) {
    productionOrder.status = "Completed";
  }

  await productionOrder.save();

  return productionOrder;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionBatch(id: string) {
  validateObjectId(id, "production batch ID");

  const batch = await ProductionBatch.findById(id);

  if (!batch) {
    throw new ProductionBatchServiceError("Production batch not found.", 404);
  }

  // ---------------------------------------------------
  // ONLY PLANNED CAN BE DELETED
  // ---------------------------------------------------

  if (batch.status !== "Planned") {
    throw new ProductionBatchServiceError(
      "Only Planned production batches can be deleted. Cancelled batches must remain in the system for audit history.",
      409,
    );
  }

  await ProductionBatch.findByIdAndDelete(id);

  return batch;
}
