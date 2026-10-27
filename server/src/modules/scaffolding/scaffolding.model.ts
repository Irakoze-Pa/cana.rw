import mongoose, { Schema } from "mongoose";

const serviceCustomerSchema = new Schema({
  customerNumber: { type: String, required: true, unique: true, index: true },
  customerType: { type: String, enum: ["individual", "company"], default: "individual" },
  fullName: { type: String, required: true, trim: true },
  businessName: { type: String, trim: true, default: "" },
  phone: { type: String, required: true, trim: true, index: true },
  nationalId: { type: String, trim: true, default: "" },
  alternatePhone: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  tin: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
  contactPerson: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const itemSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ["frame", "standard", "ledger", "brace", "platform", "coupler", "base_jack", "wheel", "ladder", "guard_rail", "other"], default: "other" },
  totalQuantity: { type: Number, min: 0, default: 0 },
  availableQuantity: { type: Number, min: 0, default: 0 },
  hiredQuantity: { type: Number, min: 0, default: 0 },
  soldQuantity: { type: Number, min: 0, default: 0 },
  damagedQuantity: { type: Number, min: 0, default: 0 },
  missingQuantity: { type: Number, min: 0, default: 0 },
  salePrice: { type: Number, min: 0, default: 0 },
  replacementCost: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

const scaffoldStockMovementSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "ScaffoldItem", required: true, index: true },
  movementType: { type: String, enum: ["opening", "adjustment", "hire_out", "hire_return", "sale", "damage", "missing"], required: true, index: true },
  quantity: { type: Number, required: true },
  balanceAfter: { type: Number, min: 0, required: true },
  reference: { type: String, trim: true, default: "" },
  reason: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const hireLineSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "ScaffoldItem", required: true },
  itemCode: { type: String, required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, min: 1, required: true },
  dailyRate: { type: Number, min: 0, required: true },
  returnedGood: { type: Number, min: 0, default: 0 },
  returnedDamaged: { type: Number, min: 0, default: 0 },
  returnedMissing: { type: Number, min: 0, default: 0 },
}, { _id: true });

const hireSchema = new Schema({
  hireNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: "ServiceCustomer", required: true, index: true },
  siteName: { type: String, trim: true, default: "" },
  siteAddress: { type: String, trim: true, default: "" },
  contactName: { type: String, trim: true, default: "" },
  contactPhone: { type: String, trim: true, default: "" },
  startDate: { type: Date, required: true },
  expectedReturnDate: { type: Date, required: true },
  actualReturnDate: Date,
  scaffoldQuantity: { type: Number, min: 1, required: true, default: 1 },
  numberOfDays: { type: Number, min: 1, required: true, default: 1 },
  billingDaysAdjusted: { type: Boolean, default: false },
  unitPrice: { type: Number, min: 0, required: true, default: 0 },
  hireSubtotal: { type: Number, min: 0, required: true, default: 0 },
  scaffoldReturnedGood: { type: Number, min: 0, default: 0 },
  scaffoldReturnedDamaged: { type: Number, min: 0, default: 0 },
  scaffoldReturnedMissing: { type: Number, min: 0, default: 0 },
  deposit: { type: Number, min: 0, default: 0 },
  transportCharge: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["draft", "active", "partially_returned", "returned", "cancelled"], default: "active", index: true },
  items: { type: [hireLineSchema], required: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  history: [{ action: String, at: { type: Date, default: Date.now }, note: String, by: { type: Schema.Types.ObjectId, ref: "User" } }],
}, { timestamps: true });

const saleLineSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "ScaffoldItem", required: true },
  itemCode: String,
  itemName: String,
  quantity: { type: Number, min: 1, required: true },
  unitPrice: { type: Number, min: 0, required: true },
  total: { type: Number, min: 0, required: true },
}, { _id: false });

const saleSchema = new Schema({
  saleNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: "ServiceCustomer", required: true, index: true },
  saleDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  items: { type: [saleLineSchema], required: true },
  subtotal: { type: Number, min: 0, required: true },
  transportCharge: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, required: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const transportTripSchema = new Schema({
  tripNumber: { type: String, required: true, unique: true, index: true },
  serviceDate: { type: String, trim: true, default: "", index: true },
  driver: { type: Schema.Types.ObjectId, ref: "ServiceWorker", default: null, index: true },
  driverName: { type: String, trim: true, default: "" },
  vehicleRegistration: { type: String, required: true, uppercase: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: "ServiceCustomer", default: null },
  contactName: { type: String, trim: true, default: "" },
  contactPhone: { type: String, trim: true, default: "" },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  destinations: { type: [String], default: [] },
  stops: { type: [{ destination: { type: String, required: true, trim: true }, amountCharged: { type: Number, min: 0, required: true } }], default: [] },
  purpose: { type: String, required: true, trim: true },
  departureAt: { type: Date, required: true },
  returnedAt: Date,
  distanceKm: { type: Number, min: 0, default: 0 },
  amountCharged: { type: Number, min: 0, default: 0 },
  fuelCost: { type: Number, min: 0, default: 0 },
  repairCost: { type: Number, min: 0, default: 0 },
  otherCost: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["planned", "dispatched", "completed", "cancelled"], default: "planned", index: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
transportTripSchema.index({ driver: 1, serviceDate: 1 }, { unique: true, partialFilterExpression: { serviceDate: { $type: "string", $gt: "" } } });

const serviceWorkerSchema = new Schema({
  workerNumber: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  businessUnit: { type: String, enum: ["transport", "scaffolding"], required: true, index: true },
  jobTitle: { type: String, trim: true, default: "" },
  vehicleRegistration: { type: String, trim: true, uppercase: true, default: "", index: true },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const serviceWorkerTransactionSchema = new Schema({
  transactionNumber: { type: String, required: true, unique: true, index: true },
  worker: { type: Schema.Types.ObjectId, ref: "ServiceWorker", required: true, index: true },
  businessUnit: { type: String, enum: ["transport", "scaffolding"], required: true, index: true },
  kind: { type: String, enum: ["advance", "payment"], required: true, index: true },
  amount: { type: Number, min: 0.01, required: true },
  transactionDate: { type: Date, required: true, default: Date.now, index: true },
  method: { type: String, enum: ["cash", "bank", "mobile_money", "cheque", "other"], default: "cash" },
  reference: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["confirmed", "reversed"], default: "confirmed", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const serviceFinanceTransactionSchema = new Schema({
  transactionNumber: { type: String, required: true, unique: true, index: true },
  transactionType: { type: String, enum: ["payment", "expense"], required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: "ServiceCustomer", default: null, index: true },
  referenceType: { type: String, enum: ["scaffold_hire", "scaffold_sale", "transport", "other"], default: "other" },
  referenceId: { type: Schema.Types.ObjectId, default: null },
  worker: { type: Schema.Types.ObjectId, ref: "ServiceWorker", default: null, index: true },
  vehicleRegistration: { type: String, trim: true, uppercase: true, default: "", index: true },
  referenceNumber: { type: String, trim: true, default: "" },
  businessUnit: { type: String, enum: ["scaffolding", "transport", "general"], default: "general", index: true },
  category: { type: String, trim: true, default: "" },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, min: 0.01, required: true },
  paymentMethod: { type: String, enum: ["cash", "bank", "mobile_money", "cheque", "other"], default: "cash" },
  transactionDate: { type: Date, required: true, default: Date.now, index: true },
  status: { type: String, enum: ["confirmed", "reversed"], default: "confirmed", index: true },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export const ScaffoldItem = mongoose.models.ScaffoldItem || mongoose.model("ScaffoldItem", itemSchema);
export const ScaffoldStockMovement = mongoose.models.ScaffoldStockMovement || mongoose.model("ScaffoldStockMovement", scaffoldStockMovementSchema);
export const ServiceCustomer = mongoose.models.ServiceCustomer || mongoose.model("ServiceCustomer", serviceCustomerSchema);
export const ScaffoldHire = mongoose.models.ScaffoldHire || mongoose.model("ScaffoldHire", hireSchema);
export const ScaffoldSale = mongoose.models.ScaffoldSale || mongoose.model("ScaffoldSale", saleSchema);
export const TransportTrip = mongoose.models.TransportTrip || mongoose.model("TransportTrip", transportTripSchema);
export const ServiceWorker = mongoose.models.ServiceWorker || mongoose.model("ServiceWorker", serviceWorkerSchema);
export const ServiceWorkerTransaction = mongoose.models.ServiceWorkerTransaction || mongoose.model("ServiceWorkerTransaction", serviceWorkerTransactionSchema);
export const ServiceFinanceTransaction = mongoose.models.ServiceFinanceTransaction || mongoose.model("ServiceFinanceTransaction", serviceFinanceTransactionSchema);
