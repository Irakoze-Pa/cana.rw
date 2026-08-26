import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type MaterialConsumptionStatus =
  | "Draft"
  | "Issued"
  | "Partially Consumed"
  | "Consumed"
  | "Cancelled";

export interface IMaterialConsumptionItem {
  rawMaterial: Types.ObjectId;

  rawMaterialName: string;
  rawMaterialCode: string;

  unit: string;

  /**
   * Quantity required by the production formula.
   */
  standardQuantity: number;

  /**
   * Quantity physically issued from Inventory.
   *
   * IMPORTANT:
   * This value can only be changed by the
   * Issue Materials operation.
   */
  issuedQuantity: number;

  /**
   * Quantity actually used in production.
   *
   * Does NOT include waste or returned quantity.
   */
  actualQuantity: number;

  /**
   * Quantity lost, damaged or rejected.
   */
  wasteQuantity: number;

  /**
   * Quantity physically returned to Inventory.
   */
  returnQuantity: number;

  /**
   * Actual usage variance against standard.
   *
   * actualQuantity - standardQuantity
   */
  varianceQuantity: number;

  /**
   * Variance percentage against standard.
   */
  variancePercentage: number;

  /**
   * Optional lot/batch number from Inventory.
   */
  lotNumber?: string;

  notes?: string;
}

export interface IMaterialConsumption
  extends Document {
  consumptionNo: string;

  productionOrder: Types.ObjectId;
  productionBatch: Types.ObjectId;

  /* -----------------------------
     PRODUCT SNAPSHOT
  ----------------------------- */

  product?: Types.ObjectId;
  productName?: string;
  productCode?: string;

  /* -----------------------------
     FORMULA SNAPSHOT
  ----------------------------- */

  formula?: Types.ObjectId;
  formulaName?: string;
  formulaVersion?: string;

  /* -----------------------------
     BATCH SNAPSHOT
  ----------------------------- */

  batchNumber?: string;

  /* -----------------------------
     STATUS
  ----------------------------- */

  status: MaterialConsumptionStatus;

  /* -----------------------------
     ITEMS
  ----------------------------- */

  items: IMaterialConsumptionItem[];

  /* -----------------------------
     TOTALS
  ----------------------------- */

  totalStandardQuantity: number;
  totalIssuedQuantity: number;
  totalActualQuantity: number;
  totalWasteQuantity: number;
  totalReturnQuantity: number;
  totalVarianceQuantity: number;

  /* -----------------------------
     NOTES
  ----------------------------- */

  notes?: string;

  /* -----------------------------
     AUDIT
  ----------------------------- */

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  /**
   * User who issued raw materials.
   */
  issuedBy?: Types.ObjectId;

  /**
   * User who recorded actual usage,
   * waste and/or return.
   */
  consumedBy?: Types.ObjectId;

  /**
   * User who completed/finalized
   * the reconciliation.
   */
  completedBy?: Types.ObjectId;

  /* -----------------------------
     DATES
  ----------------------------- */

  issuedAt?: Date;

  consumedAt?: Date;

  cancelledAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

/* =========================================================
   CONSTANTS
========================================================= */

export const QUANTITY_TOLERANCE = 0.000001;

/* =========================================================
   ITEM SCHEMA
========================================================= */

const materialConsumptionItemSchema =
  new Schema<IMaterialConsumptionItem>(
    {
      rawMaterial: {
        type: Schema.Types.ObjectId,
        ref: "RawMaterial",
        required: true,
      },

      rawMaterialName: {
        type: String,
        required: true,
        trim: true,
      },

      rawMaterialCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      standardQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      issuedQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      actualQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      wasteQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      returnQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      varianceQuantity: {
        type: Number,
        required: true,
        default: 0,
      },

      variancePercentage: {
        type: Number,
        required: true,
        default: 0,
      },

      lotNumber: {
        type: String,
        trim: true,
      },

      notes: {
        type: String,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   ITEM VALIDATION
========================================================= */

materialConsumptionItemSchema.pre(
  "validate",
  function () {
    const issued = Number(
      this.issuedQuantity || 0
    );

    const actual = Number(
      this.actualQuantity || 0
    );

    const waste = Number(
      this.wasteQuantity || 0
    );

    const returned = Number(
      this.returnQuantity || 0
    );

    if (
      issued < 0 ||
      actual < 0 ||
      waste < 0 ||
      returned < 0
    ) {
      throw new Error(
        `Invalid quantity for ${this.rawMaterialName}: quantities cannot be negative.`
      );
    }

    const accounted =
      actual +
      waste +
      returned;

    if (
      accounted >
      issued + QUANTITY_TOLERANCE
    ) {
      throw new Error(
        `Invalid quantity for ${this.rawMaterialName}: ` +
          `Actual (${actual}) + ` +
          `Waste (${waste}) + ` +
          `Return (${returned}) ` +
          `cannot exceed Issued (${issued}).`
      );
    }

    const standard = Number(
      this.standardQuantity || 0
    );

    this.varianceQuantity =
      actual - standard;

    this.variancePercentage =
      standard > 0
        ? ((actual - standard) / standard) * 100
        : 0;
  }
);

/* =========================================================
   MAIN SCHEMA
========================================================= */

const materialConsumptionSchema =
  new Schema<IMaterialConsumption>(
    {
      consumptionNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      productionOrder: {
        type: Schema.Types.ObjectId,
        ref: "ProductionOrder",
        required: true,
      },

      productionBatch: {
        type: Schema.Types.ObjectId,
        ref: "ProductionBatch",
        required: true,
      },

      /* -----------------------------
         PRODUCT SNAPSHOT
      ----------------------------- */

      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },

      productName: {
        type: String,
        trim: true,
      },

      productCode: {
        type: String,
        trim: true,
        uppercase: true,
      },

      /* -----------------------------
         FORMULA SNAPSHOT
      ----------------------------- */

      formula: {
        type: Schema.Types.ObjectId,
        ref: "Formula",
      },

      formulaName: {
        type: String,
        trim: true,
      },

      formulaVersion: {
        type: String,
        trim: true,
      },

      /* -----------------------------
         BATCH SNAPSHOT
      ----------------------------- */

      batchNumber: {
        type: String,
        trim: true,
      },

      /* -----------------------------
         STATUS
      ----------------------------- */

      status: {
        type: String,
        enum: [
          "Draft",
          "Issued",
          "Partially Consumed",
          "Consumed",
          "Cancelled",
        ],
        default: "Draft",
        required: true,
      },

      /* -----------------------------
         ITEMS
      ----------------------------- */

      items: {
        type: [materialConsumptionItemSchema],
        required: true,
        default: [],
      },

      /* -----------------------------
         TOTALS
      ----------------------------- */

      totalStandardQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalIssuedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalActualQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalWasteQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalReturnQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalVarianceQuantity: {
        type: Number,
        default: 0,
      },

      /* -----------------------------
         NOTES
      ----------------------------- */

      notes: {
        type: String,
        trim: true,
      },

      /* -----------------------------
         AUDIT
      ----------------------------- */

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      issuedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      consumedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      completedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      /* -----------------------------
         DATES
      ----------------------------- */

      issuedAt: {
        type: Date,
      },

      consumedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

/* =========================================================
   MAIN VALIDATION
========================================================= */

materialConsumptionSchema.pre(
  "validate",
  function () {
    const items = this.items || [];

    let totalStandard = 0;
    let totalIssued = 0;
    let totalActual = 0;
    let totalWaste = 0;
    let totalReturn = 0;
    let totalVariance = 0;

    for (const item of items) {
      const standard = Number(
        item.standardQuantity || 0
      );

      const issued = Number(
        item.issuedQuantity || 0
      );

      const actual = Number(
        item.actualQuantity || 0
      );

      const waste = Number(
        item.wasteQuantity || 0
      );

      const returned = Number(
        item.returnQuantity || 0
      );

      const variance =
        actual - standard;

      item.varianceQuantity =
        variance;

      item.variancePercentage =
        standard > 0
          ? (variance / standard) * 100
          : 0;

      totalStandard += standard;
      totalIssued += issued;
      totalActual += actual;
      totalWaste += waste;
      totalReturn += returned;
      totalVariance += variance;

      const accounted =
        actual +
        waste +
        returned;

      if (
        accounted >
        issued + QUANTITY_TOLERANCE
      ) {
        throw new Error(
          `${item.rawMaterialName}: Actual + Waste + Return cannot exceed Issued.`
        );
      }
    }

    this.totalStandardQuantity =
      totalStandard;

    this.totalIssuedQuantity =
      totalIssued;

    this.totalActualQuantity =
      totalActual;

    this.totalWasteQuantity =
      totalWaste;

    this.totalReturnQuantity =
      totalReturn;

    this.totalVarianceQuantity =
      totalVariance;

    /* -----------------------------
       DRAFT
    ----------------------------- */

    if (this.status === "Draft") {
      return;
    }

    /* -----------------------------
       ISSUED
    ----------------------------- */

    if (this.status === "Issued") {
      if (totalIssued <= 0) {
        throw new Error(
          "Material Consumption cannot be Issued without issued quantity."
        );
      }

      return;
    }

    /* -----------------------------
       PARTIALLY CONSUMED
    ----------------------------- */

    if (
      this.status ===
      "Partially Consumed"
    ) {
      if (totalIssued <= 0) {
        throw new Error(
          "Partially Consumed material must have issued quantity."
        );
      }

      return;
    }

    /* -----------------------------
       CONSUMED
    ----------------------------- */

    if (this.status === "Consumed") {
      if (totalIssued <= 0) {
        throw new Error(
          "Consumed material must have issued quantity."
        );
      }

      const accounted =
        totalActual +
        totalWaste +
        totalReturn;

      const difference =
        Math.abs(
          totalIssued -
            accounted
        );

      if (
        difference >
        QUANTITY_TOLERANCE
      ) {
        throw new Error(
          `Consumption reconciliation failed: ` +
            `Issued (${totalIssued}) must equal ` +
            `Actual (${totalActual}) + ` +
            `Waste (${totalWaste}) + ` +
            `Return (${totalReturn}).`
        );
      }

      return;
    }

    /* -----------------------------
       CANCELLED
    ----------------------------- */

    if (this.status === "Cancelled") {
      return;
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

/**
 * Only ONE ACTIVE consumption may exist
 * for a Production Batch.
 *
 * Cancelled records do not block creation.
 */

materialConsumptionSchema.index(
  {
    productionBatch: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "Draft",
          "Issued",
          "Partially Consumed",
          "Consumed",
        ],
      },
    },
  }
);

materialConsumptionSchema.index({
  productionOrder: 1,
});

materialConsumptionSchema.index({
  status: 1,
});

materialConsumptionSchema.index({
  createdAt: -1,
});

/* =========================================================
   MODEL
========================================================= */

const RawMaterialConsumption =
  mongoose.models.RawMaterialConsumption ||
  mongoose.model<IMaterialConsumption>(
    "RawMaterialConsumption",
    materialConsumptionSchema
  );

export default RawMaterialConsumption;