import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  Truck,
  CalendarDays,
  PackageOpen,
  X,
  Loader2,
  Printer,
} from "lucide-react";

import PurchaseOrderModal from "../components/PurchaseOrderModal";
import { printCanaDocument } from "../../utils/printCanaDocument";
import api from "@/services/api";

// =====================================================
// TYPES
// =====================================================

interface PurchaseOrderItem {
  rawMaterial:
    | string
    | null
    | {
        _id: string;
        name: string;
        code: string;
        unit?: string;
      };
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

const formatQuantity = (quantity: number, unit: string) => {
  const value = Number(quantity || 0);
  if (unit.trim().toLowerCase() !== "kg") return `${value} ${unit}`;
  return `${value.toLocaleString("en-RW", { maximumFractionDigits: 2 })} kg (${(value / 1000).toLocaleString("en-RW", { maximumFractionDigits: 3 })} t)`;
};
const materialName = (rawMaterial: PurchaseOrderItem["rawMaterial"]) =>
  rawMaterial && typeof rawMaterial !== "string" ? rawMaterial.name || "Material record unavailable" : rawMaterial || "Material record unavailable";
const materialCode = (rawMaterial: PurchaseOrderItem["rawMaterial"]) =>
  rawMaterial && typeof rawMaterial !== "string" ? rawMaterial.code || "—" : "—";

interface PurchaseOrder {
  _id: string;
  poNumber: string;

  supplier:
    | string
    | {
        _id: string;
        name: string;
        code: string;
      };

  orderDate: string;
  expectedDeliveryDate?: string;

  items: PurchaseOrderItem[];

  subtotal: number;
  tax: number;
  total: number;

  status: PurchaseOrderStatus;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// CREATE DATA
// =====================================================

interface CreatePurchaseOrderData {
  supplier: string;
  orderDate: string;
  expectedDeliveryDate?: string;

  items: {
    rawMaterial: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];

  subtotal: number;
  tax: number;
  total: number;

  notes?: string;
}

// =====================================================
// COMPONENT
// =====================================================

function PurchaseOrdersPage() {
  // ===================================================
  // STATE
  // ===================================================

  const [purchaseOrders, setPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selectedOrder, setSelectedOrder] =
    useState<PurchaseOrder | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const printPurchaseOrder = async (order: PurchaseOrder) => {
    try {
      const response = await api.get<{ data: PurchaseOrder }>(`/purchase-orders/${order._id}`);
      const fullOrder = response.data.data || order;
      printCanaDocument({ title: "Purchase order", reference: fullOrder.poNumber, status: getStatusLabel(fullOrder.status), details: [{ label: "Supplier", value: getSupplierName(fullOrder.supplier) }, { label: "Supplier code", value: typeof fullOrder.supplier === "string" ? "—" : fullOrder.supplier.code }, { label: "Order date", value: formatDate(fullOrder.orderDate) }, { label: "Expected delivery", value: formatDate(fullOrder.expectedDeliveryDate) }, { label: "Materials requested", value: fullOrder.items.length }], table: { headers: ["Raw material", "Code", "Quantity (kg / t)"], rows: fullOrder.items.map((item) => [materialName(item.rawMaterial), materialCode(item.rawMaterial), formatQuantity(item.quantity, item.unit)]) }, notes: fullOrder.notes || "Please supply the listed raw materials according to the agreed delivery date and terms.", approval: { status: fullOrder.status === "approved" || fullOrder.status === "received" ? "Official purchase order" : "Draft — pending approval", signatoryTitle: "Managing Director", signatoryName: "KABANDA Fred" } });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not prepare the purchase order for printing.");
    }
  };

  // ===================================================
  // FETCH PURCHASE ORDERS
  // ===================================================

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);

      const response = await api.get<{ data: PurchaseOrder[] }>("/purchase-orders");
      const result = response.data;

      const data = Array.isArray(result.data)
        ? result.data
        : [];

      setPurchaseOrders(data);
    } catch (error) {
      console.error(
        "Fetch Purchase Orders Error:",
        error
      );

      setPurchaseOrders([]);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load purchase orders."
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // ===================================================
  // CREATE PURCHASE ORDER
  // ===================================================

  const handleCreatePurchaseOrder = async (
    data: CreatePurchaseOrderData
  ) => {
    try {
      const payload = {
        supplier: data.supplier,

        orderDate: data.orderDate,

        expectedDeliveryDate:
          data.expectedDeliveryDate || undefined,

        items: data.items,

        subtotal: Number(data.subtotal),

        tax: Number(data.tax),

        total: Number(data.total),

        status: "draft",

        notes: data.notes || undefined,
      };

      await api.post("/purchase-orders", payload);

      await fetchPurchaseOrders();

      setIsModalOpen(false);

      alert(
        "Purchase order created successfully."
      );
    } catch (error) {
      console.error(
        "Create Purchase Order Error:",
        error
      );

      throw error;
    }
  };

  // ===================================================
  // DELETE PURCHASE ORDER
  // ===================================================

  const handleDelete = async (
    id: string
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this purchase order?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await api.delete(`/purchase-orders/${id}`);

      setPurchaseOrders(
        (previousOrders) =>
          previousOrders.filter(
            (order) =>
              order._id !== id
          )
      );

      if (
        selectedOrder?._id === id
      ) {
        setSelectedOrder(null);
        setShowDetails(false);
      }
    } catch (error) {
      console.error(
        "Delete Purchase Order Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete purchase order."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ===================================================
  // UPDATE STATUS
  // ===================================================

  const handleStatusChange = async (
    id: string,
    status: PurchaseOrderStatus
  ) => {
    const currentOrder =
      purchaseOrders.find(
        (order) => order._id === id
      );

    if (!currentOrder) {
      return;
    }

    // =================================================
    // RECEIVED IS FINAL
    // =================================================

    if (currentOrder.status === "received") {
      alert(
        "This purchase order has already been received and can no longer be changed."
      );

      return;
    }

    // =================================================
    // CANCELLED IS FINAL
    // =================================================

    if (
      currentOrder.status === "cancelled"
    ) {
      alert(
        "This purchase order has been cancelled and can no longer be changed."
      );

      return;
    }

    // =================================================
    // SAME STATUS
    // =================================================

    if (currentOrder.status === status) {
      return;
    }

    try {
      setUpdatingId(id);

      const result = (await api.patch(`/purchase-orders/${id}/status`, { status })).data;

      const updatedStatus =
        result?.data?.status || status;

      if (updatedStatus === "received") {
        window.dispatchEvent(
          new Event("cana:stock-updated"),
        );
      }

      // =================================================
      // UPDATE LIST
      // =================================================

      setPurchaseOrders(
        (previousOrders) =>
          previousOrders.map(
            (order) =>
              order._id === id
                ? {
                    ...order,
                    status:
                      updatedStatus,
                  }
                : order
          )
      );

      // =================================================
      // UPDATE SELECTED ORDER
      // =================================================

      if (
        selectedOrder?._id === id
      ) {
        setSelectedOrder(
          (previousOrder) =>
            previousOrder
              ? {
                  ...previousOrder,
                  status:
                    updatedStatus,
                }
              : null
        );
      }
    } catch (error) {
      console.error(
        "Update Purchase Order Status Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update status."
      );

      /*
       * Reload from backend to make sure
       * frontend state matches database.
       */

      await fetchPurchaseOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // FILTER
  // ===================================================

  const filteredPurchaseOrders =
    useMemo(() => {
      const searchValue =
        search.trim().toLowerCase();

      return purchaseOrders.filter(
        (order) => {
          const supplierName =
            typeof order.supplier ===
            "string"
              ? ""
              : order.supplier?.name || "";

          const supplierCode =
            typeof order.supplier ===
            "string"
              ? ""
              : order.supplier?.code || "";

          const matchesSearch =
            !searchValue ||
            order.poNumber
              ?.toLowerCase()
              .includes(searchValue) ||
            supplierName
              .toLowerCase()
              .includes(searchValue) ||
            supplierCode
              .toLowerCase()
              .includes(searchValue);

          const matchesStatus =
            statusFilter === "all" ||
            order.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      purchaseOrders,
      search,
      statusFilter,
    ]);

  // ===================================================
  // STATS
  // ===================================================

  const stats = useMemo(() => {
    const total =
      purchaseOrders.length;

    const draft =
      purchaseOrders.filter(
        (order) =>
          order.status === "draft"
      ).length;

    const pending =
      purchaseOrders.filter(
        (order) =>
          order.status ===
          "pending_approval"
      ).length;

    const approved =
      purchaseOrders.filter(
        (order) =>
          order.status === "approved"
      ).length;

    const received =
      purchaseOrders.filter(
        (order) =>
          order.status === "received"
      ).length;

    return {
      total,
      draft,
      pending,
      approved,
      received,
    };
  }, [purchaseOrders]);

  // ===================================================
  // FORMAT CURRENCY
  // ===================================================

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      "en-RW",
      {
        style: "currency",
        currency: "RWF",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  };

  // ===================================================
  // FORMAT DATE
  // ===================================================

  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return "-";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ===================================================
  // SUPPLIER NAME
  // ===================================================

  const getSupplierName = (
    supplier:
      | string
      | {
          _id: string;
          name: string;
          code: string;
        }
  ) => {
    if (
      typeof supplier ===
      "string"
    ) {
      return supplier;
    }

    return (
      supplier?.name || "-"
    );
  };

  // ===================================================
  // STATUS LABEL
  // ===================================================

  const getStatusLabel = (
    status: PurchaseOrderStatus
  ) => {
    switch (status) {
      case "pending_approval":
        return "Pending Approval";

      case "partially_received":
        return "Partially Received";

      default:
        return (
          status.charAt(0).toUpperCase() +
          status.slice(1)
        );
    }
  };

  // ===================================================
  // STATUS CLASS
  // ===================================================

  const getStatusClass = (
    status: PurchaseOrderStatus
  ) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";

      case "pending_approval":
        return "bg-yellow-100 text-yellow-700";

      case "approved":
        return "bg-blue-100 text-blue-700";

      case "partially_received":
        return "bg-orange-100 text-orange-700";

      case "received":
        return "bg-green-100 text-green-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // ===================================================
  // VIEW DETAILS
  // ===================================================

  const handleViewDetails = async (
    order: PurchaseOrder
  ) => {
    try {
      const response = await api.get<{ data: PurchaseOrder }>(`/purchase-orders/${order._id}`);
      setSelectedOrder(response.data.data || order);
      setShowDetails(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not load purchase-order details.");
    }
  };

  // ===================================================
  // CLOSE DETAILS
  // ===================================================

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedOrder(null);
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FileText size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Purchase Orders
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage raw material purchases
                and supplier orders.
              </p>
            </div>

          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsModalOpen(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          <Plus size={18} />
          Create Purchase Order
        </button>

      </div>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

        {/* TOTAL */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-gray-500">
              Total Orders
            </p>

            <FileText
              size={19}
              className="text-gray-400"
            />

          </div>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {stats.total}
          </p>
        </div>

        {/* DRAFT */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-gray-500">
              Draft
            </p>

            <FileText
              size={19}
              className="text-gray-400"
            />

          </div>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {stats.draft}
          </p>
        </div>

        {/* PENDING */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-gray-500">
              Pending
            </p>

            <CalendarDays
              size={19}
              className="text-yellow-500"
            />

          </div>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {stats.pending}
          </p>
        </div>

        {/* APPROVED */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-gray-500">
              Approved
            </p>

            <Truck
              size={19}
              className="text-blue-500"
            />

          </div>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {stats.approved}
          </p>
        </div>

        {/* RECEIVED */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-gray-500">
              Received
            </p>

            <PackageOpen
              size={19}
              className="text-green-500"
            />

          </div>

          <p className="mt-3 text-2xl font-bold text-gray-900">
            {stats.received}
          </p>
        </div>

      </div>

      {/* =================================================
          FILTER BAR
      ================================================= */}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 md:flex-row md:items-center">

          {/* SEARCH */}

          <div className="relative flex-1">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search PO number or supplier..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />

          </div>

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          >

            <option value="all">
              All Status
            </option>

            <option value="draft">
              Draft
            </option>

            <option value="pending_approval">
              Pending Approval
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="partially_received">
              Partially Received
            </option>

            <option value="received">
              Received
            </option>

            <option value="cancelled">
              Cancelled
            </option>

          </select>

          {/* REFRESH */}

          <button
            type="button"
            onClick={
              fetchPurchaseOrders
            }
            disabled={loading}
            title="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

        </div>

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {/* TABLE HEADER */}

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div>

            <h2 className="text-base font-bold text-gray-900">
              Purchase Orders
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              {filteredPurchaseOrders.length}{" "}
              order
              {filteredPurchaseOrders.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>

          </div>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="flex min-h-[280px] items-center justify-center">

            <div className="flex flex-col items-center gap-3">

              <Loader2
                size={28}
                className="animate-spin text-red-600"
              />

              <p className="text-sm text-gray-500">
                Loading purchase orders...
              </p>

            </div>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          filteredPurchaseOrders.length ===
            0 && (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <FileText size={26} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-gray-900">
                No purchase orders found
              </h3>

              <p className="mt-1 max-w-sm text-xs text-gray-500">
                Create your first purchase
                order or change your search
                filters.
              </p>

              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(true)
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Plus size={16} />
                Create Purchase Order
              </button>

            </div>
          )}

        {/* =================================================
            DESKTOP TABLE
        ================================================= */}

        {!loading &&
          filteredPurchaseOrders.length >
            0 && (
            <div className="hidden overflow-x-auto lg:block">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-gray-200 bg-gray-50">

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      PO Number
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Supplier
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Order Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Delivery
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Items
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredPurchaseOrders.map(
                    (order) => (

                      <tr
                        key={order._id}
                        className="transition hover:bg-gray-50"
                      >

                        {/* PO */}

                        <td className="px-5 py-4">

                          <p className="text-sm font-bold text-gray-900">
                            {order.poNumber}
                          </p>

                        </td>

                        {/* SUPPLIER */}

                        <td className="px-5 py-4">

                          <p className="text-sm font-medium text-gray-900">
                            {getSupplierName(
                              order.supplier
                            )}
                          </p>

                          {typeof order.supplier !==
                            "string" && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {
                                order
                                  .supplier
                                  .code
                              }
                            </p>
                          )}

                        </td>

                        {/* ORDER DATE */}

                        <td className="px-5 py-4">

                          <p className="text-sm text-gray-700">
                            {formatDate(
                              order.orderDate
                            )}
                          </p>

                        </td>

                        {/* DELIVERY */}

                        <td className="px-5 py-4">

                          <p className="text-sm text-gray-700">
                            {formatDate(
                              order.expectedDeliveryDate
                            )}
                          </p>

                        </td>

                        {/* ITEMS */}

                        <td className="px-5 py-4">

                          <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">

                            {order.items
                              ?.length ||
                              0}{" "}
                            item
                            {order.items
                              ?.length !==
                            1
                              ? "s"
                              : ""}

                          </span>

                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">

                          <select
                            value={
                              order.status
                            }
                            disabled={
                              updatingId ===
                                order._id ||
                              order.status ===
                                "received" ||
                              order.status ===
                                "cancelled"
                            }
                            onChange={(
                              event
                            ) =>
                              handleStatusChange(
                                order._id,
                                event
                                  .target
                                  .value as PurchaseOrderStatus
                              )
                            }
                            title={
                              order.status ===
                              "received"
                                ? "Received orders cannot be changed"
                                : order.status ===
                                  "cancelled"
                                ? "Cancelled orders cannot be changed"
                                : "Change status"
                            }
                            className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold outline-none ${getStatusClass(
                              order.status
                            )} ${
                              order.status ===
                                "received" ||
                              order.status ===
                                "cancelled"
                                ? "cursor-not-allowed opacity-70"
                                : ""
                            }`}
                          >

                            <option value="draft">
                              Draft
                            </option>

                            <option value="pending_approval">
                              Pending Approval
                            </option>

                            <option value="approved">
                              Approved
                            </option>

                            <option value="partially_received">
                              Partially Received
                            </option>

                            <option value="received">
                              Received
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>

                          </select>

                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">

                          <div className="flex items-center justify-end gap-1">

                            <button
                              type="button"
                              onClick={() =>
                                handleViewDetails(
                                  order
                                )
                              }
                              title="View details"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                              <Eye
                                size={17}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => printPurchaseOrder(order)}
                              title="Print purchase order"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Printer size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  order._id
                                )
                              }
                              disabled={
                                deletingId ===
                                order._id
                              }
                              title="Delete"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >

                              {deletingId ===
                              order._id ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={17}
                                />
                              )}

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        {/* =================================================
            MOBILE CARDS
        ================================================= */}

        {!loading &&
          filteredPurchaseOrders.length >
            0 && (
            <div className="divide-y divide-gray-100 lg:hidden">

              {filteredPurchaseOrders.map(
                (order) => (

                  <div
                    key={order._id}
                    className="p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-sm font-bold text-gray-900">
                          {order.poNumber}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {getSupplierName(
                            order.supplier
                          )}
                        </p>

                      </div>

                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(
                          order.status
                        )}
                      </span>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">

                      <div>

                        <p className="text-xs text-gray-400">
                          Order Date
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {formatDate(
                            order.orderDate
                          )}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-400">
                          Delivery
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {formatDate(
                            order.expectedDeliveryDate
                          )}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-400">
                          Items
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {order.items
                            ?.length ||
                            0}
                        </p>

                      </div>

                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">

                      <select
                        value={
                          order.status
                        }
                        disabled={
                          updatingId ===
                            order._id ||
                          order.status ===
                            "received" ||
                          order.status ===
                            "cancelled"
                        }
                        onChange={(
                          event
                        ) =>
                          handleStatusChange(
                            order._id,
                            event
                              .target
                              .value as PurchaseOrderStatus
                          )
                        }
                        className={`h-9 flex-1 rounded-lg border-0 px-3 text-xs font-semibold outline-none ${getStatusClass(
                          order.status
                        )} ${
                          order.status ===
                            "received" ||
                          order.status ===
                            "cancelled"
                            ? "cursor-not-allowed opacity-70"
                            : ""
                        }`}
                      >

                        <option value="draft">
                          Draft
                        </option>

                        <option value="pending_approval">
                          Pending Approval
                        </option>

                        <option value="approved">
                          Approved
                        </option>

                        <option value="partially_received">
                          Partially Received
                        </option>

                        <option value="received">
                          Received
                        </option>

                        <option value="cancelled">
                          Cancelled
                        </option>

                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          handleViewDetails(
                            order
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        <Eye
                          size={17}
                        />
                      </button>

                      <button type="button" onClick={() => printPurchaseOrder(order)} title="Print purchase order" className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"><Printer size={17} /></button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            order._id
                          )
                        }
                        disabled={
                          deletingId ===
                          order._id
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >

                        {deletingId ===
                        order._id ? (
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={17}
                          />
                        )}

                      </button>

                    </div>

                  </div>

                )
              )}

            </div>
          )}

      </div>

      {/* =================================================
          CREATE MODAL
      ================================================= */}

      <PurchaseOrderModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        onSubmit={
          handleCreatePurchaseOrder
        }
      />

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {showDetails &&
        selectedOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">

            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Purchase Order
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-gray-900">
                    {
                      selectedOrder.poNumber
                    }
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    closeDetails
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <X size={20} />
                </button>

              </div>

              {/* CONTENT */}

              <div className="flex-1 overflow-y-auto px-6 py-6">

                {/* BASIC INFO */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                  <div className="rounded-xl bg-gray-50 p-4">

                    <p className="text-xs font-medium text-gray-400">
                      Supplier
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {getSupplierName(
                        selectedOrder.supplier
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">

                    <p className="text-xs font-medium text-gray-400">
                      Order Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatDate(
                        selectedOrder.orderDate
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">

                    <p className="text-xs font-medium text-gray-400">
                      Expected Delivery
                    </p>

                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatDate(
                        selectedOrder.expectedDeliveryDate
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">

                    <p className="text-xs font-medium text-gray-400">
                      Status
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        selectedOrder.status
                      )}`}
                    >
                      {getStatusLabel(
                        selectedOrder.status
                      )}
                    </span>

                  </div>

                </div>

                {/* RECEIVED WARNING */}

                {selectedOrder.status ===
                  "received" && (
                  <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">

                    <div className="flex items-start gap-3">

                      <PackageOpen
                        size={20}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <div>

                        <p className="text-sm font-bold text-green-800">
                          Purchase Order Received
                        </p>

                        <p className="mt-1 text-xs text-green-700">
                          This purchase order has
                          already been received.
                          Its status is final and
                          cannot be changed.
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* CANCELLED WARNING */}

                {selectedOrder.status ===
                  "cancelled" && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

                    <div className="flex items-start gap-3">

                      <X
                        size={20}
                        className="mt-0.5 shrink-0 text-red-600"
                      />

                      <div>

                        <p className="text-sm font-bold text-red-800">
                          Purchase Order Cancelled
                        </p>

                        <p className="mt-1 text-xs text-red-700">
                          This purchase order has
                          been cancelled and its
                          status cannot be changed.
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* ITEMS */}

                <div className="mt-6">

                  <h3 className="text-sm font-bold text-gray-900">
                    Raw Materials
                  </h3>

                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">

                    <div className="hidden grid-cols-[2fr_1fr_1fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">

                      <span>
                        Material
                      </span>

                      <span>
                        Quantity
                      </span>

                      <span>
                        Unit
                      </span>

                    </div>

                    <div className="divide-y divide-gray-100">

                      {selectedOrder.items?.map(
                        (
                          item,
                          index
                        ) => {

                          const materialName =
                            typeof item.rawMaterial ===
                            "string"
                              ? item.rawMaterial
                              : item
                                  .rawMaterial
                                  ?.name ||
                                "-";

                          return (
                            <div
                              key={
                                `${selectedOrder._id}-${index}`
                              }
                              className="grid grid-cols-1 gap-2 px-4 py-4 md:grid-cols-[2fr_1fr_1fr] md:items-center"
                            >

                              <div>

                                <p className="text-sm font-semibold text-gray-900">
                                  {
                                    materialName
                                  }
                                </p>

                                {typeof item.rawMaterial !==
                                  "string" && (
                                  <p className="mt-0.5 text-xs text-gray-500">
                                    {
                                      item
                                        .rawMaterial
                                        ?.code
                                    }
                                  </p>
                                )}

                              </div>

                              <div>

                                <span className="text-xs text-gray-400 md:hidden">
                                  Quantity:{" "}
                                </span>

                                <span className="text-sm text-gray-700">
                                  {formatQuantity(
                                    item.quantity,
                                    item.unit,
                                  )}
                                </span>

                              </div>

                              <div>

                                <span className="text-xs text-gray-400 md:hidden">
                                  Unit:{" "}
                                </span>

                                <span className="text-sm text-gray-700">
                                  {
                                    item.unit
                                  }
                                </span>

                              </div>

                              <div className="hidden">

                                <span className="text-xs text-gray-400 md:hidden">
                                  Unit Price:{" "}
                                </span>

                                <span className="text-sm text-gray-700">
                                  {formatCurrency(
                                    item.unitPrice
                                  )}
                                </span>

                              </div>

                              <div className="hidden">

                                <span className="text-xs text-gray-400 md:hidden">
                                  Total:{" "}
                                </span>

                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(
                                    item.total
                                  )}
                                </span>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                </div>

                {/* TOTALS */}

                {selectedOrder.status === "received" && (
                <div className="w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 p-5">

                  <p className="mb-4 text-xs font-bold uppercase tracking-wide text-emerald-700">Received material cost</p>

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-gray-500">
                        Subtotal
                      </span>

                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          selectedOrder.subtotal
                        )}
                      </span>

                    </div>

                    <div className="mt-3 flex items-center justify-between">

                      <span className="text-sm text-gray-500">
                        Tax
                      </span>

                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          selectedOrder.tax
                        )}
                      </span>

                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">

                      <span className="text-sm font-bold text-gray-700">
                        Grand Total
                      </span>

                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          selectedOrder.total
                        )}
                      </span>

                    </div>

                </div>
                )}

                {/* NOTES */}

                {selectedOrder.notes && (
                  <div className="mt-6">

                    <h3 className="text-sm font-bold text-gray-900">
                      Notes
                    </h3>

                    <div className="mt-2 rounded-xl bg-gray-50 p-4">

                      <p className="whitespace-pre-wrap text-sm text-gray-600">
                        {
                          selectedOrder.notes
                        }
                      </p>

                    </div>

                  </div>
                )}

              </div>

              {/* FOOTER */}

              <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">

                <button type="button" onClick={() => printPurchaseOrder(selectedOrder)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"><Printer size={16} />Print purchase order</button>

                {selectedOrder.status === "received" && <Link to="/management/supplier-payments" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Record supplier payment</Link>}

                <button
                  type="button"
                  onClick={
                    closeDetails
                  }
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

export default PurchaseOrdersPage;
