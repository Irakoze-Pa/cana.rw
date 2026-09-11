import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import ProductionOrderModal from "../components/ProductionOrderModal";
import ProductionOrderDetailsModal from "../components/ProductionOrderDetailsModal";
import ProductionBatchModal from "../components/ProductionBatchModal";
import ProductionBatchDetailsModal from "../components/ProductionBatchDetailsModal";

import {
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrderStats,
  getProductionOrders,
  updateProductionOrder,
} from "../services/productionOrder.service";

import {
  createProductionBatch,
  getProductionBatches,
} from "../services/productionBatch.service";

import type {
  ProductionBatch,
  CreateProductionBatchData,
  UpdateProductionBatchData,
} from "../types/productionBatch.types";

import type {
  ProductionOrder,
  ProductionOrderPriority,
  ProductionOrderStatus,
  CreateProductionOrderData,
  UpdateProductionOrderData,
  ProductionOrderStats,
} from "../types/productionOrder.types";
import { printCanaDocument } from "../../utils/printCanaDocument";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function getObjectId(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const item = value as {
      _id?: string;
      id?: string;
    };

    return item._id || item.id || "";
  }

  return "";
}

function getProductName(
  product: ProductionOrder["product"],
  fallback?: string
): string {
  if (
    typeof product === "object" &&
    product !== null
  ) {
    return product.name || fallback || "—";
  }

  return fallback || "—";
}

function getProductCode(
  product: ProductionOrder["product"],
  fallback?: string
): string {
  if (
    typeof product === "object" &&
    product !== null
  ) {
    return (
      product.code ||
      product.productCode ||
      product.sku ||
      fallback ||
      "—"
    );
  }

  return fallback || "—";
}

function getFormulaName(
  formula: ProductionOrder["formula"],
  fallback?: string
): string {
  if (
    typeof formula === "object" &&
    formula !== null
  ) {
    return formula.name || fallback || "—";
  }

  return fallback || "—";
}

function getFormulaCode(
  formula: ProductionOrder["formula"],
  fallback?: string
): string {
  if (
    typeof formula === "object" &&
    formula !== null
  ) {
    return (
      formula.code ||
      formula.formulaCode ||
      fallback ||
      "—"
    );
  }

  return fallback || "—";
}

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeOrders(
  payload: unknown
): ProductionOrder[] {
  if (Array.isArray(payload)) {
    return payload as ProductionOrder[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const value = payload as {
      data?: unknown;
      orders?: unknown;
      productionOrders?: unknown;
    };

    if (Array.isArray(value.data)) {
      return value.data as ProductionOrder[];
    }

    if (Array.isArray(value.orders)) {
      return value.orders as ProductionOrder[];
    }

    if (
      Array.isArray(
        value.productionOrders
      )
    ) {
      return value.productionOrders as ProductionOrder[];
    }
  }

  return [];
}

function normalizeBatches(
  payload: unknown
): ProductionBatch[] {
  if (Array.isArray(payload)) {
    return payload as ProductionBatch[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const value = payload as {
      data?: unknown;
      batches?: unknown;
      productionBatches?: unknown;
    };

    if (Array.isArray(value.data)) {
      return value.data as ProductionBatch[];
    }

    if (Array.isArray(value.batches)) {
      return value.batches as ProductionBatch[];
    }

    if (
      Array.isArray(
        value.productionBatches
      )
    ) {
      return value.productionBatches as ProductionBatch[];
    }
  }

  return [];
}

function normalizeStats(
  payload: unknown
): ProductionOrderStats {
  const empty: ProductionOrderStats = {
    total: 0,
    draft: 0,
    planned: 0,
    released: 0,
    inProduction: 0,
    completed: 0,
    cancelled: 0,
    onHold: 0,
  };

  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return empty;
  }

  const raw =
    payload as Record<string, unknown>;

  const data =
    raw.data &&
    typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  return {
    total: Number(data.total ?? 0),
    draft: Number(data.draft ?? 0),
    planned: Number(data.planned ?? 0),
    released: Number(data.released ?? 0),
    inProduction: Number(
      data.inProduction ??
        data.in_production ??
        0
    ),
    completed: Number(
      data.completed ?? 0
    ),
    cancelled: Number(
      data.cancelled ?? 0
    ),
    onHold: Number(
      data.onHold ??
        data.on_hold ??
        0
    ),
  };
}

function printProductionOrder(order: ProductionOrder) {
  printCanaDocument({
    title: "Production order",
    reference: order.productionOrderNo,
    status: order.status,
    details: [
      { label: "Product", value: `${getProductName(order.product, order.productName)} · ${getProductCode(order.product, order.productCode)}` },
      { label: "Formula", value: `${getFormulaName(order.formula, order.formulaName)} · ${getFormulaCode(order.formula, order.formulaCode)}${order.formulaVersion ? ` v${order.formulaVersion}` : ""}` },
      { label: "Required quantity", value: `${Number(order.quantity || 0).toLocaleString()} ${order.unit}` },
      { label: "Priority", value: order.priority },
      { label: "Planned date", value: formatDate(order.plannedDate) },
      { label: "Expected completion", value: formatDate(order.expectedCompletionDate) },
      { label: "Created", value: formatDate(order.createdAt) },
      { label: "Last updated", value: formatDate(order.updatedAt) },
    ],
    notes: order.notes,
  });
}

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

export default function ProductionOrdersPage() {
  /* ------------------------------------------------------------------------ */
  /* DATA                                                                      */
  /* ------------------------------------------------------------------------ */

  const [orders, setOrders] =
    useState<ProductionOrder[]>([]);

  const [stats, setStats] =
    useState<ProductionOrderStats>({
      total: 0,
      draft: 0,
      planned: 0,
      released: 0,
      inProduction: 0,
      completed: 0,
      cancelled: 0,
      onHold: 0,
    });

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<ProductionOrder | null>(
    null
  );

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState<ProductionBatch | null>(
    null
  );

  const [
    selectedOrderBatches,
    setSelectedOrderBatches,
  ] = useState<ProductionBatch[]>([]);

  /* ------------------------------------------------------------------------ */
  /* LOADING / ERROR                                                           */
  /* ------------------------------------------------------------------------ */

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* MODALS                                                                    */
  /* ------------------------------------------------------------------------ */

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false);

  const [
    isDetailsModalOpen,
    setIsDetailsModalOpen,
  ] = useState(false);

  const [
    isBatchModalOpen,
    setIsBatchModalOpen,
  ] = useState(false);

  const [
    isBatchDetailsModalOpen,
    setIsBatchDetailsModalOpen,
  ] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* FILTERS                                                                   */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    ProductionOrderStatus | "All"
  >("All");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<
    ProductionOrderPriority | "All"
  >("All");

  /* ------------------------------------------------------------------------ */
  /* PAGINATION                                                                 */
  /* ------------------------------------------------------------------------ */

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  /* ------------------------------------------------------------------------ */
  /* ACTION                                                                     */
  /* ------------------------------------------------------------------------ */

  const [
    actionOrderId,
    setActionOrderId,
  ] = useState<string | null>(null);

  /* ========================================================================== */
  /* LOAD ORDERS                                                                */
  /* ========================================================================== */

  const loadData = useCallback(
    async (showInitialLoader = false) => {
      try {
        if (showInitialLoader) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setError("");

        const [
          ordersResponse,
          statsResponse,
        ] = await Promise.all([
          getProductionOrders(),
          getProductionOrderStats(),
        ]);

        setOrders(
          normalizeOrders(
            ordersResponse
          )
        );

        setStats(
          normalizeStats(
            statsResponse
          )
        );
      } catch (err) {
        console.error(
          "Production Orders Load Error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load production orders."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  /* ========================================================================== */
  /* LOAD ALL BATCHES FOR ONE ORDER                                             */
  /* ========================================================================== */

  const loadOrderBatches =
    useCallback(
      async (orderId: string) => {
        try {
          const response =
            await getProductionBatches();

          const allBatches =
            normalizeBatches(
              response
            );

          const orderBatches =
            allBatches.filter(
              (batch) =>
                getObjectId(
                  batch.productionOrder
                ) === orderId
            );

          setSelectedOrderBatches(
            orderBatches
          );

          return orderBatches;
        } catch (err) {
          console.error(
            "Production Order Batches Load Error:",
            err
          );

          setSelectedOrderBatches([]);

          return [];
        }
      },
      []
    );

  /* ========================================================================== */
  /* FILTERING                                                                  */
  /* ========================================================================== */

  const filteredOrders =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return orders.filter(
        (order) => {
          const productName =
            getProductName(
              order.product,
              order.productName
            );

          const productCode =
            getProductCode(
              order.product,
              order.productCode
            );

          const formulaName =
            getFormulaName(
              order.formula,
              order.formulaName
            );

          const formulaCode =
            getFormulaCode(
              order.formula,
              order.formulaCode
            );

          const matchesSearch =
            !query ||
            order.productionOrderNo
              .toLowerCase()
              .includes(query) ||
            productName
              .toLowerCase()
              .includes(query) ||
            productCode
              .toLowerCase()
              .includes(query) ||
            formulaName
              .toLowerCase()
              .includes(query) ||
            formulaCode
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "All" ||
            order.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter ===
              "All" ||
            order.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        }
      );
    }, [
      orders,
      search,
      statusFilter,
      priorityFilter,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    priorityFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length /
        pageSize
    )
  );

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedOrders =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        pageSize;

      return filteredOrders.slice(
        start,
        start + pageSize
      );
    }, [
      filteredOrders,
      currentPage,
      pageSize,
    ]);

  /* ========================================================================== */
  /* CREATE ORDER                                                                */
  /* ========================================================================== */

  const handleCreate = async (
    data: CreateProductionOrderData
  ) => {
    try {
      setError("");

      await createProductionOrder(
        data
      );

      setIsCreateModalOpen(
        false
      );

      await loadData(false);
    } catch (err) {
      console.error(
        "Create Production Order Error:",
        err
      );

      throw err;
    }
  };

  /* ========================================================================== */
  /* EDIT ORDER                                                                  */
  /* ========================================================================== */

  const handleEdit = async (
    data: UpdateProductionOrderData
  ) => {
    if (!selectedOrder) {
      return;
    }

    try {
      setError("");

      await updateProductionOrder(
        selectedOrder._id,
        data
      );

      setIsEditModalOpen(false);
      setSelectedOrder(null);

      await loadData(false);
    } catch (err) {
      console.error(
        "Update Production Order Error:",
        err
      );

      throw err;
    }
  };

  /* ========================================================================== */
  /* DELETE ORDER                                                                */
  /* ========================================================================== */

  const handleDelete = async (
    order: ProductionOrder
  ) => {
    const confirmed =
      window.confirm(
        `Delete production order "${order.productionOrderNo}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionOrderId(
        order._id
      );

      setError("");

      await deleteProductionOrder(
        order._id
      );

      if (
        selectedOrder?._id ===
        order._id
      ) {
        setSelectedOrder(null);
        setSelectedOrderBatches([]);
        setIsDetailsModalOpen(
          false
        );
      }

      await loadData(false);
    } catch (err) {
      console.error(
        "Delete Production Order Error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete production order."
      );
    } finally {
      setActionOrderId(null);
    }
  };

  /* ========================================================================== */
  /* VIEW ORDER                                                                  */
  /* ========================================================================== */

  const handleViewOrder = async (
    order: ProductionOrder
  ) => {
    setSelectedOrder(order);
    setSelectedOrderBatches([]);
    setIsDetailsModalOpen(true);

    await loadOrderBatches(
      order._id
    );
  };

  /* ========================================================================== */
  /* EDIT ORDER                                                                  */
  /* ========================================================================== */

  const handleEditOrder = (
    order: ProductionOrder
  ) => {
    if (
      order.status ===
        "Completed" ||
      order.status ===
        "Cancelled"
    ) {
      return;
    }

    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  /* ========================================================================== */
  /* CREATE BATCH                                                                */
  /* ========================================================================== */

  const handleCreateBatch =
    async (
      productionOrderId: string
    ) => {
      const order = orders.find(
        (item) =>
          item._id ===
          productionOrderId
      );

      if (!order) {
        return;
      }

      /*
       * Refresh batches immediately before
       * opening the modal so the latest remaining
       * quantity is reflected.
       */
      const batches =
        await loadOrderBatches(
          productionOrderId
        );

      const produced =
        batches.reduce(
          (sum, batch) =>
            sum +
            Number(
              batch.actualQuantity ||
                0
            ),
          0
        );

      const remaining = Math.max(
        0,
        Number(order.quantity || 0) -
          produced
      );

      if (remaining <= 0) {
        setError(
          "This production order has no remaining quantity to produce."
        );

        return;
      }

      setSelectedOrder(order);

      setIsDetailsModalOpen(
        false
      );

      setIsBatchModalOpen(true);
    };

  /* ========================================================================== */
  /* CREATE BATCH SUBMIT                                                        */
  /* ========================================================================== */

  const handleCreateBatchSubmit =
    async (
      data: CreateProductionBatchData
    ) => {
      try {
        setError("");

        await createProductionBatch(
          data
        );

        setIsBatchModalOpen(
          false
        );

        /*
         * Reload order list and statistics.
         */
        await loadData(false);

        /*
         * Refresh batches for selected order.
         */
        if (selectedOrder) {
          await loadOrderBatches(
            selectedOrder._id
          );
        }

        /*
         * Reopen order details so user immediately
         * sees the newly-created batch.
         */
        if (selectedOrder) {
          setIsDetailsModalOpen(
            true
          );
        }
      } catch (err) {
        console.error(
          "Create Production Batch Error:",
          err
        );

        throw err;
      }
    };

  /* ========================================================================== */
  /* VIEW BATCH                                                                 */
  /* ========================================================================== */

  const handleViewBatch = (
    batch: ProductionBatch
  ) => {
    setSelectedBatch(batch);

    setIsBatchDetailsModalOpen(
      true
    );
  };

  /* ========================================================================== */
  /* CLOSE DETAILS                                                              */
  /* ========================================================================== */

  const closeDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
    setSelectedOrderBatches([]);
  };

  const closeBatchDetails = () => {
    setIsBatchDetailsModalOpen(
      false
    );

    setSelectedBatch(null);
  };

  /* ========================================================================== */
  /* STATUS STYLING                                                             */
  /* ========================================================================== */

  const getStatusClass = (
    status: ProductionOrderStatus
  ) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700";

      case "Planned":
        return "bg-slate-50 text-slate-700";

      case "Released":
        return "bg-indigo-50 text-indigo-700";

      case "In Production":
        return "bg-amber-50 text-amber-700";

      case "Completed":
        return "bg-green-50 text-green-700";

      case "Cancelled":
        return "bg-red-50 text-red-700";

      case "On Hold":
        return "bg-orange-50 text-orange-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityClass = (
    priority: ProductionOrderPriority
  ) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-50 text-red-700";

      case "High":
        return "bg-orange-50 text-orange-700";

      case "Normal":
        return "bg-slate-50 text-slate-700";

      case "Low":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  /* ========================================================================== */
  /* RENDER                                                                     */
  /* ========================================================================== */

  return (
    <div className="min-h-full">
      {/* ====================================================================== */}
      {/* HEADER                                                                  */}
      {/* ====================================================================== */}

      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                <PackagePlus size={22} />
              </div>

              <div>
                <p className="cana-section-kicker">Production control</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  Production Orders
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage production requirements and
                  execute them through one or multiple batches.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadData(false)
                }
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setIsCreateModalOpen(
                    true
                  );
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
              >
                <Plus size={18} />

                New Production Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ==================================================================== */}
        {/* ERROR                                                                 */}
        {/* ==================================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STATS                                                                 */}
        {/* ==================================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {[
            ["Total", stats.total],
            ["Draft", stats.draft],
            ["Planned", stats.planned],
            ["Released", stats.released],
            [
              "In Production",
              stats.inProduction,
            ],
            [
              "Completed",
              stats.completed,
            ],
            [
              "Cancelled",
              stats.cancelled,
            ],
            [
              "On Hold",
              stats.onHold,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={String(label)}
                className="cana-panel p-4"
              >
                <p className="text-xs font-medium text-gray-500">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                  {Number(value)}
                </p>
              </div>
            )
          )}
        </div>

        {/* ==================================================================== */}
        {/* FILTERS                                                               */}
        {/* ==================================================================== */}

        <div className="cana-panel mb-5 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_190px_auto]">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search order, product or formula..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | ProductionOrderStatus
                    | "All"
                )
              }
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-red-500"
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Planned">
                Planned
              </option>

              <option value="Released">
                Released
              </option>

              <option value="In Production">
                In Production
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Cancelled">
                Cancelled
              </option>

              <option value="On Hold">
                On Hold
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target
                    .value as
                    | ProductionOrderPriority
                    | "All"
                )
              }
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-red-500"
            >
              <option value="All">
                All Priorities
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Normal">
                Normal
              </option>

              <option value="High">
                High
              </option>

              <option value="Urgent">
                Urgent
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter(
                  "All"
                );
                setPriorityFilter(
                  "All"
                );
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter size={16} />

              Clear
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TABLE                                                                 */}
        {/* ==================================================================== */}

        <div className="cana-panel overflow-hidden">
          {isLoading ? (
            <div className="flex min-h-[380px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <Loader2
                  size={30}
                  className="animate-spin text-red-600"
                />

                <p className="text-sm">
                  Loading production orders...
                </p>
              </div>
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <PackagePlus
                  size={27}
                />
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No production orders found
              </h3>

              <p className="mt-1 max-w-md text-sm text-gray-500">
                Try changing your filters or create a
                new production order.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Order
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Product
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Formula
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Required
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Priority
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Planned Date
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedOrders.map(
                      (order) => {
                        const productName =
                          getProductName(
                            order.product,
                            order.productName
                          );

                        const productCode =
                          getProductCode(
                            order.product,
                            order.productCode
                          );

                        const formulaName =
                          getFormulaName(
                            order.formula,
                            order.formulaName
                          );

                        const formulaCode =
                          getFormulaCode(
                            order.formula,
                            order.formulaCode
                          );

                        const locked =
                          order.status ===
                            "Completed" ||
                          order.status ===
                            "Cancelled";

                        const deleting =
                          actionOrderId ===
                          order._id;

                        return (
                          <tr
                            key={
                              order._id
                            }
                            className="transition hover:bg-gray-50"
                          >
                            {/* ORDER */}
                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="font-semibold text-gray-900">
                                {
                                  order.productionOrderNo
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                ID:{" "}
                                {order._id.slice(
                                  -8
                                )}
                              </p>
                            </td>

                            {/* PRODUCT */}
                            <td className="min-w-[220px] px-5 py-4">
                              <p className="font-medium text-gray-900">
                                {productName}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {productCode}
                              </p>
                            </td>

                            {/* FORMULA */}
                            <td className="min-w-[200px] px-5 py-4">
                              <p className="font-medium text-gray-900">
                                {formulaName}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {formulaCode}

                                {order.formulaVersion
                                  ? ` · v${order.formulaVersion}`
                                  : ""}
                              </p>
                            </td>

                            {/* REQUIRED */}
                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="font-semibold text-gray-900">
                                {Number(
                                  order.quantity
                                ).toLocaleString()}
                              </p>

                              <p className="text-xs text-gray-500">
                                {order.unit}
                              </p>
                            </td>

                            {/* PRIORITY */}
                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                                  order.priority
                                )}`}
                              >
                                {
                                  order.priority
                                }
                              </span>
                            </td>

                            {/* STATUS */}
                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>

                            {/* DATE */}
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                              {formatDate(
                                order.plannedDate
                              )}
                            </td>

                            {/* ACTIONS */}
                            <td className="whitespace-nowrap px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  title="View"
                                  onClick={() =>
                                    void handleViewOrder(
                                      order
                                    )
                                  }
                                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <Eye
                                    size={17}
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="Print production order"
                                  onClick={() => printProductionOrder(order)}
                                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <Printer size={17} />
                                </button>

                                <button
                                  type="button"
                                  title={
                                    locked
                                      ? "Editing disabled"
                                      : "Edit"
                                  }
                                  disabled={
                                    locked
                                  }
                                  onClick={() =>
                                    handleEditOrder(
                                      order
                                    )
                                  }
                                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <Pencil
                                    size={17}
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="Delete"
                                  disabled={
                                    deleting
                                  }
                                  onClick={() =>
                                    void handleDelete(
                                      order
                                    )
                                  }
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {deleting ? (
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
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* ============================================================ */}
              {/* PAGINATION                                                    */}
              {/* ============================================================ */}

              <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {filteredOrders.length ===
                    0
                      ? 0
                      : (currentPage -
                          1) *
                          pageSize +
                        1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(
                      currentPage *
                        pageSize,
                      filteredOrders.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {
                      filteredOrders.length
                    }
                  </span>
                </p>

                <div className="flex items-center gap-3">
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(
                        Number(
                          event.target.value
                        )
                      );
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none"
                  >
                    <option value={10}>
                      10 / page
                    </option>

                    <option value={20}>
                      20 / page
                    </option>

                    <option value={50}>
                      50 / page
                    </option>
                  </select>

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <span className="min-w-[80px] text-center text-sm text-gray-600">
                    Page{" "}
                    <strong className="text-gray-900">
                      {currentPage}
                    </strong>{" "}
                    /{" "}
                    <strong className="text-gray-900">
                      {totalPages}
                    </strong>
                  </span>

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CREATE ORDER MODAL                                                    */}
      {/* ==================================================================== */}

      <ProductionOrderModal
        isOpen={isCreateModalOpen}
        onClose={() =>
          setIsCreateModalOpen(false)
        }
        onCreate={handleCreate}
        onUpdate={async () =>
          undefined
        }
        editingOrder={null}
      />

      {/* ==================================================================== */}
      {/* EDIT ORDER MODAL                                                      */}
      {/* ==================================================================== */}

      <ProductionOrderModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedOrder(null);
        }}
        onCreate={async () =>
          undefined
        }
        onUpdate={handleEdit}
        editingOrder={selectedOrder}
      />

      {/* ==================================================================== */}
      {/* ORDER DETAILS                                                         */}
      {/* ==================================================================== */}

      <ProductionOrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDetails}
        order={selectedOrder}
        batches={
          selectedOrderBatches
        }
        onCreateBatch={
          handleCreateBatch
        }
        onViewBatch={
          handleViewBatch
        }
      />

      {/* ==================================================================== */}
      {/* CREATE BATCH MODAL                                                    */}
      {/* ==================================================================== */}

      <ProductionBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(
            false
          );
        }}
        onCreate={
          handleCreateBatchSubmit
        }
        onUpdate={async (
          _data: UpdateProductionBatchData
        ) => {
          /*
           * Batch editing is handled from
           * Production Batches page.
           */
          return;
        }}
        editingBatch={null}
        initialProductionOrder={
          selectedOrder?._id ?? ""
        }
      />

      {/* ==================================================================== */}
      {/* BATCH DETAILS                                                         */}
      {/* ==================================================================== */}

      <ProductionBatchDetailsModal
        isOpen={
          isBatchDetailsModalOpen
        }
        onClose={
          closeBatchDetails
        }
        batch={selectedBatch}
      />
    </div>
  );
}
