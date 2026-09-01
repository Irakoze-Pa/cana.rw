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
  /** Finished-goods stock and production quantities are always kilograms. */
  baseUnit: "kg";
  /** Net product weight contained in one customer sales pack. */
  packSizeKg?: number;
  /** Paint density used to convert a 4L or 20L pack to kilograms. */
  densityKgPerL?: number;
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

    // Production, finished-goods inventory and formula scaling use kg.
    baseUnit: {
      type: String,
      enum: ["kg"],
      default: "kg",
      immutable: true,
    },

    // A pack may be labelled in litres, kilograms, or another sales format,
    // but its net weight lets the system compare retail prices consistently.
    packSizeKg: {
      type: Number,
      min: 0.001,
    },

    densityKgPerL: {
      type: Number,
      min: 0.001,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("pricePerKg").get(function () {
  const packSizeKg = Number(this.packSizeKg);
  const price = Number(this.price);

  if (!Number.isFinite(packSizeKg) || packSizeKg <= 0) {
    return null;
  }

  return Math.round((price / packSizeKg) * 100) / 100;
});

export default mongoose.model<IProduct>(
  "Product",
  productSchema
);
