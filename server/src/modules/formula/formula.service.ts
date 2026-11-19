import mongoose from "mongoose";

import Formula from "./formula.model";
import Product from "../product/product.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import { resolveCurrentMaterialPrices } from "../raw-materials/materialPrice.service";
import RawMaterialConsumption from "../production/materialConsumption/materialConsumption.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import { synchronizeFormulaPackaging } from "../production/productionPackaging.service";

// =====================================================
// TYPES
// =====================================================

interface FormulaItemInput {
  rawMaterial: string;
  appliesToProduct?: string;
  quantity: number;
  unit?: string;
  wastePercentage?: number;
  notes?: string;
}

interface FormulaOutputInput {
  product: string;
  quantity: number;
  packSizeKg?: number;
  packs?: number;
}

interface CreateFormulaData {
  product: string;
  name: string;
  code: string;
  version?: number;
  batchSize: number;
  batchUnit: string;
  outputs?: FormulaOutputInput[];
  items: FormulaItemInput[];
  laborCost?: number;
  energyCost?: number;
  otherCost?: number;
  status?: "Active" | "Inactive";
  notes?: string;
}

interface CreateNewVersionData {
  name?: string;
  code?: string;
  batchSize?: number;
  batchUnit?: string;
  outputs?: FormulaOutputInput[];
  items?: FormulaItemInput[];
  laborCost?: number;
  energyCost?: number;
  otherCost?: number;
  status?: "Active" | "Inactive";
  notes?: string;
}

// =====================================================
// OBJECT ID VALIDATION
// =====================================================

function validateObjectId(
  id: string,
  fieldName: string
) {
  if (
    !id ||
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    throw new Error(
      `Invalid ${fieldName}.`
    );
  }
}

// =====================================================
// DEACTIVATE OTHER ACTIVE FORMULAS
// =====================================================

async function deactivateOtherActiveFormulas(
  productId: string,
  exceptId?: string
) {
  const filter: Record<string, any> = {
    product: productId,
    status: "Active",
  };

  if (exceptId) {
    filter._id = {
      $ne: exceptId,
    };
  }

  await Formula.updateMany(
    filter,
    {
      $set: {
        status: "Inactive",
      },
    }
  );
}

// =====================================================
// GET NEXT VERSION
//
// VERSION IS BASED ON:
// SAME PRODUCT + SAME CODE
//
// Example:
//
// Product A / INT-WHT / V1
// Product A / INT-WHT / V2
// Product A / INT-WHT / V3
//
// Product A / EXT-WHT / V1
//
// Product B / INT-WHT / V1
// =====================================================

async function getNextVersion(
  productId: string,
  code: string
) {
  const normalizedCode = String(code)
    .trim()
    .toUpperCase();

  const latestFormula =
    await Formula.findOne({
      product: productId,
      code: normalizedCode,
    }).sort({
      version: -1,
    });

  if (!latestFormula) {
    return 1;
  }

  return latestFormula.version + 1;
}

// =====================================================
// PREPARE ITEMS + COST
// =====================================================

async function prepareFormulaItems(
  items: FormulaItemInput[]
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "Formula must contain at least one raw material."
    );
  }

  const rawMaterialIds = items.map(
    (item) => String(item.rawMaterial)
  );

  const uniqueIds =
    new Set(rawMaterialIds);

  if (
    uniqueIds.size !==
    rawMaterialIds.length
  ) {
    throw new Error(
      "A raw material cannot be added more than once to the same formula."
    );
  }

  for (const id of rawMaterialIds) {
    validateObjectId(
      id,
      "raw material ID"
    );
  }
  items.forEach((item) => {
    if (item.appliesToProduct) validateObjectId(item.appliesToProduct, "material output product ID");
  });

  const rawMaterials =
    await RawMaterial.find({
      _id: {
        $in: rawMaterialIds,
      },
    });

  const currentPrices = await resolveCurrentMaterialPrices(rawMaterialIds);
  const valuationByMaterial = new Map(
    [...currentPrices.entries()].map(([id, price]) => [id, Number(price.unitPrice || 0)]),
  );

  if (
    rawMaterials.length !==
    uniqueIds.size
  ) {
    throw new Error(
      "One or more raw materials were not found."
    );
  }

  let estimatedMaterialCost = 0;

  const preparedItems = items.map(
    (item) => {
      const rawMaterial =
        rawMaterials.find(
          (material) =>
            String(material._id) ===
            String(item.rawMaterial)
        );

      if (!rawMaterial) {
        throw new Error(
          "Raw material not found."
        );
      }

      if (rawMaterial.status !== "Active") {
        throw new Error(
          `${rawMaterial.name} is inactive. Select the active material record before saving the formula.`
        );
      }

      const quantity =
        Number(item.quantity);

      const wastePercentage =
        Number(
          item.wastePercentage ?? 0
        );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for ${rawMaterial.name}.`
        );
      }

      if (
        !Number.isFinite(
          wastePercentage
        ) ||
        wastePercentage < 0 ||
        wastePercentage > 100
      ) {
        throw new Error(
          `Invalid waste percentage for ${rawMaterial.name}.`
        );
      }

      const quantityWithWaste =
        quantity *
        (1 + wastePercentage / 100);

      const materialCost =
        quantityWithWaste *
        Number(valuationByMaterial.get(String(rawMaterial._id)) || 0);

      estimatedMaterialCost +=
        materialCost;

      return {
        rawMaterial:
          rawMaterial._id,

        ...(item.appliesToProduct
          ? { appliesToProduct: new mongoose.Types.ObjectId(item.appliesToProduct) }
          : {}),

        quantity,

        unit:
          item.unit ||
          rawMaterial.unit,

        wastePercentage,

        notes:
          item.notes || "",
      };
    }
  );

  return {
    preparedItems,
    estimatedMaterialCost,
  };
}

function validateFormulaItemTargets(items: any[], outputs: any[]) {
  const outputIds = new Set((outputs || []).map((output) => String(output.product?._id || output.product)));
  const targetedItems = (items || []).filter((item) => item.appliesToProduct);
  if (targetedItems.length > 0 && outputIds.size < 2) {
    throw new Error("Product-specific raw materials require a shared formula with multiple outputs.");
  }
  targetedItems.forEach((item) => {
    if (!outputIds.has(String(item.appliesToProduct))) {
      throw new Error("A product-specific raw material must target one of the formula outputs.");
    }
  });
}

async function prepareFormulaOutputs(
  primaryProductId: string,
  batchSize: number,
  outputs?: FormulaOutputInput[],
) {
  if (!Array.isArray(outputs) || outputs.length === 0) return [];

  const productIds = outputs.map((item) => String(item.product));
  if (new Set(productIds).size !== productIds.length) {
    throw new Error("A finished product cannot be added more than once to formula outputs.");
  }
  productIds.forEach((id) => validateObjectId(id, "formula output product ID"));
  if (!productIds.includes(String(primaryProductId))) {
    throw new Error("Formula outputs must include the primary finished product.");
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name packSizeKg baseUnit unit")
    .lean();
  if (products.length !== productIds.length) {
    throw new Error("One or more formula output products were not found.");
  }

  const prepared = outputs.map((item) => {
    const product = products.find((entry) => String(entry._id) === String(item.product));
    const packSizeKg = Number(item.packSizeKg || (product as any)?.packSizeKg || 30);
    const packs = Number(item.packs || 0);
    const suppliedQuantity = Number(item.quantity || 0);
    const quantity = suppliedQuantity > 0 ? suppliedQuantity : packs * packSizeKg;
    if (!Number.isFinite(packSizeKg) || packSizeKg <= 0 || !Number.isFinite(packs) || packs <= 0) {
      throw new Error(`Enter a valid pack size and number of packs for ${(product as any)?.name || "each output"}.`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || Math.abs(quantity - packs * packSizeKg) > 0.01) {
      throw new Error(`Output quantity for ${(product as any)?.name || "finished product"} must equal packs × pack size.`);
    }
    return { product: new mongoose.Types.ObjectId(item.product), quantity, packSizeKg, packs };
  });

  const outputTotal = prepared.reduce((sum, item) => sum + item.quantity, 0);
  if (Math.abs(outputTotal - Number(batchSize)) > 0.01) {
    throw new Error(`Combined output is ${outputTotal.toLocaleString("en-RW")} kg, so the formula batch size must match it.`);
  }
  return prepared;
}

// =====================================================
// CREATE NEW FORMULA
//
// ONLY FOR A COMPLETELY NEW CODE.
//
// Example:
//
// INT-WHT -> V1
//
// If INT-WHT already exists for the product,
// user must use Create New Version.
// =====================================================

export async function createFormula(
  data: CreateFormulaData
) {
  const {
    product,
    name,
    code,
    batchSize,
    batchUnit,
    outputs,
    items,
    laborCost = 0,
    energyCost = 0,
    otherCost = 0,
    status = "Active",
    notes = "",
  } = data;

  // ---------------------------------------------------
  // REQUIRED
  // ---------------------------------------------------

  if (!product) {
    throw new Error(
      "Product is required."
    );
  }

  if (!name?.trim()) {
    throw new Error(
      "Formula name is required."
    );
  }

  if (!code?.trim()) {
    throw new Error(
      "Formula code is required."
    );
  }

  if (
    !batchSize ||
    Number(batchSize) <= 0
  ) {
    throw new Error(
      "Batch size must be greater than 0."
    );
  }

  if (batchUnit?.trim().toLowerCase() !== "kg") {
    throw new Error(
      "Formula batch unit must be kg. CANA production calculations are weight-based."
    );
  }

  // ---------------------------------------------------
  // PRODUCT
  // ---------------------------------------------------

  validateObjectId(
    product,
    "product ID"
  );

  const existingProduct =
    await Product.findById(product);

  if (!existingProduct) {
    throw new Error(
      "Product not found."
    );
  }

  const preparedOutputs = await prepareFormulaOutputs(product, Number(batchSize), outputs);

  // ---------------------------------------------------
  // NORMALIZE CODE
  // ---------------------------------------------------

  const normalizedCode =
    String(code)
      .trim()
      .toUpperCase();

  // ---------------------------------------------------
  // CHECK EXISTING CODE
  //
  // Same code is allowed across versions,
  // but the first creation cannot use an
  // already-existing product + code.
  // ---------------------------------------------------

  const existingFormula =
    await Formula.findOne({
      product,
      code: normalizedCode,
    });

  if (existingFormula) {
    throw new Error(
      `Formula code ${normalizedCode} already exists for this product. Use "Create New Version" instead.`
    );
  }

  // ---------------------------------------------------
  // PREPARE ITEMS
  // ---------------------------------------------------

  const synchronizedPackaging = await synchronizeFormulaPackaging({
    productId: product,
    batchSize: Number(batchSize),
    outputs: preparedOutputs,
    items,
  });
  const {
    preparedItems,
    estimatedMaterialCost,
  } =
    await prepareFormulaItems(synchronizedPackaging.items);
  validateFormulaItemTargets(preparedItems, preparedOutputs);

  // ---------------------------------------------------
  // COSTS
  // ---------------------------------------------------

  const normalizedLaborCost =
    Number(laborCost || 0);

  const normalizedEnergyCost =
    Number(energyCost || 0);

  const normalizedOtherCost =
    Number(otherCost || 0);

  if (
    !Number.isFinite(
      normalizedLaborCost
    ) ||
    normalizedLaborCost < 0
  ) {
    throw new Error(
      "Invalid labor cost."
    );
  }

  if (
    !Number.isFinite(
      normalizedEnergyCost
    ) ||
    normalizedEnergyCost < 0
  ) {
    throw new Error(
      "Invalid energy cost."
    );
  }

  if (
    !Number.isFinite(
      normalizedOtherCost
    ) ||
    normalizedOtherCost < 0
  ) {
    throw new Error(
      "Invalid other cost."
    );
  }

  const estimatedTotalCost =
    estimatedMaterialCost +
    normalizedLaborCost +
    normalizedEnergyCost +
    normalizedOtherCost;

  // ---------------------------------------------------
  // NEW FORMULA ALWAYS STARTS AT V1
  // ---------------------------------------------------

  const formulaVersion = 1;

  // ---------------------------------------------------
  // ACTIVE
  // ---------------------------------------------------

  if (status === "Active") {
    await deactivateOtherActiveFormulas(
      product
    );
  }

  // ---------------------------------------------------
  // CREATE
  // ---------------------------------------------------

  const formula =
    await Formula.create({
      product,

      name: name.trim(),

      code: normalizedCode,

      version: formulaVersion,

      batchSize: Number(batchSize),

      batchUnit: "kg",

      outputs: preparedOutputs,

      items: preparedItems,

      laborCost:
        normalizedLaborCost,

      energyCost:
        normalizedEnergyCost,

      otherCost:
        normalizedOtherCost,

      estimatedMaterialCost:
        Number(
          estimatedMaterialCost.toFixed(2)
        ),

      estimatedTotalCost:
        Number(
          estimatedTotalCost.toFixed(2)
        ),

      status,

      notes:
        notes?.trim() || "",
    });

  return Formula.findById(
    formula._id
  )
    .populate(
      "product",
      "name code category unit packSizeKg"
    )
    .populate("outputs.product", "name code category unit packSizeKg")
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    );
}

// =====================================================
// CREATE NEW FORMULA VERSION
//
// SAME CODE.
// NEW VERSION.
//
// INT-WHT V1
// INT-WHT V2
// INT-WHT V3
// =====================================================

export async function createNewFormulaVersion(
  formulaId: string,
  data: CreateNewVersionData = {}
) {
  // ---------------------------------------------------
  // VALIDATE ID
  // ---------------------------------------------------

  validateObjectId(
    formulaId,
    "formula ID"
  );

  // ---------------------------------------------------
  // GET OLD FORMULA
  // ---------------------------------------------------

  const oldFormula =
    await Formula.findById(
      formulaId
    );

  if (!oldFormula) {
    throw new Error(
      "Formula not found."
    );
  }

  const productId =
    String(oldFormula.product);

  // ---------------------------------------------------
  // SAME CODE BY DEFAULT
  // ---------------------------------------------------

  const newCode =
    String(
      data.code ??
        oldFormula.code
    )
      .trim()
      .toUpperCase();

  if (!newCode) {
    throw new Error(
      "Formula code is required."
    );
  }

  // ---------------------------------------------------
  // NEXT VERSION
  //
  // SAME PRODUCT + SAME CODE
  // ---------------------------------------------------

  const nextVersion =
    await getNextVersion(
      productId,
      newCode
    );

  // ---------------------------------------------------
  // ITEMS
  // ---------------------------------------------------

  const sourceItems =
    data.items ??
    oldFormula.items.map(
      (item) => ({
        rawMaterial:
          String(
            item.rawMaterial
          ),

        appliesToProduct: item.appliesToProduct ? String(item.appliesToProduct) : undefined,

        quantity:
          item.quantity,

        unit:
          item.unit,

        wastePercentage:
          item.wastePercentage,

        notes:
          item.notes || "",
      })
    );

  // ---------------------------------------------------
  // COSTS
  // ---------------------------------------------------

  const laborCost =
    Number(
      data.laborCost ??
        oldFormula.laborCost ??
        0
    );

  const energyCost =
    Number(
      data.energyCost ??
        oldFormula.energyCost ??
        0
    );

  const otherCost =
    Number(
      data.otherCost ??
        oldFormula.otherCost ??
        0
    );

  if (
    !Number.isFinite(laborCost) ||
    laborCost < 0
  ) {
    throw new Error(
      "Invalid labor cost."
    );
  }

  if (
    !Number.isFinite(
      energyCost
    ) ||
    energyCost < 0
  ) {
    throw new Error(
      "Invalid energy cost."
    );
  }

  if (
    !Number.isFinite(
      otherCost
    ) ||
    otherCost < 0
  ) {
    throw new Error(
      "Invalid other cost."
    );
  }

  // ---------------------------------------------------
  // BATCH
  // ---------------------------------------------------

  const batchSize =
    Number(
      data.batchSize ??
        oldFormula.batchSize
    );

  const batchUnit =
    String(
      data.batchUnit ??
        oldFormula.batchUnit
    ).trim();

  if (
    !Number.isFinite(
      batchSize
    ) ||
    batchSize <= 0
  ) {
    throw new Error(
      "Batch size must be greater than 0."
    );
  }

  if (batchUnit.toLowerCase() !== "kg") {
    throw new Error(
      "Formula batch unit must be kg. CANA production calculations are weight-based."
    );
  }

  const sourceOutputs = data.outputs ?? (oldFormula.outputs || []).map((item: any) => ({
    product: String(item.product),
    quantity: Number(item.quantity),
    packSizeKg: Number(item.packSizeKg),
    packs: Number(item.packs),
  }));
  const preparedOutputs = await prepareFormulaOutputs(productId, batchSize, sourceOutputs);
  const synchronizedPackaging = await synchronizeFormulaPackaging({
    productId,
    batchSize,
    outputs: preparedOutputs,
    items: sourceItems,
  });
  const {
    preparedItems,
    estimatedMaterialCost,
  } = await prepareFormulaItems(synchronizedPackaging.items);
  validateFormulaItemTargets(preparedItems, preparedOutputs);
  const estimatedTotalCost =
    estimatedMaterialCost +
    laborCost +
    energyCost +
    otherCost;

  // ---------------------------------------------------
  // IMPORTANT:
  // DEACTIVATE OTHER ACTIVE FORMULAS
  // FOR THIS PRODUCT
  // ---------------------------------------------------

  const nextStatus = data.status ?? "Active";
  if (nextStatus === "Active") {
    await deactivateOtherActiveFormulas(
      productId
    );
  }

  // ---------------------------------------------------
  // CREATE NEW VERSION
  //
  // SAME CODE
  // NEW VERSION
  // ---------------------------------------------------

  const newFormula =
    await Formula.create({
      product:
        oldFormula.product,

      name:
        data.name?.trim() ||
        oldFormula.name,

      code: newCode,

      version: nextVersion,

      batchSize,

      batchUnit: "kg",

      outputs: preparedOutputs,

      items: preparedItems,

      laborCost,

      energyCost,

      otherCost,

      estimatedMaterialCost:
        Number(
          estimatedMaterialCost.toFixed(
            2
          )
        ),

      estimatedTotalCost:
        Number(
          estimatedTotalCost.toFixed(
            2
          )
        ),

      status: nextStatus,

      notes:
        data.notes !== undefined
          ? data.notes.trim()
          : oldFormula.notes || "",
    });

  return Formula.findById(
    newFormula._id
  )
    .populate(
      "product",
      "name code category unit packSizeKg"
    )
    .populate("outputs.product", "name code category unit packSizeKg")
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .populate("items.appliesToProduct", "name code packSizeKg");
}

// =====================================================
// GET ALL
// =====================================================

async function applyCurrentMaterialValuation(formulas: any[]) {
  const plain = formulas.map((formula) =>
    typeof formula?.toObject === "function" ? formula.toObject() : formula,
  );
  const setupCostByMaterial = new Map<string, number>();
  plain.forEach((formula) => {
    (formula.items || []).forEach((item: any) => {
      const id = String(item.rawMaterial?._id || item.rawMaterial);
      const setupCost = Number(item.rawMaterial?.costPerUnit || 0);
      if (mongoose.Types.ObjectId.isValid(id) && setupCost > 0) {
        setupCostByMaterial.set(id, setupCost);
      }
    });
  });
  const materialIds = [
    ...new Set(
      plain.flatMap((formula) =>
        (formula.items || []).map((item: any) =>
          String(item.rawMaterial?._id || item.rawMaterial),
        ),
      ),
    ),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const currentPrices = await resolveCurrentMaterialPrices(materialIds);
  const costByMaterial = new Map(
    [...currentPrices.entries()].map(([id, price]) => [id, Number(price.unitPrice || 0)]),
  );
  setupCostByMaterial.forEach((price, id) => {
    if (!costByMaterial.has(id) || Number(costByMaterial.get(id) || 0) <= 0) {
      costByMaterial.set(id, price);
    }
  });

  const resolveMaterialCost = (id: string, rawMaterial?: any) =>
    Number(
      costByMaterial.get(id) ||
        rawMaterial?.costPerUnit ||
        0,
    );

  return plain.map((formula) => {
    const items = (formula.items || []).map((item: any) => {
      const id = String(item.rawMaterial?._id || item.rawMaterial);
      const currentCost = resolveMaterialCost(id, item.rawMaterial);
      const currentPrice = currentPrices.get(id);
      return {
        ...item,
        rawMaterial:
          item.rawMaterial && typeof item.rawMaterial === "object"
            ? {
                ...item.rawMaterial,
                costPerUnit: currentCost,
                currentPurchasePrice: currentCost,
                currentPriceSource: currentPrice?.source,
                currentSupplier: currentPrice?.supplierName || "",
                currentPriceUpdatedAt: currentPrice?.offerUpdatedAt,
              }
            : item.rawMaterial,
      };
    });
    const estimatedMaterialCost = items.reduce((sum: number, item: any) => {
      const id = String(item.rawMaterial?._id || item.rawMaterial);
      const quantityWithWaste =
        Number(item.quantity || 0) *
        (1 + Number(item.wastePercentage || 0) / 100);
      return sum + quantityWithWaste * resolveMaterialCost(id, item.rawMaterial);
    }, 0);
    const unpricedMaterials = items
      .filter((item: any) => {
        const id = String(item.rawMaterial?._id || item.rawMaterial);
        return resolveMaterialCost(id, item.rawMaterial) <= 0;
      })
      .map((item: any) => item.rawMaterial?.name || "Raw material");
    return {
      ...formula,
      items,
      estimatedMaterialCost: Number(estimatedMaterialCost.toFixed(2)),
      estimatedTotalCost: Number(
        (
          estimatedMaterialCost +
          Number(formula.laborCost || 0) +
          Number(formula.energyCost || 0) +
          Number(formula.otherCost || 0)
        ).toFixed(2),
      ),
      costingBasis: "current_supplier_offer",
      costingComplete: unpricedMaterials.length === 0,
      unpricedMaterials,
    };
  });
}

export async function getFormulas() {
  const formulas = await Formula.find()
    .populate(
      "product",
      "name code category unit packSizeKg"
    )
    .populate("outputs.product", "name code category unit packSizeKg")
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .populate("items.appliesToProduct", "name code packSizeKg")
    .sort({
      createdAt: -1,
    });
  return applyCurrentMaterialValuation(formulas);
}

// =====================================================
// GET ONE
// =====================================================

export async function getFormulaById(
  id: string
) {
  validateObjectId(
    id,
    "formula ID"
  );

  const formula =
    await Formula.findById(id)
      .populate(
        "product",
        "name code category unit packSizeKg"
      )
      .populate("outputs.product", "name code category unit packSizeKg")
      .populate(
        "items.rawMaterial",
        "name code unit costPerUnit category"
      );
  if (formula) await formula.populate("items.appliesToProduct", "name code packSizeKg");

  if (!formula) {
    throw new Error(
      "Formula not found."
    );
  }

  return (await applyCurrentMaterialValuation([formula]))[0];
}

// =====================================================
// GET BY PRODUCT
// =====================================================

export async function getFormulasByProduct(
  productId: string
) {
  validateObjectId(
    productId,
    "product ID"
  );

  const product =
    await Product.findById(
      productId
    );

  if (!product) {
    throw new Error(
      "Product not found."
    );
  }

  const formulas = await Formula.find({
    product: productId,
  })
    .populate(
      "product",
      "name code category unit packSizeKg"
    )
    .populate("outputs.product", "name code category unit packSizeKg")
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .populate("items.appliesToProduct", "name code packSizeKg")
    .sort({
      version: -1,
      createdAt: -1,
    });
  return applyCurrentMaterialValuation(formulas);
}

// =====================================================
// GET ACTIVE
// =====================================================

export async function getActiveFormulaByProduct(
  productId: string
) {
  validateObjectId(
    productId,
    "product ID"
  );

  const product =
    await Product.findById(
      productId
    );

  if (!product) {
    throw new Error(
      "Product not found."
    );
  }

  const formula =
    await Formula.findOne({
      product: productId,
      status: "Active",
    })
      .sort({
        version: -1,
      })
      .populate(
        "product",
        "name code category unit packSizeKg"
      )
      .populate("outputs.product", "name code category unit packSizeKg")
      .populate(
        "items.rawMaterial",
        "name code unit costPerUnit category"
      )
      .populate("items.appliesToProduct", "name code packSizeKg");

  if (!formula) {
    throw new Error(
      "No active formula found for this product."
    );
  }

  return (await applyCurrentMaterialValuation([formula]))[0];
}

// =====================================================
// UPDATE EXISTING FORMULA
//
// VERSION CANNOT BE CHANGED HERE.
// Use Create New Version instead.
// =====================================================

export async function updateFormula(
  id: string,
  data: any
) {
  validateObjectId(
    id,
    "formula ID"
  );

  const formula =
    await Formula.findById(id);

  if (!formula) {
    throw new Error(
      "Formula not found."
    );
  }

  // ---------------------------------------------------
  // PRODUCT
  // ---------------------------------------------------

  const productId =
    data.product
      ? String(data.product)
      : String(formula.product);

  validateObjectId(
    productId,
    "product ID"
  );

  const product =
    await Product.findById(
      productId
    );

  if (!product) {
    throw new Error(
      "Product not found."
    );
  }

  // ---------------------------------------------------
  // VERSION
  // ---------------------------------------------------

  if (
    data.version !== undefined &&
    Number(data.version) !==
      formula.version
  ) {
    throw new Error(
      "Formula version cannot be changed directly. Create a new version instead."
    );
  }

  // ---------------------------------------------------
  // CODE
  // ---------------------------------------------------

  if (
    data.code !== undefined
  ) {
    const normalizedCode =
      String(data.code)
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
      throw new Error(
        "Formula code is required."
      );
    }

    // Same product + code + version
    // must be unique.
    const duplicate =
      await Formula.findOne({
        product: productId,
        code: normalizedCode,
        version:
          formula.version,
        _id: {
          $ne: id,
        },
      });

    if (duplicate) {
      throw new Error(
        `Formula ${normalizedCode} V${formula.version} already exists for this product.`
      );
    }

    data.code =
      normalizedCode;
  }

  // ---------------------------------------------------
  // ITEMS
  // ---------------------------------------------------

  if (
    data.items !== undefined
  ) {
    const {
      preparedItems,
      estimatedMaterialCost,
    } =
      await prepareFormulaItems(
        data.items
      );

    data.items =
      preparedItems;

    data.estimatedMaterialCost =
      Number(
        estimatedMaterialCost.toFixed(
          2
        )
      );

    const labor =
      Number(
        data.laborCost ??
          formula.laborCost ??
          0
      );

    const energy =
      Number(
        data.energyCost ??
          formula.energyCost ??
          0
      );

    const other =
      Number(
        data.otherCost ??
          formula.otherCost ??
          0
      );

    if (
      !Number.isFinite(labor) ||
      labor < 0
    ) {
      throw new Error(
        "Invalid labor cost."
      );
    }

    if (
      !Number.isFinite(
        energy
      ) ||
      energy < 0
    ) {
      throw new Error(
        "Invalid energy cost."
      );
    }

    if (
      !Number.isFinite(
        other
      ) ||
      other < 0
    ) {
      throw new Error(
        "Invalid other cost."
      );
    }

    data.laborCost =
      labor;

    data.energyCost =
      energy;

    data.otherCost =
      other;

    data.estimatedTotalCost =
      Number(
        (
          estimatedMaterialCost +
          labor +
          energy +
          other
        ).toFixed(2)
      );
  }

  // ---------------------------------------------------
  // BATCH SIZE
  // ---------------------------------------------------

  if (
    data.batchSize !==
    undefined
  ) {
    const batchSize =
      Number(
        data.batchSize
      );

    if (
      !Number.isFinite(
        batchSize
      ) ||
      batchSize <= 0
    ) {
      throw new Error(
        "Batch size must be greater than 0."
      );
    }

    data.batchSize =
      batchSize;
  }

  if (data.outputs !== undefined) {
    data.outputs = await prepareFormulaOutputs(
      productId,
      Number(data.batchSize ?? formula.batchSize),
      data.outputs,
    );
  } else if (data.batchSize !== undefined && formula.outputs?.length) {
    data.outputs = await prepareFormulaOutputs(
      productId,
      Number(data.batchSize),
      formula.outputs.map((item: any) => ({
        product: String(item.product),
        quantity: Number(item.quantity),
        packSizeKg: Number(item.packSizeKg),
        packs: Number(item.packs),
      })),
    );
  }
  if (
    data.items !== undefined ||
    data.batchSize !== undefined ||
    data.outputs !== undefined ||
    data.product !== undefined
  ) {
    const sourceItems = (data.items ?? formula.items).map((item: any) => ({
      rawMaterial: String(item.rawMaterial?._id || item.rawMaterial),
      ...(item.appliesToProduct
        ? { appliesToProduct: String(item.appliesToProduct?._id || item.appliesToProduct) }
        : {}),
      quantity: Number(item.quantity || 0),
      unit: item.unit,
      wastePercentage: Number(item.wastePercentage || 0),
      notes: item.notes || "",
    }));
    const effectiveBatchSize = Number(data.batchSize ?? formula.batchSize);
    const effectiveOutputs = data.outputs ?? formula.outputs;
    const synchronizedPackaging = await synchronizeFormulaPackaging({
      productId,
      batchSize: effectiveBatchSize,
      outputs: effectiveOutputs,
      items: sourceItems,
    });
    const prepared = await prepareFormulaItems(synchronizedPackaging.items);
    data.items = prepared.preparedItems;
    data.estimatedMaterialCost = Number(prepared.estimatedMaterialCost.toFixed(2));
    data.estimatedTotalCost = Number((
      prepared.estimatedMaterialCost +
      Number(data.laborCost ?? formula.laborCost ?? 0) +
      Number(data.energyCost ?? formula.energyCost ?? 0) +
      Number(data.otherCost ?? formula.otherCost ?? 0)
    ).toFixed(2));
  }
  validateFormulaItemTargets(
    data.items ?? formula.items,
    data.outputs ?? formula.outputs,
  );

  // ---------------------------------------------------
  // COSTS
  // ---------------------------------------------------

  if (
    data.laborCost !==
    undefined
  ) {
    data.laborCost =
      Number(
        data.laborCost
      );
  }

  if (
    data.energyCost !==
    undefined
  ) {
    data.energyCost =
      Number(
        data.energyCost
      );
  }

  if (
    data.otherCost !==
    undefined
  ) {
    data.otherCost =
      Number(
        data.otherCost
      );
  }

  // ---------------------------------------------------
  // PRODUCT
  // ---------------------------------------------------

  data.product =
    productId;

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  if (
    data.status === "Active"
  ) {
    await deactivateOtherActiveFormulas(
      productId,
      id
    );
  }

  // ---------------------------------------------------
  // UPDATE
  // ---------------------------------------------------

  Object.assign(
    formula,
    data
  );

  await formula.save();

  // Keep unissued batch recipes aligned with an edited formula. Once material
  // has been issued the consumption remains immutable for stock auditability.
  const draftConsumptions = await RawMaterialConsumption.find({
    formula: formula._id,
    status: "Draft",
  });

  if (draftConsumptions.length > 0) {
    const materialIds = formula.items.map((item: any) => item.rawMaterial);
    const materials = await RawMaterial.find({ _id: { $in: materialIds } })
      .select("name code unit")
      .lean();
    const outputProductIds = (formula.outputs || []).map((output: any) => output.product);
    const outputProducts = await Product.find({ _id: { $in: outputProductIds } })
      .select("name code sku packSizeKg")
      .lean();
    const materialById = new Map(
      materials.map((material: any) => [String(material._id), material]),
    );

    for (const consumption of draftConsumptions) {
      const batch = await ProductionBatch.findById(consumption.productionBatch)
        .select("plannedQuantity formulaSnapshot outputs");
      if (!batch) continue;

      const scale = Number(batch.plannedQuantity || 0) / Number(formula.batchSize || 1);
      const syncedItems = formula.items.map((formulaItem: any) => {
        const material = materialById.get(String(formulaItem.rawMaterial));
        if (!material) {
          throw new Error("A formula raw material could not be synchronized to its draft batch.");
        }
        const standardQuantity = Number(
          (
            Number(formulaItem.quantity || 0) *
            (1 + Number(formulaItem.wastePercentage || 0) / 100) *
            scale
          ).toFixed(4),
        );
        return {
          rawMaterial: material._id,
          rawMaterialName: material.name,
          rawMaterialCode: material.code,
          unit: material.unit || formulaItem.unit,
          standardQuantity,
          issuedQuantity: 0,
          actualQuantity: 0,
          wasteQuantity: 0,
          returnQuantity: 0,
          varianceQuantity: -standardQuantity,
          variancePercentage: standardQuantity > 0 ? -100 : 0,
          lotNumber: "",
          notes: formulaItem.notes || "",
        };
      });
      const totalStandardQuantity = syncedItems.reduce(
        (sum: number, item: any) => sum + Number(item.standardQuantity || 0),
        0,
      );
      consumption.items = syncedItems as any;
      consumption.totalStandardQuantity = Number(totalStandardQuantity.toFixed(4));
      consumption.totalIssuedQuantity = 0;
      consumption.totalActualQuantity = 0;
      consumption.totalWasteQuantity = 0;
      consumption.totalReturnQuantity = 0;
      consumption.totalVarianceQuantity = -Number(totalStandardQuantity.toFixed(4));
      await consumption.save();

      (batch as any).formulaSnapshot = formula.items.map((formulaItem: any) => {
        const material = materialById.get(String(formulaItem.rawMaterial));
        return {
          rawMaterial: formulaItem.rawMaterial,
          rawMaterialName: material?.name || "Raw material",
          rawMaterialCode: material?.code || "RM",
          ...(formulaItem.appliesToProduct ? { appliesToProduct: formulaItem.appliesToProduct } : {}),
          quantity: Number((Number(formulaItem.quantity || 0) * (1 + Number(formulaItem.wastePercentage || 0) / 100) * scale).toFixed(4)),
          unit: material?.unit || formulaItem.unit || "kg",
          wastePercentage: Number(formulaItem.wastePercentage || 0),
          notes: formulaItem.notes || "",
        };
      });
      (batch as any).outputs = (formula.outputs || []).map((formulaOutput: any) => {
        const outputProduct: any = outputProducts.find((item: any) => String(item._id) === String(formulaOutput.product));
        const quantity = Number((Number(formulaOutput.quantity || 0) * scale).toFixed(4));
        const packSizeKg = Number(formulaOutput.packSizeKg || outputProduct?.packSizeKg || 30);
        return {
          product: formulaOutput.product,
          productName: outputProduct?.name || "Finished product",
          productCode: outputProduct?.code || outputProduct?.sku || "",
          plannedQuantity: quantity,
          actualQuantity: 0,
          packSizeKg,
          plannedPacks: Number((quantity / packSizeKg).toFixed(4)),
          actualPacks: 0,
          allocatedCost: 0,
          costPerPack: 0,
        };
      });
      await batch.save();
    }
  }

  return Formula.findById(
    formula._id
  )
    .populate(
      "product",
      "name code category unit packSizeKg"
    )
    .populate("outputs.product", "name code category unit packSizeKg")
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .populate("items.appliesToProduct", "name code packSizeKg");
}

// =====================================================
// DEACTIVATE
// =====================================================

export async function deactivateFormula(
  id: string
) {
  validateObjectId(
    id,
    "formula ID"
  );

  const formula =
    await Formula.findById(id);

  if (!formula) {
    throw new Error(
      "Formula not found."
    );
  }

  formula.status =
    "Inactive";

  await formula.save();

  return Formula.findById(
    formula._id
  )
    .populate(
      "product",
      "name code category unit"
    )
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    );
}

// =====================================================
// DELETE
// =====================================================

export async function deleteFormula(
  id: string
) {
  validateObjectId(
    id,
    "formula ID"
  );

  const formula =
    await Formula.findById(id);

  if (!formula) {
    throw new Error(
      "Formula not found."
    );
  }

  await Formula.findByIdAndDelete(
    id
  );

  return {
    success: true,
    message:
      "Formula deleted successfully.",
  };
}
