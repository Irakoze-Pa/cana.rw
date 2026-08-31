import { Router } from "express";
import User, { Company, Department, UserRole, UserStatus } from "../../models/users";
import { authorizeRoles, protect } from "../../middleware/auth.middleware";
import { hashPassword } from "../../utils/password";

const router = Router();
router.use(protect);

router.get("/customers", authorizeRoles(UserRole.ADMIN, UserRole.STAFF), async (_req, res, next) => {
  try {
    const customers = await User.find({ role: UserRole.CUSTOMER, status: UserStatus.ACTIVE }).select("fullName phone email").sort({ fullName: 1 }).lean();
    res.json({ data: customers });
  } catch (error) { next(error); }
});

router.use(authorizeRoles(UserRole.ADMIN));

router.post("/", async (req, res, next) => {
  try {
    const { fullName, phone, email, password, role = UserRole.STAFF, company = Company.CANA_GROUP, department, jobTitle, baseSalary = 0 } = req.body as Record<string, unknown>;
    if (typeof fullName !== "string" || fullName.trim().length < 3 || typeof phone !== "string" || phone.trim().length < 6 || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: { code: "INVALID_USER_INPUT", message: "Name, phone, and a temporary password of at least 8 characters are required." } });
    }
    if (!Object.values(UserRole).includes(role as UserRole) || !Object.values(Company).includes(company as Company)) return res.status(400).json({ error: { code: "INVALID_USER_INPUT", message: "Invalid role or company." } });
    if (department !== undefined && department !== "" && !Object.values(Department).includes(department as Department)) return res.status(400).json({ error: { code: "INVALID_DEPARTMENT", message: "Invalid department." } });
    if (!Number.isFinite(Number(baseSalary)) || Number(baseSalary) < 0) return res.status(400).json({ error: { code: "INVALID_SALARY", message: "Base salary cannot be negative." } });
    const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
    const exists = await User.exists({ $or: [{ phone: normalizedPhone }, ...(typeof email === "string" && email.trim() ? [{ email: email.trim().toLowerCase() }] : [])] });
    if (exists) return res.status(409).json({ error: { code: "USER_EXISTS", message: "A user already exists with this phone number or email." } });
    const user = await User.create({ fullName: fullName.trim(), phone: normalizedPhone, ...(typeof email === "string" && email.trim() ? { email: email.trim().toLowerCase() } : {}), password: await hashPassword(password), role: role as UserRole, company: company as Company, department: department ? department as Department : undefined, jobTitle: typeof jobTitle === "string" ? jobTitle.trim() : "", baseSalary: Number(baseSalary), status: UserStatus.ACTIVE, permissions: [] } as any) as any;
    const safe = user.toObject() as { password?: string; [key: string]: unknown }; delete safe.password;
    res.status(201).json({ data: safe });
  } catch (error) { next(error); }
});

router.get("/", async (_req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    res.json({ data: users });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { fullName, phone, email, role, company, department, jobTitle, status, permissions, baseSalary } = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (fullName !== undefined) { if (typeof fullName !== "string" || fullName.trim().length < 3) return res.status(400).json({ error: { code: "INVALID_NAME", message: "Full name must contain at least 3 characters." } }); update.fullName = fullName.trim(); }
    if (phone !== undefined) { if (typeof phone !== "string" || phone.trim().length < 6) return res.status(400).json({ error: { code: "INVALID_PHONE", message: "Enter a valid phone number." } }); const normalizedPhone = phone.trim().replace(/[\s()-]/g, ""); const duplicate = await User.exists({ phone: normalizedPhone, _id: { $ne: req.params.id } }); if (duplicate) return res.status(409).json({ error: { code: "USER_EXISTS", message: "Another account already uses this phone number." } }); update.phone = normalizedPhone; }
    if (email !== undefined) { if (email !== null && typeof email !== "string") return res.status(400).json({ error: { code: "INVALID_EMAIL", message: "Invalid email address." } }); const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""; if (normalizedEmail) { const duplicate = await User.exists({ email: normalizedEmail, _id: { $ne: req.params.id } }); if (duplicate) return res.status(409).json({ error: { code: "USER_EXISTS", message: "Another account already uses this email address." } }); } update.email = normalizedEmail || undefined; }
    if (role !== undefined) { if (!Object.values(UserRole).includes(role as UserRole)) return res.status(400).json({ error: { code: "INVALID_ROLE", message: "Invalid user role." } }); update.role = role; }
    if (company !== undefined) { if (!Object.values(Company).includes(company as Company)) return res.status(400).json({ error: { code: "INVALID_COMPANY", message: "Invalid company." } }); update.company = company; }
    if (department !== undefined) { if (department !== null && !Object.values(Department).includes(department as Department)) return res.status(400).json({ error: { code: "INVALID_DEPARTMENT", message: "Invalid department." } }); update.department = department; }
    if (status !== undefined) { if (!Object.values(UserStatus).includes(status as UserStatus)) return res.status(400).json({ error: { code: "INVALID_STATUS", message: "Invalid account status." } }); update.status = status; }
    if (typeof jobTitle === "string") update.jobTitle = jobTitle.trim();
    if (baseSalary !== undefined) { if (!Number.isFinite(Number(baseSalary)) || Number(baseSalary) < 0) return res.status(400).json({ error: { code: "INVALID_SALARY", message: "Base salary cannot be negative." } }); update.baseSalary = Number(baseSalary); }
    if (Array.isArray(permissions) && permissions.every((item) => typeof item === "string")) update.permissions = permissions;
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found." } });
    res.json({ data: user });
  } catch (error) { next(error); }
});

export default router;
