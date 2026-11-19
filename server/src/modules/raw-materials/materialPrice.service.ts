import mongoose from "mongoose";

import Inventory from "../inventory/inventory.model";
import "../suppliers/supplier.model";
import RawMaterial from "./rawMaterial.model";
import SupplierMaterial from "./supplierMaterial.model";

export type MaterialPriceSource =
  | "supplier_offer"
  | "inventory_average"
  | "material_setup";

export interface CurrentMaterialPrice {
  rawMaterial: string;
  materialName: string;
  materialCode: string;
  unit: string;
  unitPrice: number;
  source: MaterialPriceSource;
  supplier?: string;
  supplierName?: string;
  offerUpdatedAt?: Date;
}

/**
 * Resolve the price used for current/replacement production costing.
 *
 * Priority is deliberately consistent across current formula, planning and
 * replacement-cost views:
 * 1. most recently updated active supplier offer;
 * 2. current inventory weighted-average cost;
 * 3. raw-material setup price.
 *
 * The caller decides whether an unresolved price is allowed. Stock movements
 * are never changed by this resolver.
 */
export async function resolveCurrentMaterialPrices(
  rawMaterialIds: Array<string | mongoose.Types.ObjectId>,
) {
  const ids = [...new Set(rawMaterialIds.map(String))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!ids.length) return new Map<string, CurrentMaterialPrice>();

  const [materials, inventories, offers] = await Promise.all([
    RawMaterial.find({ _id: { $in: ids } })
      .select("name code unit costPerUnit")
      .lean(),
    Inventory.find({ rawMaterial: { $in: ids } })
      .select("rawMaterial quantity averageCostPerUnit")
      .lean(),
    SupplierMaterial.find({
      rawMaterial: { $in: ids },
      status: "Active",
      unitPrice: { $gt: 0 },
    })
      .select("rawMaterial supplier unitPrice updatedAt")
      .populate("supplier", "name code status")
      .sort({ updatedAt: -1, _id: -1 })
      .lean(),
  ]);

  const materialById = new Map(
    materials.map((material: any) => [String(material._id), material]),
  );
  const inventoryById = new Map(
    inventories.map((inventory: any) => [String(inventory.rawMaterial), inventory]),
  );
  const latestOfferById = new Map<string, any>();
  offers.forEach((offer: any) => {
    // An offer cannot be current when its supplier has been disabled or
    // deleted, even if the offer record itself still says Active.
    if (!offer.supplier || offer.supplier.status !== "Active") return;
    const id = String(offer.rawMaterial);
    if (!latestOfferById.has(id)) latestOfferById.set(id, offer);
  });

  const result = new Map<string, CurrentMaterialPrice>();
  ids.forEach((id) => {
    const material: any = materialById.get(id);
    if (!material) return;

    const offer: any = latestOfferById.get(id);
    const offerPrice = Number(offer?.unitPrice || 0);
    if (offerPrice > 0) {
      const supplier: any = offer.supplier;
      result.set(id, {
        rawMaterial: id,
        materialName: String(material.name || "Raw material"),
        materialCode: String(material.code || ""),
        unit: String(material.unit || "kg"),
        unitPrice: offerPrice,
        source: "supplier_offer",
        supplier: supplier?._id ? String(supplier._id) : supplier ? String(supplier) : undefined,
        supplierName: supplier?.name || undefined,
        offerUpdatedAt: offer.updatedAt ? new Date(offer.updatedAt) : undefined,
      });
      return;
    }

    const inventory: any = inventoryById.get(id);
    const inventoryPrice = Number(inventory?.averageCostPerUnit || 0);
    if (Number(inventory?.quantity || 0) > 0 && inventoryPrice > 0) {
      result.set(id, {
        rawMaterial: id,
        materialName: String(material.name || "Raw material"),
        materialCode: String(material.code || ""),
        unit: String(material.unit || "kg"),
        unitPrice: inventoryPrice,
        source: "inventory_average",
      });
      return;
    }

    const setupPrice = Number(material.costPerUnit || 0);
    if (setupPrice > 0) {
      result.set(id, {
        rawMaterial: id,
        materialName: String(material.name || "Raw material"),
        materialCode: String(material.code || ""),
        unit: String(material.unit || "kg"),
        unitPrice: setupPrice,
        source: "material_setup",
      });
    }
  });

  return result;
}
