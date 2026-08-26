import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

export type InventoryTransactionType =
  | "Purchase"
  | "Production Issue"
  | "Production Return"
  | "Adjustment"
  | "Opening Balance";

export type InventoryTransactionReferenceType =
  | "PurchaseOrder"
  | "MaterialConsumption"
  | "ProductionBatch"
  | "Manual"
  | "OpeningBalance";

export interface IInventoryTransaction
  extends Document {
  inventory: Types.ObjectId;

  rawMaterial: Types.ObjectId;

  rawMaterialName: string;

  rawMaterialCode: string;

  type: InventoryTransactionType;

  quantity: number;

  unit: string;

  unitCost: number;

  totalCost: number;

  quantityBefore: number;

  quantityAfter: number;

  referenceType?: InventoryTransactionReferenceType;

  referenceId?: Types.ObjectId;

  productionBatch?: Types.ObjectId;

  productionOrder?: Types.ObjectId;

  materialConsumption?: Types.ObjectId;

  purchaseOrder?: Types.ObjectId;

  reason?: string;

  notes?: string;

  performedBy?: Types.ObjectId;

  transactionDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema =
  new Schema<IInventoryTransaction>(
    {
      // =====================================================
      // INVENTORY
      // =====================================================

      inventory: {
        type: Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
        index: true,
      },

      // =====================================================
      // RAW MATERIAL
      // =====================================================

      rawMaterial: {
        type: Schema.Types.ObjectId,
        ref: "RawMaterial",
        required: true,
        index: true,
      },

      // =====================================================
      // RAW MATERIAL SNAPSHOT
      // =====================================================

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

      // =====================================================
      // TRANSACTION TYPE
      // =====================================================

      type: {
        type: String,
        enum: [
          "Purchase",
          "Production Issue",
          "Production Return",
          "Adjustment",
          "Opening Balance",
        ],
        required: true,
        index: true,
      },

      // =====================================================
      // QUANTITY
      // =====================================================

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

      // =====================================================
      // COST
      // =====================================================

      unitCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =====================================================
      // STOCK BEFORE / AFTER
      // =====================================================

      quantityBefore: {
        type: Number,
        required: true,
        min: 0,
      },

      quantityAfter: {
        type: Number,
        required: true,
        min: 0,
      },

      // =====================================================
      // REFERENCE
      // =====================================================

      referenceType: {
        type: String,
        enum: [
          "PurchaseOrder",
          "MaterialConsumption",
          "ProductionBatch",
          "Manual",
          "OpeningBalance",
        ],
      },

      referenceId: {
        type: Schema.Types.ObjectId,
      },

      // =====================================================
      // PRODUCTION REFERENCES
      // =====================================================

      productionBatch: {
        type: Schema.Types.ObjectId,
        ref: "ProductionBatch",
        index: true,
      },

      productionOrder: {
        type: Schema.Types.ObjectId,
        ref: "ProductionOrder",
        index: true,
      },

      materialConsumption: {
        type: Schema.Types.ObjectId,
        ref: "RawMaterialConsumption",
        index: true,
      },

      // =====================================================
      // PURCHASE REFERENCE
      // =====================================================

      purchaseOrder: {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        index: true,
      },

      // =====================================================
      // DETAILS
      // =====================================================

      reason: {
        type: String,
        trim: true,
      },

      notes: {
        type: String,
        trim: true,
      },

      // =====================================================
      // USER
      // =====================================================

      performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      // =====================================================
      // DATE
      // =====================================================

      transactionDate: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

// =========================================================
// INDEXES
// =========================================================

inventoryTransactionSchema.index({
  inventory: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  rawMaterial: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  type: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  referenceType: 1,
  referenceId: 1,
});

// =========================================================
// MODEL
// =========================================================

const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>(
    "InventoryTransaction",
    inventoryTransactionSchema
  );

export default InventoryTransaction;