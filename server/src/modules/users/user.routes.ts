import { randomBytes } from "node:crypto";
import { Router } from "express";
import User, { Company, Department, UserRole, UserStatus } from "../../models/users";
import { authorizeRoles, protect, AuthRequest } from "../../middleware/auth.middleware";
import { hashPassword } from "../../utils/password";

const router = Router();
const ACCESS_AREAS = ["sales", "production", "inventory", "procurement", "finance", "staff", "reports"] as const;
const defaultPermissions = (role: UserRole, department?: Department) => {
  if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) return [...ACCESS_AREAS];
  if (role === UserRole.CUSTOMER) return [];
  const departmentAccess: Partial<Record<Department, string[]>> = { sales: ["sales"], production: ["production"], warehouse: ["inventory"], procurement: ["procurement"], finance: ["finance"], hr: ["staff"], management: ["reports", "sales", "production", "inventory", "procurement", "finance"] };
  return departmentAccess[department as Department] || [];
};
router.use(protect);

router.get("/customers", authorizeRoles(UserRole.ADMIN, UserRole.STAFF), async (_req, res, next) => {
  try {
    const customers = await User.find({ role: UserRole.CUSTOMER, status: UserStatus.ACTIVE }).select("fullName phone email isCompanyCustomer businessName address tin").sort({ fullName: 1 }).lean();
    res.json({ data: customers });
  } catch (error) { next(error); }
});

router.post("/customers", authorizeRoles(UserRole.ADMIN, UserRole.STAFF), async (req, res, next) => {
  try {
    const { fullName, phone, email, isCompanyCustomer = false, businessName, address, tin } = req.body;
    const normalizedPhone = typeof phone === "string" ? phone.trim().replace(/[\s()-]/g, "") : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (typeof fullName !== "string" || fullName.trim().length < 3 || !/^\+?\d{6,15}$/.test(normalizedPhone) || (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) {
      return res.status(400).json({ error: { message: "Enter a name of at least 3 characters, a valid phone number, and a valid optional email." } });
    }
    if (typeof address !== "string" || address.trim().length < 3) return res.status(400).json({ error: { message: "Enter the customer's address." } });
    if (isCompanyCustomer && (typeof businessName !== "string" || !businessName.trim() || typeof tin !== "string" || !tin.trim())) return res.status(400).json({ error: { message: "Company name and TIN are required for a company customer." } });
    if (await User.exists({ $or: [{ phone: normalizedPhone }, ...(normalizedEmail ? [{ email: normalizedEmail }] : [])] })) return res.status(409).json({ error: { message: "An account already uses this phone number or email." } });
    const customer = await User.create({ fullName: fullName.trim(), phone: normalizedPhone, ...(normalizedEmail ? { email: normalizedEmail } : {}), password: await hashPassword(randomBytes(32).toString("hex")), isCompanyCustomer: Boolean(isCompanyCustomer), businessName: isCompanyCustomer && typeof businessName === "string" ? businessName.trim() : "", address: address.trim(), tin: isCompanyCustomer && typeof tin === "string" ? tin.trim() : "", role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, permissions: [] });
    res.status(201).json({ data: { _id: customer._id, fullName: customer.fullName, phone: customer.phone, email: customer.email, isCompanyCustomer: customer.isCompanyCustomer, businessName: customer.businessName, address: customer.address, tin: customer.tin } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return res.status(409).json({ error: { message: "An account already uses this phone number or email." } });
    next(error);
  }
});

// Administrators retain all operational modules; only SuperAdmin manages accounts.
router.use(authorizeRoles(UserRole.SUPERADMIN));

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
    const user = await User.create({ fullName: fullName.trim(), phone: normalizedPhone, ...(typeof email === "string" && email.trim() ? { email: email.trim().toLowerCase() } : {}), password: await hashPassword(password), role: role as UserRole, company: company as Company, department: department ? department as Department : undefined, jobTitle: typeof jobTitle === "string" ? jobTitle.trim() : "", baseSalary: Number(baseSalary), status: UserStatus.ACTIVE, permissions: defaultPermissions(role as UserRole, department as Department | undefined) } as any) as any;
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

router.patch("/:id", async (req: AuthRequest, res, next) => {
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
    if (Array.isArray(permissions)) { if (!permissions.every((item) => typeof item === "string" && ACCESS_AREAS.includes(item as typeof ACCESS_AREAS[number]))) return res.status(400).json({ error: { code: "INVALID_PERMISSIONS", message: "One or more access areas are invalid." } }); update.permissions = [...new Set(permissions)]; }
    const current = await User.findById(req.params.id).select("role status").lean();
    if (!current) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found." } });
    const removesSuperAdmin = current.role === UserRole.SUPERADMIN && current.status === UserStatus.ACTIVE && (update.role !== UserRole.SUPERADMIN || update.status === UserStatus.INACTIVE);
    if (String(req.user?.id) === String(req.params.id) && removesSuperAdmin) return res.status(400).json({ error: { code: "SELF_SUPERADMIN_CHANGE", message: "You cannot remove your own SuperAdmin access." } });
    if (removesSuperAdmin && await User.countDocuments({ role: UserRole.SUPERADMIN, status: UserStatus.ACTIVE }) <= 1) return res.status(400).json({ error: { code: "LAST_SUPERADMIN", message: "Keep at least one active SuperAdmin account." } });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found." } });
    res.json({ data: user });
  } catch (error) { next(error); }
});

router.post("/:id/reset-password", async (req: AuthRequest, res, next) => {
  try {
    const { temporaryPassword } = req.body as Record<string, unknown>;
    if (typeof temporaryPassword !== "string" || temporaryPassword.length < 8) return res.status(400).json({ error: { code: "INVALID_PASSWORD", message: "Temporary password must contain at least 8 characters." } });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { password: await hashPassword(temporaryPassword), isVerified: false } }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found." } });
    res.json({ data: user });
  } catch (error) { next(error); }
});

export default router;
