import { Router } from "express";
import Attendance from "./attendance.model";
import { protect, authorizeRoles, AuthRequest } from "../../middleware/auth.middleware";
import { UserRole } from "../../models/users";

const router = Router();
router.use(protect);
router.get("/my", async (req: AuthRequest, res, next) => { try { const data = await Attendance.find({ staff: req.user!.id }).sort({ date: -1 }).limit(90); res.json({ data }); } catch (error) { next(error); } });
router.use(authorizeRoles(UserRole.ADMIN));
router.get("/", async (req, res, next) => { try { const date = String(req.query.date || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: { code: "INVALID_DATE", message: "Provide an attendance date in YYYY-MM-DD format." } }); const data = await Attendance.find({ date }).populate("staff", "fullName jobTitle department").sort({ createdAt: 1 }); res.json({ data }); } catch (error) { next(error); } });
router.put("/", async (req: AuthRequest, res, next) => { try { const { staff, date, status, notes } = req.body; if (typeof staff !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !["present", "absent", "leave", "half_day"].includes(status)) return res.status(400).json({ error: { code: "INVALID_ATTENDANCE", message: "Staff member, date and a valid attendance status are required." } }); const data = await Attendance.findOneAndUpdate({ staff, date }, { $set: { status, notes: typeof notes === "string" ? notes.trim() : "", markedBy: req.user!.id } }, { new: true, upsert: true, setDefaultsOnInsert: true }).populate("staff", "fullName jobTitle department"); res.json({ data }); } catch (error) { next(error); } });
export default router;
