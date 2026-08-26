import mongoose, { Document, Schema } from "mongoose";

// =====================================================
// PURCHASE ORDER ITEM
// =====================================================

export interface IPurchaseOrderItem {
  rawMaterial: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

// =====================================================
// PURCHASE ORDER DOCUMENT
// =====================================================

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplier: mongoose.Types.ObjectId;

  orderDate: Date;
  expectedDeliveryDate?: Date;

  items: IPurchaseOrderItem[];

  subtotal: number;
  tax: number;
  total: number;

  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "partially_received"
    | "received"
    | "cancelled";

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// PURCHASE ORDER ITEM SCHEMA
// =====================================================

const purchaseOrderItemSchema =
  new Schema<IPurchaseOrderItem>(
    {
      rawMaterial: {
        type: Schema.Types.ObjectId,
        ref: "RawMaterial",
        required: true,
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

      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      total: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: false,
    }
  );

// =====================================================
// PURCHASE ORDER SCHEMA
// =====================================================

const purchaseOrderSchema =
  new Schema<IPurchaseOrder>(
    {
      poNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      supplier: {
        type: Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
      },

      orderDate: {
        type: Date,
        required: true,
        default: Date.now,
      },

      expectedDeliveryDate: {
        type: Date,
      },

      items: {
        type: [purchaseOrderItemSchema],
        required: true,
        validate: {
          validator: (
            items: IPurchaseOrderItem[]
          ) => items.length > 0,
          message:
            "Purchase order must contain at least one item.",
        },
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      tax: {
        type: Number,
        default: 0,
        min: 0,
      },

      total: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: [
          "draft",
          "pending_approval",
          "approved",
          "partially_received",
          "received",
          "cancelled",
        ],
        default: "draft",
      },

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
// MODEL
// =====================================================

const PurchaseOrder =
  mongoose.model<IPurchaseOrder>(
    "PurchaseOrder",
    purchaseOrderSchema
  );

export default PurchaseOrder;