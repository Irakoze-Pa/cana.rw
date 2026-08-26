import mongoose, {
  Types,
} from "mongoose";

import Inventory, {
  IInventory,
  InventoryStatus,
} from "./inventory.model";

import InventoryTransaction, {
  InventoryTransactionType,
  InventoryTransactionReferenceType,
  IInventoryTransaction,
} from "./inventoryTransaction.model";

import RawMaterial from "../raw-materials/rawMaterial.model";

// =========================================================
// TYPES
// =========================================================

export interface CreateInventoryData {
  rawMaterial: string;

  openingQuantity?: number;

  openingCostPerUnit?: number;

  notes?: string;

  performedBy?: string;
}

export interface AddStockData {
  rawMaterial: string;

  quantity: number;

  unitCost?: number;

  type?:
    | "Purchase"
    | "Production Return"
    | "Opening Balance";

  referenceType?: InventoryTransactionReferenceType;

  referenceId?: string;

  productionBatch?: string;

  productionOrder?: string;

  materialConsumption?: string;

  purchaseOrder?: string;

  reason?: string;

  notes?: string;

  performedBy?: string;
}

export interface RemoveStockData {
  rawMaterial: string;

  quantity: number;

  unitCost?: number;

  type?: "Production Issue";

  referenceType?: InventoryTransactionReferenceType;

  referenceId?: string;

  productionBatch?: string;

  productionOrder?: string;

  materialConsumption?: string;

  reason?: string;

  notes?: string;

  performedBy?: string;
}

export interface AdjustStockData {
  rawMaterial: string;

  newQuantity: number;

  unitCost?: number;

  reason: string;

  notes?: string;

  performedBy?: string;
}

export interface GetTransactionsOptions {
  rawMaterial?: string;

  inventory?: string;

  type?: InventoryTransactionType;

  startDate?: Date;

  endDate?: Date;

  limit?: number;

  skip?: number;
}

// =========================================================
// HELPERS
// =========================================================

const ensureObjectId = (
  value: string,
  fieldName: string
): Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(
      `Invalid ${fieldName}.`
    );
  }

  return new mongoose.Types.ObjectId(value);
};

const ensurePositiveQuantity = (
  quantity: number,
  fieldName = "Quantity"
) => {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      `${fieldName} must be greater than 0.`
    );
  }
};

const ensureNonNegativeQuantity = (
  quantity: number,
  fieldName = "Quantity"
) => {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      `${fieldName} must be greater than or equal to 0.`
    );
  }
};

const calculateAvailableQuantity = (
  quantity: number,
  reservedQuantity: number
) => {
  if (
    reservedQuantity < 0 ||
    reservedQuantity > quantity
  ) {
    throw new Error(
      "Reserved quantity cannot be greater than total quantity."
    );
  }

  return Math.max(
    0,
    quantity - reservedQuantity
  );
};

const getInventoryStatus = (
  quantity: number,
  minimumStock: number,
  active = true
): InventoryStatus => {
  if (!active) {
    return "Inactive";
  }

  if (quantity <= 0) {
    return "Out of Stock";
  }

  if (quantity <= minimumStock) {
    return "Low Stock";
  }

  return "Available";
};

const calculateTotalCost = (
  quantity: number,
  unitCost: number
) => {
  return Number(
    (quantity * unitCost).toFixed(2)
  );
};

// =========================================================
// GET RAW MATERIAL
// =========================================================

const getRawMaterialOrThrow = async (
  rawMaterialId: string
) => {
  const rawMaterialObjectId =
    ensureObjectId(
      rawMaterialId,
      "raw material ID"
    );

  const rawMaterial =
    await RawMaterial.findById(
      rawMaterialObjectId
    );

  if (!rawMaterial) {
    throw new Error(
      "Raw material not found."
    );
  }

  return rawMaterial;
};

// =========================================================
// CREATE INVENTORY
// =========================================================

export const createInventory =
  async (
    data: CreateInventoryData
  ): Promise<IInventory> => {
    const rawMaterial =
      await getRawMaterialOrThrow(
        data.rawMaterial
      );

    const existingInventory =
      await Inventory.findOne({
        rawMaterial: rawMaterial._id,
      });

    if (existingInventory) {
      throw new Error(
        "Inventory already exists for this raw material."
      );
    }

    const openingQuantity =
      data.openingQuantity ?? 0;

    const openingCostPerUnit =
      data.openingCostPerUnit ??
      rawMaterial.costPerUnit ??
      0;

    ensureNonNegativeQuantity(
      openingQuantity,
      "Opening quantity"
    );

    ensureNonNegativeQuantity(
      openingCostPerUnit,
      "Opening cost per unit"
    );

    const availableQuantity =
      openingQuantity;

    const status =
      getInventoryStatus(
        openingQuantity,
        rawMaterial.minimumStock ?? 0,
        rawMaterial.status === "Active"
      );

    const inventory =
      await Inventory.create({
        rawMaterial: rawMaterial._id,

        rawMaterialName:
          rawMaterial.name,

        rawMaterialCode:
          rawMaterial.code,

        unit:
          rawMaterial.unit,

        quantity:
          openingQuantity,

        reservedQuantity: 0,

        availableQuantity,

        minimumStock:
          rawMaterial.minimumStock ?? 0,

        averageCostPerUnit:
          openingCostPerUnit,

        status,

        lastTransactionAt:
          openingQuantity > 0
            ? new Date()
            : undefined,
      });

    // =====================================================
    // OPENING BALANCE TRANSACTION
    // =====================================================

    if (openingQuantity > 0) {
      await InventoryTransaction.create({
        inventory:
          inventory._id,

        rawMaterial:
          rawMaterial._id,

        rawMaterialName:
          rawMaterial.name,

        rawMaterialCode:
          rawMaterial.code,

        type: "Opening Balance",

        quantity:
          openingQuantity,

        unit:
          rawMaterial.unit,

        unitCost:
          openingCostPerUnit,

        totalCost:
          calculateTotalCost(
            openingQuantity,
            openingCostPerUnit
          ),

        quantityBefore: 0,

        quantityAfter:
          openingQuantity,

        referenceType:
          "OpeningBalance",

        referenceId:
          inventory._id,

        reason:
          "Initial inventory balance",

        notes:
          data.notes,

        performedBy:
          data.performedBy
            ? ensureObjectId(
                data.performedBy,
                "performed by ID"
              )
            : undefined,

        transactionDate:
          new Date(),
      });
    }

    return inventory;
  };

// =========================================================
// GET ALL INVENTORY
// =========================================================

export const getInventory =
  async (): Promise<IInventory[]> => {
    return Inventory.find()
      .populate(
        "rawMaterial",
        "name code category unit supplier minimumStock costPerUnit status"
      )
      .sort({
        rawMaterialName: 1,
      });
  };

// =========================================================
// GET INVENTORY BY ID
// =========================================================

export const getInventoryById =
  async (
    id: string
  ): Promise<IInventory> => {
    const inventoryId =
      ensureObjectId(
        id,
        "inventory ID"
      );

    const inventory =
      await Inventory.findById(
        inventoryId
      ).populate(
        "rawMaterial",
        "name code category unit supplier minimumStock costPerUnit status"
      );

    if (!inventory) {
      throw new Error(
        "Inventory not found."
      );
    }

    return inventory;
  };

// =========================================================
// GET INVENTORY BY RAW MATERIAL
// =========================================================

export const getInventoryByRawMaterial =
  async (
    rawMaterialId: string
  ): Promise<IInventory> => {
    const rawMaterialObjectId =
      ensureObjectId(
        rawMaterialId,
        "raw material ID"
      );

    const inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterialObjectId,
      }).populate(
        "rawMaterial",
        "name code category unit supplier minimumStock costPerUnit status"
      );

    if (!inventory) {
      throw new Error(
        "Inventory not found for this raw material."
      );
    }

    return inventory;
  };

// =========================================================
// GET INVENTORY SUMMARY
// =========================================================

export const getInventorySummary =
  async () => {
    const summary =
      await Inventory.aggregate([
        {
          $group: {
            _id: null,

            totalItems: {
              $sum: 1,
            },

            totalQuantity: {
              $sum: "$quantity",
            },

            totalReservedQuantity: {
              $sum: "$reservedQuantity",
            },

            totalAvailableQuantity: {
              $sum: "$availableQuantity",
            },

            totalInventoryValue: {
              $sum: {
                $multiply: [
                  "$quantity",
                  "$averageCostPerUnit",
                ],
              },
            },

            availableCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Available",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Low Stock",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            outOfStockCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Out of Stock",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,

            totalItems: 1,

            totalQuantity: 1,

            totalReservedQuantity: 1,

            totalAvailableQuantity: 1,

            totalInventoryValue: {
              $round: [
                "$totalInventoryValue",
                2,
              ],
            },

            availableCount: 1,

            lowStockCount: 1,

            outOfStockCount: 1,
          },
        },
      ]);

    return (
      summary[0] || {
        totalItems: 0,
        totalQuantity: 0,
        totalReservedQuantity: 0,
        totalAvailableQuantity: 0,
        totalInventoryValue: 0,
        availableCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      }
    );
  };

// =========================================================
// ADD STOCK
// =========================================================

export const addStock =
  async (
    data: AddStockData
  ): Promise<IInventory> => {
    ensurePositiveQuantity(
      data.quantity,
      "Stock quantity"
    );

    const rawMaterial =
      await getRawMaterialOrThrow(
        data.rawMaterial
      );

    const unitCost =
      data.unitCost ??
      rawMaterial.costPerUnit ??
      0;

    ensureNonNegativeQuantity(
      unitCost,
      "Unit cost"
    );

    let inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterial._id,
      });

    // =====================================================
    // CREATE INVENTORY IF IT DOES NOT EXIST
    // =====================================================

    if (!inventory) {
      inventory =
        await Inventory.create({
          rawMaterial:
            rawMaterial._id,

          rawMaterialName:
            rawMaterial.name,

          rawMaterialCode:
            rawMaterial.code,

          unit:
            rawMaterial.unit,

          quantity: 0,

          reservedQuantity: 0,

          availableQuantity: 0,

          minimumStock:
            rawMaterial.minimumStock ?? 0,

          averageCostPerUnit:
            unitCost,

          status:
            getInventoryStatus(
              0,
              rawMaterial.minimumStock ?? 0,
              rawMaterial.status === "Active"
            ),
        });
    }

    const quantityBefore =
      inventory.quantity;

    const quantityAfter =
      quantityBefore +
      data.quantity;

    const reservedQuantity =
      inventory.reservedQuantity;

    const availableQuantity =
      calculateAvailableQuantity(
        quantityAfter,
        reservedQuantity
      );

    // =====================================================
    // WEIGHTED AVERAGE COST
    // =====================================================

    const currentValue =
      quantityBefore *
      inventory.averageCostPerUnit;

    const incomingValue =
      data.quantity *
      unitCost;

    const totalQuantity =
      quantityBefore +
      data.quantity;

    const averageCostPerUnit =
      totalQuantity > 0
        ? Number(
            (
              (currentValue +
                incomingValue) /
              totalQuantity
            ).toFixed(4)
          )
        : unitCost;

    const status =
      getInventoryStatus(
        quantityAfter,
        inventory.minimumStock,
        rawMaterial.status === "Active"
      );

    inventory.quantity =
      quantityAfter;

    inventory.availableQuantity =
      availableQuantity;

    inventory.averageCostPerUnit =
      averageCostPerUnit;

    inventory.status =
      status;

    inventory.lastTransactionAt =
      new Date();

    await inventory.save();

    // =====================================================
    // TRANSACTION
    // =====================================================

    const transactionType =
      data.type ??
      "Purchase";

    await InventoryTransaction.create({
      inventory:
        inventory._id,

      rawMaterial:
        rawMaterial._id,

      rawMaterialName:
        rawMaterial.name,

      rawMaterialCode:
        rawMaterial.code,

      type:
        transactionType,

      quantity:
        data.quantity,

      unit:
        rawMaterial.unit,

      unitCost,

      totalCost:
        calculateTotalCost(
          data.quantity,
          unitCost
        ),

      quantityBefore,

      quantityAfter,

      referenceType:
        data.referenceType,

      referenceId:
        data.referenceId
          ? ensureObjectId(
              data.referenceId,
              "reference ID"
            )
          : undefined,

      productionBatch:
        data.productionBatch
          ? ensureObjectId(
              data.productionBatch,
              "production batch ID"
            )
          : undefined,

      productionOrder:
        data.productionOrder
          ? ensureObjectId(
              data.productionOrder,
              "production order ID"
            )
          : undefined,

      materialConsumption:
        data.materialConsumption
          ? ensureObjectId(
              data.materialConsumption,
              "material consumption ID"
            )
          : undefined,

      purchaseOrder:
        data.purchaseOrder
          ? ensureObjectId(
              data.purchaseOrder,
              "purchase order ID"
            )
          : undefined,

      reason:
        data.reason,

      notes:
        data.notes,

      performedBy:
        data.performedBy
          ? ensureObjectId(
              data.performedBy,
              "performed by ID"
            )
          : undefined,

      transactionDate:
        new Date(),
    });

    return inventory;
  };

// =========================================================
// REMOVE STOCK
// =========================================================

export const removeStock =
  async (
    data: RemoveStockData
  ): Promise<IInventory> => {
    ensurePositiveQuantity(
      data.quantity,
      "Stock quantity"
    );

    const rawMaterial =
      await getRawMaterialOrThrow(
        data.rawMaterial
      );

    const inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterial._id,
      });

    if (!inventory) {
      throw new Error(
        "Inventory not found for this raw material."
      );
    }

    const quantityBefore =
      inventory.quantity;

    const availableBefore =
      inventory.availableQuantity;

    // =====================================================
    // PROTECT RESERVED STOCK
    // =====================================================

    if (
      data.quantity >
      availableBefore
    ) {
      throw new Error(
        `Insufficient available stock. Available: ${availableBefore} ${inventory.unit}. Requested: ${data.quantity} ${inventory.unit}.`
      );
    }

    const quantityAfter =
      quantityBefore -
      data.quantity;

    const availableAfter =
      availableBefore -
      data.quantity;

    if (
      quantityAfter < 0 ||
      availableAfter < 0
    ) {
      throw new Error(
        "Stock cannot become negative."
      );
    }

    const status =
      getInventoryStatus(
        quantityAfter,
        inventory.minimumStock,
        rawMaterial.status === "Active"
      );

    // =====================================================
    // ATOMIC STOCK UPDATE
    // =====================================================

    const updatedInventory =
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,

          availableQuantity: {
            $gte: data.quantity,
          },
        },
        {
          $inc: {
            quantity:
              -data.quantity,

            availableQuantity:
              -data.quantity,
          },

          $set: {
            status,

            lastTransactionAt:
              new Date(),
          },
        },
        {
          returnDocument: "after",

          runValidators: true,
        }
      );

    if (!updatedInventory) {
      throw new Error(
        "Stock changed before the transaction was completed. Please try again."
      );
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    const unitCost =
      data.unitCost ??
      inventory.averageCostPerUnit;

    await InventoryTransaction.create({
      inventory:
        inventory._id,

      rawMaterial:
        rawMaterial._id,

      rawMaterialName:
        rawMaterial.name,

      rawMaterialCode:
        rawMaterial.code,

      type:
        data.type ??
        "Production Issue",

      quantity:
        data.quantity,

      unit:
        inventory.unit,

      unitCost,

      totalCost:
        calculateTotalCost(
          data.quantity,
          unitCost
        ),

      quantityBefore,

      quantityAfter,

      referenceType:
        data.referenceType,

      referenceId:
        data.referenceId
          ? ensureObjectId(
              data.referenceId,
              "reference ID"
            )
          : undefined,

      productionBatch:
        data.productionBatch
          ? ensureObjectId(
              data.productionBatch,
              "production batch ID"
            )
          : undefined,

      productionOrder:
        data.productionOrder
          ? ensureObjectId(
              data.productionOrder,
              "production order ID"
            )
          : undefined,

      materialConsumption:
        data.materialConsumption
          ? ensureObjectId(
              data.materialConsumption,
              "material consumption ID"
            )
          : undefined,

      reason:
        data.reason,

      notes:
        data.notes,

      performedBy:
        data.performedBy
          ? ensureObjectId(
              data.performedBy,
              "performed by ID"
            )
          : undefined,

      transactionDate:
        new Date(),
    });

    return updatedInventory;
  };

// =========================================================
// ADJUST STOCK
// =========================================================

export const adjustStock =
  async (
    data: AdjustStockData
  ): Promise<IInventory> => {
    ensureNonNegativeQuantity(
      data.newQuantity,
      "New quantity"
    );

    if (!data.reason?.trim()) {
      throw new Error(
        "Adjustment reason is required."
      );
    }

    const rawMaterial =
      await getRawMaterialOrThrow(
        data.rawMaterial
      );

    const inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterial._id,
      });

    if (!inventory) {
      throw new Error(
        "Inventory not found for this raw material."
      );
    }

    const quantityBefore =
      inventory.quantity;

    const quantityAfter =
      data.newQuantity;

    // =====================================================
    // RESERVED STOCK PROTECTION
    // =====================================================

    if (
      quantityAfter <
      inventory.reservedQuantity
    ) {
      throw new Error(
        `New quantity cannot be less than reserved quantity (${inventory.reservedQuantity} ${inventory.unit}).`
      );
    }

    const availableQuantity =
      calculateAvailableQuantity(
        quantityAfter,
        inventory.reservedQuantity
      );

    const unitCost =
      data.unitCost ??
      inventory.averageCostPerUnit;

    const status =
      getInventoryStatus(
        quantityAfter,
        inventory.minimumStock,
        rawMaterial.status === "Active"
      );

    inventory.quantity =
      quantityAfter;

    inventory.availableQuantity =
      availableQuantity;

    inventory.status =
      status;

    inventory.lastTransactionAt =
      new Date();

    if (
      data.unitCost !== undefined
    ) {
      ensureNonNegativeQuantity(
        data.unitCost,
        "Unit cost"
      );

      inventory.averageCostPerUnit =
        data.unitCost;
    }

    await inventory.save();

    // =====================================================
    // TRANSACTION
    // =====================================================

    const difference =
      quantityAfter -
      quantityBefore;

    await InventoryTransaction.create({
      inventory:
        inventory._id,

      rawMaterial:
        rawMaterial._id,

      rawMaterialName:
        rawMaterial.name,

      rawMaterialCode:
        rawMaterial.code,

      type:
        "Adjustment",

      quantity:
        Math.abs(difference),

      unit:
        inventory.unit,

      unitCost,

      totalCost:
        calculateTotalCost(
          Math.abs(difference),
          unitCost
        ),

      quantityBefore,

      quantityAfter,

      referenceType:
        "Manual",

      referenceId:
        inventory._id,

      reason:
        data.reason.trim(),

      notes:
        data.notes,

      performedBy:
        data.performedBy
          ? ensureObjectId(
              data.performedBy,
              "performed by ID"
            )
          : undefined,

      transactionDate:
        new Date(),
    });

    return inventory;
  };

// =========================================================
// GET TRANSACTION HISTORY
// =========================================================

export const getInventoryTransactions =
  async (
    options: GetTransactionsOptions = {}
  ): Promise<{
    transactions: IInventoryTransaction[];
    total: number;
  }> => {
    const filter: Record<
      string,
      unknown
    > = {};

    if (options.rawMaterial) {
      filter.rawMaterial =
        ensureObjectId(
          options.rawMaterial,
          "raw material ID"
        );
    }

    if (options.inventory) {
      filter.inventory =
        ensureObjectId(
          options.inventory,
          "inventory ID"
        );
    }

    if (options.type) {
      filter.type =
        options.type;
    }

    // =====================================================
    // DATE FILTER
    // =====================================================

    if (
      options.startDate ||
      options.endDate
    ) {
      const transactionDate: {
        $gte?: Date;
        $lte?: Date;
      } = {};

      if (options.startDate) {
        transactionDate.$gte =
          options.startDate;
      }

      if (options.endDate) {
        transactionDate.$lte =
          options.endDate;
      }

      filter.transactionDate =
        transactionDate;
    }

    const limit = Math.min(
      Math.max(
        options.limit ?? 50,
        1
      ),
      200
    );

    const skip = Math.max(
      options.skip ?? 0,
      0
    );

    const [
      transactions,
      total,
    ] = await Promise.all([
      InventoryTransaction.find(
        filter
      )
        .populate(
          "rawMaterial",
          "name code category unit"
        )
        .populate(
          "productionBatch",
          "batchNumber status"
        )
        .populate(
          "productionOrder",
          "orderNumber status"
        )
        .populate(
          "materialConsumption",
          "consumptionNo status"
        )
        .populate(
          "purchaseOrder",
          "orderNumber status"
        )
        .sort({
          transactionDate: -1,
        })
        .skip(skip)
        .limit(limit),

      InventoryTransaction.countDocuments(
        filter
      ),
    ]);

    return {
      transactions,
      total,
    };
  };

// =========================================================
// GET RECENT TRANSACTIONS
// =========================================================

export const getRecentTransactions =
  async (
    limit = 10
  ): Promise<
    IInventoryTransaction[]
  > => {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100
    );

    return InventoryTransaction.find()
      .populate(
        "rawMaterial",
        "name code category unit"
      )
      .populate(
        "productionBatch",
        "batchNumber status"
      )
      .populate(
        "productionOrder",
        "orderNumber status"
      )
      .populate(
        "materialConsumption",
        "consumptionNo status"
      )
      .populate(
        "purchaseOrder",
        "orderNumber status"
      )
      .sort({
        transactionDate: -1,
      })
      .limit(safeLimit);
  };

// =========================================================
// GET LOW STOCK
// =========================================================

export const getLowStockInventory =
  async (): Promise<IInventory[]> => {
    return Inventory.find({
      $expr: {
        $and: [
          {
            $gt: [
              "$quantity",
              0,
            ],
          },
          {
            $lte: [
              "$quantity",
              "$minimumStock",
            ],
          },
        ],
      },
    }).sort({
      quantity: 1,
    });
  };

// =========================================================
// GET OUT OF STOCK
// =========================================================

export const getOutOfStockInventory =
  async (): Promise<IInventory[]> => {
    return Inventory.find({
      quantity: {
        $lte: 0,
      },
    }).sort({
      rawMaterialName: 1,
    });
  };

// =========================================================
// RESERVE STOCK
// =========================================================

export const reserveStock =
  async (
    rawMaterialId: string,
    quantity: number
  ): Promise<IInventory> => {
    ensurePositiveQuantity(
      quantity,
      "Reservation quantity"
    );

    const rawMaterial =
      await getRawMaterialOrThrow(
        rawMaterialId
      );

    const inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterial._id,
      });

    if (!inventory) {
      throw new Error(
        "Inventory not found for this raw material."
      );
    }

    if (
      quantity >
      inventory.availableQuantity
    ) {
      throw new Error(
        `Insufficient available stock for reservation. Available: ${inventory.availableQuantity} ${inventory.unit}.`
      );
    }

    const updatedInventory =
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,

          availableQuantity: {
            $gte: quantity,
          },
        },
        {
          $inc: {
            reservedQuantity:
              quantity,

            availableQuantity:
              -quantity,
          },
        },
        {
          returnDocument: "after",

          runValidators: true,
        }
      );

    if (!updatedInventory) {
      throw new Error(
        "Stock changed before reservation was completed. Please try again."
      );
    }

    return updatedInventory;
  };

// =========================================================
// RELEASE RESERVED STOCK
// =========================================================

export const releaseReservedStock =
  async (
    rawMaterialId: string,
    quantity: number
  ): Promise<IInventory> => {
    ensurePositiveQuantity(
      quantity,
      "Release quantity"
    );

    const rawMaterial =
      await getRawMaterialOrThrow(
        rawMaterialId
      );

    const inventory =
      await Inventory.findOne({
        rawMaterial:
          rawMaterial._id,
      });

    if (!inventory) {
      throw new Error(
        "Inventory not found for this raw material."
      );
    }

    if (
      quantity >
      inventory.reservedQuantity
    ) {
      throw new Error(
        `Cannot release ${quantity} ${inventory.unit}. Reserved quantity is only ${inventory.reservedQuantity} ${inventory.unit}.`
      );
    }

    const updatedInventory =
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,

          reservedQuantity: {
            $gte: quantity,
          },
        },
        {
          $inc: {
            reservedQuantity:
              -quantity,

            availableQuantity:
              quantity,
          },
        },
        {
          returnDocument: "after",

          runValidators: true,
        }
      );

    if (!updatedInventory) {
      throw new Error(
        "Reservation changed before release was completed. Please try again."
      );
    }

    return updatedInventory;
  };

// =========================================================
// EXPORT DEFAULT
// =========================================================

const inventoryService = {
  createInventory,

  getInventory,

  getInventoryById,

  getInventoryByRawMaterial,

  getInventorySummary,

  addStock,

  removeStock,

  adjustStock,

  getInventoryTransactions,

  getRecentTransactions,

  getLowStockInventory,

  getOutOfStockInventory,

  reserveStock,

  releaseReservedStock,
};

export default inventoryService;