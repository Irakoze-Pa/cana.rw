import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  Package,
  PackageCheck,
  RefreshCw,
  XCircle,
} from "lucide-react";

import type {
  MaterialConsumption,
  MaterialConsumptionItem,
} from "../types/materialConsumption.types";

import {
  getMaterialConsumptionById,
} from "../services/materialConsumption.service";

import IssueMaterialsModal from "../components/IssueMaterialsModal";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const safeNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (
  value: unknown,
  maximumFractionDigits = 2,
): string => {
  return safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const formatDate = (
  value?: string | Date | null,
): string => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (
  value?: string | Date | null,
): string => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getBatchName = (
  batch: MaterialConsumption["productionBatch"],
): string => {
  if (!batch) return "-";

  if (typeof batch === "string") {
    return batch;
  }

  return (
    batch.batchNo ||
    batch.batchNumber ||
    batch._id ||
    "-"
  );
};

const getProductionOrderName = (
  order: MaterialConsumption["productionOrder"],
): string => {
  if (!order) return "-";

  if (typeof order === "string") {
    return order;
  }

  return (
    order.productionOrderNo ||
    order._id ||
    "-"
  );
};

const getStatusClasses = (
  status: MaterialConsumption["status"],
): string => {
  switch (status) {
    case "Draft":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "Issued":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "Partially Consumed":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Consumed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

export default function RawMaterialConsumptionDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const [consumption, setConsumption] =
    useState<MaterialConsumption | null>(null);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  const [issueModalOpen, setIssueModalOpen] =
    useState<boolean>(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  const loadConsumption = useCallback(async () => {
    if (!id) {
      setError(
        "Material consumption ID is missing.",
      );

      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response =
        await getMaterialConsumptionById(id);

      /*
       * Supports:
       *
       * 1. MaterialConsumption
       *
       * 2. { data: MaterialConsumption }
       */

      const data =
        (response as any)?.data ?? response;

      if (!data) {
        throw new Error(
          "Material consumption was not found.",
        );
      }

      setConsumption(data);
    } catch (err: any) {
      console.error(
        "Load material consumption error:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load material consumption.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadConsumption();
  }, [loadConsumption]);

  /* ------------------------------------------------------------------------ */
  /* NORMALIZE ITEMS                                                          */
  /* ------------------------------------------------------------------------ */

  const items = useMemo<MaterialConsumptionItem[]>(
    () => {
      if (
        !consumption ||
        !Array.isArray(consumption.items)
      ) {
        return [];
      }

      return consumption.items.map(
        (item) => ({
          ...item,

          standardQuantity:
            safeNumber(
              item.standardQuantity,
            ),

          issuedQuantity:
            safeNumber(
              item.issuedQuantity,
            ),

          actualQuantity:
            safeNumber(
              item.actualQuantity,
            ),

          wasteQuantity:
            safeNumber(
              item.wasteQuantity,
            ),

          returnQuantity:
            safeNumber(
              item.returnQuantity,
            ),

          varianceQuantity:
            safeNumber(
              item.varianceQuantity,
            ),

          variancePercentage:
            safeNumber(
              item.variancePercentage,
            ),
        }),
      );
    },
    [consumption],
  );

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />

              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading material consumption...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                    */
  /* ------------------------------------------------------------------------ */

  if (error || !consumption) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle
                  size={28}
                  className="text-red-600"
                />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Unable to load material consumption
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {error ||
                  "Material consumption was not found."}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/management/production/consumption",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void loadConsumption()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SUMMARY VALUES                                                           */
  /* ------------------------------------------------------------------------ */

  const totalStandard = safeNumber(
    consumption.totalStandardQuantity,
  );

  const totalIssued = safeNumber(
    consumption.totalIssuedQuantity,
  );

  const totalActual = safeNumber(
    consumption.totalActualQuantity,
  );

  const totalWaste = safeNumber(
    consumption.totalWasteQuantity,
  );

  const totalReturn = safeNumber(
    consumption.totalReturnQuantity,
  );

  const totalVariance = safeNumber(
    consumption.totalVarianceQuantity,
  );

  const accountedQuantity =
    totalActual +
    totalWaste +
    totalReturn;

  const reconciliationPercentage =
    totalIssued > 0
      ? Math.min(
          100,
          (accountedQuantity /
            totalIssued) *
            100,
        )
      : 0;

  const isDraft =
    consumption.status === "Draft";

  const isIssued =
    consumption.status === "Issued";

  const isPartiallyConsumed =
    consumption.status ===
    "Partially Consumed";

  const canIssue = isDraft;

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================================================================ */}
        {/* HEADER                                                            */}
        {/* ================================================================ */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/management/production/consumption"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {consumption.consumptionNo ||
                    "Material Consumption"}
                </h1>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    consumption.status,
                  )}`}
                >
                  {consumption.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Raw material consumption details
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void loadConsumption()
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {canIssue && (
              <button
                type="button"
                onClick={() =>
                  setIssueModalOpen(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <PackageCheck size={17} />
                Issue Materials
              </button>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* INFORMATION CARDS                                                */}
        {/* ================================================================ */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {/* PRODUCT */}

          <InfoCard
            icon={
              <Package
                size={19}
                className="text-red-600"
              />
            }
            iconClass="bg-red-50"
            label="Product"
            title={
              consumption.productName ||
              "-"
            }
            subtitle={
              consumption.productCode ||
              "-"
            }
          />

          {/* BATCH */}

          <InfoCard
            icon={
              <Factory
                size={19}
                className="text-slate-600"
              />
            }
            iconClass="bg-slate-50"
            label="Production Batch"
            title={getBatchName(
              consumption.productionBatch,
            )}
            subtitle={
              consumption.batchNumber ||
              "-"
            }
          />

          {/* ORDER */}

          <InfoCard
            icon={
              <ClipboardList
                size={19}
                className="text-amber-600"
              />
            }
            iconClass="bg-amber-50"
            label="Production Order"
            title={getProductionOrderName(
              consumption.productionOrder,
            )}
            subtitle={
              consumption.formulaName ||
              "Formula not specified"
            }
          />

          {/* CREATED */}

          <InfoCard
            icon={
              <CalendarDays
                size={19}
                className="text-slate-600"
              />
            }
            iconClass="bg-slate-100"
            label="Created"
            title={formatDate(
              consumption.createdAt,
            )}
            subtitle={formatDateTime(
              consumption.createdAt,
            )}
          />
        </div>

        {/* ================================================================ */}
        {/* SUMMARY                                                           */}
        {/* ================================================================ */}

        <div>
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Consumption Summary
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Overview of material quantities for this production batch.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              label="Standard"
              value={totalStandard}
              icon={
                <ClipboardCheck size={17} />
              }
            />

            <SummaryCard
              label="Issued"
              value={totalIssued}
              icon={<ArrowUpIcon />}
            />

            <SummaryCard
              label="Actual"
              value={totalActual}
              icon={
                <CheckCircle2 size={17} />
              }
            />

            <SummaryCard
              label="Waste"
              value={totalWaste}
              icon={<TrashIcon />}
            />

            <SummaryCard
              label="Return"
              value={totalReturn}
              icon={<ArrowDownIcon />}
            />

            <SummaryCard
              label="Variance"
              value={totalVariance}
              icon={
                <RefreshCw size={17} />
              }
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* RECONCILIATION                                                    */}
        {/* ================================================================ */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Material Reconciliation
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Issued quantity should eventually be accounted for as actual usage, waste, or returned material.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
            <ReconciliationCard
              label="Issued"
              value={totalIssued}
            />

            <ReconciliationCard
              label="Actual"
              value={totalActual}
            />

            <ReconciliationCard
              label="Waste"
              value={totalWaste}
            />

            <ReconciliationCard
              label="Return"
              value={totalReturn}
            />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
              <span className="font-medium text-slate-600">
                Accounted Quantity
              </span>

              <span className="font-bold text-slate-900">
                {formatNumber(
                  accountedQuantity,
                )}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{
                  width: `${reconciliationPercentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>
                {formatNumber(
                  accountedQuantity,
                )}{" "}
                accounted
              </span>

              <span>
                {formatNumber(
                  totalIssued,
                )}{" "}
                issued
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MATERIAL ITEMS                                                    */}
        {/* ================================================================ */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Material Items
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Raw materials used for this production batch.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {items.length}{" "}
              {items.length === 1
                ? "material"
                : "materials"}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Package
                    size={21}
                    className="text-slate-500"
                  />
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  No material items
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  This consumption does not contain any material items.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <TableHeader align="left">
                      Raw Material
                    </TableHeader>

                    <TableHeader>
                      Standard
                    </TableHeader>

                    <TableHeader>
                      Issued
                    </TableHeader>

                    <TableHeader>
                      Actual
                    </TableHeader>

                    <TableHeader>
                      Waste
                    </TableHeader>

                    <TableHeader>
                      Return
                    </TableHeader>

                    <TableHeader>
                      Variance
                    </TableHeader>

                    <TableHeader>
                      Variance %
                    </TableHeader>

                    <TableHeader align="left">
                      Lot
                    </TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map(
                    (
                      item,
                      index,
                    ) => {
                      const standard =
                        safeNumber(
                          item.standardQuantity,
                        );

                      const issued =
                        safeNumber(
                          item.issuedQuantity,
                        );

                      const actual =
                        safeNumber(
                          item.actualQuantity,
                        );

                      const waste =
                        safeNumber(
                          item.wasteQuantity,
                        );

                      const returned =
                        safeNumber(
                          item.returnQuantity,
                        );

                      const variance =
                        safeNumber(
                          item.varianceQuantity,
                        );

                      const variancePercentage =
                        safeNumber(
                          item.variancePercentage,
                        );

                      return (
                        <tr
                          key={
                            item._id ||
                            `${item.rawMaterial}-${index}`
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">
                              {item.rawMaterialName ||
                                "-"}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {item.rawMaterialCode ||
                                "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <QuantityCell
                              value={standard}
                              unit={item.unit}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <QuantityCell
                              value={issued}
                              unit={item.unit}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <QuantityCell
                              value={actual}
                              unit={item.unit}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <QuantityCell
                              value={waste}
                              unit={item.unit}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <QuantityCell
                              value={returned}
                              unit={item.unit}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={
                                variance > 0
                                  ? "font-semibold text-red-600"
                                  : variance < 0
                                    ? "font-semibold text-emerald-600"
                                    : "font-medium text-slate-700"
                              }
                            >
                              {formatNumber(
                                variance,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={
                                variancePercentage >
                                0
                                  ? "font-semibold text-red-600"
                                  : variancePercentage <
                                      0
                                    ? "font-semibold text-emerald-600"
                                    : "font-medium text-slate-700"
                              }
                            >
                              {formatNumber(
                                variancePercentage,
                              )}
                              %
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {item.lotNumber ||
                                "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* NOTES                                                             */}
        {/* ================================================================ */}

        {consumption.notes && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              Notes
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {consumption.notes}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* ACTIVITY                                                          */}
        {/* ================================================================ */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Activity
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3">
            <ActivityItem
              icon={
                <CalendarDays size={17} />
              }
              label="Created"
              value={formatDateTime(
                consumption.createdAt,
              )}
            />

            <ActivityItem
              icon={
                <PackageCheck size={17} />
              }
              label="Issued At"
              value={formatDateTime(
                consumption.issuedAt,
              )}
            />

            <ActivityItem
              icon={
                <CheckCircle2 size={17} />
              }
              label="Consumed At"
              value={formatDateTime(
                consumption.consumedAt,
              )}
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* DRAFT MESSAGE                                                     */}
        {/* ================================================================ */}

        {isDraft && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <PackageCheck
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Materials have not been issued yet
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Issue the required raw materials before production consumption can be recorded.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* ISSUED MESSAGE                                                    */}
        {/* ================================================================ */}

        {(isIssued ||
          isPartiallyConsumed) && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex gap-3">
              <PackageCheck
                size={20}
                className="mt-0.5 shrink-0 text-slate-600"
              />

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Materials issued
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-800">
                  Raw materials have been issued from inventory. The next step is to record actual usage, waste and returns.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* ISSUE MATERIALS MODAL                                               */}
      {/* ================================================================== */}

      <IssueMaterialsModal
        open={issueModalOpen}
        consumption={consumption}
        onClose={() =>
          setIssueModalOpen(false)
        }
        onSuccess={(updatedConsumption) => {
          setConsumption(
            updatedConsumption,
          );

          setIssueModalOpen(false);
        }}
      />
    </div>
  );
}

/* ========================================================================== */
/* INFO CARD                                                                  */
/* ========================================================================== */

function InfoCard({
  icon,
  iconClass,
  label,
  title,
  subtitle,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* SUMMARY CARD                                                               */
/* ========================================================================== */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* RECONCILIATION CARD                                                        */
/* ========================================================================== */

function ReconciliationCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* QUANTITY CELL                                                              */
/* ========================================================================== */

function QuantityCell({
  value,
  unit,
}: {
  value: number;
  unit?: string;
}) {
  return (
    <div>
      <span className="font-semibold text-slate-800">
        {formatNumber(value)}
      </span>

      {unit && (
        <span className="ml-1 text-xs text-slate-400">
          {unit}
        </span>
      )}
    </div>
  );
}

/* ========================================================================== */
/* TABLE HEADER                                                               */
/* ========================================================================== */

function TableHeader({
  children,
  align = "right",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-slate-500`}
    >
      {children}
    </th>
  );
}

/* ========================================================================== */
/* ACTIVITY ITEM                                                              */
/* ========================================================================== */

function ActivityItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* SMALL ICONS                                                                */
/* ========================================================================== */

function ArrowUpIcon() {
  return (
    <span className="text-[18px] font-bold">
      ↑
    </span>
  );
}

function ArrowDownIcon() {
  return (
    <span className="text-[18px] font-bold">
      ↓
    </span>
  );
}

function TrashIcon() {
  return (
    <span className="text-[17px] font-bold">
      ×
    </span>
  );
}
