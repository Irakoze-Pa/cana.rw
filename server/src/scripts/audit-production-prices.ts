import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import SupplierMaterial from "../modules/raw-materials/supplierMaterial.model";
import { resolveCurrentMaterialPrices } from "../modules/raw-materials/materialPrice.service";

dotenv.config();

const batchNo = String(process.argv.find((value) => value.startsWith("PB-")) || "PB-2026-0012").toUpperCase();
const round = (value: number) => Number(Number(value || 0).toFixed(2));

async function run() {
  await connectDB();
  const batch: any = await ProductionBatch.findOne({ batchNo }).lean();
  if (!batch) throw new Error(`${batchNo} was not found.`);

  const movements: any[] = await InventoryTransaction.find({
    productionBatch: batch._id,
    type: { $in: ["Production Issue", "Production Return"] },
  }).sort({ transactionDate: 1, _id: 1 }).lean();
  const materialIds = [...new Set(movements.map((item) => String(item.rawMaterial)))];
  const [currentPrices, inventories, offers, lots] = await Promise.all([
    resolveCurrentMaterialPrices(materialIds),
    Inventory.find({ rawMaterial: { $in: materialIds } }).lean(),
    SupplierMaterial.find({ rawMaterial: { $in: materialIds }, status: "Active" })
      .populate("supplier", "name code")
      .sort({ updatedAt: -1, _id: -1 })
      .lean(),
    RawMaterialLot.find({ rawMaterial: { $in: materialIds } })
      .populate("supplier", "name code")
      .sort({ receivedAt: -1, _id: -1 })
      .lean(),
  ]);

  const savedLines = new Map((batch.materialCostLines || []).map((line: any) => [String(line.rawMaterial), line]));
  const inventoryByMaterial = new Map(inventories.map((item: any) => [String(item.rawMaterial), item]));

  const materials = materialIds.map((id) => {
    const materialMovements = movements.filter((item) => String(item.rawMaterial) === id);
    const issueQuantity = materialMovements.reduce((sum, item) =>
      sum + (item.type === "Production Return" ? -1 : 1) * Number(item.quantity || 0), 0);
    const issuedValue = materialMovements.reduce((sum, item) => {
      const lineValue = Number(item.totalCost || 0) > 0
        ? Number(item.totalCost)
        : Number(item.quantity || 0) * Number(item.unitCost || 0);
      return sum + (item.type === "Production Return" ? -1 : 1) * lineValue;
    }, 0);
    const price = currentPrices.get(id);
    const inventory: any = inventoryByMaterial.get(id);
    const materialOffers = offers.filter((item: any) => String(item.rawMaterial) === id);
    const materialLots = lots.filter((item: any) => String(item.rawMaterial) === id);
    const saved: any = savedLines.get(id);
    return {
      material: materialMovements[0]?.rawMaterialName || price?.materialName || id,
      code: materialMovements[0]?.rawMaterialCode || price?.materialCode || "",
      quantity: round(issueQuantity),
      unit: materialMovements[0]?.unit || price?.unit || "",
      issuedLotUnitCost: issueQuantity > 0 ? round(issuedValue / issueQuantity) : 0,
      issuedLotValue: round(issuedValue),
      currentResolvedUnitPrice: round(price?.unitPrice || 0),
      currentPriceSource: price?.source || "missing",
      savedBatchUnitPrice: round(saved?.unitPrice || 0),
      savedBatchValue: round(saved?.totalCost || 0),
      inventoryAverage: round(inventory?.averageCostPerUnit || 0),
      activeOffers: materialOffers.map((item: any) => ({
        supplier: item.supplier?.name || String(item.supplier || ""),
        price: round(item.unitPrice),
        updatedAt: item.updatedAt,
      })),
      recentLots: materialLots.slice(0, 3).map((item: any) => ({
        lot: item.lotNumber,
        supplier: item.supplier?.name || String(item.supplier || ""),
        unitCost: round(item.unitCost),
        receivedAt: item.receivedAt,
        receivedQuantity: round(item.receivedQuantity),
        availableQuantity: round(item.availableQuantity),
      })),
      movements: materialMovements.map((item: any) => ({
        type: item.type,
        quantity: round(item.quantity),
        unitCost: round(item.unitCost),
        totalCost: round(item.totalCost),
        lotNumber: item.lotNumber || "",
        date: item.transactionDate,
      })),
    };
  });

  console.log(JSON.stringify({
    batch: {
      batchNo: batch.batchNo,
      product: batch.productName,
      status: batch.status,
      actualQuantity: batch.actualQuantity,
      currentSavedMaterialCost: round(batch.actualMaterialCost),
      currentSavedTotalCost: round(batch.totalActualCost),
      currentSavedCostPerPack: round(batch.costPerPack),
      currentReplacementMaterialCost: round(batch.currentMaterialCost),
      currentReplacementTotalCost: round(batch.currentTotalCost),
      currentReplacementCostPerKg: round(batch.currentCostPerKg),
      currentReplacementCostPerPack: round(batch.currentCostPerPack),
      currentReplacementPriceAsOf: batch.currentCostedAt,
      costPriceAsOf: batch.costPriceAsOf,
    },
    issuedLotMaterialCost: round(materials.reduce((sum, item) => sum + item.issuedLotValue, 0)),
    issuedQuantityAtCurrentPrice: round(materials.reduce((sum, item) => sum + item.quantity * item.currentResolvedUnitPrice, 0)),
    latestFormulaReplacementMaterialCost: round(batch.currentMaterialCost),
    materials,
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
