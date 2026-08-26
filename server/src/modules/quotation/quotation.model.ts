import mongoose, { Document, Schema } from "mongoose";

export interface IQuotationItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
}

export interface IQuotation extends Document {
  customer: mongoose.Types.ObjectId;
  items: IQuotationItem[];
  message?: string;

  status:
    | "Pending"
    | "Reviewed"
    | "Approved"
    | "Rejected";

  createdAt: Date;
  updatedAt: Date;
}

const quotationItemSchema =
  new Schema<IQuotationItem>(
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const quotationSchema =
  new Schema<IQuotation>(
    {
      customer: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      items: {
        type: [quotationItemSchema],
        required: true,
        validate: {
          validator: (
            value: IQuotationItem[]
          ) => value.length > 0,

          message:
            "Quotation must contain at least one product.",
        },
      },

      message: {
        type: String,
        trim: true,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "Pending",
          "Reviewed",
          "Approved",
          "Rejected",
        ],
        default: "Pending",
      },
    },

    {
      timestamps: true,
    }
  );

const Quotation =
  mongoose.model<IQuotation>(
    "Quotation",
    quotationSchema
  );

export default Quotation;