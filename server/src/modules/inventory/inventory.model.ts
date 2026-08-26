import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

// =====================================================
// TYPES
// =====================================================

export type InventoryStatus =
  | "Available"
  | "Low Stock"
  | "Out of Stock"
  | "Inactive";

// =====================================================
// INTERFACE
// =====================================================

export interface IInventory extends Document {
  rawMaterial: Types.ObjectId;

  rawMaterialName: string;
  rawMaterialCode: string;

  unit: string;

  quantity: number;

  reservedQuantity: number;

  availableQuantity: number;

  minimumStock: number;

  averageCostPerUnit: number;

  status: InventoryStatus;

  lastTransactionAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  isLowStock: boolean;
  isOutOfStock: boolean;
}

// =====================================================
// SCHEMA
// =====================================================

const inventorySchema =
  new Schema<IInventory>(
    {
      // =================================================
      // RAW MATERIAL REFERENCE
      // =================================================

      rawMaterial: {
        type: Schema.Types.ObjectId,
        ref: "RawMaterial",
        required: true,
      },

      // =================================================
      // RAW MATERIAL SNAPSHOT
      // =================================================

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

      // =================================================
      // UNIT
      // =================================================

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      // =================================================
      // STOCK
      // =================================================

      quantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      reservedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      availableQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =================================================
      // STOCK CONTROL
      // =================================================

      minimumStock: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =================================================
      // COST
      // =================================================

      averageCostPerUnit: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =================================================
      // STATUS
      // =================================================

      status: {
        type: String,
        enum: [
          "Available",
          "Low Stock",
          "Out of Stock",
          "Inactive",
        ],
        default: "Out of Stock",
      },

      // =================================================
      // LAST TRANSACTION
      // =================================================

      lastTransactionAt: {
        type: Date,
      },
    },
    {
      timestamps: true,

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

// =====================================================
// INDEXES
// =====================================================

// One Inventory record per Raw Material
inventorySchema.index(
  { rawMaterial: 1 },
  { unique: true }
);

// Status filtering
inventorySchema.index({
  status: 1,
});

// Quantity filtering
inventorySchema.index({
  quantity: 1,
});

// Raw material code search
inventorySchema.index({
  rawMaterialCode: 1,
});

// =====================================================
// VIRTUALS
// =====================================================

inventorySchema.virtual(
  "isLowStock"
).get(function () {
  return (
    this.quantity > 0 &&
    this.quantity <= this.minimumStock
  );
});

inventorySchema.virtual(
  "isOutOfStock"
).get(function () {
  return this.quantity <= 0;
});

// =====================================================
// MODEL
// =====================================================

const Inventory =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>(
    "Inventory",
    inventorySchema
  );

export default Inventory;