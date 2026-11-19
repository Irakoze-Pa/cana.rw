import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Inventory from "../modules/inventory/inventory.model";
import InventoryTransaction from "../modules/inventory/inventoryTransaction.model";
import ProductionBatch from "../modules/production/productionBatch/productionBatch.model";
import RawMaterial from "../modules/raw-materials/rawMaterial.model";
import RawMaterialLot from "../modules/raw-materials/rawMaterialLot.model";
import SupplierMaterial from "../modules/raw-materials/supplierMaterial.model";
import "../modules/suppliers/supplier.model";

dotenv.config();
const round = (value: number) => Number(Number(value || 0).toFixed(2));

async function run() {
  await connectDB();
  const batches: any[] = await ProductionBatch.find({
    status: "Completed",
    materialCostLines: { $elemMatch: { priceSource: { $ne: "production_issue" } } },
  }).sort({ batchNo: 1 }).lean();
  const rows: any[] = [];

  for (const batch of batches) {
    const fallbackLines = (batch.materialCostLines || []).filter((line: any) => line.priceSource !== "production_issue");
    for (const line of fallbackLines) {
      const issueMovements: any[] = await InventoryTransaction.find({
        productionBatch: batch._id,
        rawMaterial: line.rawMaterial,
        type: { $in: ["Production Issue", "Production Return"] },
      }).sort({ transactionDate: 1 }).lean();
      const asOf = issueMovements[issueMovements.length - 1]?.transactionDate || batch.endDate || batch.createdAt;
      const [purchase, lot, inventory, material, offers] = await Promise.all([
        InventoryTransaction.findOne({
          rawMaterial: line.rawMaterial,
          type: { $in: ["Purchase", "Opening Balance"] },
          transactionDate: { $lte: asOf },
          $or: [{ unitCost: { $gt: 0 } }, { totalCost: { $gt: 0 } }],
        }).sort({ transactionDate: -1, _id: -1 }).lean(),
        RawMaterialLot.findOne({
          rawMaterial: line.rawMaterial,
          receivedAt: { $lte: asOf },
          unitCost: { $gt: 0 },
        }).populate("supplier", "name code").sort({ receivedAt: -1, _id: -1 }).lean(),
        Inventory.findOne({ rawMaterial: line.rawMaterial }).lean(),
        RawMaterial.findById(line.rawMaterial).select("name code unit costPerUnit").lean(),
        SupplierMaterial.find({ rawMaterial: line.rawMaterial, status: "Active", unitPrice: { $gt: 0 } })
          .populate("supplier", "name code")
          .sort({ updatedAt: -1, _id: -1 })
          .lean(),
      ]);
      const purchaseUnitCost = Number(purchase?.unitCost || 0) > 0
        ? Number(purchase!.unitCost)
        : Number(purchase?.quantity || 0) > 0
          ? Number(purchase?.totalCost || 0) / Number(purchase?.quantity)
          : 0;
      rows.push({
        batch: batch.batchNo,
        product: batch.productName,
        asOf,
        material: line.rawMaterialName,
        quantity: round(line.quantity),
        savedFallbackPrice: round(line.unitPrice),
        savedSource: line.priceSource,
        issueMovements: issueMovements.map((item) => ({
          quantity: round(item.quantity),
          unitCost: round(item.unitCost),
          totalCost: round(item.totalCost),
          lotNumber: item.lotNumber || "",
          date: item.transactionDate,
        })),
        historicalPurchase: purchase ? {
          unitCost: round(purchaseUnitCost),
          date: purchase.transactionDate,
          lotNumber: purchase.lotNumber || "",
        } : null,
        historicalLot: lot ? {
          unitCost: round(lot.unitCost),
          receivedAt: lot.receivedAt,
          lotNumber: lot.lotNumber,
          supplier: (lot.supplier as any)?.name || "",
        } : null,
        currentInventoryAverage: round(inventory?.averageCostPerUnit || 0),
        setupPrice: round((material as any)?.costPerUnit || 0),
        currentOffers: offers.map((offer: any) => ({
          supplier: offer.supplier?.name || "",
          unitPrice: round(offer.unitPrice),
          updatedAt: offer.updatedAt,
        })),
      });
    }
  }

  console.log(JSON.stringify({ fallbackLines: rows.length, rows }, null, 2));
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
