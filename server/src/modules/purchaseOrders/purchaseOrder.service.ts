import mongoose from "mongoose";
import PurchaseOrder from "./purchaseOrder.model";
import RawMaterial from "../raw-materials/rawMaterial.model";
import Inventory from "../inventory/inventory.model";
import InventoryTransaction from "../inventory/inventoryTransaction.model";
import SupplierMaterial from "../raw-materials/supplierMaterial.model";

// =====================================================
// CREATE PURCHASE ORDER
// =====================================================

export const createPurchaseOrder = async (
  data: any
) => {
  if (!data?.supplier || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Select a supplier and at least one raw material.");
  }

  const preparedItems = await Promise.all(
    data.items.map(async (item: any) => {
      const quantity = Number(item.quantity);
      if (!item?.rawMaterial || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Each purchase-order item needs a raw material and a positive quantity.");
      }

      const material = await RawMaterial.findById(item.rawMaterial).lean();
      if (!material || material.status === "Inactive") {
        throw new Error("Each purchase-order item must reference an active raw material.");
      }

      const offer = await SupplierMaterial.findOne({
        supplier: data.supplier,
        rawMaterial: material._id,
        status: "Active",
      }).lean();

      // Prices are procurement reference data, not a required PO entry. Use
      // the supplier offer first, then the material's last known cost.
      const unitPrice = Number(
        offer?.unitPrice ?? material.costPerUnit ?? 0,
      );

      return {
        rawMaterial: material._id,
        quantity,
        unit: material.unit,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        total: Number((quantity * (Number.isFinite(unitPrice) ? unitPrice : 0)).toFixed(2)),
      };
    }),
  );

  const subtotal = Number(
    preparedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2),
  );
  let poNumber = String(data.poNumber || "").trim().toUpperCase();
  if (!poNumber) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await PurchaseOrder.countDocuments({ poNumber: new RegExp(`^PO-${today}-`) });
    poNumber = `PO-${today}-${String(count + 1).padStart(3, "0")}`;
  }
  const purchaseOrder = await PurchaseOrder.create({
    ...data,
    poNumber,
    items: preparedItems,
    subtotal,
    tax: 0,
    total: subtotal,
  });

  return purchaseOrder;
};

// =====================================================
// GET ALL PURCHASE ORDERS
// =====================================================

export const getPurchaseOrders = async () => {
  const purchaseOrders =
    await PurchaseOrder.find()
      .populate("supplier")
      .populate("items.rawMaterial")
      .sort({ createdAt: -1 });

  return purchaseOrders;
};

// =====================================================
// GET PURCHASE ORDER BY ID
// =====================================================

export const getPurchaseOrderById = async (
  id: string
) => {
  const purchaseOrder =
    await PurchaseOrder.findById(id)
      .populate("supplier")
      .populate("items.rawMaterial");

  return purchaseOrder;
};

// =====================================================
// UPDATE PURCHASE ORDER STATUS
// =====================================================

export const updatePurchaseOrderStatus = async (
  id: string,
  status: string
) => {
  // ===================================================
  // VALID STATUSES
  // ===================================================

  const allowedStatuses = [
    "draft",
    "pending_approval",
    "approved",
    "partially_received",
    "received",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid purchase order status."
    );
  }

  // ===================================================
  // FIND PURCHASE ORDER
  // ===================================================

  const purchaseOrder =
    await PurchaseOrder.findById(id);

  if (!purchaseOrder) {
    throw new Error(
      "Purchase order not found."
    );
  }

  // ===================================================
  // RECEIVED IS FINAL
  // ===================================================

  if (purchaseOrder.status === "received") {
    throw new Error(
      "Purchase order has already been received and cannot be changed."
    );
  }

  // ===================================================
  // ONLY APPROVED CAN BECOME RECEIVED
  // ===================================================

  if (
    status === "received" &&
    purchaseOrder.status !== "approved"
  ) {
    throw new Error(
      "Only approved purchase orders can be marked as received."
    );
  }

  // ===================================================
  // RECEIVE PURCHASE ORDER
  // ===================================================

  if (status === "received") {
    // -------------------------------------------------
    // VALIDATE ITEMS
    // -------------------------------------------------

    if (
      !purchaseOrder.items ||
      purchaseOrder.items.length === 0
    ) {
      throw new Error(
        "Purchase order has no items to receive."
      );
    }

    // -------------------------------------------------
    // START TRANSACTION
    // -------------------------------------------------

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      // ------------------------------------------------
      // RELOAD PO INSIDE TRANSACTION
      // ------------------------------------------------

      const currentPurchaseOrder =
        await PurchaseOrder.findById(id)
          .session(session);

      if (!currentPurchaseOrder) {
        throw new Error(
          "Purchase order not found."
        );
      }

      // ------------------------------------------------
      // DOUBLE RECEIVE PROTECTION
      // ------------------------------------------------

      if (
        currentPurchaseOrder.status ===
        "received"
      ) {
        throw new Error(
          "Purchase order has already been received."
        );
      }

      // ------------------------------------------------
      // CHECK APPROVAL AGAIN
      // ------------------------------------------------

      if (
        currentPurchaseOrder.status !==
        "approved"
      ) {
        throw new Error(
          "Only approved purchase orders can be marked as received."
        );
      }

      // ------------------------------------------------
      // UPDATE RAW MATERIAL STOCK
      // ------------------------------------------------

      for (
        const item of currentPurchaseOrder.items
      ) {
        // ----------------------------------------------
        // VALIDATE QUANTITY
        // ----------------------------------------------

        if (
          !item.quantity ||
          item.quantity <= 0
        ) {
          throw new Error(
            "Purchase order contains an invalid quantity."
          );
        }

        // ----------------------------------------------
        // FIND RAW MATERIAL
        // ----------------------------------------------

        const rawMaterial =
          await RawMaterial.findById(
            item.rawMaterial
          ).session(session);

        if (!rawMaterial) {
          throw new Error(
            "Raw material not found."
          );
        }

        // ----------------------------------------------
        // UNIT VALIDATION
        // ----------------------------------------------

        if (
          rawMaterial.unit
            .trim()
            .toLowerCase() !==
          item.unit
            .trim()
            .toLowerCase()
        ) {
          throw new Error(
            `Unit mismatch for raw material "${rawMaterial.name}".`
          );
        }

        // ----------------------------------------------
        // ADD RECEIVED QUANTITY TO STOCK
        // ----------------------------------------------

        rawMaterial.quantity +=
          Number(item.quantity);

        rawMaterial.availableQuantity = Number(rawMaterial.quantity) - Number(rawMaterial.reservedQuantity || 0);

        // ----------------------------------------------
        // UPDATE LATEST COST
        // ----------------------------------------------

        const receiptUnitPrice =
          Number(item.unitPrice) > 0
            ? Number(item.unitPrice)
            : Number(rawMaterial.costPerUnit || 0);

        rawMaterial.costPerUnit =
          receiptUnitPrice;

        // ----------------------------------------------
        // SAVE RAW MATERIAL
        // ----------------------------------------------

        await rawMaterial.save({
          session,
        });

        // ----------------------------------------------
        // POST GOODS RECEIPT TO THE RAW-MATERIAL LEDGER
        // ----------------------------------------------
        const currentInventory = await Inventory.findOne({ rawMaterial: rawMaterial._id }).session(session);
        const before = currentInventory?.quantity ?? 0;
        const after = Number((before + Number(item.quantity)).toFixed(6));
        const previousValue = before * (currentInventory?.averageCostPerUnit ?? 0);
        const averageCost = after > 0
          ? Number(((previousValue + Number(item.quantity) * receiptUnitPrice) / after).toFixed(6))
          : 0;
        const minimumStock = rawMaterial.minimumStock ?? 0;
        const status = after <= 0 ? "Out of Stock" : after <= minimumStock ? "Low Stock" : "Available";

        const inventory = currentInventory
          ? await Inventory.findByIdAndUpdate(currentInventory._id, {
              $inc: { quantity: Number(item.quantity), availableQuantity: Number(item.quantity) },
              $set: { averageCostPerUnit: averageCost, status, lastTransactionAt: new Date() },
            }, { new: true, session })
          : await Inventory.create([{
              rawMaterial: rawMaterial._id,
              rawMaterialName: rawMaterial.name,
              rawMaterialCode: rawMaterial.code,
              unit: rawMaterial.unit,
              quantity: after,
              reservedQuantity: 0,
              availableQuantity: after,
              minimumStock,
              averageCostPerUnit: averageCost,
              status,
              lastTransactionAt: new Date(),
            }], { session }).then(([created]) => created);

        if (!inventory) throw new Error("Unable to post the goods receipt to inventory.");

        await InventoryTransaction.create([{
          inventory: inventory._id,
          rawMaterial: rawMaterial._id,
          rawMaterialName: rawMaterial.name,
          rawMaterialCode: rawMaterial.code,
          type: "Purchase",
          quantity: Number(item.quantity),
          unit: rawMaterial.unit,
          unitCost: receiptUnitPrice,
          totalCost: Number((Number(item.quantity) * receiptUnitPrice).toFixed(2)),
          quantityBefore: before,
          quantityAfter: after,
          referenceType: "PurchaseOrder",
          referenceId: currentPurchaseOrder._id,
          purchaseOrder: currentPurchaseOrder._id,
          transactionDate: new Date(),
        }], { session });
      }

      // ------------------------------------------------
      // CHANGE PURCHASE ORDER STATUS
      // ------------------------------------------------

      currentPurchaseOrder.status =
        "received";

      await currentPurchaseOrder.save({
        session,
      });

      // ------------------------------------------------
      // COMMIT TRANSACTION
      // ------------------------------------------------

      await session.commitTransaction();

      return currentPurchaseOrder;
    } catch (error) {
      // ------------------------------------------------
      // ROLLBACK
      // ------------------------------------------------

      await session.abortTransaction();

      throw error;
    } finally {
      // ------------------------------------------------
      // CLOSE SESSION
      // ------------------------------------------------

      await session.endSession();
    }
  }

  // ===================================================
  // NORMAL STATUS UPDATE
  // ===================================================

  purchaseOrder.status =
    status as
      | "draft"
      | "pending_approval"
      | "approved"
      | "partially_received"
      | "received"
      | "cancelled";

  await purchaseOrder.save();

  return purchaseOrder;
};

// =====================================================
// DELETE PURCHASE ORDER
// =====================================================

export const deletePurchaseOrder = async (
  id: string
) => {
  const purchaseOrder =
    await PurchaseOrder.findByIdAndDelete(id);

  return purchaseOrder;
};
