import mongoose, { Schema } from "mongoose";

const equipmentSchema = new Schema({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  name: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  criticality: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  cleaningFrequency: { type: String, default: "Daily" },
  maintenanceFrequency: { type: String, default: "Monthly" },
  nextMaintenanceDate: { type: String, default: "" },
  status: { type: String, enum: ["active", "maintenance", "retired"], default: "active" },
}, { timestamps: true });

const recordSchema = new Schema({
  recordNo: { type: String, required: true, unique: true },
  category: { type: String, enum: ["cleaning", "maintenance", "inspection", "incident", "training", "ppe"], required: true, index: true },
  title: { type: String, required: true, trim: true },
  area: { type: String, trim: true, default: "" },
  equipment: { type: Schema.Types.ObjectId, ref: "ComplianceEquipment", default: null },
  scheduledDate: { type: String, default: "" },
  completedDate: { type: String, default: "" },
  responsible: { type: String, trim: true, default: "" },
  details: { type: String, trim: true, default: "" },
  correctiveAction: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["open", "completed", "verified", "closed"], default: "open", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

const settingsSchema = new Schema({
  key: { type: String, default: "factory-compliance", unique: true },
  facilityName: { type: String, default: "CANAN Business Group Factory" },
  safetyOfficer: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  inspectionFrequency: { type: String, default: "Weekly" },
  requireCleaningClearance: { type: Boolean, default: true },
  requireMaintenanceClearance: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export const ComplianceEquipment = mongoose.models.ComplianceEquipment || mongoose.model("ComplianceEquipment", equipmentSchema);
export const ComplianceRecord = mongoose.models.ComplianceRecord || mongoose.model("ComplianceRecord", recordSchema);
export const ComplianceSettings = mongoose.models.ComplianceSettings || mongoose.model("ComplianceSettings", settingsSchema);
