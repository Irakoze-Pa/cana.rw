import mongoose from "mongoose";
import { TreasuryAccount } from "../accounting/accounting.model";
import SalesOrder from "../sales/salesOrder.model";
import User, { UserRole } from "../../models/users";
import { CustomerOpeningBalance, Invoice, Payment } from "./billing.model";

/**
 * Use the highest issued number, rather than the number of records.  Counting
 * records makes a deleted invoice number available again and causes duplicate
 * key errors (for example, after an old INV has been removed).
 */
const sequence = async (
  prefix: string,
  model: mongoose.Model<any>,
  field: string,
) => {
  const year = new Date().getFullYear();
  const numberPrefix = `${prefix}-${year}-`;
  const latest = await model
    .findOne({ [field]: new RegExp(`^${numberPrefix}\\d+$`) })
    .sort({ [field]: -1 })
    .select(field)
    .lean();
  const previous = Number(
    String(latest?.[field] || "").slice(numberPrefix.length),
  );
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${numberPrefix}${String(next).padStart(5, "0")}`;
};
const populateInvoice = (query: ReturnType<typeof Invoice.find>) =>
  query
    .populate("customer", "fullName phone email")
    .populate("salesOrder", "orderNumber status");

export async function listInvoices() {
  // Keep the register complete for orders delivered before automatic invoice
  // creation was introduced, or if an earlier delivery request was interrupted.
  await createMissingDeliveredInvoices();
  return populateInvoice(Invoice.find().sort({ createdAt: -1 })).lean();
}
export async function listOpeningBalances() {
  return CustomerOpeningBalance.find()
    .sort({ openingDate: -1, createdAt: -1 })
    .populate("customer", "fullName phone email businessName")
    .lean();
}

export async function createOpeningBalance(
  input: {
    customer: string;
    amount: number;
    openingDate?: string;
    dueDate?: string;
    description?: string;
    notes?: string;
  },
  createdBy?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(input.customer))
    throw new Error("Select a valid customer.");
  const amount = Number(Number(input.amount).toFixed(2));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Opening balance must be greater than zero.");
  if (
    input.openingDate &&
    !Number.isFinite(new Date(input.openingDate).getTime())
  )
    throw new Error("Enter a valid opening date.");
  if (input.dueDate && !Number.isFinite(new Date(input.dueDate).getTime()))
    throw new Error("Enter a valid due date.");
  const customer = await User.findOne({
    _id: input.customer,
    role: UserRole.CUSTOMER,
  })
    .select("_id")
    .lean();
  if (!customer) throw new Error("Select an existing customer account.");
  const opening = await CustomerOpeningBalance.create({
    openingNumber: await sequence(
      "OB",
      CustomerOpeningBalance,
      "openingNumber",
    ),
    customer: input.customer,
    amount,
    balance: amount,
    openingDate: input.openingDate ? new Date(input.openingDate) : new Date(),
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    description:
      String(input.description || "Opening customer balance").trim() ||
      "Opening customer balance",
    notes: String(input.notes || "").trim(),
    ...(createdBy && mongoose.Types.ObjectId.isValid(createdBy)
      ? { createdBy }
      : {}),
  });
  return CustomerOpeningBalance.findById(opening._id)
    .populate("customer", "fullName phone email businessName")
    .lean();
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
  let invoice: InstanceType<typeof Invoice> | undefined;
  let lastError: unknown;
  // A retry also protects against two staff members issuing different invoices
  // at the exact same time. The unique index remains the final safeguard.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      invoice = await Invoice.create({
        invoiceNumber: await sequence("INV", Invoice, "invoiceNumber"),
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
      break;
    } catch (error) {
      lastError = error;
      const duplicateInvoiceNumber =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        Boolean((error.keyPattern as Record<string, unknown>).invoiceNumber);
      if (!duplicateInvoiceNumber) throw error;
    }
  }
  if (!invoice) throw lastError;
  return populateInvoice(Invoice.findById(invoice._id)).lean();
}

/** Create issued invoices for legacy delivered orders that were not invoiced. */
export async function createMissingDeliveredInvoices() {
  const deliveredOrders = await SalesOrder.find({ status: "delivered" })
    .select("_id orderNumber")
    .lean();
  const orderIds = deliveredOrders.map((order) => order._id);
  const existing = await Invoice.find({ salesOrder: { $in: orderIds } })
    .select("salesOrder")
    .lean();
  const invoicedOrderIds = new Set(
    existing.map((invoice) => String(invoice.salesOrder)),
  );
  let created = 0;

  for (const order of deliveredOrders) {
    if (invoicedOrderIds.has(String(order._id))) continue;
    try {
      await createInvoice(
        String(order._id),
        undefined,
        `Automatically created for delivered sales order ${order.orderNumber}.`,
      );
      created += 1;
    } catch (error) {
      // Another request may have created this order's invoice between the
      // pre-check and creation. Treat that as already recovered.
      if (await Invoice.exists({ salesOrder: order._id })) continue;
      throw error;
    }
  }

  return {
    created,
    alreadyInvoiced: existing.length,
    deliveredOrders: deliveredOrders.length,
  };
}
export async function recordPayment(
  input: {
    invoice?: string;
    openingBalance?: string;
    amount: number;
    method: string;
    treasuryAccount?: string;
    reference?: string;
    notes?: string;
    receivedAt?: string;
  },
  receivedBy?: string,
) {
  const hasInvoice = Boolean(input.invoice);
  const hasOpeningBalance = Boolean(input.openingBalance);
  if (hasInvoice === hasOpeningBalance)
    throw new Error(
      "Select one invoice or opening balance to receive payment.",
    );
  if (hasInvoice && !mongoose.Types.ObjectId.isValid(input.invoice!))
    throw new Error("Invalid invoice.");
  if (
    hasOpeningBalance &&
    !mongoose.Types.ObjectId.isValid(input.openingBalance!)
  )
    throw new Error("Invalid opening balance.");
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0)
    throw new Error("Payment amount must be greater than zero.");
  if (
    !["cash", "bank_transfer", "mobile_money", "card", "other"].includes(
      input.method,
    )
  )
    throw new Error("Select a valid payment method.");
  if (input.treasuryAccount) {
    if (!mongoose.Types.ObjectId.isValid(input.treasuryAccount))
      throw new Error("Select a valid receiving account.");
    const treasuryAccount = await TreasuryAccount.findById(input.treasuryAccount).lean();
    if (!treasuryAccount || treasuryAccount.status !== "active")
      throw new Error("Select an active receiving account.");
    const expectedType = input.method === "cash" ? "cash" : input.method === "mobile_money" ? "mobile_money" : "bank";
    if (input.method !== "other" && treasuryAccount.type !== expectedType)
      throw new Error(`The selected account does not match the ${input.method.replace(/_/g, " ")} payment method.`);
  }
  if (
    input.receivedAt &&
    !Number.isFinite(new Date(input.receivedAt).getTime())
  )
    throw new Error("Enter a valid payment date.");
  return mongoose.connection.transaction(async (session) => {
    const amount = Number(Number(input.amount).toFixed(2));
    if (amount <= 0) throw new Error("Payment must be at least 0.01 RWF.");
    const invoice = hasInvoice
      ? await Invoice.findById(input.invoice!).session(session)
      : null;
    const openingBalance = hasOpeningBalance
      ? await CustomerOpeningBalance.findById(input.openingBalance!).session(
          session,
        )
      : null;
    if (!invoice && !openingBalance)
      throw new Error(
        hasInvoice ? "Invoice not found." : "Opening balance not found.",
      );
    const receivable = invoice || openingBalance!;
    if (receivable.status === "void")
      throw new Error(
        invoice
          ? "A void invoice cannot receive payment."
          : "A void opening balance cannot receive payment.",
      );
    if (amount > receivable.balance + 0.0001)
      throw new Error(
        "Payment cannot be greater than the outstanding balance.",
      );
    const [payment] = await Payment.create(
      [
        {
          receiptNumber: await sequence("RCT", Payment, "receiptNumber"),
          ...(invoice
            ? { invoice: invoice._id }
            : { openingBalance: openingBalance!._id }),
          customer: receivable.customer,
          amount,
          method: input.method,
          ...(input.treasuryAccount ? { treasuryAccount: input.treasuryAccount } : {}),
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
    if (invoice) {
      invoice.amountPaid = Number((invoice.amountPaid + amount).toFixed(2));
      invoice.balance = Number((invoice.total - invoice.amountPaid).toFixed(2));
      invoice.status = invoice.balance <= 0 ? "paid" : "partially_paid";
      await invoice.save({ session });
    } else {
      openingBalance!.amountPaid = Number(
        (openingBalance!.amountPaid + amount).toFixed(2),
      );
      openingBalance!.balance = Number(
        (openingBalance!.amount - openingBalance!.amountPaid).toFixed(2),
      );
      openingBalance!.status =
        openingBalance!.balance <= 0 ? "paid" : "partially_paid";
      await openingBalance!.save({ session });
    }
    return {
      payment,
      invoice: invoice
        ? await populateInvoice(
            Invoice.findById(invoice._id).session(session),
          ).lean()
        : undefined,
      openingBalance: openingBalance
        ? await CustomerOpeningBalance.findById(openingBalance._id)
            .populate("customer", "fullName phone email businessName")
            .lean()
        : undefined,
    };
  });
}
export async function listPayments() {
  return Payment.find()
    .sort({ receivedAt: -1 })
    .populate("invoice", "invoiceNumber total balance status")
    .populate(
      "openingBalance",
      "openingNumber amount balance status description",
    )
    .populate("customer", "fullName phone")
    .lean();
}

/** Reverse a receipt without erasing it, then restore its outstanding balance. */
export async function reversePayment(
  paymentId: string,
  reason: string,
  voidedBy?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(paymentId))
    throw new Error("Invalid payment receipt.");
  const voidReason = String(reason || "").trim();
  if (!voidReason)
    throw new Error("Enter a reason for reversing this payment.");

  return mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new Error("Payment receipt not found.");
    if (payment.status === "void")
      throw new Error("This payment receipt has already been reversed.");

    const invoice = payment.invoice
      ? await Invoice.findById(payment.invoice).session(session)
      : null;
    const openingBalance = payment.openingBalance
      ? await CustomerOpeningBalance.findById(payment.openingBalance).session(
          session,
        )
      : null;
    const receivable = invoice || openingBalance;
    if (!receivable)
      throw new Error(
        "The invoice or opening balance for this receipt no longer exists.",
      );
    if (receivable.status === "void")
      throw new Error(
        "A payment cannot be reversed against a void receivable.",
      );

    receivable.amountPaid = Number(
      Math.max(
        0,
        Number(receivable.amountPaid || 0) - Number(payment.amount),
      ).toFixed(2),
    );
    const total = invoice
      ? Number(invoice.total)
      : Number(openingBalance!.amount);
    receivable.balance = Number((total - receivable.amountPaid).toFixed(2));
    receivable.status =
      receivable.amountPaid <= 0
        ? invoice
          ? "issued"
          : "open"
        : "partially_paid";
    await receivable.save({ session });

    payment.status = "void";
    payment.voidReason = voidReason;
    payment.voidedAt = new Date();
    if (voidedBy && mongoose.Types.ObjectId.isValid(voidedBy))
      payment.voidedBy = voidedBy;
    await payment.save({ session });
    return payment;
  });
}

/** Customer portal data: invoices and receipts belonging only to the signed-in customer. */
export async function listCustomerBilling(customerId: string) {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer.");
  }

  const customer = new mongoose.Types.ObjectId(customerId);
  const [invoices, openingBalances, payments] = await Promise.all([
    populateInvoice(Invoice.find({ customer }).sort({ createdAt: -1 })).lean(),
    CustomerOpeningBalance.find({ customer })
      .sort({ openingDate: -1, createdAt: -1 })
      .lean(),
    Payment.find({ customer })
      .sort({ receivedAt: -1 })
      .populate("invoice", "invoiceNumber salesOrder")
      .populate("openingBalance", "openingNumber description")
      .lean(),
  ]);

  return { invoices, openingBalances, payments };
}

/** A consolidated customer receivables view. Sales invoices and opening balances stay distinct. */
export async function listCustomerAccounts() {
  const [customers, invoices, openings, payments] = await Promise.all([
    User.find({ role: UserRole.CUSTOMER })
      .select("fullName phone email businessName")
      .sort({ fullName: 1 })
      .lean(),
    Invoice.find({ status: { $ne: "void" } })
      .select("customer total balance")
      .lean(),
    CustomerOpeningBalance.find({ status: { $ne: "void" } })
      .select("customer amount balance")
      .lean(),
    Payment.find({ status: { $ne: "void" } })
      .select("customer amount")
      .lean(),
  ]);
  return customers.map((customer) => {
    const id = String(customer._id);
    const customerInvoices = invoices.filter(
      (item) => String(item.customer) === id,
    );
    const customerOpenings = openings.filter(
      (item) => String(item.customer) === id,
    );
    const customerPayments = payments.filter(
      (item) => String(item.customer) === id,
    );
    return {
      customer,
      invoiceTotal: customerInvoices.reduce(
        (sum, item) => sum + Number(item.total || 0),
        0,
      ),
      openingTotal: customerOpenings.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
      amountPaid: customerPayments.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
      balance: [...customerInvoices, ...customerOpenings].reduce(
        (sum, item) => sum + Number(item.balance || 0),
        0,
      ),
    };
  });
}
