import mongoose, { Schema } from "mongoose";

const journalLineSchema = new Schema(
  {
    accountCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    debit: { type: Number, required: true, min: 0, default: 0 },
    credit: { type: Number, required: true, min: 0, default: 0 },
    memo: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const journalSchema = new Schema(
  {
    journalNumber: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true, trim: true },
    reference: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["draft", "posted", "void"],
      default: "draft",
      index: true,
    },
    lines: {
      type: [journalLineSchema],
      validate: {
        validator: (lines: unknown[]) =>
          Array.isArray(lines) && lines.length >= 2,
        message: "A journal requires at least two lines.",
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    postedAt: Date,
    voidReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.AccountingJournal ||
  mongoose.model("AccountingJournal", journalSchema);

const treasuryAccountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["cash", "bank", "mobile_money"],
      required: true,
      index: true,
    },
    institution: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, default: "RWF" },
    openingBalance: { type: Number, min: 0, default: 0 },
    openingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);
treasuryAccountSchema.index({ name: 1, accountNumber: 1 }, { unique: true });

const treasuryTransactionSchema = new Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now, index: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer"],
      required: true,
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: "TreasuryAccount",
      required: true,
      index: true,
    },
    destinationAccount: {
      type: Schema.Types.ObjectId,
      ref: "TreasuryAccount",
      index: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true },
    reference: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["posted", "void"],
      default: "posted",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const TreasuryAccount =
  mongoose.models.TreasuryAccount ||
  mongoose.model("TreasuryAccount", treasuryAccountSchema);
export const TreasuryTransaction =
  mongoose.models.TreasuryTransaction ||
  mongoose.model("TreasuryTransaction", treasuryTransactionSchema);

const accountingConfigurationSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "primary" },
    startDate: { type: Date, required: true, default: Date.now },
    startedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export const AccountingConfiguration =
  mongoose.models.AccountingConfiguration ||
  mongoose.model("AccountingConfiguration", accountingConfigurationSchema);

const fixedAssetSchema = new Schema(
  {
    assetCode: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "Production equipment" },
    location: { type: String, trim: true, default: "Factory" },
    recognitionDate: { type: Date, required: true, default: Date.now, index: true },
    openingValue: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "maintenance", "disposed"], default: "active", index: true },
    valuationStatus: { type: String, enum: ["provisional", "verified"], default: "provisional" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const FixedAsset =
  mongoose.models.FixedAsset || mongoose.model("FixedAsset", fixedAssetSchema);

const ownerLoanSchema = new Schema(
  {
    loanNumber: { type: String, required: true, unique: true, index: true },
    lenderName: { type: String, required: true, trim: true },
    lenderType: { type: String, enum: ["owner", "director", "shareholder", "bank", "individual", "company", "institution", "other"], default: "owner" },
    openingDate: { type: Date, required: true, default: Date.now, index: true },
    originalAmount: { type: Number, required: true, min: 0.01 },
    reference: { type: String, trim: true, default: "" },
    interestRate: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["active", "settled", "void"], default: "active", index: true },
    repayments: [{ paymentNumber: { type: String, required: true }, paymentDate: { type: Date, required: true }, principal: { type: Number, min: 0, default: 0 }, interest: { type: Number, min: 0, default: 0 }, treasuryAccount: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", required: true }, reference: { type: String, trim: true, default: "" }, createdBy: { type: Schema.Types.ObjectId, ref: "User" } }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const OwnerLoan = mongoose.models.OwnerLoan || mongoose.model("OwnerLoan", ownerLoanSchema);

const taxLiabilitySchema = new Schema({
  taxNumber: { type: String, required: true, unique: true, index: true },
  taxType: { type: String, enum: ["vat", "paye", "corporate_income_tax", "withholding_tax", "rssb", "other"], required: true },
  basis: { type: String, enum: ["opening", "current"], default: "current" },
  authority: { type: String, trim: true, default: "Rwanda Revenue Authority" },
  period: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  assessedAmount: { type: Number, required: true, min: 0.01 },
  reference: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["unpaid", "partial", "paid", "void"], default: "unpaid", index: true },
  payments: [{ paymentNumber: { type: String, required: true }, paymentDate: { type: Date, required: true }, amount: { type: Number, required: true, min: 0.01 }, treasuryAccount: { type: Schema.Types.ObjectId, ref: "TreasuryAccount", required: true }, reference: { type: String, trim: true, default: "" }, createdBy: { type: Schema.Types.ObjectId, ref: "User" } }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
export const TaxLiability = mongoose.models.TaxLiability || mongoose.model("TaxLiability", taxLiabilitySchema);
