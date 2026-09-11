import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Factory,
  FileText,
  History,
  Package,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import type { ProductionBatch } from "../types/productionBatch.types";

import type {
  ProductionOrder,
} from "../types/productionOrder.types";

/* -------------------------------------------------------------------------- */
/* PROPS                                                                      */
/* -------------------------------------------------------------------------- */

interface ProductionOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;

  order: ProductionOrder | null;

  batches?: ProductionBatch[];

  onCreateBatch?: (
    productionOrderId: string
  ) => void | Promise<void>;

  onViewBatch?: (
    batch: ProductionBatch
  ) => void;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getProductName(
  order: ProductionOrder
): string {
  if (
    typeof order.product === "object" &&
    order.product !== null
  ) {
    return (
      order.product.name ||
      order.productName ||
      "—"
    );
  }

  return order.productName || "—";
}

function getProductCode(
  order: ProductionOrder
): string {
  if (
    typeof order.product === "object" &&
    order.product !== null
  ) {
    return (
      order.product.code ||
      order.product.productCode ||
      order.product.sku ||
      order.productCode ||
      "—"
    );
  }

  return order.productCode || "—";
}

function getFormulaName(
  order: ProductionOrder
): string {
  if (
    typeof order.formula === "object" &&
    order.formula !== null
  ) {
    return (
      order.formula.name ||
      order.formulaName ||
      "—"
    );
  }

  return order.formulaName || "—";
}

function getFormulaCode(
  order: ProductionOrder
): string {
  if (
    typeof order.formula === "object" &&
    order.formula !== null
  ) {
    return (
      order.formula.code ||
      order.formula.formulaCode ||
      order.formulaCode ||
      "—"
    );
  }

  return order.formulaCode || "—";
}

function getFormulaVersion(
  order: ProductionOrder
): number | null {
  if (
    typeof order.formula === "object" &&
    order.formula !== null
  ) {
    return (
      order.formula.version ??
      order.formulaVersion ??
      null
    );
  }

  return order.formulaVersion ?? null;
}

function formatDate(
  value?: string
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value?: string
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getBatchStatusClass(
  status: ProductionBatch["status"]
): string {
  switch (status) {
    case "Completed":
      return "bg-green-50 text-green-700";

    case "In Progress":
      return "bg-slate-50 text-slate-700";

    case "Paused":
      return "bg-amber-50 text-amber-700";

    case "Ready":
      return "bg-indigo-50 text-indigo-700";

    case "Cancelled":
      return "bg-red-50 text-red-700";

    case "Planned":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getOrderStatusClass(
  status: ProductionOrder["status"]
): string {
  switch (status) {
    case "Completed":
      return "bg-green-50 text-green-700";

    case "In Production":
      return "bg-slate-50 text-slate-700";

    case "Released":
      return "bg-indigo-50 text-indigo-700";

    case "Planned":
      return "bg-amber-50 text-amber-700";

    case "On Hold":
      return "bg-orange-50 text-orange-700";

    case "Cancelled":
      return "bg-red-50 text-red-700";

    case "Draft":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProductionOrderDetailsModal({
  isOpen,
  onClose,
  order,
  batches = [],
  onCreateBatch,
  onViewBatch,
}: ProductionOrderDetailsModalProps) {
  if (!isOpen || !order) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* ORDER INFORMATION                                                        */
  /* ------------------------------------------------------------------------ */

  const productName =
    getProductName(order);

  const productCode =
    getProductCode(order);

  const formulaName =
    getFormulaName(order);

  const formulaCode =
    getFormulaCode(order);

  const formulaVersion =
    getFormulaVersion(order);

  const orderQuantity =
    Number(order.quantity || 0);

  /* ------------------------------------------------------------------------ */
  /* BATCH CALCULATIONS                                                       */
  /* ------------------------------------------------------------------------ */

  /*
   * Planned quantity = how much of the order
   * has been allocated/reserved to batches.
   */
  const totalPlanned =
    batches.reduce(
      (sum, batch) =>
        sum +
        Number(
          batch.plannedQuantity || 0
        ),
      0
    );

  /*
   * Actual quantity = what has actually
   * been produced.
   */
  const totalActual =
    batches.reduce(
      (sum, batch) =>
        sum +
        Number(
          batch.actualQuantity || 0
        ),
      0
    );

  /*
   * Remaining is based on actual production.
   *
   * Example:
   * Order = 5,000
   * Actual = 3,500
   * Remaining = 1,500
   */
  const remainingQuantity =
    Math.max(
      0,
      orderQuantity -
        totalActual
    );

  /*
   * Allocated quantity is useful to know
   * how much of the order is already planned
   * inside batches.
   */
  const allocatedQuantity =
    Math.min(
      orderQuantity,
      totalPlanned
    );

  /*
   * Production progress MUST be based on
   * the Production Order quantity, not total
   * planned batch quantity.
   */
  const progress =
    orderQuantity > 0
      ? Math.min(
          100,
          (totalActual /
            orderQuantity) *
            100
        )
      : 0;

  /*
   * Can create another batch only if there
   * is still quantity required.
   */
  const canCreateBatch =
    order.status !==
      "Completed" &&
    order.status !==
      "Cancelled" &&
    remainingQuantity > 0;

  /* ------------------------------------------------------------------------ */
  /* RETURN                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
            event.target
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* ================================================================== */}
        {/* HEADER                                                              */}
        {/* ================================================================== */}

        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
              <Factory size={23} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-gray-900">
                  {order.productionOrderNo}
                </h2>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderStatusClass(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Production order, quantity and
                batch execution details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={21} />
          </button>
        </div>

        {/* ================================================================== */}
        {/* BODY                                                                */}
        {/* ================================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* ================================================================ */}
            {/* SUMMARY CARDS                                                     */}
            {/* ================================================================ */}

            <div className="grid gap-4 md:grid-cols-3">
              {/* PRODUCT */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                    <Package size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Product
                    </p>

                    <p className="truncate font-semibold text-gray-900">
                      {productName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {productCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* FORMULA */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                    <ShieldCheck size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Formula
                    </p>

                    <p className="truncate font-semibold text-gray-900">
                      {formulaName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {formulaCode}
                      {formulaVersion
                        ? ` · v${formulaVersion}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* ORDER QUANTITY */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                    <Factory size={19} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Required Quantity
                    </p>

                    <p className="font-semibold text-gray-900">
                      {orderQuantity.toLocaleString()}{" "}
                      {order.unit}
                    </p>

                    <p className="text-xs text-gray-500">
                      Priority:{" "}
                      {order.priority}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* ORDER QUANTITY / PRODUCTION SUMMARY                              */}
            {/* ================================================================ */}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* ORDER */}
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Order Quantity
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {orderQuantity.toLocaleString()}{" "}
                    {order.unit}
                  </p>
                </div>

                {/* PLANNED / ALLOCATED */}
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Allocated to Batches
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {allocatedQuantity.toLocaleString()}{" "}
                    {order.unit}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Planned batch quantity
                  </p>
                </div>

                {/* ACTUAL */}
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Produced
                  </p>

                  <p className="mt-1 text-xl font-bold text-green-700">
                    {totalActual.toLocaleString()}{" "}
                    {order.unit}
                  </p>
                </div>

                {/* REMAINING */}
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Remaining
                  </p>

                  <p
                    className={`mt-1 text-xl font-bold ${
                      remainingQuantity === 0
                        ? "text-green-700"
                        : "text-red-600"
                    }`}
                  >
                    {remainingQuantity.toLocaleString()}{" "}
                    {order.unit}
                  </p>
                </div>
              </div>

              {/* PROGRESS */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Production Progress
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Based on actual production
                      against the original order
                      quantity.
                    </p>
                  </div>

                  <p className="text-lg font-bold text-gray-900">
                    {progress.toFixed(0)}%
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-red-600 transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>

              {/* FULLY PRODUCED MESSAGE */}
              {remainingQuantity ===
                0 &&
                orderQuantity > 0 && (
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    <CheckCircle2
                      size={20}
                      className="shrink-0"
                    />

                    <div>
                      <p className="font-semibold">
                        Order quantity fully produced
                      </p>

                      <p className="mt-0.5 text-sm">
                        All required quantity has
                        been produced through the
                        linked batches.
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {/* ================================================================ */}
            {/* SCHEDULE / NOTES                                                  */}
            {/* ================================================================ */}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* SCHEDULE */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays
                    className="text-red-600"
                    size={19}
                  />

                  <h3 className="font-semibold text-gray-900">
                    Schedule
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">
                      Planned Date
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(
                        order.plannedDate
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Expected Completion
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(
                        order.expectedCompletionDate
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDateTime(
                        order.createdAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Updated
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDateTime(
                        order.updatedAt
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileText
                    className="text-red-600"
                    size={19}
                  />

                  <h3 className="font-semibold text-gray-900">
                    Notes
                  </h3>
                </div>

                <div className="min-h-[120px] rounded-xl bg-gray-50 p-4">
                  <p className="text-sm leading-6 text-gray-600">
                    {order.notes?.trim() ||
                      "No notes available."}
                  </p>
                </div>
              </div>
            </div>

            {/* ================================================================ */}
            {/* PRODUCTION BATCHES                                                */}
            {/* ================================================================ */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* HEADER */}
              <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock3
                      className="text-red-600"
                      size={19}
                    />

                    <h3 className="font-semibold text-gray-900">
                      Production Batches
                    </h3>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    This order can be completed through
                    one or multiple production batches.
                  </p>
                </div>

                {/* CREATE BATCH */}
                {onCreateBatch && (
                  <div>
                    {canCreateBatch ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onCreateBatch(
                            order._id
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <Plus size={17} />
                        Create Batch
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-500">
                        No More Batches Needed
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* NO BATCHES */}
              {batches.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                    <Package size={24} />
                  </div>

                  <p className="mt-3 font-semibold text-gray-900">
                    No production batches yet
                  </p>

                  <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                    This production order has not
                    been allocated to any batch.
                  </p>

                  {canCreateBatch &&
                    onCreateBatch && (
                      <button
                        type="button"
                        onClick={() =>
                          void onCreateBatch(
                            order._id
                          )
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <Plus size={17} />
                        Create First Batch
                      </button>
                    )}
                </div>
              ) : (
                <>
                  {/* MOBILE / DESKTOP TABLE */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Batch
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Planned
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Actual
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Start Date
                          </th>

                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {batches.map(
                          (batch) => {
                            const batchPlanned =
                              Number(
                                batch.plannedQuantity ||
                                  0
                              );

                            const batchActual =
                              Number(
                                batch.actualQuantity ||
                                  0
                              );

                            const batchRemaining =
                              Math.max(
                                0,
                                batchPlanned -
                                  batchActual
                              );

                            const batchProgress =
                              batchPlanned >
                              0
                                ? Math.min(
                                    100,
                                    (batchActual /
                                      batchPlanned) *
                                      100
                                  )
                                : 0;

                            return (
                              <tr
                                key={
                                  batch._id
                                }
                                className="transition hover:bg-gray-50"
                              >
                                {/* BATCH */}
                                <td className="whitespace-nowrap px-5 py-4">
                                  <p className="font-semibold text-gray-900">
                                    {
                                      batch.batchNo
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-500">
                                    Lot:{" "}
                                    {batch.lotNumber ||
                                      "—"}
                                  </p>
                                </td>

                                {/* PLANNED */}
                                <td className="whitespace-nowrap px-5 py-4">
                                  <p className="font-medium text-gray-900">
                                    {batchPlanned.toLocaleString()}{" "}
                                    {batch.unit}
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-500">
                                    allocated
                                  </p>
                                </td>

                                {/* ACTUAL */}
                                <td className="min-w-[180px] px-5 py-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {batchActual.toLocaleString()}{" "}
                                        {batch.unit}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {batchRemaining.toLocaleString()}{" "}
                                        remaining
                                      </p>
                                    </div>

                                    <span className="text-xs font-semibold text-gray-700">
                                      {batchProgress.toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>

                                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className="h-full rounded-full bg-red-600"
                                      style={{
                                        width: `${batchProgress}%`,
                                      }}
                                    />
                                  </div>
                                </td>

                                {/* STATUS */}
                                <td className="whitespace-nowrap px-5 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBatchStatusClass(
                                      batch.status
                                    )}`}
                                  >
                                    {
                                      batch.status
                                    }
                                  </span>
                                </td>

                                {/* START DATE */}
                                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                                  {formatDate(
                                    batch.startDate
                                  )}
                                </td>

                                {/* ACTION */}
                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                  {onViewBatch && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onViewBatch(
                                          batch
                                        )
                                      }
                                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                                    >
                                      View
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* BATCH SUMMARY FOOTER */}
                  <div className="grid gap-4 border-t border-gray-200 bg-gray-50 p-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Number of Batches
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {batches.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Total Allocated
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {allocatedQuantity.toLocaleString()}{" "}
                        {order.unit}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Remaining Order Quantity
                      </p>

                      <p
                        className={`mt-1 text-lg font-bold ${
                          remainingQuantity === 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {remainingQuantity.toLocaleString()}{" "}
                        {order.unit}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ================================================================ */}
            {/* HISTORY                                                           */}
            {/* ================================================================ */}

            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <History
                  className="text-red-600"
                  size={19}
                />

                <h3 className="font-semibold text-gray-900">
                  Order History
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />

                  <div>
                    <p className="font-medium text-gray-900">
                      Current Status
                    </p>

                    <p className="mt-0.5 text-sm text-gray-500">
                      {order.status}
                    </p>
                  </div>
                </div>

                {order.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />

                    <div>
                      <p className="font-medium text-gray-900">
                        Order Created
                      </p>

                      <p className="mt-0.5 text-sm text-gray-500">
                        {formatDateTime(
                          order.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {order.status ===
                  "Completed" && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={19}
                      className="shrink-0 text-green-600"
                    />

                    <div>
                      <p className="font-medium text-green-700">
                        Production Completed
                      </p>

                      <p className="mt-0.5 text-sm text-gray-600">
                        The required production quantity
                        has been completed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* FOOTER                                                              */}
        {/* ================================================================== */}

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}