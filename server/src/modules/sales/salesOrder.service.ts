import mongoose from "mongoose";
import { Invoice } from "../billing/billing.model";
import User, { UserRole, UserStatus } from "../../models/users";
import Product from "../product/product.model";
import FinishedGoodsStoreBalance from "../finishedGoods/storeBalance.model";
import SalesOrder, { salesOrderStatuses, SalesOrderStatus } from "./salesOrder.model";

const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["confirmed", "cancelled"], submitted: ["confirmed", "cancelled"], confirmed: ["in_production", "ready_for_delivery", "cancelled"],
  in_production: ["ready_for_delivery", "cancelled"], ready_for_delivery: ["delivered", "cancelled"], delivered: [], cancelled: [],
};

export async function createSalesOrder(input: { customer: string; quotation?: string; items: { product: string; quantity: number; unit?: string; unitPrice?: number }[]; tax?: number; deliveryAddress?: string; requestedDeliveryDate?: string; notes?: string; allowInactiveProducts?: boolean; initialStatus?: SalesOrderStatus }) {
  if (!mongoose.Types.ObjectId.isValid(input.customer)) throw new Error("A valid customer is required.");
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("At least one sales item is required.");
  if (!await User.exists({ _id: input.customer, role: UserRole.CUSTOMER, status: UserStatus.ACTIVE })) throw new Error("Select an active customer.");
  if (new Set(input.items.map(item => item.product)).size !== input.items.length) throw new Error("Combine repeated products into one order line.");
  const items = await Promise.all(input.items.map(async (item) => {
    if (!mongoose.Types.ObjectId.isValid(item.product) || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Each sales item needs a valid product and positive quantity.");
    const product = await Product.findById(item.product);
    if (!product) throw new Error("A quoted product no longer exists. Restore it or replace it before creating the order.");
    // Approved quotations are commercial commitments. They may be converted even
    // when a product was later retired, while manually created orders remain
    // restricted to active products.
    if (product.status !== "Active" && !input.allowInactiveProducts) {
      throw new Error(`${product.name} is inactive and cannot be added to a new sales order.`);
    }
    const unitPrice = item.unitPrice ?? product.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Unit price must be a non-negative number.");
    return { product: product._id, productName: product.name, productCode: product.code, quantity: item.quantity, unit: item.unit || product.unit, unitPrice, total: Number((item.quantity * unitPrice).toFixed(2)) };
  }));
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const tax = input.tax ?? 0;
  if (!Number.isFinite(tax) || tax < 0) throw new Error("Tax cannot be negative.");
  const orderNumber = `SO-${new Date().getFullYear()}-${String((await SalesOrder.countDocuments()) + 1).padStart(5, "0")}`;
  const { allowInactiveProducts: _allowInactiveProducts, initialStatus = "draft", ...orderInput } = input;
  const order = await SalesOrder.create({ ...orderInput, orderNumber, items, subtotal, tax, total: Number((subtotal + tax).toFixed(2)), status: initialStatus, statusHistory: [{ status: initialStatus }] });
  return order.populate("customer", "fullName phone email");
}

export const listSalesOrders = () => SalesOrder.find().sort({ createdAt: -1 }).populate("customer", "fullName phone email").lean();

export const listCustomerSalesOrders = (customerId: string) =>
  SalesOrder.find({ customer: customerId, status: { $ne: "draft" } })
    .sort({ createdAt: -1 })
    .populate("customer", "fullName phone email")
    .lean();

export async function createCustomerSalesOrder(customer: string, input: { items: { product: string; quantity: number; unit?: string }[]; deliveryAddress?: string; requestedDeliveryDate?: string; notes?: string }) {
  return createSalesOrder({ customer, items: input.items.map((item) => ({ product: item.product, quantity: item.quantity, unit: item.unit })), deliveryAddress: input.deliveryAddress, requestedDeliveryDate: input.requestedDeliveryDate, notes: input.notes, initialStatus: "submitted" });
}

export async function updateSalesOrderPrices(id: string, prices: Array<{ product: string; unitPrice: number }>, performedBy?: string) {
  if (!mongoose.Types.ObjectId.isValid(id) || !Array.isArray(prices)) throw new Error("Invalid sales-order price update.");
  const order = await SalesOrder.findById(id);
  if (!order) throw new Error("Sales order not found.");
  if (!["draft", "submitted"].includes(order.status)) throw new Error("Prices can only be changed before the order is confirmed.");
  const values = new Map(prices.map((item) => [String(item.product), Number(item.unitPrice)]));
  for (const item of order.items) {
    const unitPrice = values.get(String(item.product));
    if (!Number.isFinite(unitPrice) || (unitPrice as number) < 0) throw new Error(`Enter a valid agreed price for ${item.productName}.`);
    item.unitPrice = Number(unitPrice);
    item.total = Number((item.quantity * Number(unitPrice)).toFixed(2));
  }
  order.subtotal = Number(order.items.reduce((sum: number, item: { total: number }) => sum + item.total, 0).toFixed(2));
  order.total = Number((order.subtotal + Number(order.tax || 0)).toFixed(2));
  order.statusHistory.push({ status: order.status, ...(performedBy && mongoose.Types.ObjectId.isValid(performedBy) ? { by: new mongoose.Types.ObjectId(performedBy) } : {}) });
  await order.save();
  return order.populate("customer", "fullName phone email");
}

export async function transitionSalesOrder(id: string, status: SalesOrderStatus, performedBy?: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid sales order ID.");
  if (!salesOrderStatuses.includes(status)) throw new Error("Invalid sales order status.");
  const order = await SalesOrder.findById(id);
  if (!order) throw new Error("Sales order not found.");
  if (!transitions[order.status as SalesOrderStatus].includes(status)) throw new Error(`Cannot change a ${order.status} sales order to ${status}.`);

  if (status === "cancelled" && await Invoice.exists({ salesOrder: id, status: { $ne: "void" } })) throw new Error("An invoiced order cannot be cancelled. Resolve its invoice first.");

  if (status === "ready_for_delivery" || status === "delivered") {
    for (const item of order.items) {
      const balance = await FinishedGoodsStoreBalance.findOne({ product: item.product, store: "sales" });
      if (!balance || balance.quantity < item.quantity) {
        throw new Error(`Insufficient Sales Store stock for ${item.productName}. Transfer finished goods to Sales Store before delivery.`);
      }
    }
  }

  if (status === "delivered") {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Finished product not found for ${item.productName}.`);
      product.stock = Number((product.stock - item.quantity).toFixed(4));
      await product.save();
      const salesBalance = await FinishedGoodsStoreBalance.findOneAndUpdate({ product: item.product, store: "sales", quantity: { $gte: item.quantity } }, { $inc: { quantity: -item.quantity } }, { new: true });
      if (!salesBalance) throw new Error(`Sales Store stock changed before delivery for ${item.productName}. Please review the order.`);
    }
  }
  order.status = status;
  order.statusHistory.push({ status, ...(performedBy && mongoose.Types.ObjectId.isValid(performedBy) ? { by: new mongoose.Types.ObjectId(performedBy) } : {}) });
  await order.save();
  return order.populate("customer", "fullName phone email");
}
