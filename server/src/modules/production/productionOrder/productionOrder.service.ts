import mongoose from "mongoose";

import ProductionOrder from "./productionOrder.model";

import type {
  ProductionOrderPriority,
  ProductionOrderStatus,
} from "./productionOrder.model";

// =====================================================
// TYPES
// =====================================================

export interface CreateProductionOrderData {
  product: string;
  formula: string;
  quantity: number;
  unit?: string;
  priority?: ProductionOrderPriority;
  plannedDate: string | Date;
  expectedCompletionDate?: string | Date;
  status?: ProductionOrderStatus;
  notes?: string;
}

export interface UpdateProductionOrderData {
  quantity?: number;
  unit?: string;
  priority?: ProductionOrderPriority;
  plannedDate?: string | Date;
  expectedCompletionDate?: string | Date;
  status?: ProductionOrderStatus;
  notes?: string;
}

export class ProductionOrderServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ProductionOrderServiceError";
    this.statusCode = statusCode;
  }
}

// =====================================================
// MODEL HELPERS
// =====================================================

function getModel<T = any>(name: string) {
  try {
    return mongoose.model<T>(name);
  } catch {
    throw new ProductionOrderServiceError(
      `${name} model is not registered.`,
      500
    );
  }
}

// =====================================================
// VALIDATE OBJECT ID
// =====================================================

function validateObjectId(
  id: string,
  fieldName: string
): void {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ProductionOrderServiceError(
      `Invalid ${fieldName}.`,
      400
    );
  }
}

// =====================================================
// ROUND NUMBER
// =====================================================

function roundNumber(
  value: number,
  decimals = 4
): number {
  const factor = Math.pow(10, decimals);

  return (
    Math.round((value + Number.EPSILON) * factor) /
    factor
  );
}

// =====================================================
// GET OBJECT ID
// =====================================================

function getObjectId(
  value: unknown
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    const id = (
      value as {
        _id?: unknown;
      }
    )._id;

    return id ? String(id) : null;
  }

  return null;
}

// =====================================================
// PRODUCT HELPERS
// =====================================================

function getProductCode(product: any): string {
  const possibleCodes = [
    product?.code,
    product?.productCode,
    product?.sku,
    product?.product_code,
  ];

  for (const value of possibleCodes) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  if (product?._id) {
    return `PRD-${String(product._id)
      .slice(-8)
      .toUpperCase()}`;
  }

  return "PRD-UNKNOWN";
}

function getProductName(product: any): string {
  const possibleNames = [
    product?.name,
    product?.productName,
  ];

  for (const value of possibleNames) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "Unnamed Product";
}

// =====================================================
// FORMULA HELPERS
// =====================================================

function getFormulaCode(formula: any): string {
  const possibleCodes = [
    formula?.code,
    formula?.formulaCode,
    formula?.sku,
  ];

  for (const value of possibleCodes) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  if (formula?._id) {
    return `FOR-${String(formula._id)
      .slice(-8)
      .toUpperCase()}`;
  }

  return "FOR-UNKNOWN";
}

function getFormulaName(formula: any): string {
  const possibleNames = [
    formula?.name,
    formula?.formulaName,
  ];

  for (const value of possibleNames) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "Unnamed Formula";
}

// =====================================================
// RAW MATERIAL HELPERS
// =====================================================

function getRawMaterialCode(rawMaterial: any): string {
  const possibleCodes = [
    rawMaterial?.code,
    rawMaterial?.rawMaterialCode,
    rawMaterial?.sku,
  ];

  for (const value of possibleCodes) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  if (rawMaterial?._id) {
    return `RM-${String(rawMaterial._id)
      .slice(-8)
      .toUpperCase()}`;
  }

  return "RM-UNKNOWN";
}

// =====================================================
// DATE HELPERS
// =====================================================

function parseDate(
  value: string | Date | undefined,
  fieldName: string,
  required = false
): Date | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throw new ProductionOrderServiceError(
        `${fieldName} is required.`,
        400
      );
    }

    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ProductionOrderServiceError(
      `Invalid ${fieldName}.`,
      400
    );
  }

  return date;
}

// =====================================================
// STATUS TRANSITIONS
// =====================================================

const allowedStatusTransitions: Record<
  ProductionOrderStatus,
  ProductionOrderStatus[]
> = {
  Draft: [
    "Draft",
    "Planned",
    "Cancelled",
  ],

  Planned: [
    "Planned",
    "Released",
    "On Hold",
    "Cancelled",
  ],

  Released: [
    "Released",
    "In Production",
    "On Hold",
    "Cancelled",
  ],

  "In Production": [
    "In Production",
    "Completed",
    "On Hold",
  ],

  Completed: [
    "Completed",
  ],

  Cancelled: [
    "Cancelled",
  ],

  "On Hold": [
    "On Hold",
    "Released",
    "Cancelled",
  ],
};

function validateStatusTransition(
  current: ProductionOrderStatus,
  next: ProductionOrderStatus
) {
  const allowed =
    allowedStatusTransitions[current] || [];

  if (!allowed.includes(next)) {
    throw new ProductionOrderServiceError(
      `Invalid production order status transition: ${current} → ${next}.`,
      400
    );
  }
}

// =====================================================
// BUILD MATERIAL REQUIREMENTS
// =====================================================

function buildMaterialRequirements(
  formula: any,
  productionQuantity: number
) {
  const batchSize =
    Number(formula.batchSize);

  if (
    !Number.isFinite(batchSize) ||
    batchSize <= 0
  ) {
    throw new ProductionOrderServiceError(
      "Formula batch size must be greater than 0.",
      400
    );
  }

  if (
    !Array.isArray(formula.items) ||
    formula.items.length === 0
  ) {
    throw new ProductionOrderServiceError(
      "The selected formula has no raw materials.",
      400
    );
  }

  const scalingFactor =
    productionQuantity / batchSize;

  const items = formula.items.map(
    (formulaItem: any) => {
      const rawMaterial =
        formulaItem.rawMaterial;

      if (!rawMaterial) {
        throw new ProductionOrderServiceError(
          "A raw material in the selected formula could not be loaded.",
          400
        );
      }

      const rawMaterialId =
        getObjectId(rawMaterial);

      if (!rawMaterialId) {
        throw new ProductionOrderServiceError(
          "Invalid raw material reference in formula.",
          400
        );
      }

      const baseQuantity =
        Number(formulaItem.quantity);

      if (
        !Number.isFinite(baseQuantity) ||
        baseQuantity <= 0
      ) {
        throw new ProductionOrderServiceError(
          `Invalid quantity for raw material ${
            rawMaterial.name || "Unknown"
          }.`,
          400
        );
      }

      const wastePercentage =
        Number(
          formulaItem.wastePercentage ?? 0
        );

      if (
        !Number.isFinite(wastePercentage) ||
        wastePercentage < 0 ||
        wastePercentage > 100
      ) {
        throw new ProductionOrderServiceError(
          `Invalid waste percentage for ${
            rawMaterial.name || "Unknown"
          }.`,
          400
        );
      }

      const quantity =
        baseQuantity * scalingFactor;

      const requiredQuantity =
        quantity *
        (1 + wastePercentage / 100);

      const costPerUnit =
        Number(
          rawMaterial.costPerUnit ?? 0
        );

      const estimatedCost =
        requiredQuantity * costPerUnit;

      return {
        rawMaterial: rawMaterialId,

        rawMaterialName:
          String(
            rawMaterial.name || "Unknown"
          ),

        rawMaterialCode:
          getRawMaterialCode(
            rawMaterial
          ),

        quantity:
          roundNumber(quantity),

        unit:
          String(
            formulaItem.unit ||
              rawMaterial.unit ||
              formula.batchUnit ||
              "kg"
          ),

        wastePercentage:
          roundNumber(
            wastePercentage
          ),

        requiredQuantity:
          roundNumber(
            requiredQuantity
          ),

        estimatedCost:
          roundNumber(
            estimatedCost
          ),

        actualQuantity: 0,

        variance: 0,

        notes:
          formulaItem.notes
            ? String(
                formulaItem.notes
              )
            : "",
      };
    }
  );

  return {
    scalingFactor:
      roundNumber(scalingFactor),

    items,
  };
}

// =====================================================
// CALCULATE COSTS
// =====================================================

function calculateCosts(
  formula: any,
  items: any[],
  scalingFactor: number
) {
  const estimatedMaterialCost =
    items.reduce(
      (
        total: number,
        item: {
          estimatedCost: number;
        }
      ) =>
        total + Number(item.estimatedCost || 0),
      0
    );

  const laborCost =
    Number(formula.laborCost || 0) *
    scalingFactor;

  const energyCost =
    Number(formula.energyCost || 0) *
    scalingFactor;

  const otherCost =
    Number(formula.otherCost || 0) *
    scalingFactor;

  const estimatedTotalCost =
    estimatedMaterialCost +
    laborCost +
    energyCost +
    otherCost;

  return {
    estimatedMaterialCost:
      roundNumber(
        estimatedMaterialCost
      ),

    laborCost:
      roundNumber(laborCost),

    energyCost:
      roundNumber(energyCost),

    otherCost:
      roundNumber(otherCost),

    estimatedTotalCost:
      roundNumber(
        estimatedTotalCost
      ),
  };
}

// =====================================================
// LOAD PRODUCT
// =====================================================

async function loadProduct(
  productId: string
) {
  const Product = getModel("Product");

  const product =
    await Product.findById(
      productId
    ).lean();

  if (!product) {
    throw new ProductionOrderServiceError(
      "Product not found.",
      404
    );
  }

  return product;
}

// =====================================================
// LOAD FORMULA
// =====================================================

async function loadFormula(
  formulaId: string
) {
  const Formula = getModel("Formula");

  const formula =
    await Formula.findById(
      formulaId
    )
      .populate(
        "items.rawMaterial"
      )
      .lean();

  if (!formula) {
    throw new ProductionOrderServiceError(
      "Formula not found.",
      404
    );
  }

  return formula;
}

// =====================================================
// VALIDATE FORMULA FOR PRODUCT
// =====================================================

function validateFormulaForProduct(
  formula: any,
  product: any,
  status?: ProductionOrderStatus
) {
  const formulaProductId =
    getObjectId(formula.product);

  if (
    !formulaProductId ||
    formulaProductId !==
      String(product._id)
  ) {
    throw new ProductionOrderServiceError(
      "The selected formula does not belong to the selected product.",
      400
    );
  }

  const formulaStatus =
    String(formula.status || "");

  if (
    formulaStatus !== "Active" &&
    status !== "Draft"
  ) {
    throw new ProductionOrderServiceError(
      "Only an active formula can be used for a production order.",
      400
    );
  }
}

// =====================================================
// GENERATE PRODUCTION ORDER NUMBER
// =====================================================

async function generateProductionOrderNo() {
  const year =
    new Date().getFullYear();

  const latestOrder =
    await ProductionOrder.findOne({
      productionOrderNo: {
        $regex: `^PO-${year}-`,
      },
    })
      .sort({
        productionOrderNo: -1,
      })
      .select(
        "productionOrderNo"
      )
      .lean();

  let nextNumber = 1;

  if (
    latestOrder?.productionOrderNo
  ) {
    const match =
      latestOrder.productionOrderNo.match(
        /PO-\d{4}-(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `PO-${year}-${String(
    nextNumber
  ).padStart(4, "0")}`;
}

// =====================================================
// CREATE PRODUCTION ORDER
// =====================================================

export async function createProductionOrder(
  data: CreateProductionOrderData
) {
  if (!data) {
    throw new ProductionOrderServiceError(
      "Production order data is required.",
      400
    );
  }

  validateObjectId(
    data.product,
    "product ID"
  );

  validateObjectId(
    data.formula,
    "formula ID"
  );

  const quantity =
    Number(data.quantity);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new ProductionOrderServiceError(
      "Production quantity must be greater than 0.",
      400
    );
  }

  const plannedDate =
    parseDate(
      data.plannedDate,
      "planned date",
      true
    );

  const expectedCompletionDate =
    parseDate(
      data.expectedCompletionDate,
      "expected completion date"
    );

  if (
    expectedCompletionDate &&
    plannedDate &&
    expectedCompletionDate < plannedDate
  ) {
    throw new ProductionOrderServiceError(
      "Expected completion date cannot be before planned date.",
      400
    );
  }

  const product =
    await loadProduct(data.product);

  const formula =
    await loadFormula(data.formula);

  validateFormulaForProduct(
    formula,
    product,
    data.status
  );

  const {
    scalingFactor,
    items,
  } =
    buildMaterialRequirements(
      formula,
      quantity
    );

  const costs =
    calculateCosts(
      formula,
      items,
      scalingFactor
    );

  const productionOrderNo =
    await generateProductionOrderNo();

  try {
    const productionOrder =
      await ProductionOrder.create({
        productionOrderNo,

        product: product._id,
        productName:
          getProductName(product),
        productCode:
          getProductCode(product),

        formula: formula._id,
        formulaName:
          getFormulaName(formula),
        formulaCode:
          getFormulaCode(formula),
        formulaVersion:
          Number(formula.version ?? 1),

        quantity,

        unit:
          String(
            data.unit ||
              product.unit ||
              formula.batchUnit ||
              "kg"
          ),

        formulaBatchSize:
          Number(formula.batchSize),

        formulaBatchUnit:
          String(
            formula.batchUnit ||
              data.unit ||
              product.unit ||
              "kg"
          ),

        scalingFactor,

        priority:
          data.priority || "Normal",

        status:
          data.status || "Draft",

        plannedDate,

        expectedCompletionDate,

        items,

        ...costs,

        actualProducedQuantity: 0,

        notes:
          data.notes?.trim() || "",
      });

    return productionOrder;
  } catch (error: any) {
    if (
      error?.code === 11000
    ) {
      throw new ProductionOrderServiceError(
        "A production order with this number already exists. Please try again.",
        409
      );
    }

    throw error;
  }
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionOrders() {
  return ProductionOrder.find()
    .populate(
      "product",
      "name code productCode sku category unit"
    )
    .populate(
      "formula",
      "name code formulaCode version batchSize batchUnit status"
    )
    .populate(
      "items.rawMaterial",
      "name code rawMaterialCode sku category unit costPerUnit"
    )
    .sort({
      createdAt: -1,
    });
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionOrderById(
  id: string
) {
  validateObjectId(
    id,
    "production order ID"
  );

  return ProductionOrder.findById(id)
    .populate(
      "product",
      "name code productCode sku category unit"
    )
    .populate(
      "formula",
      "name code formulaCode version batchSize batchUnit status"
    )
    .populate(
      "items.rawMaterial",
      "name code rawMaterialCode sku category unit costPerUnit"
    );
}

// =====================================================
// STATS
// =====================================================

export async function getProductionOrderStats() {
  const [
    total,
    draft,
    planned,
    released,
    inProduction,
    completed,
    cancelled,
    onHold,
  ] =
    await Promise.all([
      ProductionOrder.countDocuments(),

      ProductionOrder.countDocuments({
        status: "Draft",
      }),

      ProductionOrder.countDocuments({
        status: "Planned",
      }),

      ProductionOrder.countDocuments({
        status: "Released",
      }),

      ProductionOrder.countDocuments({
        status: "In Production",
      }),

      ProductionOrder.countDocuments({
        status: "Completed",
      }),

      ProductionOrder.countDocuments({
        status: "Cancelled",
      }),

      ProductionOrder.countDocuments({
        status: "On Hold",
      }),
    ]);

  return {
    total,
    draft,
    planned,
    released,
    inProduction,
    completed,
    cancelled,
    onHold,
  };
}

// =====================================================
// CHECK EXISTING BATCHES
// =====================================================

async function hasProductionBatches(
  productionOrderId: string
) {
  try {
    const ProductionBatch =
      mongoose.model(
        "ProductionBatch"
      );

    const count =
      await ProductionBatch.countDocuments(
        {
          productionOrder:
            productionOrderId,
        }
      );

    return count > 0;
  } catch {
    // ProductionBatch model may not yet
    // be registered during isolated tests.
    return false;
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateProductionOrder(
  id: string,
  data: UpdateProductionOrderData
) {
  validateObjectId(
    id,
    "production order ID"
  );

  const productionOrder =
    await ProductionOrder.findById(id);

  if (!productionOrder) {
    throw new ProductionOrderServiceError(
      "Production order not found.",
      404
    );
  }

  const currentStatus =
    productionOrder.status;

  // ---------------------------------------------------
  // COMPLETED / CANCELLED
  // ---------------------------------------------------

  if (
    currentStatus === "Completed" ||
    currentStatus === "Cancelled"
  ) {
    throw new ProductionOrderServiceError(
      `A ${currentStatus} production order cannot be modified.`,
      409
    );
  }

  // ---------------------------------------------------
  // BATCH CHECK
  // ---------------------------------------------------

  const hasBatches =
    await hasProductionBatches(id);

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  if (
    data.status !== undefined
  ) {
    validateStatusTransition(
      currentStatus,
      data.status
    );

    if (
      data.status === "Released" &&
      productionOrder.items.length === 0
    ) {
      throw new ProductionOrderServiceError(
        "A production order must have raw-material requirements before it can be released.",
        400
      );
    }

    if (
      data.status === "Completed" &&
      productionOrder.actualProducedQuantity <= 0
    ) {
      throw new ProductionOrderServiceError(
        "A production order cannot be completed before production output is recorded.",
        400
      );
    }

    productionOrder.status =
      data.status;
  }

  // ---------------------------------------------------
  // LOCK AFTER RELEASE
  // ---------------------------------------------------

  const isLocked =
    currentStatus === "Released" ||
    currentStatus === "In Production" ||
    hasBatches;

  if (
    data.quantity !== undefined
  ) {
    if (isLocked) {
      throw new ProductionOrderServiceError(
        "Production quantity cannot be changed after the order has been released or a production batch exists.",
        409
      );
    }

    const newQuantity =
      Number(data.quantity);

    if (
      !Number.isFinite(newQuantity) ||
      newQuantity <= 0
    ) {
      throw new ProductionOrderServiceError(
        "Production quantity must be greater than 0.",
        400
      );
    }

    // -------------------------------------------------
    // RECALCULATE MATERIALS
    // -------------------------------------------------

    const Formula =
      getModel("Formula");

    const formula =
      await Formula.findById(
        productionOrder.formula
      )
        .populate(
          "items.rawMaterial"
        )
        .lean();

    if (!formula) {
      throw new ProductionOrderServiceError(
        "The formula linked to this production order no longer exists.",
        404
      );
    }

    const {
      scalingFactor,
      items,
    } =
      buildMaterialRequirements(
        formula,
        newQuantity
      );

    const costs =
      calculateCosts(
        formula,
        items,
        scalingFactor
      );

    productionOrder.quantity =
      newQuantity;

    productionOrder.scalingFactor =
      scalingFactor;

    productionOrder.items =
      items;

    productionOrder.estimatedMaterialCost =
      costs.estimatedMaterialCost;

    productionOrder.laborCost =
      costs.laborCost;

    productionOrder.energyCost =
      costs.energyCost;

    productionOrder.otherCost =
      costs.otherCost;

    productionOrder.estimatedTotalCost =
      costs.estimatedTotalCost;
  }

  // ---------------------------------------------------
  // UNIT
  // ---------------------------------------------------

  if (
    data.unit !== undefined
  ) {
    if (isLocked) {
      throw new ProductionOrderServiceError(
        "Production unit cannot be changed after release or batch creation.",
        409
      );
    }

    const unit =
      data.unit.trim();

    if (!unit) {
      throw new ProductionOrderServiceError(
        "Production unit cannot be empty.",
        400
      );
    }

    productionOrder.unit = unit;
  }

  // ---------------------------------------------------
  // PRIORITY
  // ---------------------------------------------------

  if (
    data.priority !== undefined
  ) {
    productionOrder.priority =
      data.priority;
  }

  // ---------------------------------------------------
  // PLANNED DATE
  // ---------------------------------------------------

  if (
    data.plannedDate !== undefined
  ) {
    const plannedDate =
      parseDate(
        data.plannedDate,
        "planned date",
        true
      );

    productionOrder.plannedDate =
      plannedDate!;
  }

  // ---------------------------------------------------
  // EXPECTED COMPLETION DATE
  // ---------------------------------------------------

  if (
    data.expectedCompletionDate !==
    undefined
  ) {
    const expectedDate =
      parseDate(
        data.expectedCompletionDate,
        "expected completion date"
      );

    if (
      expectedDate &&
      expectedDate <
        productionOrder.plannedDate
    ) {
      throw new ProductionOrderServiceError(
        "Expected completion date cannot be before planned date.",
        400
      );
    }

    productionOrder.expectedCompletionDate =
      expectedDate;
  }

  // ---------------------------------------------------
  // NOTES
  // ---------------------------------------------------

  if (
    data.notes !== undefined
  ) {
    productionOrder.notes =
      data.notes.trim();
  }

  await productionOrder.save();

  return productionOrder;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionOrder(
  id: string
) {
  validateObjectId(
    id,
    "production order ID"
  );

  const productionOrder =
    await ProductionOrder.findById(id);

  if (!productionOrder) {
    throw new ProductionOrderServiceError(
      "Production order not found.",
      404
    );
  }

  if (
    productionOrder.status !== "Draft" &&
    productionOrder.status !== "Cancelled"
  ) {
    throw new ProductionOrderServiceError(
      "Only Draft or Cancelled production orders can be deleted.",
      409
    );
  }

  const hasBatches =
    await hasProductionBatches(id);

  if (hasBatches) {
    throw new ProductionOrderServiceError(
      "A production order with production batches cannot be deleted.",
      409
    );
  }

  await ProductionOrder.findByIdAndDelete(
    id
  );

  return productionOrder;
}