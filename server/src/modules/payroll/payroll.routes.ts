import { Router } from "express";
import { protect, authorizeRoles, AuthRequest } from "../../middleware/auth.middleware";
import { UserRole } from "../../models/users";
import PayrollRun from "./payrollRun.model";
import { createPayrollRun, markPayrollPaid } from "./payroll.service";
const router = Router(); router.use(protect, authorizeRoles(UserRole.ADMIN));
router.get("/", async (_req, res, next) => { try { res.json({ data: await PayrollRun.find().populate("lines.staff", "fullName company department").sort({ period: -1 }) }); } catch (e) { next(e); } });
router.post("/", async (req: AuthRequest, res, next) => { try { res.status(201).json({ data: await createPayrollRun(String(req.body.period || ""), req.user!.id) }); } catch (e) { next(e); } });
router.patch("/:id/status", async (req: AuthRequest, res, next) => { try { const id = String(req.params.id); const nextStatus = String(req.body.status); if (!["reviewed", "approved", "paid", "cancelled"].includes(nextStatus)) throw new Error("Invalid payroll status."); if (nextStatus === "paid") return res.json({ data: await markPayrollPaid(id) }); const run = await PayrollRun.findById(id); if (!run) return res.status(404).json({ error: { code: "PAYROLL_NOT_FOUND", message: "Payroll run not found." } }); const allowed: Record<string, string[]> = { draft: ["reviewed", "cancelled"], reviewed: ["approved", "cancelled"], approved: ["cancelled"], paid: [], cancelled: [] }; if (!allowed[run.status]?.includes(nextStatus)) throw new Error(`A ${run.status} payroll cannot be changed to ${nextStatus}.`); run.status = nextStatus; if (nextStatus === "approved") run.approvedBy = req.user!.id as any; await run.save(); res.json({ data: run }); } catch (e) { next(e); } }); export default router;
