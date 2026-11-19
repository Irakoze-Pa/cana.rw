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

  /** Legacy reference retained only on batches created by the old workflow. */
  productionOrder?: mongoose.Types.ObjectId;

  // ---------------------------------------------------
  // PRODUCT SNAPSHOT
  // ---------------------------------------------------

  product: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;

  outputs: Array<{
    product: mongoose.Types.ObjectId;
    productName: string;
    productCode: string;
    plannedQuantity: number;
    actualQuantity: number;
    packSizeKg: number;
    plannedPacks: number;
    actualPacks: number;
    allocatedCost: number;
    costPerPack: number;
  }>;

  // ---------------------------------------------------
  // FORMULA SNAPSHOT
  // ---------------------------------------------------

  formula: mongoose.Types.ObjectId;
  formulaName: string;
  formulaCode: string;
  formulaVersion: number;
  formulaSnapshot: Array<{
    rawMaterial: mongoose.Types.ObjectId;
    rawMaterialName: string;
    rawMaterialCode: string;
    appliesToProduct?: mongoose.Types.ObjectId;
    quantity: number;
    unit: string;
    wastePercentage: number;
    notes?: string;
  }>;

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

  /** Saved production-cost valuation. Stock movement values remain immutable. */
  actualMaterialCost: number;
  allocatedLaborCost: number;
  allocatedEnergyCost: number;
  allocatedOtherCost: number;
  totalActualCost: number;
  costPerKg: number;
  costPerPack: number;
  costedAt?: Date;
  costingBasis?: "current_supplier_offer" | "actual_issue_cost";
  costPriceAsOf?: Date;
  costPriceFallbackMaterials: string[];
  costFormula?: mongoose.Types.ObjectId;
  costFormulaName?: string;
  costFormulaCode?: string;
  costFormulaVersion?: number;
  materialCostLines: Array<{
    rawMaterial: mongoose.Types.ObjectId;
    rawMaterialName: string;
    rawMaterialCode: string;
    appliesToProduct?: mongoose.Types.ObjectId;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
    priceSource: "production_issue" | "historical_receipt" | "supplier_offer" | "inventory_average" | "material_setup";
    quantitySource: "actual_issue" | "pack_output";
    supplier?: mongoose.Types.ObjectId;
    supplierName?: string;
    offerUpdatedAt?: Date;
  }>;

  /** Current replacement valuation from the active formula and current offers. */
  currentMaterialCost: number;
  currentTotalCost: number;
  currentCostPerKg: number;
  currentCostPerPack: number;
  currentCostedAt?: Date;
  currentMaterialCostLines: Array<{
    rawMaterial: mongoose.Types.ObjectId;
    rawMaterialName: string;
    rawMaterialCode: string;
    appliesToProduct?: mongoose.Types.ObjectId;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
    priceSource: "supplier_offer" | "inventory_average" | "material_setup";
    supplier?: mongoose.Types.ObjectId;
    supplierName?: string;
    offerUpdatedAt?: Date;
  }>;

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
        required: false,
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

      outputs: {
        type: [new Schema(
          {
            product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            productName: { type: String, required: true, trim: true },
            productCode: { type: String, default: "", trim: true },
            plannedQuantity: { type: Number, required: true, min: 0.0001 },
            actualQuantity: { type: Number, default: 0, min: 0 },
            packSizeKg: { type: Number, required: true, min: 0.0001 },
            plannedPacks: { type: Number, required: true, min: 0.0001 },
            actualPacks: { type: Number, default: 0, min: 0 },
            allocatedCost: { type: Number, default: 0, min: 0 },
            costPerPack: { type: Number, default: 0, min: 0 },
          },
          { _id: false },
        )],
        default: [],
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

      // Scaled recipe owned by this batch. It remains unchanged when the
      // master formula is edited and is locked once materials are issued.
      formulaSnapshot: {
        type: [
          new Schema(
            {
              rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
              rawMaterialName: { type: String, required: true, trim: true },
              rawMaterialCode: { type: String, required: true, trim: true, uppercase: true },
              appliesToProduct: { type: Schema.Types.ObjectId, ref: "Product", required: false },
              quantity: { type: Number, required: true, min: 0 },
              unit: { type: String, required: true, trim: true },
              wastePercentage: { type: Number, default: 0, min: 0, max: 100 },
              notes: { type: String, default: "", trim: true },
            },
            { _id: false },
          ),
        ],
        default: [],
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

      actualMaterialCost: { type: Number, default: 0, min: 0 },
      allocatedLaborCost: { type: Number, default: 0, min: 0 },
      allocatedEnergyCost: { type: Number, default: 0, min: 0 },
      allocatedOtherCost: { type: Number, default: 0, min: 0 },
      totalActualCost: { type: Number, default: 0, min: 0 },
      costPerKg: { type: Number, default: 0, min: 0 },
      costPerPack: { type: Number, default: 0, min: 0 },
      costedAt: { type: Date },
      costingBasis: { type: String, enum: ["current_supplier_offer", "actual_issue_cost"] },
      costPriceAsOf: { type: Date },
      costPriceFallbackMaterials: { type: [String], default: [] },
      materialCostLines: {
        type: [new Schema(
          {
            rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
            rawMaterialName: { type: String, required: true, trim: true },
            rawMaterialCode: { type: String, required: true, trim: true, uppercase: true },
            appliesToProduct: { type: Schema.Types.ObjectId, ref: "Product", required: false },
            quantity: { type: Number, required: true, min: 0 },
            unit: { type: String, required: true, trim: true },
            unitPrice: { type: Number, required: true, min: 0 },
            totalCost: { type: Number, required: true, min: 0 },
            priceSource: {
              type: String,
              enum: ["production_issue", "historical_receipt", "supplier_offer", "inventory_average", "material_setup"],
              required: true,
            },
            quantitySource: {
              type: String,
              enum: ["actual_issue", "pack_output"],
              default: "actual_issue",
              required: true,
            },
            supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: false },
            supplierName: { type: String, trim: true },
            offerUpdatedAt: { type: Date },
          },
          { _id: false },
        )],
        default: [],
      },
      currentMaterialCost: { type: Number, default: 0, min: 0 },
      currentTotalCost: { type: Number, default: 0, min: 0 },
      currentCostPerKg: { type: Number, default: 0, min: 0 },
      currentCostPerPack: { type: Number, default: 0, min: 0 },
      currentCostedAt: Date,
      currentMaterialCostLines: {
        type: [new Schema(
          {
            rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
            rawMaterialName: { type: String, required: true, trim: true },
            rawMaterialCode: { type: String, required: true, trim: true, uppercase: true },
            appliesToProduct: { type: Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, required: true, min: 0 },
            unit: { type: String, required: true, trim: true },
            unitPrice: { type: Number, required: true, min: 0 },
            totalCost: { type: Number, required: true, min: 0 },
            priceSource: { type: String, enum: ["supplier_offer", "inventory_average", "material_setup"], required: true },
            supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
            supplierName: { type: String, trim: true },
            offerUpdatedAt: Date,
          },
          { _id: false },
        )],
        default: [],
      },
      costFormula: { type: Schema.Types.ObjectId, ref: "Formula" },
      costFormulaName: { type: String, trim: true, default: "" },
      costFormulaCode: { type: String, trim: true, uppercase: true, default: "" },
      costFormulaVersion: { type: Number, min: 1 },
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
