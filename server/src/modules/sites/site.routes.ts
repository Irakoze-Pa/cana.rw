import { Router } from "express";
import mongoose from "mongoose";
import Site, { siteStatuses, siteWorkTypes } from "./site.model";
import User, { UserRole, UserStatus } from "../../models/users";
import { hashPassword } from "../../utils/password";
import { randomBytes } from "node:crypto";
import { authorizeRoles, protect, type AuthRequest } from "../../middleware/auth.middleware";
import upload from "../product/product.upload";
import cloudinary from "../../config/cloudinary";

const router = Router();
const profile = "fullName phone email businessName address tin";
const isId = (value: unknown) => typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
const numberOrNull = (value: unknown, min: number, max: number) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`Enter a valid coordinate between ${min} and ${max}.`);
  return number;
};
const uploadSiteImage = (file: Express.Multer.File) => new Promise<string>((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({ folder: "cana/sites", resource_type: "image" }, (error, result) => {
    if (error) return reject(error);
    if (!result?.secure_url) return reject(new Error("Cloudinary did not return a site image URL."));
    resolve(result.secure_url);
  });
  stream.end(file.buffer);
});

const parseSite = (input: Record<string, unknown>) => {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const address = typeof input.address === "string" ? input.address.trim() : "";
  if (name.length < 3 || address.length < 3) throw new Error("Site name and full address are required.");
  if (!siteWorkTypes.includes(input.workType as typeof siteWorkTypes[number])) throw new Error("Select a valid work type.");
  if (!siteStatuses.includes(input.status as typeof siteStatuses[number])) throw new Error("Select a valid site status.");
  const latitude = numberOrNull(input.latitude, -90, 90);
  const longitude = numberOrNull(input.longitude, -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new Error("Enter both latitude and longitude, or leave both blank.");
  if (input.customer && !isId(input.customer)) throw new Error("Select a valid customer.");
  if (input.responsible && !isId(input.responsible)) throw new Error("Select a valid responsible staff member.");
  return { name, address, workType: input.workType, status: input.status, latitude, longitude, customer: input.customer || null, responsible: input.responsible || null, district: typeof input.district === "string" ? input.district.trim() : "", plannedStartDate: input.plannedStartDate || null, plannedEndDate: input.plannedEndDate || null, notes: typeof input.notes === "string" ? input.notes.trim() : "", followUpContactName: typeof input.followUpContactName === "string" ? input.followUpContactName.trim() : "", followUpContactPhone: typeof input.followUpContactPhone === "string" ? input.followUpContactPhone.trim().replace(/[\s()-]/g, "") : "", followUpContactEmail: typeof input.followUpContactEmail === "string" ? input.followUpContactEmail.trim().toLowerCase() : "", publicVisible: input.publicVisible === true || input.publicVisible === "true", publicSummary: typeof input.publicSummary === "string" ? input.publicSummary.trim() : "" };
};

const createCustomerFromSite = async (input: Record<string, unknown>, address: string) => {
  if (input.createCustomer !== true && input.createCustomer !== "true") return null;
  const fullName = typeof input.newCustomerName === "string" ? input.newCustomerName.trim() : "";
  const phone = typeof input.newCustomerPhone === "string" ? input.newCustomerPhone.trim().replace(/[\s()-]/g, "") : "";
  const email = typeof input.newCustomerEmail === "string" ? input.newCustomerEmail.trim().toLowerCase() : "";
  const businessName = typeof input.newCustomerBusinessName === "string" ? input.newCustomerBusinessName.trim() : "";
  if (fullName.length < 3 || !/^\+?\d{6,15}$/.test(phone)) throw new Error("Enter the new customer's name and valid phone number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid customer email address.");
  if (await User.exists({ $or: [{ phone }, ...(email ? [{ email }] : [])] })) throw new Error("A customer already uses this phone number or email. Select the existing customer instead.");
  const customer = await User.create({ fullName, phone, ...(email ? { email } : {}), password: await hashPassword(randomBytes(32).toString("hex")), role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, isCompanyCustomer: Boolean(businessName), businessName, address, permissions: [] });
  return customer._id;
};

router.get("/public", async (_req, res, next) => {
  try {
    const data = await Site.find({ publicVisible: true, status: { $ne: "closed" } }).select("siteCode name workType status address district latitude longitude publicSummary image plannedStartDate plannedEndDate").sort({ status: 1, plannedStartDate: -1 }).lean();
    res.json({ data });
  } catch (error) { next(error); }
});

router.use(protect, authorizeRoles(UserRole.ADMIN, UserRole.STAFF));

router.get("/staff-options", async (_req, res, next) => {
  try { res.json({ data: await User.find({ role: { $in: [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPERADMIN] }, status: UserStatus.ACTIVE }).select("fullName phone role department company").sort({ fullName: 1 }).lean() }); }
  catch (error) { next(error); }
});

router.get("/", async (_req, res, next) => {
  try { res.json({ data: await Site.find().populate("customer", profile).populate("responsible", "fullName phone department jobTitle").sort({ updatedAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.post("/", upload.single("image"), async (req: AuthRequest, res, next) => {
  try {
    const data = parseSite(req.body || {});
    const customerId = await createCustomerFromSite(req.body || {}, data.address);
    if (customerId) data.customer = customerId;
    const siteCode = `SITE-${new Date().getFullYear()}-${String((await Site.countDocuments()) + 1).padStart(4, "0")}`;
    const created = await Site.create({ ...data, ...(req.file ? { image: await uploadSiteImage(req.file) } : {}), siteCode, createdBy: req.user!.id });
    await created.populate("customer", profile);
    await created.populate("responsible", "fullName phone department jobTitle");
    res.status(201).json({ data: created });
  } catch (error) { next(error); }
});

router.patch("/:id", upload.single("image"), async (req, res, next) => {
  try {
    const siteId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(siteId)) throw new Error("Invalid site record.");
    const data = parseSite(req.body || {});
    const updated = await Site.findByIdAndUpdate(siteId, { $set: { ...data, ...(req.file ? { image: await uploadSiteImage(req.file) } : {}) } }, { new: true, runValidators: true }).populate("customer", profile).populate("responsible", "fullName phone department jobTitle");
    if (!updated) return res.status(404).json({ message: "Site record not found." });
    res.json({ data: updated });
  } catch (error) { next(error); }
});

export default router;
