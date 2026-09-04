import mongoose from "mongoose";
import SalesOrder from "../sales/salesOrder.model";
import { Invoice, Payment } from "./billing.model";

const sequence = async (
  prefix: string,
  model: typeof Invoice | typeof Payment,
) =>
  `${prefix}-${new Date().getFullYear()}-${String((await model.countDocuments()) + 1).padStart(5, "0")}`;
const populateInvoice = (query: ReturnType<typeof Invoice.find>) =>
  query
    .populate("customer", "fullName phone email")
    .populate("salesOrder", "orderNumber status");

export async function listInvoices() {
  return populateInvoice(Invoice.find().sort({ createdAt: -1 })).lean();
}
export async function createInvoice(
  salesOrderId: string,
  dueDate?: string,
  notes?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(salesOrderId))
    throw new Error("Invalid sales order.");
  const existing = await Invoice.findOne({ salesOrder: salesOrderId });
  if (existing) throw new Error("This sales order already has an invoice.");
  const order = await SalesOrder.findById(salesOrderId);
  if (!order) throw new Error("Sales order not found.");
  if (["draft", "cancelled"].includes(order.status))
    throw new Error("Confirm the sales order before issuing an invoice.");
  if (dueDate && !Number.isFinite(new Date(dueDate).getTime()))
    throw new Error("Enter a valid due date.");
  const invoice = await Invoice.create({
    invoiceNumber: await sequence("INV", Invoice),
    salesOrder: order._id,
    customer: order.customer,
    lines: order.items.map(
      (item: {
        productName: string;
        productCode: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
      }) => ({
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total,
      }),
    ),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    balance: order.total,
    status: "issued",
    dueDate: dueDate ? new Date(dueDate) : undefined,
    notes: notes || "",
  });
  return populateInvoice(Invoice.findById(invoice._id)).lean();
}
export async function recordPayment(
  input: {
    invoice: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    receivedAt?: string;
  },
  receivedBy?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(input.invoice))
    throw new Error("Invalid invoice.");
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0)
    throw new Error("Payment amount must be greater than zero.");
  if (
    !["cash", "bank_transfer", "mobile_money", "card", "other"].includes(
      input.method,
    )
  )
    throw new Error("Select a valid payment method.");
  if (
    input.receivedAt &&
    !Number.isFinite(new Date(input.receivedAt).getTime())
  )
    throw new Error("Enter a valid payment date.");
  return mongoose.connection.transaction(async (session) => {
    const invoice = await Invoice.findById(input.invoice).session(session);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "void")
      throw new Error("A void invoice cannot receive payment.");
    const amount = Number(Number(input.amount).toFixed(2));
    if (amount <= 0) throw new Error("Payment must be at least 0.01 RWF.");
    if (amount > invoice.balance + 0.0001)
      throw new Error(
        "Payment cannot be greater than the outstanding balance.",
      );
    const [payment] = await Payment.create(
      [
        {
          receiptNumber: await sequence("RCT", Payment),
          invoice: invoice._id,
          customer: invoice.customer,
          amount,
          method: input.method,
          reference: input.reference || "",
          notes: input.notes || "",
          receivedAt: input.receivedAt
            ? new Date(input.receivedAt)
            : new Date(),
          ...(receivedBy && mongoose.Types.ObjectId.isValid(receivedBy)
            ? { receivedBy }
            : {}),
        },
      ],
      { session },
    );
    invoice.amountPaid = Number((invoice.amountPaid + amount).toFixed(2));
    invoice.balance = Number((invoice.total - invoice.amountPaid).toFixed(2));
    invoice.status = invoice.balance <= 0 ? "paid" : "partially_paid";
    await invoice.save({ session });
    return {
      payment,
      invoice: await populateInvoice(
        Invoice.findById(invoice._id).session(session),
      ).lean(),
    };
  });
}
export async function listPayments() {
  return Payment.find()
    .sort({ receivedAt: -1 })
    .populate("invoice", "invoiceNumber total balance status")
    .populate("customer", "fullName phone")
    .lean();
}
