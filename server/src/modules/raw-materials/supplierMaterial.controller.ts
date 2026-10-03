import { Request, Response } from "express";
import mongoose from "mongoose";

import Supplier from "../suppliers/supplier.model";
import RawMaterial from "./rawMaterial.model";
import SupplierMaterial from "./supplierMaterial.model";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to save supplier material offers.";

const populate = (query: ReturnType<typeof SupplierMaterial.find>) =>
  query
    .populate("supplier", "name code status")
    .populate("rawMaterial", "name code unit category packSizes status");

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const numericValue = (value: unknown, label: string) => {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
  return result;
};

const normaliseOffer = (offer: Record<string, unknown>) => ({
  rawMaterial: offer.rawMaterial,
  supplierCode: String(offer.supplierCode || "").trim(),
  unitPrice: numericValue(offer.unitPrice, "Unit price"),
  leadTimeDays: numericValue(offer.leadTimeDays, "Lead time"),
  minimumOrderQuantity: numericValue(
    offer.minimumOrderQuantity,
    "Minimum order quantity",
  ),
  status: offer.status === "Inactive" ? "Inactive" : "Active",
});

const validateSupplierAndMaterials = async (
  supplierId: unknown,
  offers: Array<Record<string, unknown>>,
) => {
  if (!isObjectId(supplierId)) throw new Error("Select a valid supplier.");

  const supplier = await Supplier.findOne({ _id: supplierId, status: "Active" })
    .select("_id")
    .lean();
  if (!supplier) throw new Error("Select an active supplier.");
  if (!offers.length) throw new Error("Add at least one raw material.");

  const materialIds = offers.map((offer) => offer.rawMaterial);
  if (!materialIds.every(isObjectId)) {
    throw new Error("Each offer must have a valid raw material.");
  }
  if (new Set(materialIds).size !== materialIds.length) {
    throw new Error("Add each raw material only once for this supplier.");
  }

  const materialCount = await RawMaterial.countDocuments({
    _id: { $in: materialIds },
    status: "Active",
  });
  if (materialCount !== materialIds.length) {
    throw new Error("Each offer must reference an active raw material.");
  }
};

export async function list(_req: Request, res: Response) {
  try {
    const offers = await populate(SupplierMaterial.find().sort({ createdAt: -1 })).lean();
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: message(error) });
  }
}

/** A repeat supplier/material pair updates the existing offer instead of duplicating it. */
export async function create(req: Request, res: Response) {
  try {
    const { supplier, rawMaterial, ...details } = req.body || {};
    const offer = normaliseOffer({ rawMaterial, ...details });
    await validateSupplierAndMaterials(supplier, [offer]);

    const record = await SupplierMaterial.findOneAndUpdate(
      { supplier, rawMaterial },
      { $set: { ...offer, supplier, rawMaterial } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    res.status(200).json({
      success: true,
      message: "Supplier offer saved successfully.",
      data: await populate(SupplierMaterial.findById(record!._id)).lean(),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: message(error) });
  }
}

/** Save several materials under one supplier in one bulk operation. */
export async function saveMany(req: Request, res: Response) {
  try {
    const supplier = req.body?.supplier;
    const submittedOffers = req.body?.offers;
    if (!Array.isArray(submittedOffers)) {
      throw new Error("Add at least one supplier material offer.");
    }

    const offers = submittedOffers.map((offer) => normaliseOffer(offer || {}));
    await validateSupplierAndMaterials(supplier, offers);

    await SupplierMaterial.bulkWrite(
      offers.map((offer) => ({
        updateOne: {
          filter: { supplier, rawMaterial: offer.rawMaterial },
          update: { $set: { ...offer, supplier } },
          upsert: true,
        },
      })),
      { ordered: true },
    );

    const saved = await populate(
      SupplierMaterial.find({
        supplier,
        rawMaterial: { $in: offers.map((offer) => offer.rawMaterial) },
      }),
    ).lean();
    res.json({
      success: true,
      message: `${offers.length} supplier material ${offers.length === 1 ? "offer was" : "offers were"} saved.`,
      data: saved,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: message(error) });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const current = await SupplierMaterial.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Supplier material offer not found." });
    }

    const details = normaliseOffer({
      ...req.body,
      rawMaterial: current.rawMaterial.toString(),
    });
    const record = await SupplierMaterial.findByIdAndUpdate(
      current._id,
      { $set: details },
      { returnDocument: "after", runValidators: true },
    );
    res.json({
      success: true,
      message: "Supplier offer updated successfully.",
      data: await populate(SupplierMaterial.findById(record!._id)).lean(),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: message(error) });
  }
}
