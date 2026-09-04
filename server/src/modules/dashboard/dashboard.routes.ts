import { Router } from "express";
import Product from "../product/product.model";
import Inventory from "../inventory/inventory.model";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import SalesOrder from "../sales/salesOrder.model";
import ProductionOrder from "../production/productionOrder/productionOrder.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import Quotation from "../quotation/quotation.model";
import { Invoice } from "../billing/billing.model";
import { ComplianceEquipment, ComplianceRecord } from "../compliance/compliance.model";

const router = Router();

router.get("/summary", async (_req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [products, lowStock, purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, openProductionOrders, lowMaterials, outstandingInvoices, salesTotals, recentQuotations, attentionOrders, activeEquipment, openCompliance, overdueCompliance] = await Promise.all([
      Product.countDocuments({ status: "Active" }),
      Inventory.countDocuments({ status: { $in: ["Low Stock", "Out of Stock"] } }),
      PurchaseOrder.countDocuments({ status: { $in: ["pending_approval", "approved", "partially_received"] } }),
      ProductionBatch.countDocuments({ status: { $in: ["Ready", "In Progress", "Paused"] } }),
      ProductionBatch.countDocuments({ status: "Completed" }),
      SalesOrder.countDocuments({ status: { $in: ["draft", "confirmed", "in_production", "ready_for_delivery"] } }),
      SalesOrder.find().sort({ createdAt: -1 }).limit(6).populate("customer", "fullName").select("orderNumber status total createdAt customer").lean(),
      Quotation.countDocuments({ status: "Pending" }),
      ProductionOrder.countDocuments({ status: { $in: ["Draft", "Planned", "Released", "In Production", "On Hold"] } }),
      RawMaterial.find({ status: "Active", $expr: { $lte: ["$availableQuantity", "$minimumStock"] } }).select("name code availableQuantity minimumStock unit").limit(6).lean(),
      Invoice.find({ balance: { $gt: 0 }, status: { $ne: "void" } }).sort({ dueDate: 1, createdAt: -1 }).limit(6).populate("customer", "fullName").select("invoiceNumber balance dueDate status customer").lean(),
      SalesOrder.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: null, total: { $sum: "$total" }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$total", 0] } } } }]),
      Quotation.find({ status: "Pending" }).sort({ createdAt: -1 }).limit(5).populate("customer", "fullName").select("createdAt customer items").lean(),
      SalesOrder.find({ status: { $in: ["draft", "confirmed", "in_production", "ready_for_delivery"] } }).sort({ requestedDeliveryDate: 1, createdAt: 1 }).limit(6).populate("customer", "fullName").select("orderNumber status total requestedDeliveryDate customer").lean(),
      ComplianceEquipment.countDocuments({ status: "active" }),
      ComplianceRecord.countDocuments({ status: { $in: ["open", "completed"] } }),
      ComplianceRecord.countDocuments({ scheduledDate: { $lt: today }, status: { $in: ["open", "completed"] } }),
    ]);
    const sales = salesTotals[0] || { total: 0, delivered: 0 };
    res.json({ data: { products, lowStock: Math.max(lowStock, lowMaterials.length), purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, openProductionOrders, outstandingInvoices: outstandingInvoices.length, salesValue: sales.total || 0, deliveredValue: sales.delivered || 0, lowMaterials, outstandingInvoiceList: outstandingInvoices, recentQuotations, attentionOrders, activeEquipment, openCompliance, overdueCompliance } });
  } catch (error) { next(error); }
});

export default router;
