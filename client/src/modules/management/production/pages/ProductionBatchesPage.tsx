import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Edit3,
  Eye,
  Factory,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import ProductionBatchModal from "../components/ProductionBatchModal";
import ProductionBatchDetailsModal from "../components/ProductionBatchDetailsModal";

import {
  createProductionBatch,
  deleteProductionBatch,
  getProductionBatchById,
  getProductionBatches,
  getProductionBatchStats,
  updateProductionBatch,
} from "../services/productionBatch.service";

import type {
  CreateProductionBatchData,
  ProductionBatch,
  ProductionBatchStats,
  ProductionBatchStatus,
  UpdateProductionBatchData,
} from "../types/productionBatch.types";
import { printCanaDocument } from "../../utils/printCanaDocument";

// =====================================================
// DEFAULT STATS
// =====================================================

const defaultStats: ProductionBatchStats = {
  total: 0,
  planned: 0,
  ready: 0,
  inProgress: 0,
  paused: 0,
  completed: 0,
  cancelled: 0,
};

// =====================================================
// STATUS STYLE
// =====================================================

function getStatusClass(
  status: ProductionBatchStatus
): string {
  switch (status) {
    case "Planned":
      return "bg-slate-100 text-slate-700";

    case "Ready":
      return "bg-green-100 text-green-700";

    case "In Progress":
      return "bg-orange-100 text-orange-700";

    case "Paused":
      return "bg-yellow-100 text-yellow-700";

    case "Completed":
      return "bg-emerald-100 text-emerald-700";

    case "Cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(
  date?: string
): string {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "-";
  }

  return parsedDate.toLocaleDateString();
}

// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(
  value?: number
): string {
  return Number(
    value ?? 0
  ).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 2,
    }
  );
}

// =====================================================
// CAN EDIT
// =====================================================

function canEditBatch(
  batch: ProductionBatch
): boolean {
  return (
    batch.status !== "Completed" &&
    batch.status !== "Cancelled"
  );
}

// =====================================================
// CAN DELETE
// =====================================================

function canDeleteBatch(
  batch: ProductionBatch
): boolean {
  return (
    batch.status === "Planned" ||
    batch.status === "Cancelled"
  );
}

function printBatchRecord(batch: ProductionBatch) {
  const order = typeof batch.productionOrder === "string" ? undefined : batch.productionOrder;
  printCanaDocument({
    title: "Production batch record",
    reference: batch.batchNo || batch.batchNumber,
    status: batch.status,
    details: [
      { label: "Production order", value: order?.productionOrderNo },
      { label: "Product", value: `${batch.productName} · ${batch.productCode}` },
      { label: "Formula", value: `${batch.formulaName} · ${batch.formulaCode} v${batch.formulaVersion}` },
      { label: "Batch / lot number", value: `${batch.batchNumber || "—"} / ${batch.lotNumber || "—"}` },
      { label: "Planned output", value: `${formatNumber(batch.plannedQuantity)} ${batch.unit}` },
      { label: "Actual output", value: `${formatNumber(batch.actualQuantity)} ${batch.unit}` },
      { label: "Start date", value: formatDate(batch.startDate) },
      { label: "Completion date", value: formatDate(batch.endDate) },
      { label: "Supervisor", value: batch.supervisorName },
      { label: "Finished goods posted", value: batch.finishedGoodsPostedAt ? formatDate(batch.finishedGoodsPostedAt) : "Not posted" },
    ],
    notes: batch.notes,
  });
}

// =====================================================
// PAGE
// =====================================================

const ProductionBatchesPage = () => {
  // =================================================
  // DATA
  // =================================================

  const [batches, setBatches] =
    useState<ProductionBatch[]>([]);

  const [stats, setStats] =
    useState<ProductionBatchStats>(
      defaultStats
    );

  // =================================================
  // LOADING
  // =================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  // =================================================
  // FILTERS
  // =================================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      ProductionBatchStatus | "All"
    >("All");

  // =================================================
  // MODALS
  // =================================================

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
    selectedBatch,
    setSelectedBatch,
  ] = useState<ProductionBatch | null>(
    null
  );

  // =================================================
  // LOAD DATA
  // =================================================

  const loadData = async (
    refresh = false
  ) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        batchList,
        batchStats,
      ] = await Promise.all([
        getProductionBatches(),
        getProductionBatchStats(),
      ]);

      setBatches(
        Array.isArray(batchList)
          ? batchList
          : []
      );

      setStats(
        batchStats ?? defaultStats
      );
    } catch (error) {
      console.error(
        "Load Production Batches Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load production batches."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =================================================
  // INITIAL LOAD
  // =================================================

  useEffect(() => {
    loadData();
  }, []);

  // =================================================
  // FILTERED BATCHES
  // =================================================

  const filteredBatches = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    return batches.filter(
      (batch) => {
        const matchesSearch =
          !term ||
          String(
            batch.batchNo ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.batchNumber ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.lotNumber ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.productName ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.productCode ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.formulaName ?? ""
          )
            .toLowerCase()
            .includes(term) ||
          String(
            batch.formulaCode ?? ""
          )
            .toLowerCase()
            .includes(term);

        const matchesStatus =
          statusFilter === "All" ||
          batch.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    batches,
    search,
    statusFilter,
  ]);

  // =================================================
  // CREATE
  // =================================================

  const handleCreate = async (
    data: CreateProductionBatchData
  ) => {
    try {
      await createProductionBatch(
        data
      );

      setIsCreateModalOpen(false);

      await loadData(true);
    } catch (error) {
      console.error(
        "Create Production Batch Error:",
        error
      );

      throw error;
    }
  };

  // =================================================
  // EDIT
  // =================================================

  const handleEdit = async (
    data: UpdateProductionBatchData
  ) => {
    if (!selectedBatch) {
      throw new Error(
        "No production batch selected."
      );
    }

    try {
      const updatedBatch = await updateProductionBatch(
        selectedBatch._id,
        data
      );

      if (
        updatedBatch.status === "In Progress" ||
        updatedBatch.status === "Completed"
      ) {
        window.dispatchEvent(
          new Event("cana:stock-updated"),
        );
      }

      setIsEditModalOpen(false);

      setSelectedBatch(null);

      await loadData(true);
    } catch (error) {
      console.error(
        "Update Production Batch Error:",
        error
      );

      throw error;
    }
  };

  // =================================================
  // VIEW
  // =================================================

  const handleView = async (
    batch: ProductionBatch
  ) => {
    try {
      const freshBatch =
        await getProductionBatchById(
          batch._id
        );

      setSelectedBatch(
        freshBatch
      );

      setIsDetailsModalOpen(
        true
      );
    } catch (error) {
      console.error(
        "Get Production Batch Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load production batch."
      );
    }
  };

  // =================================================
  // OPEN EDIT
  // =================================================

  const handleOpenEdit =
    async (
      batch: ProductionBatch
    ) => {
      if (!canEditBatch(batch)) {
        alert(
          `A ${batch.status} production batch cannot be edited.`
        );

        return;
      }

      try {
        const freshBatch =
          await getProductionBatchById(
            batch._id
          );

        setSelectedBatch(
          freshBatch
        );

        setIsEditModalOpen(
          true
        );
      } catch (error) {
        console.error(
          "Get Production Batch For Edit Error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to load production batch for editing."
        );
      }
    };

  // =================================================
  // DELETE
  // =================================================

  const handleDelete = async (
    batch: ProductionBatch
  ) => {
    if (!canDeleteBatch(batch)) {
      alert(
        "Only Planned or Cancelled production batches can be deleted."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${batch.batchNo}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProductionBatch(
        batch._id
      );

      if (
        selectedBatch?._id ===
        batch._id
      ) {
        setSelectedBatch(null);
      }

      await loadData(true);
    } catch (error) {
      console.error(
        "Delete Production Batch Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete production batch."
      );
    }
  };

  // =================================================
  // RENDER
  // =================================================

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-100 p-3 text-red-600">
            <Factory size={22} />
          </div>

          <div>
            <p className="cana-section-kicker">Production control</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Production Batches
            </h1>

          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setIsCreateModalOpen(true)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
          >
            <Plus size={17} />
            New Production Batch
          </button>
        </div>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Total
          </p>

          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {stats.total}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Planned
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-600">
            {stats.planned}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Ready
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {stats.ready}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            In Progress
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {stats.inProgress}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Paused
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {stats.paused}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Completed
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {stats.completed}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Cancelled
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {stats.cancelled}
          </p>
        </div>
      </div>

      {/* =================================================
          TABLE CARD
      ================================================= */}

      <div className="cana-panel w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-gray-900">
              Production Batch List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredBatches.length}{" "}
              {filteredBatches.length === 1
                ? "batch"
                : "batches"}{" "}
              shown
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
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
                placeholder="Search batches..."
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 sm:w-72"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | ProductionBatchStatus
                    | "All"
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Planned">
                Planned
              </option>

              <option value="Ready">
                Ready
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Paused">
                Paused
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-x-auto">
          <table className="min-w-[1350px] w-full text-left">
            <thead className="bg-gray-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-4">
                  Batch
                </th>

                <th className="px-5 py-4">
                  Production Order
                </th>

                <th className="px-5 py-4">
                  Product
                </th>

                <th className="px-5 py-4">
                  Formula
                </th>

                <th className="px-5 py-4">
                  Quantity
                </th>

                <th className="px-5 py-4">
                  Lot / Batch No.
                </th>

                <th className="px-5 py-4">
                  Start Date
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >
                    <Loader2
                      size={28}
                      className="mx-auto animate-spin text-red-600"
                    />

                    <p className="mt-3 text-sm text-gray-500">Loading…</p>
                  </td>
                </tr>
              ) : filteredBatches.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >
                    <ClipboardList
                      size={40}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-3 font-semibold text-gray-700">
                      No production
                      batches found
                    </p>


                    {!search &&
                      statusFilter ===
                        "All" && (
                        <button
                          type="button"
                          onClick={() =>
                            setIsCreateModalOpen(
                              true
                            )
                          }
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          <Plus
                            size={16}
                          />
                          Create Batch
                        </button>
                      )}
                  </td>
                </tr>
              ) : (
                filteredBatches.map(
                  (batch) => {
                    const productionOrder =
                      typeof batch.productionOrder ===
                      "string"
                        ? null
                        : batch.productionOrder;

                    return (
                      <tr
                        key={batch._id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">
                            {batch.batchNo}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Created{" "}
                            {formatDate(
                              batch.createdAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {productionOrder
                              ? productionOrder.productionOrderNo
                              : "-"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {productionOrder
                              ? `${formatNumber(
                                  productionOrder.quantity
                                )} ${
                                  productionOrder.unit
                                }`
                              : "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {batch.productName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {batch.productCode}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {batch.formulaName}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {
                                batch.formulaCode
                              }
                            </span>

                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                              V
                              {
                                batch.formulaVersion
                              }
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {formatNumber(
                              batch.plannedQuantity
                            )}{" "}
                            {batch.unit}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Actual:{" "}
                            {formatNumber(
                              batch.actualQuantity
                            )}{" "}
                            {batch.unit}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {batch.batchNumber ||
                              "-"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Lot:{" "}
                            {batch.lotNumber ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays
                              size={15}
                              className="text-gray-400"
                            />

                            {formatDate(
                              batch.startDate
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              batch.status
                            )}`}
                          >
                            {batch.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* VIEW */}

                            <button
                              type="button"
                              onClick={() =>
                                handleView(
                                  batch
                                )
                              }
                              className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                              title="View"
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => printBatchRecord(batch)}
                              className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                              title="Print batch record"
                            >
                              <Printer size={16} />
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEdit(
                                  batch
                                )
                              }
                              disabled={
                                !canEditBatch(
                                  batch
                                )
                              }
                              className="rounded-xl border border-gray-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                              title={
                                canEditBatch(
                                  batch
                                )
                                  ? "Edit"
                                  : "Cannot edit"
                              }
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  batch
                                )
                              }
                              disabled={
                                !canDeleteBatch(
                                  batch
                                )
                              }
                              className="rounded-xl border border-gray-200 p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                              title={
                                canDeleteBatch(
                                  batch
                                )
                                  ? "Delete"
                                  : "Cannot delete"
                              }
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          CREATE MODAL
      ================================================= */}

      <ProductionBatchModal
        isOpen={
          isCreateModalOpen
        }
        onClose={() =>
          setIsCreateModalOpen(
            false
          )
        }
        onCreate={
          handleCreate
        }
        onUpdate={async () => {}}
        editingBatch={null}
      />

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      <ProductionBatchModal
        isOpen={
          isEditModalOpen
        }
        onClose={() => {
          setIsEditModalOpen(
            false
          );

          setSelectedBatch(
            null
          );
        }}
        onCreate={async () => {}}
        onUpdate={
          handleEdit
        }
        editingBatch={
          selectedBatch
        }
      />

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      <ProductionBatchDetailsModal
        isOpen={
          isDetailsModalOpen
        }
        onClose={() => {
          setIsDetailsModalOpen(
            false
          );

          setSelectedBatch(
            null
          );
        }}
        batch={
          selectedBatch
        }
      />
    </div>
  );
};

export default ProductionBatchesPage;
