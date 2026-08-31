import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  status: { type: String, enum: ["present", "absent", "leave", "half_day"], default: "present", required: true },
  notes: { type: String, trim: true, default: "" },
  markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

schema.index({ staff: 1, date: 1 }, { unique: true });
export default mongoose.models.Attendance || mongoose.model("Attendance", schema);
