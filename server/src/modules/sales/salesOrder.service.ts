import mongoose from "mongoose";
import Product from "../product/product.model";
import FinishedGoodsStoreBalance from "../finishedGoods/storeBalance.model";
import SalesOrder, { salesOrderStatuses, SalesOrderStatus } from "./salesOrder.model";

const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["confirmed", "cancelled"], confirmed: ["in_production", "ready_for_delivery", "cancelled"],
  in_production: ["ready_for_delivery", "cancelled"], ready_for_delivery: ["delivered", "cancelled"], delivered: [], cancelled: [],
};

export async function createSalesOrder(input: { customer: string; quotation?: string; items: { product: string; quantity: number; unit?: string; unitPrice?: number }[]; tax?: number; deliveryAddress?: string; requestedDeliveryDate?: string; notes?: string; allowInactiveProducts?: boolean }) {
  if (!mongoose.Types.ObjectId.isValid(input.customer)) throw new Error("A valid customer is required.");
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("At least one sales item is required.");
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
    return { product: product._id, productName: product.name, productCode: product.code, quantity: item.quantity, unit: item.unit || product.unit, unitPrice, total: Number((item.quantity * unitPrice).toFixed(2)) };
  }));
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const tax = input.tax ?? 0;
  if (!Number.isFinite(tax) || tax < 0) throw new Error("Tax cannot be negative.");
  const orderNumber = `SO-${new Date().getFullYear()}-${String((await SalesOrder.countDocuments()) + 1).padStart(5, "0")}`;
  const { allowInactiveProducts: _allowInactiveProducts, ...orderInput } = input;
  return SalesOrder.create({ ...orderInput, orderNumber, items, subtotal, tax, total: Number((subtotal + tax).toFixed(2)), statusHistory: [{ status: "draft" }] });
}

export const listSalesOrders = () => SalesOrder.find().sort({ createdAt: -1 }).populate("customer", "fullName phone email").lean();

export const listCustomerSalesOrders = (customerId: string) =>
  SalesOrder.find({ customer: customerId, status: { $ne: "draft" } })
    .sort({ createdAt: -1 })
    .populate("customer", "fullName phone email")
    .lean();

export async function transitionSalesOrder(id: string, status: SalesOrderStatus, performedBy?: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid sales order ID.");
  if (!salesOrderStatuses.includes(status)) throw new Error("Invalid sales order status.");
  const order = await SalesOrder.findById(id);
  if (!order) throw new Error("Sales order not found.");
  if (!transitions[order.status as SalesOrderStatus].includes(status)) throw new Error(`Cannot change a ${order.status} sales order to ${status}.`);

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
  return order.save();
}
