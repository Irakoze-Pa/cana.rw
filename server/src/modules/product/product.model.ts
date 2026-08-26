import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IProduct extends Document {
  name: string;
  code: string;
  category: string;

  price: number;
  stock: number;
  unit: string;

  description?: string;
  image?: string;

  status: "Active" | "Inactive";

  trackBatch: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    // PRODUCT NAME
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // UNIQUE PRODUCT CODE
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // PRODUCT CATEGORY
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // SELLING PRICE
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // CURRENT STOCK
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // UNIT
    unit: {
      type: String,
      required: true,
      trim: true,
    },

    // DESCRIPTION
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // PRODUCT IMAGE
    image: {
      type: String,
      default: "",
    },

    // STATUS
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // BATCH TRACKING
    trackBatch: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProduct>(
  "Product",
  productSchema
);