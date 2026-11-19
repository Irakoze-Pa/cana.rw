import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Formula from "../modules/formula/formula.model";
import "../modules/product/product.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import { resolveCurrentMaterialPrices } from "../modules/raw-materials/materialPrice.service";
import SupplierMaterial from "../modules/raw-materials/supplierMaterial.model";

dotenv.config();

const round = (value: number) => Number(Number(value || 0).toFixed(4));
const moneyEqual = (left: number, right: number) => Math.abs(left - right) <= 0.01;

async function run() {
  await connectDB();

  const formulas: any[] = await Formula.find({ status: "Active" })
    .populate("product", "name code")
    .sort({ code: 1, version: 1, _id: 1 })
    .lean();

  const materialIds = [
    ...new Set(
      formulas.flatMap((formula) =>
        (formula.items || []).map((item: any) => String(item.rawMaterial)),
      ),
    ),
  ];

  const [materials, activeOffers, formulaPriceMaps] = await Promise.all([
    RawMaterial.find({ _id: { $in: materialIds } })
      .select("name code unit status costPerUnit")
      .lean(),
    SupplierMaterial.find({
      rawMaterial: { $in: materialIds },
      status: "Active",
      unitPrice: { $gt: 0 },
    })
      .select("rawMaterial supplier unitPrice updatedAt")
      .populate("supplier", "name code status")
      .sort({ updatedAt: -1, _id: -1 })
      .lean(),
    Promise.all(
      formulas.map((formula) =>
        resolveCurrentMaterialPrices(
          (formula.items || []).map((item: any) => String(item.rawMaterial)),
        ),
      ),
    ),
  ]);

  const materialById = new Map(materials.map((material: any) => [String(material._id), material]));
  const offersByMaterial = new Map<string, any[]>();
  activeOffers.forEach((offer: any) => {
    if (!offer.supplier || offer.supplier.status !== "Active") return;
    const id = String(offer.rawMaterial);
    if (!offersByMaterial.has(id)) offersByMaterial.set(id, []);
    offersByMaterial.get(id)!.push(offer);
  });

  const missingPrices: Array<Record<string, unknown>> = [];
  const inactiveReferences: Array<Record<string, unknown>> = [];
  const staleFormulaCosts: Array<Record<string, unknown>> = [];
  const unitWarnings: Array<Record<string, unknown>> = [];
  const usageByMaterial = new Map<string, Array<Record<string, any>>>();

  const formulaResults = formulas.map((formula, formulaIndex) => {
    const priceMap = formulaPriceMaps[formulaIndex];
    let recalculatedMaterialCost = 0;

    (formula.items || []).forEach((item: any) => {
      const materialId = String(item.rawMaterial);
      const material: any = materialById.get(materialId);
      const price = priceMap.get(materialId);
      const productName = formula.product?.name || formula.product?.code || "Unknown product";
      const formulaLabel = `${formula.code} V${formula.version}`;

      if (!material || material.status !== "Active") {
        inactiveReferences.push({
          product: productName,
          formula: formulaLabel,
          rawMaterial: material?.name || materialId,
          code: material?.code || "",
          status: material?.status || "Missing",
        });
      }

      const unitPrice = Number(price?.unitPrice || 0);
      if (!(unitPrice > 0)) {
        missingPrices.push({
          product: productName,
          formula: formulaLabel,
          rawMaterial: material?.name || materialId,
          code: material?.code || "",
        });
      } else {
        const requiredQuantity = Number(item.quantity || 0)
          * (1 + Number(item.wastePercentage || 0) / 100);
        recalculatedMaterialCost += requiredQuantity * unitPrice;
      }

      if (material && String(item.unit || "").toLowerCase() !== String(material.unit || "").toLowerCase()) {
        unitWarnings.push({
          product: productName,
          formula: formulaLabel,
          rawMaterial: material.name,
          formulaUnit: item.unit,
          materialPriceUnit: material.unit,
          quantity: item.quantity,
        });
      }

      if (!usageByMaterial.has(materialId)) usageByMaterial.set(materialId, []);
      usageByMaterial.get(materialId)!.push({
        product: productName,
        formula: formulaLabel,
        price: unitPrice,
        source: price?.source || "missing",
        supplier: price?.supplierName || "",
      });
    });

    const savedMaterialCost = Number(formula.estimatedMaterialCost || 0);
    if (!moneyEqual(savedMaterialCost, recalculatedMaterialCost)) {
      staleFormulaCosts.push({
        product: formula.product?.name || formula.product?.code || "Unknown product",
        formula: `${formula.code} V${formula.version}`,
        savedMaterialCost: round(savedMaterialCost),
        currentMaterialCost: round(recalculatedMaterialCost),
        difference: round(savedMaterialCost - recalculatedMaterialCost),
      });
    }

    return {
      product: formula.product?.name || formula.product?.code || "Unknown product",
      formula: `${formula.code} V${formula.version}`,
      batchSize: formula.batchSize,
      materialLines: (formula.items || []).length,
      savedMaterialCost: round(savedMaterialCost),
      currentMaterialCost: round(recalculatedMaterialCost),
      synchronized: moneyEqual(savedMaterialCost, recalculatedMaterialCost),
    };
  });

  const inconsistentMaterialPrices: Array<Record<string, unknown>> = [];
  const materialPriceRegister = materialIds.map((materialId) => {
    const material: any = materialById.get(materialId);
    const usages = usageByMaterial.get(materialId) || [];
    const distinctPrices = [...new Set(usages.map((usage) => round(usage.price)))];
    if (distinctPrices.length > 1) {
      inconsistentMaterialPrices.push({
        rawMaterial: material?.name || materialId,
        code: material?.code || "",
        prices: distinctPrices,
        uses: usages,
      });
    }

    const selected = usages.find((usage) => usage.price > 0);
    const offers = offersByMaterial.get(materialId) || [];
    return {
      rawMaterial: material?.name || materialId,
      code: material?.code || "",
      unit: material?.unit || "",
      currentPrice: round(selected?.price || 0),
      source: selected?.source || "missing",
      selectedSupplier: selected?.supplier || "",
      usedBy: [...new Set(usages.map((usage) => usage.product))],
      activeOffers: offers.map((offer: any) => ({
        supplier: offer.supplier?.name || String(offer.supplier || ""),
        unitPrice: round(offer.unitPrice),
        updatedAt: offer.updatedAt,
      })),
    };
  }).sort((left, right) => left.rawMaterial.localeCompare(right.rawMaterial));

  const fallbacks = materialPriceRegister.filter((item) => item.source !== "supplier_offer");
  const failures = {
    missingPrices,
    inactiveReferences,
    inconsistentMaterialPrices,
    staleFormulaCosts,
  };
  const failed = Object.values(failures).some((items) => items.length > 0);

  console.log(JSON.stringify({
    verified: !failed,
    summary: {
      activeFormulas: formulas.length,
      uniqueRawMaterials: materialIds.length,
      supplierOfferPrices: materialPriceRegister.filter((item) => item.source === "supplier_offer").length,
      fallbackPrices: fallbacks.length,
      missingPrices: missingPrices.length,
      inactiveReferences: inactiveReferences.length,
      inconsistentPrices: inconsistentMaterialPrices.length,
      staleFormulaCosts: staleFormulaCosts.length,
      unitWarnings: unitWarnings.length,
    },
    formulas: formulaResults,
    fallbacks,
    unitWarnings,
    failures,
    materialPriceRegister,
  }, null, 2));

  if (failed) process.exitCode = 1;
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
