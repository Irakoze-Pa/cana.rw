import { Router } from "express";
import { protect, authorizeRoles, AuthRequest } from "../../middleware/auth.middleware";
import { UserRole } from "../../models/users";
import { ComplianceEquipment, ComplianceRecord, ComplianceSettings } from "./compliance.model";

const router = Router();
router.use(protect);
router.use(authorizeRoles(UserRole.ADMIN));

const nextNumber = async (category: string) => {
  const count = await ComplianceRecord.countDocuments({ category });
  return `FC-${category.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(4, "0")}`;
};

router.get("/dashboard", async (_req, res, next) => { try {
  const [equipment, openRecords, overdueRecords, overdueEquipment, recent] = await Promise.all([
    ComplianceEquipment.countDocuments({ status: "active" }),
    ComplianceRecord.countDocuments({ status: { $in: ["open", "completed"] } }),
    ComplianceRecord.countDocuments({ scheduledDate: { $lt: new Date().toISOString().slice(0, 10) }, status: { $in: ["open", "completed"] } }),
    ComplianceEquipment.countDocuments({ status: "active", nextMaintenanceDate: { $ne: "", $lt: new Date().toISOString().slice(0, 10) } }),
    ComplianceRecord.find().populate("equipment", "name code").sort({ createdAt: -1 }).limit(8),
  ]);
  res.json({ data: { equipment, openRecords, overdue: overdueRecords + overdueEquipment, overdueEquipment, recent } });
} catch (error) { next(error); } });

router.get("/equipment", async (_req, res, next) => { try { res.json({ data: await ComplianceEquipment.find().sort({ name: 1 }) }); } catch (error) { next(error); } });
router.post("/equipment", async (req, res, next) => { try {
  const { code, name, area, criticality, cleaningFrequency, maintenanceFrequency, nextMaintenanceDate } = req.body;
  if (!code || !name || !area) return res.status(400).json({ message: "Equipment code, name and area are required." });
  if (nextMaintenanceDate && (typeof nextMaintenanceDate !== "string" || nextMaintenanceDate.length !== 10)) return res.status(400).json({ message: "Use a valid next maintenance date." });
  res.status(201).json({ data: await ComplianceEquipment.create({ code, name, area, criticality, cleaningFrequency, maintenanceFrequency, nextMaintenanceDate }) });
} catch (error) {
  if ((error as { code?: number }).code === 11000) return res.status(409).json({ message: "This equipment code is already in use." });
  next(error);
} });
router.patch("/equipment/:id", async (req, res, next) => { try {
  const data = await ComplianceEquipment.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!data) return res.status(404).json({ message: "Equipment was not found." }); res.json({ data });
} catch (error) { next(error); } });

router.get("/records", async (req, res, next) => { try {
  const filter = req.query.category ? { category: String(req.query.category) } : {};
  res.json({ data: await ComplianceRecord.find(filter).populate("equipment", "name code").sort({ createdAt: -1 }).limit(200) });
} catch (error) { next(error); } });
router.post("/records", async (req: AuthRequest, res, next) => { try {
  const { category, title, area, equipment, scheduledDate, completedDate, responsible, details, correctiveAction } = req.body;
  if (!category || !title) return res.status(400).json({ message: "Record type and title are required." });
  if (typeof responsible !== "string" || !responsible.trim()) return res.status(400).json({ message: "Name the staff member responsible for this register entry." });
  if (!area && !equipment) return res.status(400).json({ message: "Select an equipment item or enter the factory area." });
  if ((scheduledDate && (typeof scheduledDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))) || (completedDate && (typeof completedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(completedDate)))) return res.status(400).json({ message: "Use a valid date for the register entry." });
  if (!["cleaning", "maintenance", "inspection", "incident", "training", "ppe"].includes(category)) return res.status(400).json({ message: "Invalid compliance record type." });
  const data = await ComplianceRecord.create({ category, title, area, equipment: equipment || null, scheduledDate, completedDate, details, correctiveAction, recordNo: await nextNumber(category), createdBy: req.user!.id, responsible: responsible.trim(), status: completedDate ? "completed" : "open" });
  res.status(201).json({ data: await data.populate("equipment", "name code") });
} catch (error) { next(error); } });
router.patch("/records/:id", async (req: AuthRequest, res, next) => { try {
  const current = await ComplianceRecord.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Record was not found." });
  if (["verified", "closed"].includes(current.status)) return res.status(409).json({ message: "Verified compliance records are locked. Create a corrective record instead of changing this audit record." });
  if (req.body.status) {
    const permitted: Record<string, string[]> = { open: ["completed"], completed: ["verified"] };
    if (!permitted[current.status]?.includes(req.body.status)) return res.status(400).json({ message: "Factory records must follow Open → Completed → Verified." });
    if (req.body.status === "completed" && !(req.body.responsible || current.responsible)) return res.status(400).json({ message: "A responsible staff member is required before completion." });
  }
  const allowed = ["title", "area", "equipment", "scheduledDate", "completedDate", "responsible", "details", "correctiveAction", "status"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (req.body.status === "verified") { update.verifiedBy = req.user!.id; update.verifiedAt = new Date(); }
  const data = await ComplianceRecord.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).populate("equipment", "name code");
  res.json({ data });
} catch (error) { next(error); } });

router.get("/settings", async (_req, res, next) => { try { const data = await ComplianceSettings.findOneAndUpdate({ key: "factory-compliance" }, { $setOnInsert: { key: "factory-compliance" } }, { new: true, upsert: true }); res.json({ data }); } catch (error) { next(error); } });
router.put("/settings", async (req: AuthRequest, res, next) => { try { const data = await ComplianceSettings.findOneAndUpdate({ key: "factory-compliance" }, { $set: { ...req.body, updatedBy: req.user!.id } }, { new: true, upsert: true, runValidators: true }); res.json({ data }); } catch (error) { next(error); } });
export default router;
