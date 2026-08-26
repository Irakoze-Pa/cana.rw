import mongoose from "mongoose";

import RawMaterialConsumption from "./materialConsumption.model";

import type {
  IMaterialConsumptionItem,
  MaterialConsumptionStatus,
} from "./materialConsumption.model";

import ProductionOrder from "../productionOrder/productionOrder.model";
import ProductionBatch from "../productionBatch/productionBatch.model";

import Inventory from "../../inventory/inventory.model";
import InventoryTransaction from "../../inventory/inventoryTransaction.model";

// =====================================================
// TYPES
// =====================================================

interface CreateMaterialConsumptionInput {
  productionOrder: string;
  productionBatch: string;
  notes?: string;
}

interface MaterialConsumptionItemUpdate {
  actualQuantity?: number;
  wasteQuantity?: number;
  lotNumber?: string;
  notes?: string;
}

interface UpdateMaterialConsumptionInput {
  items?: MaterialConsumptionItemUpdate[];
  notes?: string;
}

interface IssueMaterialConsumptionItemInput {
  rawMaterial: string;
  issuedQuantity?: number;
  lotNumber?: string;
  notes?: string;
}

interface IssueMaterialConsumptionInput {
  issuedBy?: string;
  items?: IssueMaterialConsumptionItemInput[];
  notes?: string;
}

interface ReturnMaterialConsumptionItemInput {
  rawMaterial: string;
  returnQuantity: number;
  notes?: string;
}

interface ReturnMaterialConsumptionInput {
  returnedBy?: string;
  items: ReturnMaterialConsumptionItemInput[];
  notes?: string;
}

interface CompleteMaterialConsumptionInput {
  completedBy?: string;
  notes?: string;
}

type MaterialConsumptionItemData =
  IMaterialConsumptionItem;

// =====================================================
// CONSTANTS
// =====================================================

const QUANTITY_TOLERANCE = 0.000001;

// =====================================================
// OBJECT ID
// =====================================================

const toObjectId = (
  id: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId => {
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }

  return new mongoose.Types.ObjectId(id);
};

// =====================================================
// NUMBER
// =====================================================

const toNumber = (
  value: unknown,
  fallback = 0
): number => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

// =====================================================
// ROUND
// =====================================================

const roundNumber = (
  value: number,
  decimals = 6
): number => {
  const factor = Math.pow(10, decimals);

  return Math.round(value * factor) / factor;
};

// =====================================================
// ITEMS
// =====================================================

const getConsumptionItems = (
  items: unknown
): IMaterialConsumptionItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items as IMaterialConsumptionItem[];
};

// =====================================================
// GENERATE CONSUMPTION NUMBER
// =====================================================

const generateConsumptionNo =
  async (): Promise<string> => {
    const year = new Date().getFullYear();

    const prefix = `MC-${year}-`;

    const latest =
      await RawMaterialConsumption.findOne({
        consumptionNo: {
          $regex: `^${prefix}`,
        },
      })
        .sort({
          consumptionNo: -1,
        })
        .lean();

    let nextNumber = 1;

    if (latest?.consumptionNo) {
      const currentNumber = Number(
        latest.consumptionNo.replace(
          prefix,
          ""
        )
      );

      if (Number.isFinite(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  };

// =====================================================
// VALIDATE NON NEGATIVE
// =====================================================

const validateNonNegativeQuantity = (
  name: string,
  value: number
) => {
  if (!Number.isFinite(value)) {
    throw new Error(
      `${name} must be a valid number.`
    );
  }

  if (value < 0) {
    throw new Error(
      `${name} cannot be negative.`
    );
  }
};

// =====================================================
// VALIDATE POSITIVE
// =====================================================

const validatePositiveQuantity = (
  name: string,
  value: number
) => {
  if (!Number.isFinite(value)) {
    throw new Error(
      `${name} must be a valid number.`
    );
  }

  if (value <= 0) {
    throw new Error(
      `${name} must be greater than zero.`
    );
  }
};

// =====================================================
// VALIDATE RECONCILIATION
// =====================================================

const validateReconciliation = (
  item: MaterialConsumptionItemData,
  requireComplete = false
) => {
  const issued = roundNumber(
    toNumber(item.issuedQuantity)
  );

  const actual = roundNumber(
    toNumber(item.actualQuantity)
  );

  const waste = roundNumber(
    toNumber(item.wasteQuantity)
  );

  const returned = roundNumber(
    toNumber(item.returnQuantity)
  );

  validateNonNegativeQuantity(
    `${item.rawMaterialName} issued quantity`,
    issued
  );

  validateNonNegativeQuantity(
    `${item.rawMaterialName} actual quantity`,
    actual
  );

  validateNonNegativeQuantity(
    `${item.rawMaterialName} waste quantity`,
    waste
  );

  validateNonNegativeQuantity(
    `${item.rawMaterialName} return quantity`,
    returned
  );

  const accounted = roundNumber(
    actual +
      waste +
      returned
  );

  const remaining = roundNumber(
    issued -
      accounted
  );

  if (
    accounted >
    issued + QUANTITY_TOLERANCE
  ) {
    throw new Error(
      `${item.rawMaterialName}: Actual (${actual}) + Waste (${waste}) + Return (${returned}) cannot exceed Issued (${issued}).`
    );
  }

  if (
    requireComplete &&
    Math.abs(remaining) >
      QUANTITY_TOLERANCE
  ) {
    throw new Error(
      `${item.rawMaterialName}: ${remaining} ${item.unit} is still unaccounted for.`
    );
  }

  return {
    issued,
    actual,
    waste,
    returned,
    accounted,
    remaining,
  };
};

// =====================================================
// CALCULATE LINE
// =====================================================

const calculateLine = (
  item: MaterialConsumptionItemData
): MaterialConsumptionItemData => {
  const standard = roundNumber(
    toNumber(item.standardQuantity)
  );

  const issued = roundNumber(
    toNumber(item.issuedQuantity)
  );

  const actual = roundNumber(
    toNumber(item.actualQuantity)
  );

  const waste = roundNumber(
    toNumber(item.wasteQuantity)
  );

  const returned = roundNumber(
    toNumber(item.returnQuantity)
  );

  const varianceQuantity =
    roundNumber(
      actual - standard
    );

  const variancePercentage =
    standard > 0
      ? roundNumber(
          (varianceQuantity / standard) *
            100
        )
      : 0;

  return {
    rawMaterial:
      item.rawMaterial,

    rawMaterialName:
      item.rawMaterialName,

    rawMaterialCode:
      item.rawMaterialCode,

    unit:
      item.unit,

    standardQuantity:
      standard,

    issuedQuantity:
      issued,

    actualQuantity:
      actual,

    wasteQuantity:
      waste,

    returnQuantity:
      returned,

    varianceQuantity,

    variancePercentage,

    lotNumber:
      item.lotNumber?.trim() ?? "",

    notes:
      item.notes?.trim() ?? "",
  };
};

// =====================================================
// CALCULATE TOTALS
// =====================================================

const calculateTotals = (
  items: MaterialConsumptionItemData[]
) => {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalStandardQuantity +=
        toNumber(item.standardQuantity);

      acc.totalIssuedQuantity +=
        toNumber(item.issuedQuantity);

      acc.totalActualQuantity +=
        toNumber(item.actualQuantity);

      acc.totalWasteQuantity +=
        toNumber(item.wasteQuantity);

      acc.totalReturnQuantity +=
        toNumber(item.returnQuantity);

      acc.totalVarianceQuantity +=
        toNumber(item.varianceQuantity);

      return acc;
    },
    {
      totalStandardQuantity: 0,
      totalIssuedQuantity: 0,
      totalActualQuantity: 0,
      totalWasteQuantity: 0,
      totalReturnQuantity: 0,
      totalVarianceQuantity: 0,
    }
  );

  return {
    totalStandardQuantity:
      roundNumber(
        totals.totalStandardQuantity
      ),

    totalIssuedQuantity:
      roundNumber(
        totals.totalIssuedQuantity
      ),

    totalActualQuantity:
      roundNumber(
        totals.totalActualQuantity
      ),

    totalWasteQuantity:
      roundNumber(
        totals.totalWasteQuantity
      ),

    totalReturnQuantity:
      roundNumber(
        totals.totalReturnQuantity
      ),

    totalVarianceQuantity:
      roundNumber(
        totals.totalVarianceQuantity
      ),
  };
};

// =====================================================
// BUILD STANDARD MATERIALS
// =====================================================

const buildConsumptionItems = (
  orderItems: Array<{
    rawMaterial: mongoose.Types.ObjectId;
    rawMaterialName: string;
    rawMaterialCode: string;
    quantity: number;
    unit: string;
    wastePercentage: number;
    requiredQuantity: number;
    estimatedCost: number;
    actualQuantity: number;
    variance: number;
    notes?: string;
  }>,
  orderQuantity: number,
  batchPlannedQuantity: number
): MaterialConsumptionItemData[] => {
  const productionOrderQuantity =
    toNumber(orderQuantity);

  const batchQuantity =
    toNumber(batchPlannedQuantity);

  if (
    productionOrderQuantity <= 0
  ) {
    throw new Error(
      "Production Order quantity must be greater than zero."
    );
  }

  if (
    batchQuantity <= 0
  ) {
    throw new Error(
      "Production Batch planned quantity must be greater than zero."
    );
  }

  if (
    !orderItems?.length
  ) {
    throw new Error(
      "Production Order has no raw material requirements."
    );
  }

  if (
    batchQuantity >
    productionOrderQuantity
  ) {
    throw new Error(
      "Production Batch planned quantity cannot exceed Production Order quantity."
    );
  }

  const scalingFactor =
    batchQuantity /
    productionOrderQuantity;

  return orderItems.map(
    (item, index) => {
      if (!item.rawMaterial) {
        throw new Error(
          `Raw material is missing at item ${index + 1}.`
        );
      }

      const requiredQuantity =
        toNumber(
          item.requiredQuantity
        );

      if (
        requiredQuantity < 0
      ) {
        throw new Error(
          `${item.rawMaterialName}: required quantity cannot be negative.`
        );
      }

      const standardQuantity =
        roundNumber(
          requiredQuantity *
            scalingFactor
        );

      return {
        rawMaterial:
          item.rawMaterial,

        rawMaterialName:
          item.rawMaterialName,

        rawMaterialCode:
          item.rawMaterialCode,

        unit:
          item.unit,

        standardQuantity,

        issuedQuantity: 0,

        actualQuantity: 0,

        wasteQuantity: 0,

        returnQuantity: 0,

        varianceQuantity:
          roundNumber(
            -standardQuantity
          ),

        variancePercentage:
          standardQuantity > 0
            ? -100
            : 0,

        lotNumber: "",

        notes: "",
      };
    }
  );
};

// =====================================================
// DETERMINE STATUS
// =====================================================

const determineConsumptionStatus = (
  items: MaterialConsumptionItemData[]
): MaterialConsumptionStatus => {
  const hasIssued =
    items.some(
      (item) =>
        toNumber(
          item.issuedQuantity
        ) > QUANTITY_TOLERANCE
    );

  if (!hasIssued) {
    return "Draft";
  }

  const hasActivity =
    items.some(
      (item) =>
        toNumber(
          item.actualQuantity
        ) > QUANTITY_TOLERANCE ||
        toNumber(
          item.wasteQuantity
        ) > QUANTITY_TOLERANCE ||
        toNumber(
          item.returnQuantity
        ) > QUANTITY_TOLERANCE
    );

  if (!hasActivity) {
    return "Issued";
  }

  return "Partially Consumed";
};

// =====================================================
// POPULATE HELPER
// =====================================================

const populateConsumption = (
  id: mongoose.Types.ObjectId
) => {
  return RawMaterialConsumption.findById(id)
    .populate(
      "productionOrder",
      "productionOrderNo quantity unit status product productName productCode formula formulaName formulaCode formulaVersion"
    )
    .populate(
      "productionBatch",
      "batchNo batchNumber plannedQuantity actualQuantity unit status product productName productCode formula formulaName formulaCode formulaVersion"
    )
    .populate(
      "product",
      "name code"
    )
    .populate(
      "formula",
      "name code version"
    )
    .populate(
      "items.rawMaterial",
      "name code unit"
    )
    .lean();
};

// =====================================================
// CREATE MATERIAL CONSUMPTION
// =====================================================

export const createMaterialConsumption =
  async (
    input: CreateMaterialConsumptionInput
  ) => {
    if (
      !input.productionOrder ||
      !input.productionBatch
    ) {
      throw new Error(
        "Production Order and Production Batch are required."
      );
    }

    const productionOrderId =
      toObjectId(
        input.productionOrder
      );

    const productionBatchId =
      toObjectId(
        input.productionBatch
      );

    const order =
      await ProductionOrder.findById(
        productionOrderId
      );

    if (!order) {
      throw new Error(
        "Production Order not found."
      );
    }

    const batch =
      await ProductionBatch.findById(
        productionBatchId
      );

    if (!batch) {
      throw new Error(
        "Production Batch not found."
      );
    }

    // =================================================
    // OWNERSHIP
    // =================================================

    if (
      batch.productionOrder.toString() !==
      order._id.toString()
    ) {
      throw new Error(
        "Production Batch does not belong to the selected Production Order."
      );
    }

    // =================================================
    // ONLY IN PROGRESS
    // =================================================

    if (
      batch.status !==
      "In Progress"
    ) {
      throw new Error(
        `Material Consumption can only be created for an In Progress Production Batch. Current status: ${batch.status}.`
      );
    }

    // =================================================
    // QUANTITIES
    // =================================================

    const orderQuantity =
      toNumber(
        order.quantity
      );

    const batchPlannedQuantity =
      toNumber(
        batch.plannedQuantity
      );

    if (
      orderQuantity <= 0
    ) {
      throw new Error(
        "Production Order quantity must be greater than zero."
      );
    }

    if (
      batchPlannedQuantity <= 0
    ) {
      throw new Error(
        "Production Batch planned quantity must be greater than zero."
      );
    }

    if (
      batchPlannedQuantity >
      orderQuantity
    ) {
      throw new Error(
        "Production Batch planned quantity cannot exceed Production Order quantity."
      );
    }

    // =================================================
    // EXISTING CONSUMPTION
    // =================================================

    const existing =
      await RawMaterialConsumption.findOne({
        productionBatch:
          productionBatchId,

        status: {
          $ne: "Cancelled",
        },
      });

    if (existing) {
      throw new Error(
        "Material Consumption already exists for this Production Batch."
      );
    }

    // =================================================
    // BUILD ITEMS
    // =================================================

    const items =
      buildConsumptionItems(
        order.items,
        orderQuantity,
        batchPlannedQuantity
      );

    // =================================================
    // NUMBER
    // =================================================

    const consumptionNo =
      await generateConsumptionNo();

    // =================================================
    // TOTALS
    // =================================================

    const totals =
      calculateTotals(items);

    // =================================================
    // CREATE
    // =================================================

    const consumption =
      new RawMaterialConsumption({
        consumptionNo,

        productionOrder:
          order._id,

        productionBatch:
          batch._id,

        product:
          batch.product,

        productName:
          batch.productName,

        productCode:
          batch.productCode,

        formula:
          batch.formula,

        formulaName:
          batch.formulaName,

        formulaVersion:
          String(
            batch.formulaVersion ??
              ""
          ),

        batchNumber:
          batch.batchNumber ??
          batch.batchNo,

        status:
          "Draft",

        items,

        ...totals,

        notes:
          input.notes?.trim() ??
          "",
      });

    await consumption.save();

    return populateConsumption(
      consumption._id
    );
  };

// =====================================================
// ISSUE MATERIALS
// =====================================================

export const issueMaterialConsumption =
  async (
    id: string,
    input: IssueMaterialConsumptionInput = {}
  ) => {
    const session =
      await mongoose.startSession();

    try {
      let result:
        | unknown
        | null = null;

      await session.withTransaction(
        async () => {
          const consumption =
            await RawMaterialConsumption.findById(
              toObjectId(id)
            ).session(session);

          if (!consumption) {
            throw new Error(
              "Material Consumption not found."
            );
          }

          if (
            consumption.status !==
            "Draft"
          ) {
            throw new Error(
              `Only Draft Material Consumption can be issued. Current status: ${consumption.status}.`
            );
          }

          const batch =
            await ProductionBatch.findById(
              consumption.productionBatch
            ).session(session);

          if (!batch) {
            throw new Error(
              "Production Batch not found."
            );
          }

          if (
            batch.status !==
            "In Progress"
          ) {
            throw new Error(
              `Materials can only be issued for an In Progress Production Batch. Current status: ${batch.status}.`
            );
          }

          const order =
            await ProductionOrder.findById(
              consumption.productionOrder
            ).session(session);

          if (!order) {
            throw new Error(
              "Production Order not found."
            );
          }

          if (
            batch.productionOrder.toString() !==
            order._id.toString()
          ) {
            throw new Error(
              "Production Batch does not belong to the Production Order."
            );
          }

          const existingItems =
            getConsumptionItems(
              consumption.items
            );

          if (
            existingItems.length ===
            0
          ) {
            throw new Error(
              "Material Consumption has no raw materials to issue."
            );
          }

          // =================================================
          // REQUEST MAP
          // =================================================

          const issueMap =
            new Map<
              string,
              IssueMaterialConsumptionItemInput
            >();

          if (input.items) {
            for (
              const requestedItem of input.items
            ) {
              if (
                !requestedItem.rawMaterial
              ) {
                throw new Error(
                  "Each issue item must contain a rawMaterial."
                );
              }

              const rawMaterialId =
                toObjectId(
                  requestedItem.rawMaterial
                ).toString();

              if (
                issueMap.has(
                  rawMaterialId
                )
              ) {
                throw new Error(
                  `Duplicate raw material in issue request: ${rawMaterialId}.`
                );
              }

              issueMap.set(
                rawMaterialId,
                requestedItem
              );
            }
          }

          // =================================================
          // VALIDATE UNKNOWN ITEMS
          // =================================================

          for (
            const requestedItem of issueMap.values()
          ) {
            const exists =
              existingItems.some(
                (item) =>
                  item.rawMaterial.toString() ===
                  toObjectId(
                    requestedItem.rawMaterial
                  ).toString()
              );

            if (!exists) {
              throw new Error(
                `Raw material ${requestedItem.rawMaterial} does not belong to this Material Consumption.`
              );
            }
          }

          // =================================================
          // PREPARE
          // =================================================

          const issueItems =
            existingItems.map(
              (item) => {
                const requested =
                  issueMap.get(
                    item.rawMaterial.toString()
                  );

                const requestedQuantity =
                  requested?.issuedQuantity !==
                  undefined
                    ? toNumber(
                        requested.issuedQuantity
                      )
                    : toNumber(
                        item.standardQuantity
                      );

                validatePositiveQuantity(
                  `${item.rawMaterialName} issued quantity`,
                  requestedQuantity
                );

                if (
                  toNumber(
                    item.issuedQuantity
                  ) > QUANTITY_TOLERANCE
                ) {
                  throw new Error(
                    `${item.rawMaterialName} has already been issued.`
                  );
                }

                return {
                  item,

                  issuedQuantity:
                    roundNumber(
                      requestedQuantity
                    ),

                  lotNumber:
                    requested?.lotNumber?.trim() ||
                    item.lotNumber ||
                    "",

                  notes:
                    requested?.notes?.trim() ||
                    item.notes ||
                    "",
                };
              }
            );

          // =================================================
          // INVENTORY
          // =================================================

          for (
            const prepared of issueItems
          ) {
            const item =
              prepared.item;

            const quantity =
              prepared.issuedQuantity;

            const inventory =
              await Inventory.findOne({
                rawMaterial:
                  item.rawMaterial,
              }).session(session);

            if (!inventory) {
              throw new Error(
                `Inventory record not found for ${item.rawMaterialName} (${item.rawMaterialCode}).`
              );
            }

            if (
              inventory.unit
                .trim()
                .toLowerCase() !==
              item.unit
                .trim()
                .toLowerCase()
            ) {
              throw new Error(
                `Unit mismatch for ${item.rawMaterialName}: Inventory uses ${inventory.unit}, but Consumption uses ${item.unit}.`
              );
            }

            const available =
              roundNumber(
                toNumber(
                  inventory.availableQuantity
                )
              );

            if (
              available <
              quantity -
                QUANTITY_TOLERANCE
            ) {
              throw new Error(
                `Insufficient stock for ${item.rawMaterialName}. Required: ${quantity} ${item.unit}, Available: ${available} ${inventory.unit}.`
              );
            }

            const quantityBefore =
              available;

            const quantityAfter =
              roundNumber(
                available -
                  quantity
              );

            const newStatus =
              quantityAfter <=
              QUANTITY_TOLERANCE
                ? "Out of Stock"
                : quantityAfter <=
                  toNumber(
                    inventory.minimumStock
                  )
                ? "Low Stock"
                : "Available";

            const updatedInventory =
              await Inventory.findOneAndUpdate(
                {
                  _id:
                    inventory._id,

                  availableQuantity: {
                    $gte:
                      quantity,
                  },
                },
                {
                  $inc: {
                    quantity:
                      -quantity,

                    availableQuantity:
                      -quantity,
                  },

                  $set: {
                    status:
                      newStatus,

                    lastTransactionAt:
                      new Date(),
                  },
                },
                {
                  new: true,
                  session,
                  runValidators:
                    true,
                }
              );

            if (!updatedInventory) {
              throw new Error(
                `Inventory changed while issuing ${item.rawMaterialName}. Please retry the operation.`
              );
            }

            await InventoryTransaction.create(
              [
                {
                  inventory:
                    inventory._id,

                  rawMaterial:
                    item.rawMaterial,

                  rawMaterialName:
                    item.rawMaterialName,

                  rawMaterialCode:
                    item.rawMaterialCode,

                  type:
                    "Production Issue",

                  quantity,

                  unit:
                    item.unit,

                  unitCost:
                    toNumber(
                      inventory.averageCostPerUnit
                    ),

                  totalCost:
                    roundNumber(
                      quantity *
                        toNumber(
                          inventory.averageCostPerUnit
                        )
                    ),

                  quantityBefore,

                  quantityAfter,

                  referenceType:
                    "MaterialConsumption",

                  referenceId:
                    consumption._id,

                  productionBatch:
                    consumption.productionBatch,

                  productionOrder:
                    consumption.productionOrder,

                  materialConsumption:
                    consumption._id,

                  performedBy:
                    input.issuedBy
                      ? toObjectId(
                          input.issuedBy
                        )
                      : undefined,

                  reason:
                    "Raw material issued for production.",

                  notes:
                    prepared.notes ||
                    input.notes?.trim() ||
                    undefined,

                  transactionDate:
                    new Date(),
                },
              ],
              {
                session,
              }
            );
          }

          // =================================================
          // UPDATE ITEMS
          // =================================================

          const updatedItems =
            existingItems.map(
              (item) => {
                const prepared =
                  issueItems.find(
                    (entry) =>
                      entry.item.rawMaterial.toString() ===
                      item.rawMaterial.toString()
                  );

                if (!prepared) {
                  throw new Error(
                    `Could not prepare issue quantity for ${item.rawMaterialName}.`
                  );
                }

                return calculateLine({
                  rawMaterial:
                    item.rawMaterial,

                  rawMaterialName:
                    item.rawMaterialName,

                  rawMaterialCode:
                    item.rawMaterialCode,

                  unit:
                    item.unit,

                  standardQuantity:
                    item.standardQuantity,

                  issuedQuantity:
                    prepared.issuedQuantity,

                  actualQuantity:
                    0,

                  wasteQuantity:
                    0,

                  returnQuantity:
                    0,

                  varianceQuantity:
                    0,

                  variancePercentage:
                    0,

                  lotNumber:
                    prepared.lotNumber,

                  notes:
                    prepared.notes,
                });
              }
            );

          consumption.items =
            updatedItems;

          const totals =
            calculateTotals(
              updatedItems
            );

          consumption.totalStandardQuantity =
            totals.totalStandardQuantity;

          consumption.totalIssuedQuantity =
            totals.totalIssuedQuantity;

          consumption.totalActualQuantity =
            totals.totalActualQuantity;

          consumption.totalWasteQuantity =
            totals.totalWasteQuantity;

          consumption.totalReturnQuantity =
            totals.totalReturnQuantity;

          consumption.totalVarianceQuantity =
            totals.totalVarianceQuantity;

          consumption.status =
            "Issued";

          consumption.issuedAt =
            new Date();

          if (
            input.issuedBy
          ) {
            consumption.issuedBy =
              toObjectId(
                input.issuedBy
              );
          }

          if (
            input.notes !==
            undefined
          ) {
            consumption.notes =
              input.notes.trim();
          }

          await consumption.save({
            session,
          });

          result =
            await RawMaterialConsumption.findById(
              consumption._id
            )
              .session(session)
              .populate(
                "productionOrder"
              )
              .populate(
                "productionBatch"
              )
              .populate(
                "product"
              )
              .populate(
                "formula"
              )
              .populate(
                "items.rawMaterial"
              )
              .lean();
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

// =====================================================
// GET ALL
// =====================================================

export const getMaterialConsumptions =
  async (
    filters?: {
      status?: MaterialConsumptionStatus;
      productionOrder?: string;
      productionBatch?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const page =
      Math.max(
        Number(
          filters?.page ?? 1
        ),
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            filters?.limit ?? 20
          ),
          1
        ),
        100
      );

    const skip =
      (page - 1) *
      limit;

    const query: Record<
      string,
      unknown
    > = {};

    if (
      filters?.status
    ) {
      query.status =
        filters.status;
    }

    if (
      filters?.productionOrder
    ) {
      query.productionOrder =
        toObjectId(
          filters.productionOrder
        );
    }

    if (
      filters?.productionBatch
    ) {
      query.productionBatch =
        toObjectId(
          filters.productionBatch
        );
    }

    if (
      filters?.search?.trim()
    ) {
      const search =
        filters.search.trim();

      query.$or = [
        {
          consumptionNo: {
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          productName: {
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          productCode: {
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          formulaName: {
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          batchNumber: {
            $regex:
              search,
            $options:
              "i",
          },
        },
      ];
    }

    const [
      data,
      total,
    ] = await Promise.all([
      RawMaterialConsumption.find(
        query
      )
        .populate(
          "productionOrder",
          "productionOrderNo quantity unit status product productName productCode formula formulaName formulaCode formulaVersion"
        )
        .populate(
          "productionBatch",
          "batchNo batchNumber plannedQuantity actualQuantity unit status"
        )
        .populate(
          "product",
          "name code"
        )
        .populate(
          "formula",
          "name code version"
        )
        .populate(
          "items.rawMaterial",
          "name code unit"
        )
        .sort({
          createdAt:
            -1,
        })
        .skip(
          skip
        )
        .limit(
          limit
        )
        .lean(),

      RawMaterialConsumption.countDocuments(
        query
      ),
    ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,

        pages:
          Math.ceil(
            total /
              limit
          ),
      },
    };
  };

// =====================================================
// GET BY ID
// =====================================================

export const getMaterialConsumptionById =
  async (
    id: string
  ) => {
    const consumption =
      await populateConsumption(
        toObjectId(id)
      );

    if (!consumption) {
      throw new Error(
        "Material Consumption not found."
      );
    }

    return consumption;
  };

// =====================================================
// GET BY BATCH
// =====================================================

/**
 * IMPORTANT:
 *
 * We do NOT filter by batch.status.
 *
 * This allows a Completed Production Batch
 * to still display its Material Consumption
 * for reconciliation/history.
 *
 * But CREATE is still restricted to In Progress.
 */
export const getMaterialConsumptionByBatch =
  async (
    productionBatchId: string
  ) => {
    if (
      !productionBatchId
    ) {
      throw new Error(
        "Production Batch ID is required."
      );
    }

    return RawMaterialConsumption.findOne({
      productionBatch:
        toObjectId(
          productionBatchId
        ),

      status: {
        $ne:
          "Cancelled",
      },
    })
      .populate(
        "productionOrder"
      )
      .populate(
        "productionBatch"
      )
      .populate(
        "product"
      )
      .populate(
        "formula"
      )
      .populate(
        "items.rawMaterial"
      )
      .lean();
  };

// =====================================================
// UPDATE MATERIAL CONSUMPTION
// =====================================================

/**
 * GENERIC PATCH
 *
 * Allowed:
 *   - actualQuantity
 *   - wasteQuantity
 *   - lotNumber
 *   - notes
 *
 * Protected:
 *   - standardQuantity
 *   - issuedQuantity
 *   - returnQuantity
 *   - varianceQuantity
 *   - variancePercentage
 *   - status
 *
 * Inventory must NEVER be changed here.
 */
export const updateMaterialConsumption =
  async (
    id: string,
    input: UpdateMaterialConsumptionInput
  ) => {
    const consumption =
      await RawMaterialConsumption.findById(
        toObjectId(id)
      );

    if (!consumption) {
      throw new Error(
        "Material Consumption not found."
      );
    }

    if (
      consumption.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cancelled Material Consumption cannot be updated."
      );
    }

    if (
      consumption.status ===
      "Consumed"
    ) {
      throw new Error(
        "Consumed Material Consumption is locked and cannot be edited."
      );
    }

    if (
      input.items
    ) {
      const existingItems =
        getConsumptionItems(
          consumption.items
        );

      if (
        input.items.length !==
        existingItems.length
      ) {
        throw new Error(
          "Material item structure cannot be changed after creation."
        );
      }

      const updatedItems =
        existingItems.map(
          (
            existingItem,
            index
          ) => {
            const incoming =
              input.items?.[index];

            const issued =
              roundNumber(
                toNumber(
                  existingItem.issuedQuantity
                )
              );

            const actual =
              incoming?.actualQuantity !==
              undefined
                ? roundNumber(
                    toNumber(
                      incoming.actualQuantity
                    )
                  )
                : roundNumber(
                    toNumber(
                      existingItem.actualQuantity
                    )
                  );

            const waste =
              incoming?.wasteQuantity !==
              undefined
                ? roundNumber(
                    toNumber(
                      incoming.wasteQuantity
                    )
                  )
                : roundNumber(
                    toNumber(
                      existingItem.wasteQuantity
                    )
                  );

            const returned =
              roundNumber(
                toNumber(
                  existingItem.returnQuantity
                )
              );

            validateNonNegativeQuantity(
              `${existingItem.rawMaterialName} actual quantity`,
              actual
            );

            validateNonNegativeQuantity(
              `${existingItem.rawMaterialName} waste quantity`,
              waste
            );

            validateNonNegativeQuantity(
              `${existingItem.rawMaterialName} return quantity`,
              returned
            );

            const accounted =
              roundNumber(
                actual +
                  waste +
                  returned
              );

            if (
              accounted >
              issued +
                QUANTITY_TOLERANCE
            ) {
              throw new Error(
                `${existingItem.rawMaterialName}: Actual (${actual}) + Waste (${waste}) + Return (${returned}) cannot exceed Issued (${issued}).`
              );
            }

            // No actual/waste can be recorded
            // before material has been issued.
            if (
              issued <=
                QUANTITY_TOLERANCE &&
              accounted >
                QUANTITY_TOLERANCE
            ) {
              throw new Error(
                `${existingItem.rawMaterialName}: Materials must be issued before actual usage or waste can be recorded.`
              );
            }

            const lotNumber =
              incoming?.lotNumber !==
              undefined
                ? incoming.lotNumber.trim()
                : existingItem.lotNumber ??
                  "";

            const notes =
              incoming?.notes !==
              undefined
                ? incoming.notes.trim()
                : existingItem.notes ??
                  "";

            return calculateLine({
              rawMaterial:
                existingItem.rawMaterial,

              rawMaterialName:
                existingItem.rawMaterialName,

              rawMaterialCode:
                existingItem.rawMaterialCode,

              unit:
                existingItem.unit,

              standardQuantity:
                existingItem.standardQuantity,

              issuedQuantity:
                issued,

              actualQuantity:
                actual,

              wasteQuantity:
                waste,

              returnQuantity:
                returned,

              varianceQuantity:
                0,

              variancePercentage:
                0,

              lotNumber,

              notes,
            });
          }
        );

      consumption.items =
        updatedItems;

      const totals =
        calculateTotals(
          updatedItems
        );

      consumption.totalStandardQuantity =
        totals.totalStandardQuantity;

      consumption.totalIssuedQuantity =
        totals.totalIssuedQuantity;

      consumption.totalActualQuantity =
        totals.totalActualQuantity;

      consumption.totalWasteQuantity =
        totals.totalWasteQuantity;

      consumption.totalReturnQuantity =
        totals.totalReturnQuantity;

      consumption.totalVarianceQuantity =
        totals.totalVarianceQuantity;

      consumption.status =
        determineConsumptionStatus(
          updatedItems
        );
    }

    if (
      input.notes !==
      undefined
    ) {
      consumption.notes =
        input.notes.trim();
    }

    await consumption.save();

    return populateConsumption(
      consumption._id
    );
  };

// =====================================================
// RETURN MATERIALS
// =====================================================

export const returnMaterialConsumption =
  async (
    id: string,
    input: ReturnMaterialConsumptionInput
  ) => {
    if (
      !input.items ||
      input.items.length ===
      0
    ) {
      throw new Error(
        "At least one material return item is required."
      );
    }

    const session =
      await mongoose.startSession();

    try {
      let result:
        | unknown
        | null = null;

      await session.withTransaction(
        async () => {
          const consumption =
            await RawMaterialConsumption.findById(
              toObjectId(id)
            ).session(session);

          if (!consumption) {
            throw new Error(
              "Material Consumption not found."
            );
          }

          if (
            consumption.status ===
            "Cancelled"
          ) {
            throw new Error(
              "Cancelled Material Consumption cannot receive returns."
            );
          }

          if (
            consumption.status ===
            "Consumed"
          ) {
            throw new Error(
              "Consumed Material Consumption is locked."
            );
          }

          const existingItems =
            getConsumptionItems(
              consumption.items
            );

          if (
            existingItems.length ===
            0
          ) {
            throw new Error(
              "Material Consumption has no raw material items."
            );
          }

          // =================================================
          // REQUEST MAP
          // =================================================

          const returnMap =
            new Map<
              string,
              ReturnMaterialConsumptionItemInput
            >();

          for (
            const requestedItem of input.items
          ) {
            if (
              !requestedItem.rawMaterial
            ) {
              throw new Error(
                "Each return item must contain a rawMaterial."
              );
            }

            const rawMaterialId =
              toObjectId(
                requestedItem.rawMaterial
              ).toString();

            if (
              returnMap.has(
                rawMaterialId
              )
            ) {
              throw new Error(
                `Duplicate raw material in return request: ${rawMaterialId}.`
              );
            }

            const quantity =
              toNumber(
                requestedItem.returnQuantity
              );

            validatePositiveQuantity(
              `${rawMaterialId} return quantity`,
              quantity
            );

            returnMap.set(
              rawMaterialId,
              {
                ...requestedItem,

                returnQuantity:
                  roundNumber(
                    quantity
                  ),
              }
            );
          }

          // =================================================
          // VALIDATE MATERIALS
          // =================================================

          for (
            const requestedItem of returnMap.values()
          ) {
            const exists =
              existingItems.some(
                (item) =>
                  item.rawMaterial.toString() ===
                  toObjectId(
                    requestedItem.rawMaterial
                  ).toString()
              );

            if (!exists) {
              throw new Error(
                `Raw material ${requestedItem.rawMaterial} does not belong to this Material Consumption.`
              );
            }
          }

          // =================================================
          // UPDATE ITEMS
          // =================================================

          const updatedItems =
            existingItems.map(
              (item) => {
                const requested =
                  returnMap.get(
                    item.rawMaterial.toString()
                  );

                if (!requested) {
                  return calculateLine(
                    item
                  );
                }

                const issued =
                  roundNumber(
                    toNumber(
                      item.issuedQuantity
                    )
                  );

                const actual =
                  roundNumber(
                    toNumber(
                      item.actualQuantity
                    )
                  );

                const waste =
                  roundNumber(
                    toNumber(
                      item.wasteQuantity
                    )
                  );

                const existingReturn =
                  roundNumber(
                    toNumber(
                      item.returnQuantity
                    )
                  );

                const newReturn =
                  roundNumber(
                    toNumber(
                      requested.returnQuantity
                    )
                  );

                if (
                  issued <=
                  QUANTITY_TOLERANCE
                ) {
                  throw new Error(
                    `${item.rawMaterialName}: Material must be issued before it can be returned.`
                  );
                }

                const remaining =
                  roundNumber(
                    issued -
                      actual -
                      waste -
                      existingReturn
                  );

                if (
                  newReturn >
                  remaining +
                    QUANTITY_TOLERANCE
                ) {
                  throw new Error(
                    `${item.rawMaterialName}: Return quantity (${newReturn}) cannot exceed remaining unaccounted quantity (${remaining} ${item.unit}).`
                  );
                }

                return calculateLine({
                  rawMaterial:
                    item.rawMaterial,

                  rawMaterialName:
                    item.rawMaterialName,

                  rawMaterialCode:
                    item.rawMaterialCode,

                  unit:
                    item.unit,

                  standardQuantity:
                    item.standardQuantity,

                  issuedQuantity:
                    issued,

                  actualQuantity:
                    actual,

                  wasteQuantity:
                    waste,

                  returnQuantity:
                    roundNumber(
                      existingReturn +
                        newReturn
                    ),

                  varianceQuantity:
                    0,

                  variancePercentage:
                    0,

                  lotNumber:
                    item.lotNumber,

                  notes:
                    requested.notes?.trim() ||
                    item.notes ||
                    "",
                });
              }
            );

          // =================================================
          // INVENTORY RETURN
          // =================================================

          for (
            const requested of returnMap.values()
          ) {
            const item =
              existingItems.find(
                (existingItem) =>
                  existingItem.rawMaterial.toString() ===
                  toObjectId(
                    requested.rawMaterial
                  ).toString()
              );

            if (!item) {
              throw new Error(
                "Return material item not found."
              );
            }

            const quantity =
              roundNumber(
                toNumber(
                  requested.returnQuantity
                )
              );

            const inventory =
              await Inventory.findOne({
                rawMaterial:
                  item.rawMaterial,
              }).session(session);

            if (!inventory) {
              throw new Error(
                `Inventory record not found for ${item.rawMaterialName} (${item.rawMaterialCode}).`
              );
            }

            if (
              inventory.unit
                .trim()
                .toLowerCase() !==
              item.unit
                .trim()
                .toLowerCase()
            ) {
              throw new Error(
                `Unit mismatch for ${item.rawMaterialName}: Inventory uses ${inventory.unit}, but Consumption uses ${item.unit}.`
              );
            }

            const quantityBefore =
              roundNumber(
                toNumber(
                  inventory.quantity
                )
              );

            const availableBefore =
              roundNumber(
                toNumber(
                  inventory.availableQuantity
                )
              );

            const quantityAfter =
              roundNumber(
                quantityBefore +
                  quantity
              );

            const availableAfter =
              roundNumber(
                availableBefore +
                  quantity
              );

            const newStatus =
              availableAfter <=
              QUANTITY_TOLERANCE
                ? "Out of Stock"
                : availableAfter <=
                  toNumber(
                    inventory.minimumStock
                  )
                ? "Low Stock"
                : "Available";

            const updatedInventory =
              await Inventory.findOneAndUpdate(
                {
                  _id:
                    inventory._id,
                },
                {
                  $inc: {
                    quantity:
                      quantity,

                    availableQuantity:
                      quantity,
                  },

                  $set: {
                    status:
                      newStatus,

                    lastTransactionAt:
                      new Date(),
                  },
                },
                {
                  new: true,
                  session,
                  runValidators:
                    true,
                }
              );

            if (!updatedInventory) {
              throw new Error(
                `Could not update inventory for ${item.rawMaterialName}.`
              );
            }

            await InventoryTransaction.create(
              [
                {
                  inventory:
                    inventory._id,

                  rawMaterial:
                    item.rawMaterial,

                  rawMaterialName:
                    item.rawMaterialName,

                  rawMaterialCode:
                    item.rawMaterialCode,

                  type:
                    "Production Return",

                  quantity,

                  unit:
                    item.unit,

                  unitCost:
                    toNumber(
                      inventory.averageCostPerUnit
                    ),

                  totalCost:
                    roundNumber(
                      quantity *
                        toNumber(
                          inventory.averageCostPerUnit
                        )
                    ),

                  quantityBefore,

                  quantityAfter,

                  referenceType:
                    "MaterialConsumption",

                  referenceId:
                    consumption._id,

                  productionBatch:
                    consumption.productionBatch,

                  productionOrder:
                    consumption.productionOrder,

                  materialConsumption:
                    consumption._id,

                  performedBy:
                    input.returnedBy
                      ? toObjectId(
                          input.returnedBy
                        )
                      : undefined,

                  reason:
                    "Unused raw material returned from production.",

                  notes:
                    requested.notes?.trim() ||
                    input.notes?.trim() ||
                    undefined,

                  transactionDate:
                    new Date(),
                },
              ],
              {
                session,
              }
            );
          }

          // =================================================
          // SAVE CONSUMPTION
          // =================================================

          consumption.items =
            updatedItems;

          const totals =
            calculateTotals(
              updatedItems
            );

          consumption.totalStandardQuantity =
            totals.totalStandardQuantity;

          consumption.totalIssuedQuantity =
            totals.totalIssuedQuantity;

          consumption.totalActualQuantity =
            totals.totalActualQuantity;

          consumption.totalWasteQuantity =
            totals.totalWasteQuantity;

          consumption.totalReturnQuantity =
            totals.totalReturnQuantity;

          consumption.totalVarianceQuantity =
            totals.totalVarianceQuantity;

          consumption.status =
            determineConsumptionStatus(
              updatedItems
            );

          if (
            !consumption.issuedAt &&
            totals.totalIssuedQuantity >
              QUANTITY_TOLERANCE
          ) {
            consumption.issuedAt =
              new Date();
          }

          if (
            input.notes !==
            undefined
          ) {
            consumption.notes =
              input.notes.trim();
          }

          await consumption.save({
            session,
          });

          result =
            await RawMaterialConsumption.findById(
              consumption._id
            )
              .session(session)
              .populate(
                "productionOrder"
              )
              .populate(
                "productionBatch"
              )
              .populate(
                "product"
              )
              .populate(
                "formula"
              )
              .populate(
                "items.rawMaterial"
              )
              .lean();
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

// =====================================================
// COMPLETE MATERIAL CONSUMPTION
// =====================================================

/**
 * ONLY THIS FUNCTION CAN SET:
 *
 * status = "Consumed"
 *
 * Requirements:
 *
 * 1. Not Cancelled
 * 2. Not already Consumed
 * 3. Production Batch = Completed
 * 4. Materials were issued
 * 5. Every line:
 *
 *    Actual + Waste + Return = Issued
 */
export const completeMaterialConsumption =
  async (
    id: string,
    input: CompleteMaterialConsumptionInput = {}
  ) => {
    const consumption =
      await RawMaterialConsumption.findById(
        toObjectId(id)
      );

    if (!consumption) {
      throw new Error(
        "Material Consumption not found."
      );
    }

    if (
      consumption.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cancelled Material Consumption cannot be completed."
      );
    }

    if (
      consumption.status ===
      "Consumed"
    ) {
      throw new Error(
        "Material Consumption is already completed."
      );
    }

    const batch =
      await ProductionBatch.findById(
        consumption.productionBatch
      );

    if (!batch) {
      throw new Error(
        "Production Batch not found."
      );
    }

    // =================================================
    // BATCH MUST BE COMPLETED
    // =================================================

    if (
      batch.status !==
      "Completed"
    ) {
      throw new Error(
        `Material Consumption can only be completed after the Production Batch is Completed. Current batch status: ${batch.status}.`
      );
    }

    const items =
      getConsumptionItems(
        consumption.items
      );

    if (
      items.length === 0
    ) {
      throw new Error(
        "Material Consumption has no raw material items."
      );
    }

    // =================================================
    // RECONCILIATION
    // =================================================

    let hasIssued = false;

    let hasActivity = false;

    for (
      const item of items
    ) {
      const reconciliation =
        validateReconciliation(
          item,
          true
        );

      if (
        reconciliation.issued >
        QUANTITY_TOLERANCE
      ) {
        hasIssued = true;
      }

      if (
        reconciliation.accounted >
        QUANTITY_TOLERANCE
      ) {
        hasActivity = true;
      }
    }

    if (!hasIssued) {
      throw new Error(
        "Materials must be issued before Material Consumption can be completed."
      );
    }

    if (!hasActivity) {
      throw new Error(
        "Actual usage, waste, or return must be recorded before Material Consumption can be completed."
      );
    }

    // =================================================
    // TOTALS
    // =================================================

    const totals =
      calculateTotals(
        items
      );

    consumption.totalStandardQuantity =
      totals.totalStandardQuantity;

    consumption.totalIssuedQuantity =
      totals.totalIssuedQuantity;

    consumption.totalActualQuantity =
      totals.totalActualQuantity;

    consumption.totalWasteQuantity =
      totals.totalWasteQuantity;

    consumption.totalReturnQuantity =
      totals.totalReturnQuantity;

    consumption.totalVarianceQuantity =
      totals.totalVarianceQuantity;

    // =================================================
    // FINAL STATUS
    // =================================================

    consumption.status =
      "Consumed";

    consumption.consumedAt =
      new Date();

    if (
      input.completedBy
    ) {
      consumption.completedBy =
        toObjectId(
          input.completedBy
        );
    }

    if (
      !consumption.issuedAt
    ) {
      consumption.issuedAt =
        new Date();
    }

    if (
      input.notes !==
      undefined
    ) {
      consumption.notes =
        input.notes.trim();
    }

    await consumption.save();

    return populateConsumption(
      consumption._id
    );
  };

// =====================================================
// CANCEL
// =====================================================

export const cancelMaterialConsumption =
  async (
    id: string
  ) => {
    const consumption =
      await RawMaterialConsumption.findById(
        toObjectId(id)
      );

    if (!consumption) {
      throw new Error(
        "Material Consumption not found."
      );
    }

    if (
      consumption.status ===
      "Consumed"
    ) {
      throw new Error(
        "Consumed Material Consumption cannot be cancelled directly. Use a reversal/correction transaction."
      );
    }

    if (
      consumption.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Material Consumption is already cancelled."
      );
    }

    if (
      toNumber(
        consumption.totalIssuedQuantity
      ) >
      QUANTITY_TOLERANCE
    ) {
      throw new Error(
        "Material Consumption with issued materials cannot be cancelled directly. Reverse the inventory issue first."
      );
    }

    consumption.status =
      "Cancelled";

    consumption.cancelledAt =
      new Date();

    await consumption.save();

    return populateConsumption(
      consumption._id
    );
  };

// =====================================================
// STATS
// =====================================================

export const getMaterialConsumptionStats =
  async () => {
    const [
      total,
      draft,
      issued,
      partiallyConsumed,
      consumed,
      cancelled,
    ] = await Promise.all([
      RawMaterialConsumption.countDocuments(),

      RawMaterialConsumption.countDocuments({
        status:
          "Draft",
      }),

      RawMaterialConsumption.countDocuments({
        status:
          "Issued",
      }),

      RawMaterialConsumption.countDocuments({
        status:
          "Partially Consumed",
      }),

      RawMaterialConsumption.countDocuments({
        status:
          "Consumed",
      }),

      RawMaterialConsumption.countDocuments({
        status:
          "Cancelled",
      }),
    ]);

    return {
      total,
      draft,
      issued,
      partiallyConsumed,
      consumed,
      cancelled,
    };
  };