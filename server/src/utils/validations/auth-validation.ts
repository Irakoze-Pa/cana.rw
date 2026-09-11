import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name is required"),

  phone: z
    .string()
    .min(10, "Phone number is required"),

  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .min(3, "Address is required"),

  isCompanyCustomer: z.boolean().default(false),

  businessName: z.string().trim().optional().default(""),

  tin: z.string().trim().optional().default(""),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
}).superRefine((data, context) => {
  if (!data.isCompanyCustomer) return;

  if (!data.businessName) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["businessName"], message: "Company name is required for a company account" });
  }

  if (!data.tin) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["tin"], message: "TIN number is required for a company account" });
  }
});

export const loginSchema = z.object({
  phone: z.string().min(1, "Phone is required"),

  password: z.string().min(1, "Password is required"),
});
