import {
  Eye,
  Pencil,
  RotateCcw,
  XCircle,
} from "lucide-react";

import ConsumptionStatusBadge from "./ConsumptionStatusBadge";

import type {
  MaterialConsumption,
} from "../types/materialConsumption.types";

interface ConsumptionTableProps {
  consumptions: MaterialConsumption[];
  loading?: boolean;
  onView?: (consumption: MaterialConsumption) => void;
  onEdit?: (consumption: MaterialConsumption) => void;
  onCancel?: (consumption: MaterialConsumption) => void;
}

/* =========================================================
   CONSTANTS
========================================================= */

const QUANTITY_TOLERANCE = 0.000001;

/* =========================================================
   REFERENCE TYPES
========================================================= */

type ReferenceObject = {
  _id?: string;

  productionOrderNo?: string;

  batchNo?: string;
  batchNumber?: string;

  name?: string;
  code?: string;

  productName?: string;
  productCode?: string;

  formulaName?: string;
  formulaCode?: string;

  version?: number;
};

/* =========================================================
   HELPERS
========================================================= */

const formatNumber = (
  value?: number | null
): string => {
  if (
    value === undefined ||
    value === null ||
    Number.isNaN(Number(value))
  ) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(Number(value));
};

const formatDate = (
  date?: string
): string => {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
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

/**
 * Safely extract a display value from either:
 * - MongoDB ObjectId string
 * - populated object
 * - primitive value
 */
const getDisplayValue = (
  value: unknown,
  preferredKeys: Array<
    keyof ReferenceObject
  > = []
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() || "—";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const record =
      value as ReferenceObject;

    for (const key of preferredKeys) {
      const candidate = record[key];

      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }

    if (
      typeof record._id === "string" &&
      record._id.trim()
    ) {
      return record._id.trim();
    }
  }

  return "—";
};

const getShortId = (
  value: unknown
): string => {
  const id = getDisplayValue(value);

  if (id === "—") {
    return "—";
  }

  return id.length > 10
    ? `…${id.slice(-8)}`
    : id;
};

/**
 * Issued quantity that has not yet been
 * accounted for as Actual + Waste + Return.
 */
const getRemainingQuantity = (
  consumption: MaterialConsumption
): number => {
  const issued = Number(
    consumption.totalIssuedQuantity ?? 0
  );

  const actual = Number(
    consumption.totalActualQuantity ?? 0
  );

  const waste = Number(
    consumption.totalWasteQuantity ?? 0
  );

  const returned = Number(
    consumption.totalReturnQuantity ?? 0
  );

  return Math.max(
    0,
    issued -
      actual -
      waste -
      returned
  );
};

const isReconciled = (
  consumption: MaterialConsumption
): boolean => {
  return (
    getRemainingQuantity(
      consumption
    ) <= QUANTITY_TOLERANCE
  );
};

const getRemainingClass = (
  consumption: MaterialConsumption
): string => {
  return isReconciled(consumption)
    ? "text-green-600"
    : "text-amber-600";
};

const getRemainingLabel = (
  consumption: MaterialConsumption
): string => {
  return isReconciled(consumption)
    ? "Reconciled"
    : "Pending";
};

/* =========================================================
   COMPONENT
========================================================= */

export default function ConsumptionTable({
  consumptions,
  loading = false,
  onView,
  onEdit,
  onCancel,
}: ConsumptionTableProps) {
  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {[
                  "Consumption",
                  "Batch",
                  "Product",
                  "Materials",
                  "Issued",
                  "Actual",
                  "Waste",
                  "Return",
                  "Remaining",
                  "Status",
                  "Date",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {[1, 2, 3, 4, 5].map(
                (row) => (
                  <tr
                    key={row}
                    className="border-b border-gray-100 last:border-0"
                  >
                    {Array.from({
                      length: 12,
                    }).map(
                      (_, index) => (
                        <td
                          key={index}
                          className="px-4 py-4"
                        >
                          <div
                            className={`h-4 animate-pulse rounded bg-gray-100 ${
                              index === 0
                                ? "w-28"
                                : index === 2
                                  ? "w-36"
                                  : "w-20"
                            }`}
                          />
                        </td>
                      )
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  if (!consumptions.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
          <span className="text-lg text-gray-400">
            —
          </span>
        </div>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">
          No material consumption found
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          No consumption records are
          available.
        </p>
      </div>
    );
  }

  /* =======================================================
     TABLE
  ======================================================= */

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1350px]">
          {/* =================================================
              HEADER
          ================================================= */}

          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Consumption
              </th>

              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Batch
              </th>

              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Product
              </th>

              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Materials
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Issued
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Actual
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Waste
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Return
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Remaining
              </th>

              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>

              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Date
              </th>

              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          {/* =================================================
              BODY
          ================================================= */}

          <tbody className="divide-y divide-gray-100">
            {consumptions.map(
              (consumption) => {
                const canEdit =
                  consumption.status ===
                    "Draft" ||
                  consumption.status ===
                    "Issued" ||
                  consumption.status ===
                    "Partially Consumed";

                const canCancel =
                  consumption.status !==
                    "Cancelled" &&
                  consumption.status !==
                    "Consumed";

                const productionOrderLabel =
                  getDisplayValue(
                    consumption.productionOrder,
                    ["productionOrderNo"]
                  );

                const productionBatchLabel =
                  consumption.batchNumber ||
                  getDisplayValue(
                    consumption.productionBatch,
                    [
                      "batchNo",
                      "batchNumber",
                    ]
                  );

                const batchId =
                  getDisplayValue(
                    consumption.productionBatch
                  );

                const productLabel =
                  consumption.productName ||
                  getDisplayValue(
                    consumption.product,
                    [
                      "name",
                      "productName",
                      "productCode",
                      "code",
                    ]
                  );

                const formulaLabel =
                  consumption.formulaName ||
                  getDisplayValue(
                    consumption.formula,
                    [
                      "name",
                      "formulaName",
                      "formulaCode",
                      "code",
                    ]
                  );

                const remaining =
                  getRemainingQuantity(
                    consumption
                  );

                const reconciled =
                  isReconciled(
                    consumption
                  );

                return (
                  <tr
                    key={
                      consumption._id
                    }
                    className="group transition-colors hover:bg-gray-50/70"
                  >
                    {/* =====================================
                        CONSUMPTION
                    ====================================== */}

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          onView?.(
                            consumption
                          )
                        }
                        className="text-left"
                      >
                        <p className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-red-600">
                          {consumption.consumptionNo ||
                            "—"}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {productionOrderLabel !==
                          "—"
                            ? `Order: ${productionOrderLabel}`
                            : "Production order —"}
                        </p>
                      </button>
                    </td>

                    {/* =====================================
                        BATCH
                    ====================================== */}

                    <td className="px-5 py-4">
                      <div className="min-w-[140px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {
                            productionBatchLabel
                          }
                        </p>

                        {batchId !==
                          "—" &&
                          batchId !==
                            productionBatchLabel && (
                            <p className="mt-1 text-[11px] text-gray-400">
                              ID:{" "}
                              {getShortId(
                                batchId
                              )}
                            </p>
                          )}
                      </div>
                    </td>

                    {/* =====================================
                        PRODUCT
                    ====================================== */}

                    <td className="px-5 py-4">
                      <div className="max-w-[230px]">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {productLabel}
                        </p>

                        {consumption.productCode && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {
                              consumption.productCode
                            }
                          </p>
                        )}

                        {formulaLabel !==
                          "—" && (
                          <p className="mt-1 truncate text-[11px] text-gray-400">
                            Formula:{" "}
                            {
                              formulaLabel
                            }
                          </p>
                        )}
                      </div>
                    </td>

                    {/* =====================================
                        MATERIALS
                    ====================================== */}

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-gray-100 px-2 text-xs font-semibold text-gray-700">
                        {consumption.items
                          ?.length ||
                          0}
                      </span>
                    </td>

                    {/* =====================================
                        ISSUED
                    ====================================== */}

                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(
                          consumption.totalIssuedQuantity
                        )}
                      </span>
                    </td>

                    {/* =====================================
                        ACTUAL
                    ====================================== */}

                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(
                          consumption.totalActualQuantity
                        )}
                      </span>
                    </td>

                    {/* =====================================
                        WASTE
                    ====================================== */}

                    <td className="px-5 py-4 text-right">
                      <span
                        className={`text-sm font-medium ${
                          consumption.totalWasteQuantity >
                          0
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        {formatNumber(
                          consumption.totalWasteQuantity
                        )}
                      </span>
                    </td>

                    {/* =====================================
                        RETURN
                    ====================================== */}

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {consumption.totalReturnQuantity >
                          0 && (
                          <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                        )}

                        <span
                          className={`text-sm font-medium ${
                            consumption.totalReturnQuantity >
                            0
                              ? "text-blue-600"
                              : "text-gray-500"
                          }`}
                        >
                          {formatNumber(
                            consumption.totalReturnQuantity
                          )}
                        </span>
                      </div>
                    </td>

                    {/* =====================================
                        REMAINING
                    ====================================== */}

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-semibold ${getRemainingClass(
                            consumption
                          )}`}
                        >
                          {formatNumber(
                            remaining
                          )}
                        </span>

                        <span
                          className={`mt-0.5 text-[10px] font-medium ${
                            reconciled
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          {getRemainingLabel(
                            consumption
                          )}
                        </span>
                      </div>
                    </td>

                    {/* =====================================
                        STATUS
                    ====================================== */}

                    <td className="px-5 py-4">
                      <ConsumptionStatusBadge
                        status={
                          consumption.status
                        }
                      />
                    </td>

                    {/* =====================================
                        DATE
                    ====================================== */}

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="text-xs text-gray-500">
                        {formatDate(
                          consumption.createdAt
                        )}
                      </span>
                    </td>

                    {/* =====================================
                        ACTIONS
                    ====================================== */}

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* VIEW */}

                        {onView && (
                          <button
                            type="button"
                            onClick={() =>
                              onView(
                                consumption
                              )
                            }
                            title="View details"
                            aria-label="View details"
                            className="
                              inline-flex h-8 w-8
                              items-center justify-center
                              rounded-lg border
                              border-gray-200 bg-white
                              text-gray-500
                              transition-all
                              hover:border-gray-300
                              hover:bg-gray-50
                              hover:text-gray-900
                            "
                          >
                            <Eye size={16} />
                          </button>
                        )}

                        {/* EDIT */}

                        {canEdit &&
                          onEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                onEdit(
                                  consumption
                                )
                              }
                              title="Edit consumption"
                              aria-label="Edit consumption"
                              className="
                                inline-flex h-8 w-8
                                items-center justify-center
                                rounded-lg border
                                border-gray-200 bg-white
                                text-gray-500
                                transition-all
                                hover:border-gray-300
                                hover:bg-gray-50
                                hover:text-gray-900
                              "
                            >
                              <Pencil
                                size={15}
                              />
                            </button>
                          )}

                        {/* CANCEL */}

                        {canCancel &&
                          onCancel && (
                            <button
                              type="button"
                              onClick={() =>
                                onCancel(
                                  consumption
                                )
                              }
                              title="Cancel consumption"
                              aria-label="Cancel consumption"
                              className="
                                inline-flex h-8 w-8
                                items-center justify-center
                                rounded-lg border
                                border-gray-200 bg-white
                                text-gray-400
                                transition-all
                                hover:border-red-200
                                hover:bg-red-50
                                hover:text-red-600
                              "
                            >
                              <XCircle
                                size={16}
                              />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}