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
  return await Supplier.findByIdAndUpdate(
    id,
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
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
