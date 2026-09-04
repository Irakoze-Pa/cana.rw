import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User, { Company, UserRole, UserStatus } from "../models/users";
import { hashPassword } from "../utils/password";

dotenv.config();

async function createSuperAdmin() {
  const phone = process.env.SUPERADMIN_PHONE?.trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!phone || !password || password.length < 8) throw new Error("Set SUPERADMIN_PHONE and an 8+ character SUPERADMIN_PASSWORD in server/.env before creating the SuperAdmin.");
  await connectDB();
  const user = await User.findOneAndUpdate(
    { phone },
    { $set: { fullName: "Irakoze Isidore", phone, password: await hashPassword(password), role: UserRole.SUPERADMIN, company: Company.CANA_GROUP, department: "management", jobTitle: "SuperAdmin", status: UserStatus.ACTIVE, permissions: ["sales", "production", "inventory", "procurement", "finance", "staff", "reports"] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`SuperAdmin ready: ${user.fullName} (${user.phone})`);
}

createSuperAdmin().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
