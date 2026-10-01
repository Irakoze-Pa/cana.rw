import { Router } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model";
import Supplier from "../suppliers/supplier.model";
import SupplierPayment, { SupplierOpeningPayable } from "./supplierPayment.model";

const router = Router();
const paymentMethods = ["cash", "bank_transfer", "bank_cheque", "mobile_money", "other"];
const amountOf = (value: unknown) => Number(Number(value).toFixed(2));
const nextNumber = async (prefix: string, model: { countDocuments: () => Promise<number> }) => `${prefix}-${new Date().getFullYear()}-${String((await model.countDocuments()) + 1).padStart(5, "0")}`;
const populatedPayment = (id: unknown) => SupplierPayment.findById(id).populate("supplier", "name code").populate("purchaseOrder", "poNumber total").populate("openingPayable", "openingNumber amount balance status description").lean();

router.get("/", async (_req, res, next) => {
  try { res.json({ data: await SupplierPayment.find().populate("supplier", "name code").populate("purchaseOrder", "poNumber total").populate("openingPayable", "openingNumber amount balance status description").sort({ paidAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.get("/opening-payables", async (_req, res, next) => {
  try { res.json({ data: await SupplierOpeningPayable.find().populate("supplier", "name code phone").sort({ openingDate: -1, createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
});

router.get("/supplier-accounts", async (_req, res, next) => {
  try {
    const [suppliers, orders, openings, payments] = await Promise.all([
      Supplier.find().select("name code phone status").sort({ name: 1 }).lean(),
      PurchaseOrder.find({ status: { $in: ["received", "partially_received"] } }).select("supplier total").lean(),
      SupplierOpeningPayable.find({ status: { $ne: "void" } }).select("supplier amount balance").lean(),
      SupplierPayment.find().select("supplier purchaseOrder openingPayable amount").lean(),
    ]);
    res.json({ data: suppliers.map((supplier) => {
      const id = String(supplier._id);
      const supplierOrders = orders.filter((order) => String(order.supplier) === id);
      const supplierOpenings = openings.filter((opening) => String(opening.supplier) === id);
      const supplierPayments = payments.filter((payment) => String(payment.supplier) === id);
      const poPaid = supplierPayments.filter((payment) => payment.purchaseOrder).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      return { supplier, purchaseOrderTotal: supplierOrders.reduce((sum, order) => sum + Number(order.total || 0), 0), openingTotal: supplierOpenings.reduce((sum, opening) => sum + Number(opening.amount || 0), 0), amountPaid: supplierPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0), balance: Math.max(0, supplierOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) - poPaid) + supplierOpenings.reduce((sum, opening) => sum + Number(opening.balance || 0), 0) };
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
    const payable = await SupplierOpeningPayable.create({ openingNumber: await nextNumber("SOB", SupplierOpeningPayable), supplier, amount: openingAmount, balance: openingAmount, openingDate: openingDate ? new Date(openingDate) : new Date(), dueDate: dueDate ? new Date(dueDate) : undefined, description: String(description || "Opening supplier balance").trim() || "Opening supplier balance", notes: String(notes || "").trim() });
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
    if (method === "bank_cheque" && (!String(chequeNumber || "").trim() || !String(bankName || "").trim())) throw new Error("Cheque number and bank name are required for a bank cheque.");
    if (hasPO) {
      const po = await PurchaseOrder.findById(purchaseOrder).lean();
      if (!po || String(po.supplier) !== String(supplier)) throw new Error("The selected purchase order does not belong to this supplier.");
      if (!["received", "partially_received"].includes(po.status)) throw new Error("Receive the raw materials before recording a supplier payment.");
      const paid = await SupplierPayment.aggregate([{ $match: { purchaseOrder: new mongoose.Types.ObjectId(purchaseOrder) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
      if (paidAmount > Number(po.total || 0) - Number(paid[0]?.total || 0) + 0.0001) throw new Error("Payment cannot exceed the remaining purchase-order balance.");
    } else {
      const opening = await SupplierOpeningPayable.findById(openingPayable);
      if (!opening || String(opening.supplier) !== String(supplier)) throw new Error("The selected opening payable does not belong to this supplier.");
      if (opening.status === "void") throw new Error("A void opening payable cannot receive payment.");
      if (paidAmount > Number(opening.balance || 0) + 0.0001) throw new Error("Payment cannot exceed the remaining opening payable balance.");
      opening.amountPaid = amountOf(Number(opening.amountPaid || 0) + paidAmount);
      opening.balance = amountOf(Number(opening.amount) - Number(opening.amountPaid));
      opening.status = opening.balance <= 0 ? "paid" : "partially_paid";
      await opening.save();
    }
    const payment = await SupplierPayment.create({ paymentNumber: await nextNumber("SPY", SupplierPayment), supplier, ...(hasPO ? { purchaseOrder } : { openingPayable }), amount: paidAmount, method, chequeNumber, bankName, chequeDate: chequeDate || undefined, reference, paidAt: paidAt || new Date(), notes });
    res.status(201).json({ data: await populatedPayment(payment._id) });
  } catch (error) { next(error); }
});

export default router;
