import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IRawMaterial extends Document {
  name: string;
  code: string;
  category: string;

  unit: string;

  quantity: number;

  reservedQuantity: number;

  availableQuantity: number;

  minimumStock: number;

  costPerUnit: number;

  supplier: mongoose.Types.ObjectId;

  status: "Active" | "Inactive";

  createdAt: Date;
  updatedAt: Date;

  isLowStock: boolean;
  isOutOfStock: boolean;
}

const rawMaterialSchema =
  new Schema<IRawMaterial>(
    {
      // =====================================================
      // MATERIAL NAME
      // =====================================================
      name: {
        type: String,
        required: true,
        trim: true,
      },

      // =====================================================
      // UNIQUE MATERIAL CODE
      // =====================================================
      code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
      },

      // =====================================================
      // CATEGORY
      // =====================================================
      category: {
        type: String,
        required: true,
        trim: true,
      },

      // =====================================================
      // UNIT
      // =====================================================
      unit: {
        type: String,
        required: true,
        trim: true,
      },

      // =====================================================
      // CURRENT STOCK
      // =====================================================
      //
      // Example:
      // Titanium Dioxide = 500 KG
      //
      // For now this remains on RawMaterial.
      // Later Inventory will manage stock movements/history.
      //
      quantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =====================================================
      // RESERVED QUANTITY
      // =====================================================
      //
      // Quantity already reserved for production/orders.
      //
      reservedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =====================================================
      // AVAILABLE QUANTITY
      // =====================================================
      //
      // availableQuantity =
      // quantity - reservedQuantity
      //
      availableQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =====================================================
      // MINIMUM STOCK
      // =====================================================
      minimumStock: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =====================================================
      // COST PER UNIT
      // =====================================================
      costPerUnit: {
        type: Number,
        required: true,
        min: 0,
      },

      // =====================================================
      // SUPPLIER
      // =====================================================
      supplier: {
        type: Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
      },

      // =====================================================
      // STATUS
      // =====================================================
      status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
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

// =========================================================
// INDEXES
// =========================================================

rawMaterialSchema.index({
  category: 1,
});

rawMaterialSchema.index({
  supplier: 1,
});

rawMaterialSchema.index({
  status: 1,
});

rawMaterialSchema.index({
  quantity: 1,
});

// =========================================================
// VIRTUAL: LOW STOCK
// =========================================================

rawMaterialSchema.virtual(
  "isLowStock"
).get(function () {
  return this.quantity <= this.minimumStock;
});

// =========================================================
// VIRTUAL: OUT OF STOCK
// =========================================================

rawMaterialSchema.virtual(
  "isOutOfStock"
).get(function () {
  return this.quantity <= 0;
});

// =========================================================
// MODEL
// =========================================================

const RawMaterial =
  mongoose.models.RawMaterial ||
  mongoose.model<IRawMaterial>(
    "RawMaterial",
    rawMaterialSchema
  );

export default RawMaterial;