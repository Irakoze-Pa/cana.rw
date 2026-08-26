import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

// =====================================================
// TYPES
// =====================================================

export type ProductionOrderStatus =
  | "Draft"
  | "Planned"
  | "Released"
  | "In Production"
  | "Completed"
  | "Cancelled"
  | "On Hold";

export type ProductionOrderPriority =
  | "Low"
  | "Normal"
  | "High"
  | "Urgent";

// =====================================================
// PRODUCTION ORDER ITEM
// =====================================================

export interface IProductionOrderItem {
  rawMaterial: Types.ObjectId;

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
}

// =====================================================
// PRODUCTION ORDER
// =====================================================

export interface IProductionOrder
  extends Document {
  productionOrderNo: string;

  // Product
  product: Types.ObjectId;
  productName: string;
  productCode: string;

  // Formula
  formula: Types.ObjectId;
  formulaName: string;
  formulaCode: string;
  formulaVersion: number;

  // Production quantity
  quantity: number;
  unit: string;

  // Formula batch
  formulaBatchSize: number;
  formulaBatchUnit: string;
  scalingFactor: number;

  // Order information
  priority: ProductionOrderPriority;
  status: ProductionOrderStatus;

  // Dates
  plannedDate: Date;
  expectedCompletionDate?: Date;

  // Raw materials
  items: IProductionOrderItem[];

  // Costs
  estimatedMaterialCost: number;
  laborCost: number;
  energyCost: number;
  otherCost: number;
  estimatedTotalCost: number;

  // Actual production
  actualProducedQuantity: number;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// PRODUCTION ORDER ITEM SCHEMA
// =====================================================

const productionOrderItemSchema =
  new Schema<IProductionOrderItem>(
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
        trim: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      wastePercentage: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100,
      },

      requiredQuantity: {
        type: Number,
        required: true,
        min: 0,
      },

      estimatedCost: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      actualQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      variance: {
        type: Number,
        required: true,
        default: 0,
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

// =====================================================
// PRODUCTION ORDER SCHEMA
// =====================================================

const productionOrderSchema =
  new Schema<IProductionOrder>(
    {
      // -------------------------------------------------
      // PRODUCTION ORDER NUMBER
      // -------------------------------------------------

      productionOrderNo: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
      },

      // -------------------------------------------------
      // PRODUCT
      // -------------------------------------------------

      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
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
        index: true,
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
      },

      // -------------------------------------------------
      // PRODUCTION QUANTITY
      // -------------------------------------------------

      quantity: {
        type: Number,
        required: true,
        min: 0.01,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      // -------------------------------------------------
      // FORMULA BATCH
      // -------------------------------------------------

      formulaBatchSize: {
        type: Number,
        required: true,
        min: 0.01,
      },

      formulaBatchUnit: {
        type: String,
        required: true,
        trim: true,
      },

      scalingFactor: {
        type: Number,
        required: true,
        min: 0,
      },

      // -------------------------------------------------
      // PRIORITY
      // -------------------------------------------------

      priority: {
        type: String,
        enum: [
          "Low",
          "Normal",
          "High",
          "Urgent",
        ],
        default: "Normal",
      },

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      status: {
        type: String,
        enum: [
          "Draft",
          "Planned",
          "Released",
          "In Production",
          "Completed",
          "Cancelled",
          "On Hold",
        ],
        default: "Draft",
        index: true,
      },

      // -------------------------------------------------
      // DATES
      // -------------------------------------------------

      plannedDate: {
        type: Date,
        required: true,
      },

      expectedCompletionDate: {
        type: Date,
      },

      // -------------------------------------------------
      // RAW MATERIAL REQUIREMENTS
      // -------------------------------------------------

      items: {
        type: [productionOrderItemSchema],
        default: [],
      },

      // -------------------------------------------------
      // COSTS
      // -------------------------------------------------

      estimatedMaterialCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      laborCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      energyCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      otherCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      estimatedTotalCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      // -------------------------------------------------
      // ACTUAL PRODUCTION
      // -------------------------------------------------

      actualProducedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      // -------------------------------------------------
      // NOTES
      // -------------------------------------------------

      notes: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

// =====================================================
// INDEXES
// =====================================================

productionOrderSchema.index({
  product: 1,
  createdAt: -1,
});

productionOrderSchema.index({
  formula: 1,
  formulaVersion: 1,
});

productionOrderSchema.index({
  status: 1,
  plannedDate: -1,
});

// =====================================================
// MODEL
// =====================================================

const ProductionOrder =
  mongoose.model<IProductionOrder>(
    "ProductionOrder",
    productionOrderSchema
  );

export default ProductionOrder;