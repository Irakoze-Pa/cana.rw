import mongoose, {
  Document,
  Schema,
} from "mongoose";

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
// PRODUCTION BATCH
// =====================================================

export interface IProductionBatch
  extends Document {
  // ---------------------------------------------------
  // BATCH IDENTIFICATION
  // ---------------------------------------------------

  batchNo: string;

  // ---------------------------------------------------
  // PRODUCTION ORDER
  // ---------------------------------------------------

  productionOrder: mongoose.Types.ObjectId;

  // ---------------------------------------------------
  // PRODUCT SNAPSHOT
  // ---------------------------------------------------

  product: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;

  // ---------------------------------------------------
  // FORMULA SNAPSHOT
  // ---------------------------------------------------

  formula: mongoose.Types.ObjectId;
  formulaName: string;
  formulaCode: string;
  formulaVersion: number;

  // ---------------------------------------------------
  // PRODUCTION QUANTITY
  // ---------------------------------------------------

  /**
   * Planned finished-product quantity for this batch.
   */
  plannedQuantity: number;

  /**
   * Actual finished-product quantity produced.
   *
   * IMPORTANT:
   * This is NOT raw material consumption.
   */
  actualQuantity: number;

  unit: string;

  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  status: ProductionBatchStatus;

  // ---------------------------------------------------
  // TRACEABILITY
  // ---------------------------------------------------

  /**
   * Internal/technical batch identifier.
   *
   * Normally generated automatically by backend.
   */
  batchNumber: string;

  /**
   * Production lot number.
   */
  lotNumber: string;

  // ---------------------------------------------------
  // DATES
  // ---------------------------------------------------

  startDate?: Date;

  endDate?: Date;

  // ---------------------------------------------------
  // SUPERVISOR
  // ---------------------------------------------------

  supervisor?: mongoose.Types.ObjectId;

  supervisorName: string;

  // ---------------------------------------------------
  // NOTES
  // ---------------------------------------------------

  notes: string;

  finishedGoodsPostedAt?: Date;

  // ---------------------------------------------------
  // TIMESTAMPS
  // ---------------------------------------------------

  createdAt: Date;

  updatedAt: Date;
}

// =====================================================
// SCHEMA
// =====================================================

const productionBatchSchema =
  new Schema<IProductionBatch>(
    {
      // -------------------------------------------------
      // BATCH NUMBER
      // -------------------------------------------------

      batchNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      // -------------------------------------------------
      // PRODUCTION ORDER
      // -------------------------------------------------

      productionOrder: {
        type: Schema.Types.ObjectId,
        ref: "ProductionOrder",
        required: true,
      },

      // -------------------------------------------------
      // PRODUCT
      // -------------------------------------------------

      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      productName: {
        type: String,
        required: true,
        trim: true,
      },

      productCode: {
        type: String,
        required: true,
        trim: true,
      },

      // -------------------------------------------------
      // FORMULA
      // -------------------------------------------------

      formula: {
        type: Schema.Types.ObjectId,
        ref: "Formula",
        required: true,
      },

      formulaName: {
        type: String,
        required: true,
        trim: true,
      },

      formulaCode: {
        type: String,
        required: true,
        trim: true,
      },

      formulaVersion: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },

      // -------------------------------------------------
      // PLANNED QUANTITY
      // -------------------------------------------------

      plannedQuantity: {
        type: Number,
        required: true,
        min: 0.01,
      },

      // -------------------------------------------------
      // ACTUAL QUANTITY
      // -------------------------------------------------

      actualQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      // -------------------------------------------------
      // UNIT
      // -------------------------------------------------

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      status: {
        type: String,
        enum: [
          "Planned",
          "Ready",
          "In Progress",
          "Paused",
          "Completed",
          "Cancelled",
        ],
        default: "Planned",
        index: true,
      },

      // -------------------------------------------------
      // INTERNAL BATCH IDENTIFIER
      // -------------------------------------------------

      batchNumber: {
        type: String,
        default: "",
        trim: true,
      },

      // -------------------------------------------------
      // LOT NUMBER
      // -------------------------------------------------

      lotNumber: {
        type: String,
        default: "",
        trim: true,
      },

      // -------------------------------------------------
      // START DATE
      // -------------------------------------------------

      startDate: {
        type: Date,
      },

      // -------------------------------------------------
      // END DATE
      // -------------------------------------------------

      endDate: {
        type: Date,
      },

      // -------------------------------------------------
      // SUPERVISOR
      // -------------------------------------------------

      supervisor: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      supervisorName: {
        type: String,
        default: "",
        trim: true,
      },

      // -------------------------------------------------
      // NOTES
      // -------------------------------------------------

      notes: {
        type: String,
        default: "",
        trim: true,
      },

      finishedGoodsPostedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

// =====================================================
// INDEXES
// =====================================================

// Production Order → newest batches
productionBatchSchema.index({
  productionOrder: 1,
  createdAt: -1,
});

// Product → status
productionBatchSchema.index({
  product: 1,
  status: 1,
});

// Status → start date
productionBatchSchema.index({
  status: 1,
  startDate: 1,
});

// =====================================================
// MODEL
// =====================================================

const ProductionBatch =
  mongoose.models.ProductionBatch ||
  mongoose.model<IProductionBatch>(
    "ProductionBatch",
    productionBatchSchema
  );

export default ProductionBatch;
