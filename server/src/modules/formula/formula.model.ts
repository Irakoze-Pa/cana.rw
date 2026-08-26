import mongoose, {
  Document,
  Schema,
} from "mongoose";

// =====================================================
// FORMULA ITEM
// =====================================================

export interface IFormulaItem {
  rawMaterial: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  wastePercentage: number;
  notes?: string;
}

// =====================================================
// FORMULA
// =====================================================

export interface IFormula extends Document {
  product: mongoose.Types.ObjectId;

  name: string;

  code: string;

  version: number;

  batchSize: number;

  batchUnit: string;

  items: IFormulaItem[];

  laborCost: number;

  energyCost: number;

  otherCost: number;

  estimatedMaterialCost: number;

  estimatedTotalCost: number;

  status: "Active" | "Inactive";

  notes?: string;

  createdAt: Date;

  updatedAt: Date;
}

// =====================================================
// FORMULA ITEM SCHEMA
// =====================================================

const formulaItemSchema =
  new Schema<IFormulaItem>(
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

      wastePercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

// =====================================================
// FORMULA SCHEMA
// =====================================================

const formulaSchema =
  new Schema<IFormula>(
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      // =================================================
      // FORMULA CODE
      //
      // Same code can have many versions.
      //
      // Example:
      //
      // INT-WHT V1
      // INT-WHT V2
      // INT-WHT V3
      //
      // The code remains INT-WHT.
      // =================================================

      code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      // =================================================
      // VERSION
      // =================================================

      version: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },

      batchSize: {
        type: Number,
        required: true,
        min: 0,
      },

      batchUnit: {
        type: String,
        required: true,
        trim: true,
      },

      items: {
        type: [formulaItemSchema],
        required: true,

        validate: {
          validator: (
            value: IFormulaItem[]
          ) =>
            Array.isArray(value) &&
            value.length > 0,

          message:
            "Formula must contain at least one raw material.",
        },
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

      estimatedMaterialCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      estimatedTotalCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },
    },

    {
      timestamps: true,
    }
  );

// =====================================================
// INDEXES
// =====================================================

// Product lookup
formulaSchema.index({
  product: 1,
});

// Code lookup
formulaSchema.index({
  code: 1,
});

// Product + version lookup
formulaSchema.index({
  product: 1,
  version: 1,
});

// =====================================================
// IMPORTANT UNIQUE INDEX
//
// SAME PRODUCT + SAME CODE + SAME VERSION
// MUST NOT EXIST TWICE.
//
// Product A + INT-WHT + V1  ✅
// Product A + INT-WHT + V2  ✅
// Product A + INT-WHT + V3  ✅
//
// Product B + INT-WHT + V1  ✅
//
// Product A + INT-WHT + V1  ❌
// =====================================================

formulaSchema.index(
  {
    product: 1,
    code: 1,
    version: 1,
  },
  {
    unique: true,
    name:
      "unique_formula_product_code_version",
  }
);

// =====================================================
// ACTIVE FORMULA LOOKUP
// =====================================================

formulaSchema.index({
  product: 1,
  status: 1,
});

// =====================================================
// MODEL
// =====================================================

export default mongoose.model<IFormula>(
  "Formula",
  formulaSchema
);