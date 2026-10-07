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
        validator: (lines: unknown[]) => Array.isArray(lines) && lines.length >= 2,
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
