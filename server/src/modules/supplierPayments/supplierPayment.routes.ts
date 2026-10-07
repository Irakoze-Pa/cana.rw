import { Router } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import Supplier from "../suppliers/supplier.model";
import SupplierPayment, { SupplierOpeningPayable } from "./supplierPayment.model";

const router = Router();
const paymentMethods = ["cash", "bank_transfer", "bank_cheque", "mobile_money", "other"];
const activeChequeStatuses = ["issued", "due", "deposited"];
const amountOf = (value: unknown) => Number(Number(value).toFixed(2));
const nextNumber = async (prefix: string, model: mongoose.Model<any>, field: string) => {
  const year = new Date().getFullYear(); const numberPrefix = `${prefix}-${year}-`;
  const latest = await model.findOne({ [field]: new RegExp(`^${numberPrefix}\\d+$`) }).sort({ [field]: -1 }).select(field).lean();
  const previous = Number(String(latest?.[field] || "").slice(numberPrefix.length));
  return `${numberPrefix}${String((Number.isFinite(previous) ? previous : 0) + 1).padStart(5, "0")}`;
};
const populatedPayment = (id: unknown) => SupplierPayment.findById(id).populate("supplier", "name code").populate("purchaseOrder", "poNumber total").populate("openingPayable", "openingNumber amount balance status description").lean();
const clearedFilter = { $or: [{ chequeStatus: "cleared" }, { chequeStatus: { $exists: false } }] };
async function refreshDueCheques() {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  await SupplierPayment.updateMany({ method: "bank_cheque", chequeStatus: "issued", chequeDate: { $lte: endOfToday } }, { $set: { chequeStatus: "due" }, $push: { statusHistory: { status: "due", at: new Date(), note: "Maturity date reached" } } });
}
async function applyOpeningPayment(openingPayable: unknown, amount: number) {
  if (!openingPayable) return;
  const opening = await SupplierOpeningPayable.findById(openingPayable);
  if (!opening || opening.status === "void") throw new Error("The opening payable is no longer available.");
  if (amount > Number(opening.balance || 0) + 0.0001) throw new Error("Payment exceeds the remaining opening payable balance.");
  opening.amountPaid = amountOf(Number(opening.amountPaid || 0) + amount); opening.balance = amountOf(Number(opening.amount) - Number(opening.amountPaid)); opening.status = opening.balance <= 0 ? "paid" : "partially_paid"; await opening.save();
}

router.get("/", async (_req, res, next) => {
  try { await refreshDueCheques(); res.json({ data: await SupplierPayment.find().populate("supplier", "name code").populate("purchaseOrder", "poNumber total").populate("openingPayable", "openingNumber amount balance status description").sort({ createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.get("/opening-payables", async (_req, res, next) => {
  try { res.json({ data: await SupplierOpeningPayable.find().populate("supplier", "name code phone").sort({ openingDate: -1, createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.get("/supplier-accounts", async (_req, res, next) => {
  try {
    await refreshDueCheques();
    const [suppliers, orders, openings, payments] = await Promise.all([
      Supplier.find().select("name code phone status").sort({ name: 1 }).lean(),
      PurchaseOrder.find({ status: { $in: ["received", "partially_received"] } }).select("supplier total").lean(),
      SupplierOpeningPayable.find({ status: { $ne: "void" } }).select("supplier amount balance").lean(),
      SupplierPayment.find().select("supplier purchaseOrder openingPayable amount method chequeStatus").lean(),
    ]);
    res.json({ data: suppliers.map((supplier) => {
      const id = String(supplier._id);
      const supplierOrders = orders.filter((order) => String(order.supplier) === id);
      const supplierOpenings = openings.filter((opening) => String(opening.supplier) === id);
      const supplierPayments = payments.filter((payment) => String(payment.supplier) === id);
      const cleared = supplierPayments.filter((payment: any) => !payment.chequeStatus || payment.chequeStatus === "cleared");
      const pending = supplierPayments.filter((payment: any) => payment.method === "bank_cheque" && activeChequeStatuses.includes(payment.chequeStatus));
      const poPaid = cleared.filter((payment) => payment.purchaseOrder).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const purchaseOrderTotal = supplierOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const balance = Math.max(0, purchaseOrderTotal - poPaid) + supplierOpenings.reduce((sum, opening) => sum + Number(opening.balance || 0), 0);
      const pendingCheques = pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      return { supplier, purchaseOrderTotal, openingTotal: supplierOpenings.reduce((sum, opening) => sum + Number(opening.amount || 0), 0), amountPaid: cleared.reduce((sum, payment) => sum + Number(payment.amount || 0), 0), pendingCheques, balance, expectedBalance: Math.max(0, balance - pendingCheques) };
    }) });
  } catch (error) { next(error); }
});

router.post("/opening-payables", async (req, res, next) => {
  try {
    const { supplier, amount, openingDate, dueDate, description, notes } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(supplier)) throw new Error("Select a valid supplier.");
    const openingAmount = amountOf(amount);
    if (!Number.isFinite(openingAmount) || openingAmount <= 0) throw new Error("Opening payable must be greater than zero.");
    if (openingDate && !Number.isFinite(new Date(openingDate).getTime())) throw new Error("Enter a valid opening date.");
    if (dueDate && !Number.isFinite(new Date(dueDate).getTime())) throw new Error("Enter a valid due date.");
    if (!(await Supplier.exists({ _id: supplier }))) throw new Error("Supplier not found.");
    const payable = await SupplierOpeningPayable.create({ openingNumber: await nextNumber("SOB", SupplierOpeningPayable, "openingNumber"), supplier, amount: openingAmount, balance: openingAmount, openingDate: openingDate ? new Date(openingDate) : new Date(), dueDate: dueDate ? new Date(dueDate) : undefined, description: String(description || "Opening supplier balance").trim() || "Opening supplier balance", notes: String(notes || "").trim() });
    res.status(201).json({ data: await SupplierOpeningPayable.findById(payable._id).populate("supplier", "name code phone").lean() });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { supplier, purchaseOrder, openingPayable, amount, method, chequeNumber, bankName, chequeDate, reference, paidAt, notes } = req.body || {};
    const hasPO = Boolean(purchaseOrder); const hasOpening = Boolean(openingPayable);
    if (!mongoose.Types.ObjectId.isValid(supplier) || hasPO === hasOpening) throw new Error("Select a supplier and one purchase order or opening payable.");
    if (hasPO && !mongoose.Types.ObjectId.isValid(purchaseOrder)) throw new Error("Select a valid purchase order.");
    if (hasOpening && !mongoose.Types.ObjectId.isValid(openingPayable)) throw new Error("Select a valid opening payable.");
    const paidAmount = amountOf(amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) throw new Error("Payment amount must be greater than zero.");
    if (!paymentMethods.includes(method)) throw new Error("Select a valid payment method.");
    const isCheque = method === "bank_cheque";
    if (isCheque && (!String(chequeNumber || "").trim() || !String(bankName || "").trim() || !chequeDate)) throw new Error("Cheque number, bank and maturity date are required.");
    if (isCheque && !Number.isFinite(new Date(chequeDate).getTime())) throw new Error("Enter a valid cheque maturity date.");
    if (hasPO) {
      const po = await PurchaseOrder.findById(purchaseOrder).lean();
      if (!po || String(po.supplier) !== String(supplier)) throw new Error("The selected purchase order does not belong to this supplier.");
      if (!["received", "partially_received"].includes(po.status)) throw new Error("Receive the raw materials before recording supplier settlement.");
      const committed = await SupplierPayment.aggregate([{ $match: { purchaseOrder: new mongoose.Types.ObjectId(purchaseOrder), $or: [{ chequeStatus: { $in: ["issued", "due", "deposited", "cleared"] } }, { chequeStatus: { $exists: false } }] } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
      if (paidAmount > Number(po.total || 0) - Number(committed[0]?.total || 0) + 0.0001) throw new Error("Amount exceeds the purchase-order balance not already paid or covered by a pending cheque.");
    } else {
      const opening = await SupplierOpeningPayable.findById(openingPayable);
      if (!opening || String(opening.supplier) !== String(supplier)) throw new Error("The selected opening payable does not belong to this supplier.");
      if (opening.status === "void") throw new Error("A void opening payable cannot receive payment.");
      const pending = await SupplierPayment.aggregate([{ $match: { openingPayable: opening._id, chequeStatus: { $in: activeChequeStatuses } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
      if (paidAmount > Number(opening.balance || 0) - Number(pending[0]?.total || 0) + 0.0001) throw new Error("Amount exceeds the opening balance not already covered by pending cheques.");
      if (!isCheque) await applyOpeningPayment(openingPayable, paidAmount);
    }
    const now = new Date();
    const chequeStatus = isCheque ? (new Date(chequeDate).getTime() <= now.getTime() ? "due" : "issued") : "cleared";
    const payment = await SupplierPayment.create({ paymentNumber: await nextNumber(isCheque ? "CHQ" : "SPY", SupplierPayment, "paymentNumber"), supplier, ...(hasPO ? { purchaseOrder } : { openingPayable }), amount: paidAmount, method, chequeNumber, bankName, chequeDate: isCheque ? new Date(chequeDate) : undefined, chequeStatus, issuedAt: isCheque ? now : undefined, clearedAt: isCheque ? undefined : new Date(paidAt || now), reference, paidAt: paidAt || now, notes, statusHistory: [{ status: chequeStatus, at: now, note: isCheque ? "Cheque issued to supplier" : "Payment recorded and cleared" }] });
    res.status(201).json({ data: await populatedPayment(payment._id) });
  } catch (error) { next(error); }
});

router.patch("/:id/cheque-status", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new Error("Invalid cheque record.");
    const status = String(req.body?.status || ""); const note = String(req.body?.note || "").trim();
    if (!["deposited", "cleared", "bounced", "cancelled"].includes(status)) throw new Error("Select a valid cheque action.");
    const payment = await SupplierPayment.findById(req.params.id);
    if (!payment || payment.method !== "bank_cheque") throw new Error("Cheque record not found.");
    const current = payment.chequeStatus || "cleared";
    if (["cleared", "bounced", "cancelled"].includes(current)) throw new Error(`A ${current} cheque cannot be changed.`);
    if (status === "deposited" && !["issued", "due"].includes(current)) throw new Error("Only an issued or due cheque can be deposited.");
    if (status === "cleared") {
      if (payment.purchaseOrder) {
        const order = await PurchaseOrder.findById(payment.purchaseOrder).lean();
        const paid = await SupplierPayment.aggregate([{ $match: { purchaseOrder: payment.purchaseOrder, _id: { $ne: payment._id }, ...clearedFilter } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
        if (!order || Number(payment.amount) > Number(order.total || 0) - Number(paid[0]?.total || 0) + 0.0001) throw new Error("The purchase-order balance is now lower than this cheque amount.");
      } else await applyOpeningPayment(payment.openingPayable, Number(payment.amount));
      payment.clearedAt = new Date(); payment.paidAt = payment.clearedAt;
    }
    if (status === "deposited") payment.depositedAt = new Date();
    payment.chequeStatus = status;
    payment.statusHistory.push({ status, at: new Date(), note: note || `Cheque marked ${status}` });
    await payment.save();
    res.json({ data: await populatedPayment(payment._id) });
  } catch (error) { next(error); }
});

export default router;
