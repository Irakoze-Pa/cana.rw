import { Schema, model, models } from "mongoose";

export const siteStatuses = ["planning", "active", "on_hold", "completed", "closed"] as const;
export const siteWorkTypes = ["painting", "scaffolding", "transport", "maintenance", "other"] as const;

const siteSchema = new Schema({
  siteCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: "User", default: null },
  followUpContactName: { type: String, default: "", trim: true },
  followUpContactPhone: { type: String, default: "", trim: true },
  followUpContactEmail: { type: String, default: "", trim: true, lowercase: true },
  workType: { type: String, enum: siteWorkTypes, default: "painting" },
  status: { type: String, enum: siteStatuses, default: "planning" },
  address: { type: String, required: true, trim: true },
  district: { type: String, default: "", trim: true },
  latitude: { type: Number, default: null, min: -90, max: 90 },
  longitude: { type: Number, default: null, min: -180, max: 180 },
  responsible: { type: Schema.Types.ObjectId, ref: "User", default: null },
  plannedStartDate: { type: Date, default: null },
  plannedEndDate: { type: Date, default: null },
  notes: { type: String, default: "", trim: true },
  publicVisible: { type: Boolean, default: false },
  publicSummary: { type: String, default: "", trim: true, maxlength: 500 },
  image: { type: String, default: "", trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

siteSchema.index({ status: 1, workType: 1 });
siteSchema.index({ publicVisible: 1, status: 1 });

export default models.Site || model("Site", siteSchema);
