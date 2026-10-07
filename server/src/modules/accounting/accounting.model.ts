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
