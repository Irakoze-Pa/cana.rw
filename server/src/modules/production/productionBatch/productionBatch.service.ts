import mongoose from "mongoose";

import ProductionBatch from "./productionBatch.model";
import ProductionOrder from "../productionOrder/productionOrder.model";
import Product from "../../product/product.model";
import FinishedGoodsStoreBalance from "../../finishedGoods/storeBalance.model";
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
  productionOrder: string;

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
    | "Planned"
    | "Ready"
    | "In Progress"
    | "Paused"
    | "Completed"
    | "Cancelled";

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

  constructor(
    message: string,
    statusCode = 400
  ) {
    super(message);

    this.name =
      "ProductionBatchServiceError";

    this.statusCode =
      statusCode;
  }
}

// =====================================================
// TYPES
// =====================================================

export type ProductionBatchStatus =
  | "Planned"
  | "Ready"
  | "In Progress"
  | "Paused"
  | "Completed"
  | "Cancelled";

// =====================================================
// STATUS TRANSITIONS
// =====================================================

const allowedStatusTransitions: Record<
  ProductionBatchStatus,
  ProductionBatchStatus[]
> = {
  Planned: [
    "Planned",
    "Ready",
    "Cancelled",
  ],

  Ready: [
    "Ready",
    "In Progress",
    "Cancelled",
  ],

  "In Progress": [
    "In Progress",
    "Paused",
    "Completed",
  ],

  Paused: [
    "Paused",
    "In Progress",
    "Completed",
    "Cancelled",
  ],

  Completed: [
    "Completed",
  ],

  Cancelled: [
    "Cancelled",
  ],
};

// =====================================================
// OBJECT ID
// =====================================================

function validateObjectId(
  id: string,
  fieldName: string
) {
  if (
    !id ||
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    throw new ProductionBatchServiceError(
      `Invalid ${fieldName}.`,
      400
    );
  }
}

// =====================================================
// ROUND
// =====================================================

function roundNumber(
  value: number,
  decimals = 4
) {
  const factor =
    Math.pow(10, decimals);

  return (
    Math.round(
      (value + Number.EPSILON) *
        factor
    ) / factor
  );
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
  }>
) {
  return roundNumber(
    batches.reduce(
      (total, batch) => {
        if (batch.status === "Cancelled") {
          return total;
        }

        return total + Number(
          batch.status === "Completed"
            ? batch.actualQuantity || 0
            : batch.plannedQuantity || 0
        );
      },
      0
    )
  );
}

// =====================================================
// DATE
// =====================================================

function parseDate(
  value:
    | string
    | Date
    | undefined,
  fieldName: string
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new ProductionBatchServiceError(
      `Invalid ${fieldName}.`,
      400
    );
  }

  return date;
}

// =====================================================
// STATUS TRANSITION
// =====================================================

function validateStatusTransition(
  current: ProductionBatchStatus,
  next: ProductionBatchStatus
) {
  const allowed =
    allowedStatusTransitions[
      current
    ];

  if (
    !allowed ||
    !allowed.includes(next)
  ) {
    throw new ProductionBatchServiceError(
      `Invalid production batch status transition: ${current} → ${next}.`,
      400
    );
  }
}

// =====================================================
// GENERATE BATCH NUMBER
// =====================================================

async function generateBatchNo() {
  const year =
    new Date().getFullYear();

  const latestBatch =
    await ProductionBatch.findOne({
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

  if (
    latestBatch?.batchNo
  ) {
    const match =
      latestBatch.batchNo.match(
        /PB-\d{4}-(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `PB-${year}-${String(
    nextNumber
  ).padStart(4, "0")}`;
}

// =====================================================
// CREATE BATCH
// =====================================================

export async function createProductionBatch(
  data: CreateProductionBatchData
) {
  if (!data) {
    throw new ProductionBatchServiceError(
      "Production batch data is required.",
      400
    );
  }

  validateObjectId(
    data.productionOrder,
    "production order ID"
  );

  const productionOrder =
    await ProductionOrder.findById(
      data.productionOrder
    );

  if (!productionOrder) {
    throw new ProductionBatchServiceError(
      "Production order not found.",
      404
    );
  }

  // ---------------------------------------------------
  // ORDER STATUS
  // ---------------------------------------------------

  if (
    productionOrder.status !==
      "Draft" &&
    productionOrder.status !==
      "Planned" &&
    productionOrder.status !==
      "Released" &&
    productionOrder.status !==
      "In Production"
  ) {
    throw new ProductionBatchServiceError(
      `A production batch can only be created for a Draft, Planned, Released or In Production production order. Current status: ${productionOrder.status}.`,
      409
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
      400
    );
  }

  // ---------------------------------------------------
  // ORDER MUST HAVE POSITIVE QUANTITY
  // ---------------------------------------------------

  const orderQuantity =
    Number(
      productionOrder.quantity
    );

  if (
    !Number.isFinite(
      orderQuantity
    ) ||
    orderQuantity <= 0
  ) {
    throw new ProductionBatchServiceError(
      "Production order quantity must be greater than 0.",
      400
    );
  }

  // ---------------------------------------------------
  // PLANNED QUANTITY
  // ---------------------------------------------------

  const plannedQuantity =
    Number(
      data.plannedQuantity ??
        orderQuantity
    );

  if (
    !Number.isFinite(
      plannedQuantity
    ) ||
    plannedQuantity <= 0
  ) {
    throw new ProductionBatchServiceError(
      "Batch planned quantity must be greater than 0.",
      400
    );
  }

  // ---------------------------------------------------
  // EXISTING BATCHES
  // ---------------------------------------------------

  const existingBatches =
    await ProductionBatch.find({
      productionOrder:
        productionOrder._id,
      status: {
        $ne: "Cancelled",
      },
    })
      .select(
        "plannedQuantity actualQuantity status"
      )
      .lean();

  const plannedAlready =
    getOrderCommittedQuantity(existingBatches);

  const remainingQuantity =
    roundNumber(
      orderQuantity -
        plannedAlready
    );

  if (
    remainingQuantity <= 0
  ) {
    throw new ProductionBatchServiceError(
      "No remaining quantity is available for another production batch.",
      409
    );
  }

  if (
    plannedQuantity >
    remainingQuantity
  ) {
    throw new ProductionBatchServiceError(
      `Batch quantity (${plannedQuantity}) exceeds the remaining production order quantity (${remainingQuantity}).`,
      409
    );
  }

  // ---------------------------------------------------
  // BATCH NUMBER
  // ---------------------------------------------------

  const batchNo =
    await generateBatchNo();

  // ---------------------------------------------------
  // START DATE
  // ---------------------------------------------------

  const startDate =
    parseDate(
      data.startDate,
      "start date"
    );

  // ---------------------------------------------------
  // CREATE
  // ---------------------------------------------------

  try {
    const batch =
      await ProductionBatch.create({
        batchNo,

        productionOrder:
          productionOrder._id,

        product:
          productionOrder.product,

        productName:
          productionOrder.productName,

        productCode:
          productionOrder.productCode,

        formula:
          productionOrder.formula,

        formulaName:
          productionOrder.formulaName,

        formulaCode:
          productionOrder.formulaCode,

        formulaVersion:
          productionOrder.formulaVersion,

        plannedQuantity,

        actualQuantity: 0,

        unit:
          productionOrder.unit,

        status:
          "Planned",

        batchNumber:
          data.batchNumber?.trim() ||
          batchNo,

        lotNumber:
          data.lotNumber?.trim() ||
          batchNo,

        startDate,

        supervisor:
          data.supervisor
            ? new mongoose.Types.ObjectId(
                data.supervisor
              )
            : undefined,

        supervisorName:
          data.supervisorName?.trim() ||
          "",

        notes:
          data.notes?.trim() ||
          "",
      });

    // -------------------------------------------------
    // DRAFT / PLANNED → RELEASED
    //
    // Creating a batch commits a prepared order to production. The order
    // becomes In Production only when one of its batches actually starts.
    // -------------------------------------------------

    if (
      productionOrder.status === "Draft" ||
      productionOrder.status === "Planned"
    ) {
      productionOrder.status =
        "Released";

      await productionOrder.save();
    }

    return batch;
  } catch (error: any) {
    if (
      error?.code === 11000
    ) {
      throw new ProductionBatchServiceError(
        "A production batch with the same batch number already exists.",
        409
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
      "productionOrderNo productName productCode quantity unit status"
    )
    .populate(
      "product",
      "name code category unit"
    )
    .populate(
      "formula",
      "name code version batchSize batchUnit"
    )
    .sort({
      createdAt: -1,
    });
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionBatchById(
  id: string
) {
  validateObjectId(
    id,
    "production batch ID"
  );

  return ProductionBatch.findById(
    id
  )
    .populate(
      "productionOrder",
      "productionOrderNo productName productCode quantity unit status"
    )
    .populate(
      "product",
      "name code category unit"
    )
    .populate(
      "formula",
      "name code version batchSize batchUnit"
    );
}

// =====================================================
// GET BY ORDER
// =====================================================

export async function getBatchesByProductionOrder(
  productionOrderId: string
) {
  validateObjectId(
    productionOrderId,
    "production order ID"
  );

  return ProductionBatch.find({
    productionOrder:
      productionOrderId,
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
      $in: [
        "Planned",
        "Ready",
        "In Progress",
        "Paused",
      ],
    },
  })
    .populate(
      "productionOrder",
      "productionOrderNo productName productCode quantity unit status"
    )
    .populate(
      "product",
      "name code category unit"
    )
    .sort({
      createdAt: -1,
    });
}

// =====================================================
// UPDATE BATCH
// =====================================================

export async function updateProductionBatch(
  id: string,
  data: UpdateProductionBatchData
) {
  validateObjectId(
    id,
    "production batch ID"
  );

  const batch =
    await ProductionBatch.findById(id);

  if (!batch) {
    throw new ProductionBatchServiceError(
      "Production batch not found.",
      404
    );
  }

  const wasCompleted = batch.status === "Completed";

  const currentStatus =
    batch.status as ProductionBatchStatus;

  // ---------------------------------------------------
  // TERMINAL STATES
  // ---------------------------------------------------

  if (
    currentStatus ===
      "Completed" ||
    currentStatus ===
      "Cancelled"
  ) {
    throw new ProductionBatchServiceError(
      `A ${currentStatus} production batch cannot be modified.`,
      409
    );
  }

  // ---------------------------------------------------
  // CALCULATE NEXT STATUS
  // ---------------------------------------------------

  const nextStatus =
    (data.status ??
      currentStatus) as ProductionBatchStatus;

  validateStatusTransition(
    currentStatus,
    nextStatus
  );

  const isCompletingBatch =
    nextStatus === "Completed";

  let consumptionToFinalize: any = null;

  if (isCompletingBatch) {
    consumptionToFinalize =
      await RawMaterialConsumption.findOne({
        productionBatch: batch._id,
        status: { $ne: "Cancelled" },
      });

    if (!consumptionToFinalize) {
      throw new ProductionBatchServiceError(
        "Raw materials have not been issued for this batch. Start the batch first, then issue materials before recording finished output.",
        409
      );
    }

    if (consumptionToFinalize.status === "Draft") {
      throw new ProductionBatchServiceError(
        "Issue the raw materials for this batch before completing it.",
        409
      );
    }
  }

  // ---------------------------------------------------
  // LOAD ORDER
  // ---------------------------------------------------

  const productionOrder =
    await ProductionOrder.findById(
      batch.productionOrder
    );

  if (!productionOrder) {
    throw new ProductionBatchServiceError(
      "Production order not found.",
      404
    );
  }

  // ---------------------------------------------------
  // FIELD PERMISSIONS
  // ---------------------------------------------------

  const canEditPlannedQuantity =
    currentStatus ===
      "Planned" ||
    currentStatus ===
      "Ready";

  const canEditActualQuantity =
    currentStatus ===
      "In Progress" ||
    currentStatus ===
      "Paused";

  const productionStarted =
    currentStatus ===
      "In Progress" ||
    currentStatus ===
      "Paused";

  // ---------------------------------------------------
  // PLANNED QUANTITY
  // ---------------------------------------------------

  if (
    data.plannedQuantity !==
    undefined
  ) {
    if (
      !canEditPlannedQuantity
    ) {
      throw new ProductionBatchServiceError(
        "Planned batch quantity can only be changed while the batch is Planned or Ready.",
        409
      );
    }

    const quantity =
      Number(
        data.plannedQuantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {
      throw new ProductionBatchServiceError(
        "Planned quantity must be greater than 0.",
        400
      );
    }

    const otherBatches =
      await ProductionBatch.find({
        productionOrder:
          batch.productionOrder,

        _id: {
          $ne: batch._id,
        },

        status: {
          $ne: "Cancelled",
        },
      })
        .select(
          "plannedQuantity actualQuantity status"
        )
        .lean();

    const otherPlanned =
      getOrderCommittedQuantity(otherBatches);

    const remainingForThisBatch =
      roundNumber(
        Number(
          productionOrder.quantity
        ) -
          otherPlanned
      );

    if (
      quantity >
      remainingForThisBatch
    ) {
      throw new ProductionBatchServiceError(
        `The new batch quantity (${quantity}) exceeds the remaining production order quantity (${remainingForThisBatch}).`,
        409
      );
    }

    batch.plannedQuantity =
      quantity;
  }

  // ---------------------------------------------------
  // ACTUAL QUANTITY
  // ---------------------------------------------------

  if (
    data.actualQuantity !==
    undefined
  ) {
    if (
      !canEditActualQuantity
    ) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity can only be recorded while the batch is In Progress or Paused.",
        409
      );
    }

    const actual =
      Number(
        data.actualQuantity
      );

    if (
      !Number.isFinite(
        actual
      ) ||
      actual < 0
    ) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity cannot be negative.",
        400
      );
    }

    if (
      actual >
      Number(
        batch.plannedQuantity
      )
    ) {
      throw new ProductionBatchServiceError(
        "Actual produced quantity cannot exceed planned batch quantity.",
        400
      );
    }

    // -------------------------------------------------
    // ORDER TOTAL SAFETY
    // -------------------------------------------------

    const otherActualBatches =
      await ProductionBatch.find({
        productionOrder:
          batch.productionOrder,

        _id: {
          $ne: batch._id,
        },

        status: {
          $ne: "Cancelled",
        },
      })
        .select(
          "actualQuantity"
        )
        .lean();

    const otherActual =
      otherActualBatches.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.actualQuantity ||
              0
          ),
        0
      );

    const maximumAllowedActual =
      roundNumber(
        Number(
          productionOrder.quantity
        ) -
          otherActual
      );

    if (
      actual >
      maximumAllowedActual
    ) {
      throw new ProductionBatchServiceError(
        `Actual produced quantity cannot exceed the remaining production order quantity (${maximumAllowedActual}).`,
        409
      );
    }

    batch.actualQuantity =
      actual;
  }

  // ---------------------------------------------------
  // COMPLETION VALIDATION
  // ---------------------------------------------------

  if (
    nextStatus ===
    "Completed"
  ) {
    const finalActual =
      data.actualQuantity !==
      undefined
        ? Number(
            data.actualQuantity
          )
        : Number(
            batch.actualQuantity
          );

    if (
      !Number.isFinite(
        finalActual
      ) ||
      finalActual <= 0
    ) {
      throw new ProductionBatchServiceError(
        "A completed batch must have actual produced quantity greater than 0.",
        400
      );
    }

    batch.endDate =
      new Date();
  }

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  batch.status =
    nextStatus;

  if (
    nextStatus === "In Progress" &&
    productionOrder.status === "Released"
  ) {
    productionOrder.status =
      "In Production";
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

  if (
    data.startDate !==
    undefined
  ) {
    if (
      productionStarted
    ) {
      throw new ProductionBatchServiceError(
        "Start date cannot be changed after production starts.",
        409
      );
    }

    batch.startDate =
      parseDate(
        data.startDate,
        "start date"
      );
  }

  // ---------------------------------------------------
  // END DATE
  // ---------------------------------------------------

  if (
    data.endDate !==
    undefined
  ) {
    throw new ProductionBatchServiceError(
      "End date is managed automatically by the production batch workflow.",
      409
    );
  }

  // ---------------------------------------------------
  // BATCH NUMBER
  // ---------------------------------------------------

  if (
    data.batchNumber !==
    undefined
  ) {
    if (
      productionStarted
    ) {
      throw new ProductionBatchServiceError(
        "Batch number cannot be changed after production starts.",
        409
      );
    }

    const value =
      data.batchNumber.trim();

    if (!value) {
      throw new ProductionBatchServiceError(
        "Batch number cannot be empty.",
        400
      );
    }

    batch.batchNumber =
      value;
  }

  // ---------------------------------------------------
  // LOT NUMBER
  // ---------------------------------------------------

  if (
    data.lotNumber !==
    undefined
  ) {
    if (
      productionStarted
    ) {
      throw new ProductionBatchServiceError(
        "Lot number cannot be changed after production starts.",
        409
      );
    }

    const value =
      data.lotNumber.trim();

    if (!value) {
      throw new ProductionBatchServiceError(
        "Lot number cannot be empty.",
        400
      );
    }

    batch.lotNumber =
      value;
  }

  // ---------------------------------------------------
  // SUPERVISOR
  // ---------------------------------------------------

  if (
    data.supervisor !==
    undefined
  ) {
    if (
      productionStarted
    ) {
      throw new ProductionBatchServiceError(
        "Supervisor cannot be changed after production starts.",
        409
      );
    }

    validateObjectId(
      data.supervisor,
      "supervisor ID"
    );

    batch.supervisor =
      new mongoose.Types.ObjectId(
        data.supervisor
      );
  }

  // ---------------------------------------------------
  // SUPERVISOR NAME
  // ---------------------------------------------------

  if (
    data.supervisorName !==
    undefined
  ) {
    if (
      productionStarted
    ) {
      throw new ProductionBatchServiceError(
        "Supervisor cannot be changed after production starts.",
        409
      );
    }

    batch.supervisorName =
      data.supervisorName.trim();
  }

  // ---------------------------------------------------
  // NOTES
  // ---------------------------------------------------

  if (
    data.notes !==
    undefined
  ) {
    batch.notes =
      data.notes.trim();
  }

  // ---------------------------------------------------
  // SAVE
  // ---------------------------------------------------

  await batch.save();

  await productionOrder.save();

  // Create the formula-based material issue list when actual production starts.
  // This is intentionally done once per batch and remains Draft until the
  // storekeeper selects receipt lots and issues the materials.
  if (
    nextStatus === "In Progress" &&
    currentStatus !== "In Progress"
  ) {
    const existingConsumption =
      await RawMaterialConsumption.exists({
        productionBatch: batch._id,
        status: { $ne: "Cancelled" },
      });

    if (!existingConsumption) {
      await createMaterialConsumption({
        productionOrder: String(batch.productionOrder),
        productionBatch: String(batch._id),
        notes: `Created automatically when batch ${batch.batchNo} started.`,
      });
    }
  }

  // At batch completion, quantities already issued to production are treated
  // as used unless the operator recorded a specific waste or return amount.
  // The resulting consumption record is locked as an audit trail.
  if (isCompletingBatch && consumptionToFinalize) {
    const consumptionItems =
      Array.isArray(consumptionToFinalize.items)
        ? consumptionToFinalize.items
        : [];

    await updateMaterialConsumption(
      String(consumptionToFinalize._id),
      {
        items: consumptionItems.map((item: any) => ({
          actualQuantity: Math.max(
            0,
            Number(item.issuedQuantity || 0) -
              Number(item.wasteQuantity || 0) -
              Number(item.returnQuantity || 0),
          ),
        })),
      },
    );

    await completeMaterialConsumption(
      String(consumptionToFinalize._id),
      {
        notes: `Closed automatically when production batch ${batch.batchNo} was completed.`,
      },
    );
  }

  if (batch.status === "Completed" && !wasCompleted && !batch.finishedGoodsPostedAt) {
    const product = await Product.findById(batch.product);
    if (!product) {
      throw new ProductionBatchServiceError("Finished product not found.", 404);
    }
    product.stock = Number((product.stock + batch.actualQuantity).toFixed(4));
    await product.save();
    await FinishedGoodsStoreBalance.findOneAndUpdate({ product: product._id, store: "production" }, { $inc: { quantity: Number(batch.actualQuantity) } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    batch.finishedGoodsPostedAt = new Date();
    await batch.save();
  }

  // ---------------------------------------------------
  // SYNC ORDER
  // ---------------------------------------------------

  await syncProductionOrderFromBatches(
    String(
      batch.productionOrder
    )
  );

  return batch;
}

// =====================================================
// SYNC PRODUCTION ORDER
// =====================================================

export async function syncProductionOrderFromBatches(
  productionOrderId: string
) {
  validateObjectId(
    productionOrderId,
    "production order ID"
  );

  const productionOrder =
    await ProductionOrder.findById(
      productionOrderId
    );

  if (!productionOrder) {
    throw new ProductionBatchServiceError(
      "Production order not found.",
      404
    );
  }

  const batches =
    await ProductionBatch.find({
      productionOrder:
        productionOrderId,

      status: {
        $ne: "Cancelled",
      },
    })
      .select(
        "actualQuantity status"
      )
      .lean();

  const actualProducedQuantity =
    batches.reduce(
      (total, batch) =>
        batch.status === "Completed"
          ? total + Number(batch.actualQuantity || 0)
          : total,
      0
    );

  const actualProduced =
    roundNumber(
      actualProducedQuantity
    );

  productionOrder.actualProducedQuantity =
    actualProduced;

  const hasCompletedBatch =
    batches.some(
      (batch) =>
        batch.status ===
        "Completed"
    );

  // ---------------------------------------------------
  // ORDER COMPLETION
  // ---------------------------------------------------

  if (
    actualProduced ===
      Number(
        productionOrder.quantity
      ) &&
    hasCompletedBatch
  ) {
    productionOrder.status =
      "Completed";
  }

  await productionOrder.save();

  return productionOrder;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionBatch(
  id: string
) {
  validateObjectId(
    id,
    "production batch ID"
  );

  const batch =
    await ProductionBatch.findById(id);

  if (!batch) {
    throw new ProductionBatchServiceError(
      "Production batch not found.",
      404
    );
  }

  // ---------------------------------------------------
  // ONLY PLANNED CAN BE DELETED
  // ---------------------------------------------------

  if (
    batch.status !==
    "Planned"
  ) {
    throw new ProductionBatchServiceError(
      "Only Planned production batches can be deleted. Cancelled batches must remain in the system for audit history.",
      409
    );
  }

  await ProductionBatch.findByIdAndDelete(
    id
  );

  return batch;
}
