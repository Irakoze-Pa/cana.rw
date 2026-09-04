import RawMaterial from "./rawMaterial.model";
import { createInventory } from "../inventory/inventory.service";
import Inventory from "../inventory/inventory.model";
import InventoryTransaction from "../inventory/inventoryTransaction.model";
import RawMaterialLot from "./rawMaterialLot.model";
import SupplierMaterial from "./supplierMaterial.model";
import Formula from "../formula/formula.model";
import RawMaterialConsumption from "../production/materialConsumption/materialConsumption.model";

export interface CreateRawMaterialData {
  name: string;
  code?: string;
  category: string;
  unit: string;

  quantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;

  minimumStock?: number;

  costPerUnit: number;

  supplier?: string;

  status?: "Active" | "Inactive";
}

export interface UpdateRawMaterialData {
  name?: string;
  code?: string;
  category?: string;
  unit?: string;

  quantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;

  minimumStock?: number;

  costPerUnit?: number;

  supplier?: string;

  status?: "Active" | "Inactive";
}

/**
 * =========================================================
 * HELPER
 * =========================================================
 *
 * Calculates the quantity that is actually available.
 *
 * availableQuantity =
 * quantity - reservedQuantity
 *
 * Example:
 *
 * quantity         = 500
 * reservedQuantity = 100
 * available        = 400
 */
const calculateAvailableQuantity = (
  quantity: number,
  reservedQuantity: number
) => {
  if (reservedQuantity > quantity) {
    throw new Error(
      "Reserved quantity cannot be greater than current quantity"
    );
  }

  return Math.max(
    0,
    quantity - reservedQuantity
  );
};

/** Repairs legacy balances so the material master always obeys: available = current - reserved. */
const reconcileAvailableQuantities = async () => {
  await RawMaterial.updateMany({}, [
    {
      $set: {
        availableQuantity: {
          $max: [0, { $subtract: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$reservedQuantity", 0] }] }],
        },
      },
    },
  ], { updatePipeline: true });
};

/**
 * =========================================================
 * CREATE RAW MATERIAL
 * =========================================================
 */
export const createRawMaterial = async (
  data: CreateRawMaterialData
) => {
  const requestedCode = data.code?.trim().toUpperCase();
  const year = new Date().getFullYear();
  const existingCodes = await RawMaterial.find({ code: new RegExp(`^RM-${year}-\\d+$`) }).select("code").lean();
  const nextSequence = existingCodes.reduce((highest, material) => {
    const sequence = Number(String(material.code).split("-").pop());
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0) + 1;
  const code = requestedCode || `RM-${year}-${String(nextSequence).padStart(5, "0")}`;

  /**
   * Check duplicate material code
   */
  const existingMaterial =
    await RawMaterial.findOne({
      code,
    });

  if (existingMaterial) {
    throw new Error(
      "Raw material code already exists"
    );
  }

  /**
   * Normalize quantity
   */
  const quantity =
    Number(data.quantity ?? 0);

  /**
   * Normalize reserved quantity
   */
  const reservedQuantity =
    Number(
      data.reservedQuantity ?? 0
    );

  /**
   * Validate quantities
   */
  if (quantity < 0) {
    throw new Error(
      "Quantity cannot be negative"
    );
  }

  if (reservedQuantity < 0) {
    throw new Error(
      "Reserved quantity cannot be negative"
    );
  }

  /**
   * Calculate available quantity
   */
  const availableQuantity =
    calculateAvailableQuantity(
      quantity,
      reservedQuantity
    );

  /**
   * Create raw material
   */
  const rawMaterial =
    await RawMaterial.create({
      name: data.name.trim(),

      code,

      category:
        data.category.trim(),

      unit: data.unit.trim(),

      quantity,

      reservedQuantity,

      availableQuantity,

      minimumStock:
        Number(
          data.minimumStock ?? 0
        ),

      costPerUnit:
        Number(data.costPerUnit),

      ...(data.supplier ? { supplier: data.supplier } : {}),

      status:
        data.status ?? "Active",
    });

  // Every new material receives a ledger record. Its opening quantity is
  // posted as an auditable opening-balance transaction instead of becoming an
  // orphaned stock number in master data.
  await createInventory({
    rawMaterial: rawMaterial._id.toString(),
    openingQuantity: quantity,
    openingCostPerUnit: Number(data.costPerUnit),
    notes: "Opening balance created with raw material master data.",
  });

  /**
   * Return populated material
   */
  return await RawMaterial.findById(
    rawMaterial._id
  ).populate(
    "supplier",
    "name code"
  );
};

/**
 * =========================================================
 * GET ALL RAW MATERIALS
 * =========================================================
 */
export const getRawMaterials =
  async () => {
    await reconcileAvailableQuantities();
    return await RawMaterial.find()
      .populate(
        "supplier",
        "name code"
      )
      .sort({
        createdAt: -1,
      });
  };

/**
 * =========================================================
 * GET RAW MATERIAL BY ID
 * =========================================================
 */
export const getRawMaterialById =
  async (id: string) => {
    await reconcileAvailableQuantities();
    return await RawMaterial.findById(
      id
    ).populate(
      "supplier",
      "name code"
    );
  };

/**
 * =========================================================
 * UPDATE RAW MATERIAL
 * =========================================================
 */
export const updateRawMaterial =
  async (
    id: string,
    data: UpdateRawMaterialData
  ) => {
    /**
     * Find existing material first.
     */
    const existingRawMaterial =
      await RawMaterial.findById(id);

    if (!existingRawMaterial) {
      throw new Error(
        "Raw material not found"
      );
    }

    if (data.quantity !== undefined) {
      const inventory = await Inventory.findOne({ rawMaterial: existingRawMaterial._id });
      if (inventory) {
        throw new Error("Stock is controlled by Inventory. Use a stock adjustment or goods receipt instead of editing quantity here.");
      }
    }

    /**
     * Normalize code
     */
    if (data.code) {
      data.code =
        data.code
          .trim()
          .toUpperCase();

      /**
       * Check duplicate code
       */
      const existingMaterial =
        await RawMaterial.findOne({
          code: data.code,
          _id: {
            $ne: id,
          },
        });

      if (existingMaterial) {
        throw new Error(
          "Raw material code already exists"
        );
      }
    }

    /**
     * Determine final quantity.
     *
     * If quantity is not included in update,
     * keep existing quantity.
     */
    const quantity =
      data.quantity !== undefined
        ? Number(data.quantity)
        : existingRawMaterial.quantity;

    /**
     * Determine final reserved quantity.
     */
    const reservedQuantity =
      data.reservedQuantity !==
      undefined
        ? Number(
            data.reservedQuantity
          )
        : existingRawMaterial.reservedQuantity;

    /**
     * Validate quantity
     */
    if (quantity < 0) {
      throw new Error(
        "Quantity cannot be negative"
      );
    }

    /**
     * Validate reserved quantity
     */
    if (reservedQuantity < 0) {
      throw new Error(
        "Reserved quantity cannot be negative"
      );
    }

    /**
     * Calculate available quantity
     */
    const availableQuantity =
      calculateAvailableQuantity(
        quantity,
        reservedQuantity
      );

    /**
     * Build update object.
     */
    const updateData: Record<
      string,
      unknown
    > = {
      ...data,

      quantity,

      reservedQuantity,

      availableQuantity,
    };

    /**
     * Normalize common string fields.
     */
    if (data.name !== undefined) {
      updateData.name =
        data.name.trim();
    }

    if (
      data.category !== undefined
    ) {
      updateData.category =
        data.category.trim();
    }

    if (data.unit !== undefined) {
      updateData.unit =
        data.unit.trim();
    }

    /**
     * Update material.
     */
    const updatedRawMaterial = await RawMaterial.findByIdAndUpdate(
      id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate(
      "supplier",
      "name code"
    );

    // Keep the operational inventory snapshot aligned when a material is
    // renamed, reactivated, or its unit/minimum level changes in setup.
    // Quantity itself continues to be controlled only by inventory movements.
    if (updatedRawMaterial) {
      const inventory = await Inventory.findOne({
        rawMaterial: updatedRawMaterial._id,
      });
      if (inventory) {
        const quantity = Number(inventory.quantity || 0);
        const minimumStock = Number(updatedRawMaterial.minimumStock || 0);
        const status =
          updatedRawMaterial.status !== "Active"
            ? "Inactive"
            : quantity <= 0
              ? "Out of Stock"
              : quantity <= minimumStock
                ? "Low Stock"
                : "Available";
        await Inventory.updateOne(
          { _id: inventory._id },
          {
            $set: {
              rawMaterialName: updatedRawMaterial.name,
              rawMaterialCode: updatedRawMaterial.code,
              unit: updatedRawMaterial.unit,
              minimumStock,
              status,
            },
          }
        );
      }
    }

    return updatedRawMaterial;
  };

/**
 * =========================================================
 * DELETE RAW MATERIAL
 * =========================================================
 */
export const deleteRawMaterial =
  async (id: string, purgeTestData = false) => {
    const rawMaterial =
      await RawMaterial.findById(
        id
      );

    if (!rawMaterial) {
      throw new Error(
        "Raw material not found"
      );
    }

    const [formulaUsage, consumptionUsage] =
      await Promise.all([
        Formula.exists({ "items.rawMaterial": rawMaterial._id }),
        RawMaterialConsumption.exists({ "items.rawMaterial": rawMaterial._id }),
      ]);

    if (formulaUsage || consumptionUsage) {
      throw new Error(
        "This raw material is used by a formula or production consumption and must be retained for traceability. Archive it instead."
      );
    }

    if (!purgeTestData) {
      const [inventory, lotCount, offerCount, transactionCount] = await Promise.all([
        Inventory.exists({ rawMaterial: rawMaterial._id }),
        RawMaterialLot.countDocuments({ rawMaterial: rawMaterial._id }),
        SupplierMaterial.countDocuments({ rawMaterial: rawMaterial._id }),
        InventoryTransaction.countDocuments({ rawMaterial: rawMaterial._id }),
      ]);

      if (rawMaterial.quantity > 0 || rawMaterial.reservedQuantity > 0 || inventory || lotCount || offerCount || transactionCount) {
        throw new Error(
          "This raw material has stock or linked setup records. Use the explicit test-data purge option only for unused setup records."
        );
      }
    } else {
      await Promise.all([
        RawMaterialLot.deleteMany({ rawMaterial: rawMaterial._id }),
        SupplierMaterial.deleteMany({ rawMaterial: rawMaterial._id }),
        InventoryTransaction.deleteMany({ rawMaterial: rawMaterial._id }),
        Inventory.deleteMany({ rawMaterial: rawMaterial._id }),
      ]);
    }

    if (rawMaterial.reservedQuantity > 0 && !purgeTestData) {
      throw new Error(
        "Cannot delete a raw material with reserved stock."
      );
    }

    return await RawMaterial.findByIdAndDelete(
      id
    );
  };
