import mongoose from "mongoose";
import Supplier from "./supplier.model";

import type {
  ISupplier,
} from "./supplier.model";

/* =========================
   CREATE SUPPLIER
========================= */

export const createSupplier = async (
  data: Partial<ISupplier>
) => {
  const suppliedCode = String(data.code || "").trim().toUpperCase();
  let code = suppliedCode;

  if (!code) {
    const count = await Supplier.countDocuments();
    let sequence = count + 1;
    do {
      code = `SUP-${String(sequence).padStart(4, "0")}`;
      sequence += 1;
    } while (await Supplier.exists({ code }));
  }

  const existingSupplier = await Supplier.findOne({ code });

  if (existingSupplier) {
    throw new Error(
      "Supplier code already exists"
    );
  }

  return await Supplier.create({ ...data, code });
};

/* =========================
   GET ALL SUPPLIERS
========================= */

export const getSuppliers = async () => {
  return await Supplier.find()
    .sort({
      createdAt: -1,
    });
};

/* =========================
   GET SUPPLIER BY ID
========================= */

export const getSupplierById = async (
  id: string
) => {
  return await Supplier.findById(id);
};

/* =========================
   UPDATE SUPPLIER
========================= */

export const updateSupplier = async (
  id: string,
  data: Partial<ISupplier>
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid supplier.");
  }

  const existing = await Supplier.findById(id);
  if (!existing) return null;

  const update: Record<string, unknown> = {};
  const textFields = [
    "contactPerson",
    "phone",
    "address",
    "city",
    "country",
    "paymentTerms",
    "notes",
  ] as const;

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new Error("Supplier name is required.");
    update.name = name;
  }

  if (data.code !== undefined) {
    const code = String(data.code || "").trim().toUpperCase();
    if (code) {
      const duplicate = await Supplier.exists({ code, _id: { $ne: existing._id } });
      if (duplicate) throw new Error("Supplier code already exists.");
      update.code = code;
    }
    // An empty edit should not erase a supplier's established identifier.
  }

  for (const field of textFields) {
    if (data[field] !== undefined) update[field] = String(data[field] || "").trim();
  }

  if (data.email !== undefined) {
    update.email = String(data.email || "").trim().toLowerCase();
  }

  if (data.status !== undefined) {
    if (!["Active", "Inactive"].includes(String(data.status))) {
      throw new Error("Select a valid supplier status.");
    }
    update.status = data.status;
  }

  return Supplier.findByIdAndUpdate(id, { $set: update }, {
    new: true,
    runValidators: true,
  });
};

/* =========================
   DELETE SUPPLIER
========================= */

export const deleteSupplier = async (
  id: string
) => {
  return await Supplier.findByIdAndDelete(
    id
  );
};
