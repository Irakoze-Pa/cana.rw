import mongoose from "mongoose";
import { Invoice } from "../billing/billing.model";
import { createInvoice } from "../billing/billing.service";
import User, { UserRole, UserStatus } from "../../models/users";
import Product from "../product/product.model";
import FinishedGoodsStoreBalance from "../finishedGoods/storeBalance.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import Inventory from "../inventory/inventory.model";
import InventoryTransaction from "../inventory/inventoryTransaction.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import RawMaterialLot from "../raw-materials/rawMaterialLot.model";
import SalesOrder, {
  salesOrderStatuses,
  SalesOrderStatus,
} from "./salesOrder.model";

const transitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["in_production", "ready_for_delivery", "cancelled"],
  in_production: ["ready_for_delivery", "cancelled"],
  ready_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function stockQuantityForProduct(
  product: { baseUnit?: string; packSizeKg?: number; unit?: string },
  packQuantity: number,
) {
  if (product.baseUnit === "pcs") {
    return {
      stockQuantity: packQuantity,
      stockUnit: "pcs",
      packSizeKg: undefined,
    };
  }

  const packSizeKg = Number(product.packSizeKg);
  if (!Number.isFinite(packSizeKg) || packSizeKg <= 0) {
    throw new Error(
      `Set the pack weight in kg for ${product.unit || "this product"} before selling it by pack.`,
    );
  }

  return {
    stockQuantity: Number((packQuantity * packSizeKg).toFixed(4)),
    stockUnit: "kg",
    packSizeKg,
  };
}

async function stockQuantityForOrderItem(
  item: {
    product: mongoose.Types.ObjectId;
    quantity: number;
    stockQuantity?: number;
  },
  product?: { baseUnit?: string; packSizeKg?: number; unit?: string },
) {
  if (
    Number.isFinite(Number(item.stockQuantity)) &&
    Number(item.stockQuantity) > 0
  ) {
    return Number(item.stockQuantity);
  }

  const orderProduct = product || (await Product.findById(item.product).lean());
  if (!orderProduct)
    throw new Error("Finished product no longer exists for this sales order.");
  return stockQuantityForProduct(orderProduct, Number(item.quantity))
    .stockQuantity;
}

async function snapshotDeliveredItemCost(item: any, issuedStock: number) {
  const latestCostedBatch = await ProductionBatch.findOne({
    product: item.product,
    status: "Completed",
    costedAt: { $exists: true, $ne: null },
  })
    .sort({ costedAt: -1 })
    .select("costPerKg costPerPack")
    .lean();
  const quantity = Number(item.quantity || 0);
  const totalCost =
    item.stockUnit === "kg"
      ? Number(issuedStock || 0) * Number(latestCostedBatch?.costPerKg || 0)
      : quantity * Number(latestCostedBatch?.costPerPack || 0);
  item.costTotal = Number(totalCost.toFixed(2));
  item.costPerUnit =
    quantity > 0 ? Number((totalCost / quantity).toFixed(2)) : 0;
}

async function nextSalesOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `SO-${year}-`;
  const latest = await SalesOrder.findOne({
    orderNumber: new RegExp(`^${prefix}\\d+$`),
  })
    .sort({ orderNumber: -1 })
    .select("orderNumber")
    .lean();
  const current = Number(
    String(latest?.orderNumber || "").slice(prefix.length),
  );
  const sequence = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(sequence).padStart(5, "0")}`;
}

type SalesInputItem = {
  product?: string;
  rawMaterial?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
};

export async function createSalesOrder(input: {
  customer: string;
  quotation?: string;
  items: SalesInputItem[];
  tax?: number;
  deliveryAddress?: string;
  requestedDeliveryDate?: string;
  notes?: string;
  allowInactiveProducts?: boolean;
  initialStatus?: SalesOrderStatus;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.customer))
    throw new Error("A valid customer is required.");
  if (!Array.isArray(input.items) || input.items.length === 0)
    throw new Error("At least one sales item is required.");
  const customer = await User.findOne({
    _id: input.customer,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
  }).lean();
  if (!customer) throw new Error("Select an active customer.");
  if (
    new Set(
      input.items.map((item) =>
        item.rawMaterial
          ? `raw:${item.rawMaterial}`
          : `product:${item.product}`,
      ),
    ).size !== input.items.length
  )
    throw new Error("Combine repeated items into one order line.");
  const items = await Promise.all(
    input.items.map(async (item) => {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0)
        throw new Error("Each sales item needs a positive quantity.");
      if (item.rawMaterial) {
        if (!mongoose.Types.ObjectId.isValid(item.rawMaterial))
          throw new Error(
            "Each raw-material sales item needs a valid material.",
          );
        const rawMaterial = await RawMaterial.findById(item.rawMaterial);
        if (!rawMaterial || rawMaterial.status !== "Active")
          throw new Error("Select an active raw material.");
        if (
          item.unit &&
          item.unit.trim().toLowerCase() !==
            rawMaterial.unit.trim().toLowerCase()
        )
          throw new Error(
            `${rawMaterial.name} must be sold in ${rawMaterial.unit}.`,
          );
        const unitPrice =
          item.unitPrice ?? Number(rawMaterial.costPerUnit || 0);
        if (!Number.isFinite(unitPrice) || unitPrice < 0)
          throw new Error("Unit price must be a non-negative number.");
        return {
          itemType: "raw_material" as const,
          rawMaterial: rawMaterial._id,
          productName: rawMaterial.name,
          productCode: rawMaterial.code,
          quantity: Number(item.quantity),
          unit: rawMaterial.unit,
          packLabel: "",
          stockQuantity: Number(item.quantity),
          stockUnit: rawMaterial.unit,
          unitPrice,
          total: Number((item.quantity * unitPrice).toFixed(2)),
        };
      }
      const productId = item.product;
      if (!productId || !mongoose.Types.ObjectId.isValid(productId))
        throw new Error("Each sales item needs a valid product.");
      const product = await Product.findById(productId);
      if (!product)
        throw new Error(
          "A quoted product no longer exists. Restore it or replace it before creating the order.",
        );
      // Approved quotations are commercial commitments. They may be converted even
      // when a product was later retired, while manually created orders remain
      // restricted to active products.
      if (product.status !== "Active" && !input.allowInactiveProducts) {
        throw new Error(
          `${product.name} is inactive and cannot be added to a new sales order.`,
        );
      }
      if (!Number.isInteger(item.quantity))
        throw new Error(`${product.name} must be sold in whole packs.`);
      const stock = stockQuantityForProduct(product, Number(item.quantity));
      // Customer-originated orders receive the wholesale rate; office users can
      // still explicitly agree a different price before confirmation.
      const unitPrice =
        item.unitPrice ?? Number(product.wholesalePrice ?? product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0)
        throw new Error("Unit price must be a non-negative number.");
      return {
        itemType: "product" as const,
        product: product._id,
        productName: product.name,
        productCode: product.code,
        quantity: Number(item.quantity),
        unit: product.baseUnit === "pcs" ? "pcs" : "packs",
        packLabel: product.baseUnit === "pcs" ? "" : product.unit,
        packSizeKg: stock.packSizeKg,
        stockQuantity: stock.stockQuantity,
        stockUnit: stock.stockUnit,
        unitPrice,
        total: Number((item.quantity * unitPrice).toFixed(2)),
      };
    }),
  );
  const subtotal = Number(
    items.reduce((sum, item) => sum + item.total, 0).toFixed(2),
  );
  const tax = input.tax ?? 0;
  if (!Number.isFinite(tax) || tax < 0)
    throw new Error("Tax cannot be negative.");
  const {
    allowInactiveProducts: _allowInactiveProducts,
    initialStatus = "draft",
    ...orderInput
  } = input;
  const orderData = {
    ...orderInput,
    items,
    subtotal,
    tax,
    total: Number((subtotal + tax).toFixed(2)),
    status: initialStatus,
    statusHistory: [{ status: initialStatus }],
  };

  // A count-based sequence reused old numbers after records were deleted.
  // Use the highest assigned number instead, then retry safely if two users
  // create an order at the same time.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await SalesOrder.create({
        ...orderData,
        orderNumber: await nextSalesOrderNumber(),
      });
      return order.populate(
        "customer",
        "fullName phone email isCompanyCustomer businessName address tin",
      );
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 11000 || attempt === 2)
        throw error;
    }
  }

  throw new Error(
    "Could not allocate a unique sales-order number. Please try again.",
  );
}

export const listSalesOrders = () =>
  SalesOrder.find()
    .sort({ createdAt: -1 })
    .populate(
      "customer",
      "fullName phone email isCompanyCustomer businessName address tin",
    )
    .lean();

export const listCustomerSalesOrders = (customerId: string) =>
  SalesOrder.find({ customer: customerId, status: { $ne: "draft" } })
    .sort({ createdAt: -1 })
    .populate(
      "customer",
      "fullName phone email isCompanyCustomer businessName address tin",
    )
    .lean();

export async function createCustomerSalesOrder(
  customer: string,
  input: {
    items: { product: string; quantity: number; unit?: string }[];
    deliveryAddress?: string;
    requestedDeliveryDate?: string;
    notes?: string;
  },
) {
  return createSalesOrder({
    customer,
    items: input.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      unit: item.unit,
    })),
    deliveryAddress: input.deliveryAddress,
    requestedDeliveryDate: input.requestedDeliveryDate,
    notes: input.notes,
    initialStatus: "submitted",
  });
}

export async function updateSalesOrderPrices(
  id: string,
  prices: Array<{ product?: string; rawMaterial?: string; unitPrice: number }>,
  performedBy?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(id) || !Array.isArray(prices))
    throw new Error("Invalid sales-order price update.");
  const order = await SalesOrder.findById(id);
  if (!order) throw new Error("Sales order not found.");
  if (!["draft", "submitted"].includes(order.status))
    throw new Error(
      "Prices can only be changed before the order is confirmed.",
    );
  const values = new Map(
    prices.map((item) => [
      String(
        item.rawMaterial
          ? `raw:${item.rawMaterial}`
          : `product:${item.product}`,
      ),
      Number(item.unitPrice),
    ]),
  );
  for (const item of order.items) {
    const itemKey =
      item.itemType === "raw_material"
        ? `raw:${item.rawMaterial}`
        : `product:${item.product}`;
    const unitPrice = values.get(itemKey);
    if (!Number.isFinite(unitPrice) || (unitPrice as number) < 0)
      throw new Error(`Enter a valid agreed price for ${item.productName}.`);
    item.unitPrice = Number(unitPrice);
    item.total = Number((item.quantity * Number(unitPrice)).toFixed(2));
  }
  order.subtotal = Number(
    order.items
      .reduce((sum: number, item: { total: number }) => sum + item.total, 0)
      .toFixed(2),
  );
  order.total = Number((order.subtotal + Number(order.tax || 0)).toFixed(2));
  order.statusHistory.push({
    status: order.status,
    ...(performedBy && mongoose.Types.ObjectId.isValid(performedBy)
      ? { by: new mongoose.Types.ObjectId(performedBy) }
      : {}),
  });
  await order.save();

  // Delivery is the commercial handover point. Create one issued invoice from
  // the delivered order lines so finance can receive payment without re-entry.
  if (
    status === "delivered" &&
    !(await Invoice.exists({ salesOrder: order._id }))
  ) {
    await createInvoice(
      String(order._id),
      undefined,
      `Automatically created when sales order ${order.orderNumber} was delivered.`,
    );
  }

  return order.populate(
    "customer",
    "fullName phone email isCompanyCustomer businessName address tin",
  );
}

export async function transitionSalesOrder(
  id: string,
  status: SalesOrderStatus,
  performedBy?: string,
) {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new Error("Invalid sales order ID.");
  if (!salesOrderStatuses.includes(status))
    throw new Error("Invalid sales order status.");
  const order = await SalesOrder.findById(id);
  if (!order) throw new Error("Sales order not found.");
  if (!transitions[order.status as SalesOrderStatus].includes(status))
    throw new Error(
      `Cannot change a ${order.status} sales order to ${status}.`,
    );

  if (
    status === "cancelled" &&
    (await Invoice.exists({ salesOrder: id, status: { $ne: "void" } }))
  )
    throw new Error(
      "An invoiced order cannot be cancelled. Resolve its invoice first.",
    );

  if (status === "ready_for_delivery" || status === "delivered") {
    for (const item of order.items) {
      if (item.itemType === "raw_material") {
        const inventory = await Inventory.findOne({
          rawMaterial: item.rawMaterial,
        });
        const requiredStock = Number(item.stockQuantity || item.quantity);
        if (!inventory || Number(inventory.availableQuantity) < requiredStock) {
          throw new Error(
            `Insufficient raw-material stock for ${item.productName}. Receive or adjust stock before delivery.`,
          );
        }
        continue;
      }
      const balance = await FinishedGoodsStoreBalance.findOne({
        product: item.product,
        store: "sales",
      });
      const requiredStock = await stockQuantityForOrderItem(item);
      if (!balance || balance.quantity < requiredStock) {
        throw new Error(
          `Insufficient Sales Store stock for ${item.productName}. Transfer finished goods to Sales Store before delivery.`,
        );
      }
    }
  }

  if (status === "delivered") {
    for (const item of order.items) {
      if (item.itemType === "raw_material") {
        const rawMaterial = await RawMaterial.findById(item.rawMaterial);
        const inventory = await Inventory.findOne({
          rawMaterial: item.rawMaterial,
        });
        const issuedStock = Number(item.stockQuantity || item.quantity);
        if (
          !rawMaterial ||
          !inventory ||
          Number(inventory.availableQuantity) < issuedStock
        )
          throw new Error(
            `Raw-material stock changed before delivery for ${item.productName}. Please review the order.`,
          );
        const quantityBefore = Number(inventory.quantity);
        const quantityAfter = Number((quantityBefore - issuedStock).toFixed(6));
        const availableAfter = Number(
          (Number(inventory.availableQuantity) - issuedStock).toFixed(6),
        );
        const statusValue =
          availableAfter <= 0
            ? "Out of Stock"
            : availableAfter <= Number(inventory.minimumStock || 0)
              ? "Low Stock"
              : "Available";
        inventory.quantity = quantityAfter;
        inventory.availableQuantity = availableAfter;
        inventory.status = statusValue;
        inventory.lastTransactionAt = new Date();
        await inventory.save();
        rawMaterial.quantity = quantityAfter;
        rawMaterial.availableQuantity = availableAfter;
        rawMaterial.reservedQuantity = Number(inventory.reservedQuantity || 0);
        rawMaterial.costPerUnit = Number(
          inventory.averageCostPerUnit || rawMaterial.costPerUnit || 0,
        );
        await rawMaterial.save();
        const unitCost = Number(inventory.averageCostPerUnit || 0);
        item.costTotal = Number((issuedStock * unitCost).toFixed(2));
        item.costPerUnit =
          Number(item.quantity) > 0
            ? Number(
                (Number(item.costTotal) / Number(item.quantity)).toFixed(2),
              )
            : 0;
        await InventoryTransaction.create({
          inventory: inventory._id,
          rawMaterial: rawMaterial._id,
          rawMaterialName: rawMaterial.name,
          rawMaterialCode: rawMaterial.code,
          type: "Sales Issue",
          quantity: issuedStock,
          unit: rawMaterial.unit,
          unitCost,
          totalCost: Number(item.costTotal),
          quantityBefore,
          quantityAfter,
          referenceType: "SalesOrder",
          referenceId: order._id,
          reason: `Sold on ${order.orderNumber}.`,
          performedBy:
            performedBy && mongoose.Types.ObjectId.isValid(performedBy)
              ? new mongoose.Types.ObjectId(performedBy)
              : undefined,
          transactionDate: new Date(),
        });
        const lots = await RawMaterialLot.find({
          rawMaterial: rawMaterial._id,
          status: "available",
          availableQuantity: { $gt: 0 },
        }).sort({ receivedAt: 1 });
        let remaining = issuedStock;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const used = Math.min(remaining, Number(lot.availableQuantity));
          lot.availableQuantity = Number(
            (Number(lot.availableQuantity) - used).toFixed(6),
          );
          lot.status = lot.availableQuantity <= 0 ? "consumed" : "available";
          await lot.save();
          remaining = Number((remaining - used).toFixed(6));
        }
        continue;
      }
      const product = await Product.findById(item.product);
      if (!product)
        throw new Error(`Finished product not found for ${item.productName}.`);
      const issuedStock = await stockQuantityForOrderItem(item, product);
      await snapshotDeliveredItemCost(item, issuedStock);
      product.stock = Number((product.stock - issuedStock).toFixed(4));
      await product.save();
      const salesBalance = await FinishedGoodsStoreBalance.findOneAndUpdate(
        {
          product: item.product,
          store: "sales",
          quantity: { $gte: issuedStock },
        },
        { $inc: { quantity: -issuedStock } },
        { new: true },
      );
      if (!salesBalance)
        throw new Error(
          `Sales Store stock changed before delivery for ${item.productName}. Please review the order.`,
        );
    }
  }
  order.status = status;
  if (status === "delivered" && !order.deliveredAt)
    order.deliveredAt = new Date();
  order.statusHistory.push({
    status,
    ...(performedBy && mongoose.Types.ObjectId.isValid(performedBy)
      ? { by: new mongoose.Types.ObjectId(performedBy) }
      : {}),
  });
  await order.save();
  return order.populate(
    "customer",
    "fullName phone email isCompanyCustomer businessName address tin",
  );
}
