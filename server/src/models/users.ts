import { Schema, model, Document } from "mongoose";

export enum UserRole {
  SUPERADMIN = "superadmin",
  CUSTOMER = "customer",
  STAFF = "staff",
  ADMIN = "admin",
}

export enum Company {
  CANA_GROUP = "cana_group",
  CANA_PAINTS = "cana_paints",
  CANA_SERVICES = "cana_services",
}

export enum Department {
  SALES = "sales",
  PRODUCTION = "production",
  WAREHOUSE = "warehouse",
  TRANSPORT = "transport",
  FINANCE = "finance",
  MARKETING = "marketing",
  HR = "hr",
  PROCUREMENT = "procurement",
  CUSTOMER_SERVICE = "customer_service",
  MANAGEMENT = "management",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IUser extends Document {
  fullName: string;
  phone: string;
  email?: string;
  isCompanyCustomer: boolean;
  businessName?: string;
  address?: string;
  tin?: string;
  password: string;

  role: UserRole;
  company: Company;

  department?: Department;
  jobTitle?: string;
  baseSalary: number;

  permissions: string[];

  status: UserStatus;

  isVerified: boolean;

  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    isCompanyCustomer: { type: Boolean, default: false },

    businessName: { type: String, default: "", trim: true },

    address: { type: String, default: "", trim: true },

    tin: { type: String, default: "", trim: true },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },

    company: {
      type: String,
      enum: Object.values(Company),
      default: Company.CANA_GROUP,
    },

    department: {
      type: String,
      enum: Object.values(Department),
      default: null,
    },

    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },

    baseSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    permissions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = model<IUser>("User", userSchema);

export default User;
