import mongoose, { Document, Schema } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  code: string;

  contactPerson?: string;
  phone?: string;
  email?: string;

  address?: string;
  city?: string;
  country?: string;

  paymentTerms?: string;

  status: "Active" | "Inactive";

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    // SUPPLIER / COMPANY NAME
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // UNIQUE SUPPLIER CODE
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // MAIN CONTACT PERSON
    contactPerson: {
      type: String,
      trim: true,
    },

    // PHONE NUMBER
    phone: {
      type: String,
      trim: true,
    },

    // EMAIL
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // ADDRESS
    address: {
      type: String,
      trim: true,
    },

    // CITY
    city: {
      type: String,
      trim: true,
    },

    // COUNTRY
    country: {
      type: String,
      trim: true,
    },

    // PAYMENT TERMS
    paymentTerms: {
      type: String,
      trim: true,
    },

    // SUPPLIER STATUS
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    // ADDITIONAL NOTES
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISupplier>(
  "Supplier",
  supplierSchema
);