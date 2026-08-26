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
  password: string;
};

type LoginInput = {
  phone: string;
  password: string;
};

class AuthService {
  async register({
    fullName,
    phone,
    email,
    password,
  }: RegisterInput) {

    const existingPhone = await User.findOne({ phone });

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
      phone,
      email: email || undefined,
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

    const user = await User.findOne({
      phone,
    }).select("+password");

    if (!user) {
      throw new Error("Invalid phone or password.");
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
