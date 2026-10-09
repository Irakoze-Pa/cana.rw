import { Router } from "express";
import Product from "../product/product.model";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import SalesOrder from "../sales/salesOrder.model";
import ProductionOrder from "../production/productionOrder/productionOrder.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import Quotation from "../quotation/quotation.model";
import { Invoice } from "../billing/billing.model";
import { ComplianceEquipment, ComplianceRecord } from "../compliance/compliance.model";
import FinishedGoodsStoreBalance from "../finishedGoods/storeBalance.model";
import { accountingSummary, buildLedger, filterLedger, treasuryWorkspace } from "../accounting/accounting.service";
import type { AuthRequest } from "../../middleware/auth.middleware";
import User from "../../models/users";

const router = Router();

router.get("/summary", async (req: AuthRequest, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const outstandingInvoiceFilter = { balance: { $gt: 0 }, status: { $ne: "void" } };
    const [products, lowRawMaterials, lowFinishedGoods, purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, openProductionOrders, lowMaterials, outstandingInvoiceCount, outstandingInvoices, invoiceBalanceTotals, overdueInvoices, salesTotals, recentQuotations, attentionOrders, activeEquipment, openCompliance, overdueCompliance] = await Promise.all([
      Product.countDocuments({ status: "Active" }),
      RawMaterial.countDocuments({ status: "Active", $expr: { $lte: ["$availableQuantity", "$minimumStock"] } }),
      FinishedGoodsStoreBalance.countDocuments({ minimumQuantity: { $gt: 0 }, $expr: { $lte: ["$quantity", "$minimumQuantity"] } }),
      PurchaseOrder.countDocuments({ status: { $in: ["pending_approval", "approved", "partially_received"] } }),
      ProductionBatch.countDocuments({ status: { $in: ["Ready", "In Progress", "Paused"] } }),
      ProductionBatch.countDocuments({ status: "Completed" }),
      SalesOrder.countDocuments({ status: { $in: ["draft", "confirmed", "in_production", "ready_for_delivery"] } }),
      SalesOrder.find().sort({ createdAt: -1 }).limit(6).populate("customer", "fullName phone businessName").select("orderNumber status total createdAt customer requestedDeliveryDate deliveryAddress items").lean(),
      Quotation.countDocuments({ status: "Pending" }),
      ProductionOrder.countDocuments({ status: { $in: ["Draft", "Planned", "Released", "In Production", "On Hold"] } }),
      RawMaterial.find({ status: "Active", $expr: { $lte: ["$availableQuantity", "$minimumStock"] } }).select("name code availableQuantity minimumStock unit").limit(6).lean(),
      Invoice.countDocuments(outstandingInvoiceFilter),
      Invoice.find(outstandingInvoiceFilter).sort({ dueDate: 1, createdAt: -1 }).limit(6).populate("customer", "fullName businessName").select("invoiceNumber balance dueDate status customer").lean(),
      Invoice.aggregate([{ $match: outstandingInvoiceFilter }, { $group: { _id: null, total: { $sum: "$balance" } } }]),
      Invoice.countDocuments({ ...outstandingInvoiceFilter, dueDate: { $lt: startOfToday } }),
      SalesOrder.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: null, total: { $sum: "$total" }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$total", 0] } } } }]),
      Quotation.find({ status: "Pending" }).sort({ createdAt: -1 }).limit(5).populate("customer", "fullName").select("createdAt customer items").lean(),
      SalesOrder.find({ status: { $in: ["draft", "submitted", "confirmed", "in_production", "ready_for_delivery"] } }).sort({ requestedDeliveryDate: 1, createdAt: 1 }).limit(6).populate("customer", "fullName phone businessName").select("orderNumber status total createdAt requestedDeliveryDate deliveryAddress customer items").lean(),
      ComplianceEquipment.countDocuments({ status: "active" }),
      ComplianceRecord.countDocuments({ status: { $in: ["open", "completed"] } }),
      ComplianceRecord.countDocuments({ scheduledDate: { $lt: today }, status: { $in: ["open", "completed"] } }),
    ]);
    const sales = salesTotals[0] || { total: 0, delivered: 0 };
    const invoiceBalance = invoiceBalanceTotals[0]?.total || 0;
    let finance = {};
    const profile: any = req.user?.role === "staff" ? await User.findById(req.user.id).select("department permissions").lean() : null;
    const canSeeFinance = req.user?.role !== "staff" || profile?.permissions?.includes("finance") || ["finance", "management"].includes(String(profile?.department));
    if (canSeeFinance) {
      const monthStart = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1).toISOString().slice(0, 10);
      const [ledger, treasury] = await Promise.all([buildLedger(), treasuryWorkspace()]);
      const financial = accountingSummary(filterLedger(ledger, monthStart, today), filterLedger(ledger, undefined, today));
      finance = { treasuryBalance: treasury.accounts.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0), activeTreasuryAccounts: treasury.accounts.filter((account: any) => account.status === "active").length, periodRevenue: financial.revenue, periodExpenses: financial.expenses, netProfit: financial.netProfit, supplierPayables: financial.payables, customerReceivables: financial.receivables };
    }
    res.json({ data: { products, lowStock: lowRawMaterials, lowRawMaterials, lowFinishedGoods, purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, openProductionOrders, outstandingInvoices: outstandingInvoiceCount, outstandingBalance: invoiceBalance, overdueInvoices, salesValue: sales.total || 0, deliveredValue: sales.delivered || 0, lowMaterials, outstandingInvoiceList: outstandingInvoices, recentQuotations, attentionOrders, activeEquipment, openCompliance, overdueCompliance, ...finance } });
  } catch (error) { next(error); }
});

export default router;
