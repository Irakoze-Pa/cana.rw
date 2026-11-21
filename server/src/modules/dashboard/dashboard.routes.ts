import { Router } from "express";
import Product from "../product/product.model";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import SalesOrder from "../sales/salesOrder.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import Quotation from "../quotation/quotation.model";
import { Invoice, Payment } from "../billing/billing.model";
import { ComplianceEquipment, ComplianceRecord } from "../compliance/compliance.model";
import FinishedGoodsStoreBalance from "../finishedGoods/storeBalance.model";
import { accountingSummary, buildLedger, filterLedger, treasuryWorkspace } from "../accounting/accounting.service";
import { authorizeRoles, protect, type AuthRequest } from "../../middleware/auth.middleware";
import User from "../../models/users";

const router = Router();
router.use(protect, authorizeRoles("admin", "staff"));

router.get("/summary", async (req: AuthRequest, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const monthStartDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    const nextMonthDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 1);
    const trendStartDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 5, 1);
    const outstandingInvoiceFilter = { balance: { $gt: 0 }, status: { $in: ["issued", "partially_paid"] } };
    const [products, lowRawMaterials, lowFinishedGoods, purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, outstandingInvoiceCount, outstandingInvoices, invoiceBalanceTotals, overdueInvoices, salesTotals, salesTrendTotals, deliveryTrendTotals, paymentTrendTotals, recentQuotations, activeEquipment, openCompliance, overdueCompliance] = await Promise.all([
      Product.countDocuments({ status: "Active" }),
      RawMaterial.countDocuments({ status: "Active", $expr: { $lte: ["$availableQuantity", "$minimumStock"] } }),
      FinishedGoodsStoreBalance.countDocuments({ minimumQuantity: { $gt: 0 }, $expr: { $lte: ["$quantity", "$minimumQuantity"] } }),
      PurchaseOrder.countDocuments({ status: { $in: ["pending_approval", "approved", "partially_received"] } }),
      ProductionBatch.countDocuments({ status: { $in: ["Ready", "In Progress", "Paused"] } }),
      ProductionBatch.countDocuments({ status: "Completed" }),
      SalesOrder.countDocuments({ status: { $in: ["draft", "confirmed", "in_production", "ready_for_delivery"] } }),
      SalesOrder.find().sort({ createdAt: -1 }).limit(6).populate("customer", "fullName phone businessName").select("orderNumber status total createdAt customer requestedDeliveryDate deliveryAddress items").lean(),
      Quotation.countDocuments({ status: "Pending" }),
      Invoice.countDocuments(outstandingInvoiceFilter),
      Invoice.find(outstandingInvoiceFilter).sort({ dueDate: 1, createdAt: -1 }).limit(6).populate("customer", "fullName businessName").select("invoiceNumber balance dueDate status customer").lean(),
      Invoice.aggregate([{ $match: outstandingInvoiceFilter }, { $group: { _id: null, total: { $sum: "$balance" } } }]),
      Invoice.countDocuments({ ...outstandingInvoiceFilter, dueDate: { $lt: startOfToday } }),
      SalesOrder.aggregate([
        { $match: { status: { $ne: "cancelled" }, $or: [{ createdAt: { $gte: monthStartDate, $lt: nextMonthDate } }, { deliveredAt: { $gte: monthStartDate, $lt: nextMonthDate } }] } },
        { $group: { _id: null,
          total: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", monthStartDate] }, { $lt: ["$createdAt", nextMonthDate] }] }, "$total", 0] } },
          delivered: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", monthStartDate] }, { $lt: ["$deliveredAt", nextMonthDate] }] }, "$total", 0] } },
          orders: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", monthStartDate] }, { $lt: ["$createdAt", nextMonthDate] }] }, 1, 0] } },
          deliveredOrders: { $sum: { $cond: [{ $and: [{ $gte: ["$deliveredAt", monthStartDate] }, { $lt: ["$deliveredAt", nextMonthDate] }] }, 1, 0] } },
        } },
      ]),
      SalesOrder.aggregate([
        { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: trendStartDate, $lt: nextMonthDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Africa/Kigali" } }, amount: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      SalesOrder.aggregate([
        { $match: { status: "delivered", deliveredAt: { $gte: trendStartDate, $lt: nextMonthDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$deliveredAt", timezone: "Africa/Kigali" } }, amount: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { invoice: { $exists: true, $ne: null }, status: { $ne: "void" }, $or: [
          { method: { $ne: "bank_cheque" }, receivedAt: { $gte: trendStartDate, $lt: nextMonthDate } },
          { method: "bank_cheque", chequeStatus: "cleared", clearedAt: { $gte: trendStartDate, $lt: nextMonthDate } },
        ] } },
        { $lookup: { from: "invoices", localField: "invoice", foreignField: "_id", as: "invoiceRecord" } },
        { $unwind: "$invoiceRecord" },
        { $match: { "invoiceRecord.status": { $ne: "void" } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$clearedAt", "$receivedAt"] }, timezone: "Africa/Kigali" } }, amount: { $sum: "$amount" } } },
      ]),
      Quotation.find({ status: "Pending" }).sort({ createdAt: -1 }).limit(5).populate("customer", "fullName").select("createdAt customer items").lean(),
      ComplianceEquipment.countDocuments({ status: "active" }),
      ComplianceRecord.countDocuments({ status: "open" }),
      ComplianceRecord.countDocuments({ scheduledDate: { $lt: today }, status: "open" }),
    ]);
    const sales = salesTotals[0] || { total: 0, delivered: 0, orders: 0, deliveredOrders: 0 };
    const monthKey = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, "0")}`;
    const salesTrend = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 5 + index, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: monthDate.toLocaleDateString("en-RW", { month: "short" }),
        sales: Number(salesTrendTotals.find((item: any) => item._id === key)?.amount || 0),
        delivered: Number(deliveryTrendTotals.find((item: any) => item._id === key)?.amount || 0),
        collected: Number(paymentTrendTotals.find((item: any) => item._id === key)?.amount || 0),
      };
    });
    const invoiceBalance = invoiceBalanceTotals[0]?.total || 0;
    let finance = {};
    const profile: any = req.user?.role === "staff" ? await User.findById(req.user.id).select("department permissions").lean() : null;
    const canSeeFinance = req.user?.role !== "staff" || profile?.permissions?.includes("finance") || ["finance", "management"].includes(String(profile?.department));
    if (canSeeFinance) {
      const monthStart = monthStartDate.toISOString().slice(0, 10);
      const [ledger, treasury] = await Promise.all([buildLedger(), treasuryWorkspace()]);
      const financial = accountingSummary(filterLedger(ledger, monthStart, today), filterLedger(ledger, undefined, today));
      finance = { treasuryBalance: treasury.accounts.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0), activeTreasuryAccounts: treasury.accounts.filter((account: any) => account.status === "active").length, periodRevenue: financial.revenue, periodExpenses: financial.expenses, netProfit: financial.netProfit, supplierPayables: financial.payables, customerReceivables: financial.receivables };
    }
    res.json({ data: { products, lowStock: lowRawMaterials, lowRawMaterials, lowFinishedGoods, purchaseOrders, activeBatches, completedBatches, openSales, recentSales, pendingQuotations, outstandingInvoices: outstandingInvoiceCount, outstandingBalance: invoiceBalance, overdueInvoices, salesValue: sales.total || 0, deliveredValue: sales.delivered || 0, salesCollectedValue: Number(paymentTrendTotals.find((item: any) => item._id === monthKey)?.amount || 0), monthSalesOrders: sales.orders || 0, monthDeliveredOrders: sales.deliveredOrders || 0, salesTrend, outstandingInvoiceList: outstandingInvoices, recentQuotations, activeEquipment, openCompliance, overdueCompliance, reportingPeriod: { from: monthStartDate.toISOString(), to: nextMonthDate.toISOString() }, ...finance } });
  } catch (error) { next(error); }
});

export default router;
