import type { Request, Response } from "express";
import { z } from "zod";
import ContactInquiry from "./contact.model";

const contactInquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z.string().trim().min(6, "Please enter a valid phone number.").max(30),
  email: z.union([z.string().trim().email("Please enter a valid email address."), z.literal("")]).optional(),
  service: z.string().trim().max(100).optional(),
  message: z.string().trim().min(10, "Please provide a little more detail.").max(2000),
});

export const createContactInquiry = async (req: Request, res: Response) => {
  const parsed = contactInquirySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid contact enquiry.",
    });
  }

  const inquiry = await ContactInquiry.create({
    ...parsed.data,
    email: parsed.data.email || undefined,
    service: parsed.data.service || undefined,
  });

  return res.status(201).json({
    success: true,
    message: "Thanks — your enquiry has been received.",
    data: { id: inquiry.id },
  });
};
