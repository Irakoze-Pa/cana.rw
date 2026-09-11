import User, {
  UserRole,
  Company,
  UserStatus,
} from "../models/users";

import {
  hashPassword,
  comparePassword,
} from "../utils/password";

import { generateToken } from "../utils/generateToken";

type RegisterInput = {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  isCompanyCustomer: boolean;
  businessName?: string;
  tin?: string;
  password: string;
};

type LoginInput = {
  phone: string;
  password: string;
};

const normalizePhone = (phone: string) =>
  phone.trim().replace(/[\s()-]/g, "");

class AuthService {
  async register({
    fullName,
    phone,
    email,
    address,
    isCompanyCustomer,
    businessName,
    tin,
    password,
  }: RegisterInput) {

    const normalizedPhone = normalizePhone(phone);
    const existingPhone = await User.findOne({ phone: normalizedPhone });

    if (existingPhone) {
      throw new Error("Phone number already exists.");
    }

    if (email) {
      const existingEmail = await User.findOne({ email });

      if (existingEmail) {
        throw new Error("Email already exists.");
      }
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      fullName,
      phone: normalizedPhone,
      email: email || undefined,
      address: address.trim(),
      isCompanyCustomer,
      businessName: isCompanyCustomer ? businessName?.trim() || "" : "",
      tin: isCompanyCustomer ? tin?.trim() || "" : "",
      password: hashedPassword,

      role: UserRole.CUSTOMER,
      company: Company.CANA_GROUP,
      status: UserStatus.ACTIVE,

      permissions: [],
    });

    const token = generateToken(String(user._id), user.role);

    return {
      token,
      user,
    };
  }

  async login({
    phone,
    password,
  }: LoginInput) {

    const normalizedPhone = normalizePhone(phone);
    const user = await User.findOne({ phone: normalizedPhone }).select("+password");

    if (!user) {
      throw new Error("Invalid phone or password.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("This account is inactive. Please contact CANA support.");
    }

    const isMatch = await comparePassword(
      password,
      user.password
    );

    if (!isMatch) {
      throw new Error("Invalid phone or password.");
    }

    user.lastLogin = new Date();

    await user.save();

    const token = generateToken(String(user._id), user.role);

    return {
      token,
      user,
    };
  }
}

export default new AuthService();
