import mongoose from "mongoose";

import Formula from "./formula.model";
import Product from "../product/product.model";
import RawMaterial from "../raw-materials/rawMaterial.model";

// =====================================================
// TYPES
// =====================================================

interface FormulaItemInput {
  rawMaterial: string;
  quantity: number;
  unit?: string;
  wastePercentage?: number;
  notes?: string;
}

interface CreateFormulaData {
  product: string;
  name: string;
  code: string;
  version?: number;
  batchSize: number;
  batchUnit: string;
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

  const rawMaterials =
    await RawMaterial.find({
      _id: {
        $in: rawMaterialIds,
      },
    });

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
        Number(
          rawMaterial.costPerUnit || 0
        );

      estimatedMaterialCost +=
        materialCost;

      return {
        rawMaterial:
          rawMaterial._id,

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

  const {
    preparedItems,
    estimatedMaterialCost,
  } =
    await prepareFormulaItems(items);

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
      "name code category unit"
    )
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

  const {
    preparedItems,
    estimatedMaterialCost,
  } =
    await prepareFormulaItems(
      sourceItems
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

  const estimatedTotalCost =
    estimatedMaterialCost +
    laborCost +
    energyCost +
    otherCost;

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

  // ---------------------------------------------------
  // IMPORTANT:
  // DEACTIVATE OTHER ACTIVE FORMULAS
  // FOR THIS PRODUCT
  // ---------------------------------------------------

  await deactivateOtherActiveFormulas(
    productId
  );

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

      status:
        data.status ??
        "Active",

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
      "name code category unit"
    )
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    );
}

// =====================================================
// GET ALL
// =====================================================

export async function getFormulas() {
  return Formula.find()
    .populate(
      "product",
      "name code category unit"
    )
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .sort({
      createdAt: -1,
    });
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
        "name code category unit"
      )
      .populate(
        "items.rawMaterial",
        "name code unit costPerUnit category"
      );

  if (!formula) {
    throw new Error(
      "Formula not found."
    );
  }

  return formula;
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

  return Formula.find({
    product: productId,
  })
    .populate(
      "product",
      "name code category unit"
    )
    .populate(
      "items.rawMaterial",
      "name code unit costPerUnit category"
    )
    .sort({
      version: -1,
      createdAt: -1,
    });
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
        "name code category unit"
      )
      .populate(
        "items.rawMaterial",
        "name code unit costPerUnit category"
      );

  if (!formula) {
    throw new Error(
      "No active formula found for this product."
    );
  }

  return formula;
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
