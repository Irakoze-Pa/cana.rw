import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  MaterialConsumption,
} from "../types/materialConsumption.types";

interface ConsumptionTableProps {
  consumptions: MaterialConsumption[];
  loading?: boolean;
}

function getBatchName(
  batch: MaterialConsumption["productionBatch"],
): string {
  if (!batch) {
    return "-";
  }

  if (typeof batch === "string") {
    return batch;
  }

  return (
    batch.batchNo ||
    batch.batchNumber ||
    batch._id ||
    "-"
  );
}

export default function ConsumptionTable({
  consumptions,
  loading = false,
}: ConsumptionTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
      </div>
    );
  }

  if (!Array.isArray(consumptions) || consumptions.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <span className="text-xl">📦</span>
        </div>

        <h3 className="font-semibold text-slate-900">
          No material consumptions found
        </h3>

        <p className="mt-1 max-w-md text-sm text-slate-500">
          Material consumptions will appear here once
          they are created.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Consumption
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Batch
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Product
            </th>

            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Standard
            </th>

            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Issued
            </th>

            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actual
            </th>

            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Waste
            </th>

            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>

            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {consumptions.map((consumption) => (
            <tr
              key={consumption._id}
              className="transition hover:bg-slate-50"
            >
              {/* Consumption */}
              <td className="px-5 py-4">
                <div className="font-semibold text-slate-900">
                  {consumption.consumptionNo}
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  {consumption.createdAt
                    ? new Date(
                        consumption.createdAt,
                      ).toLocaleDateString()
                    : "-"}
                </div>
              </td>

              {/* Batch */}
              <td className="px-5 py-4">
                <span className="font-medium text-slate-700">
                  {getBatchName(
                    consumption.productionBatch,
                  )}
                </span>
              </td>

              {/* Product */}
              <td className="px-5 py-4">
                <div className="font-medium text-slate-800">
                  {consumption.productName || "-"}
                </div>

                <div className="text-xs text-slate-500">
                  {consumption.productCode || ""}
                </div>
              </td>

              {/* Standard */}
              <td className="px-5 py-4 text-right font-medium text-slate-700">
                {Number(
                  consumption.totalStandardQuantity ?? 0,
                ).toLocaleString()}
              </td>

              {/* Issued */}
              <td className="px-5 py-4 text-right font-medium text-slate-700">
                {Number(
                  consumption.totalIssuedQuantity ?? 0,
                ).toLocaleString()}
              </td>

              {/* Actual */}
              <td className="px-5 py-4 text-right font-medium text-slate-700">
                {Number(
                  consumption.totalActualQuantity ?? 0,
                ).toLocaleString()}
              </td>

              {/* Waste */}
              <td className="px-5 py-4 text-right font-medium text-slate-700">
                {Number(
                  consumption.totalWasteQuantity ?? 0,
                ).toLocaleString()}
              </td>

              {/* Status */}
              <td className="px-5 py-4">
                <StatusBadge
                  status={consumption.status}
                />
              </td>

              {/* Action */}
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/management/production/consumption/${consumption._id}`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Eye size={16} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: MaterialConsumption["status"];
}) {
  const styles: Record<
    MaterialConsumption["status"],
    string
  > = {
    Draft:
      "bg-slate-100 text-slate-700 border-slate-200",

    Issued:
      "bg-slate-50 text-slate-700 border-slate-200",

    "Partially Consumed":
      "bg-amber-50 text-amber-700 border-amber-200",

    Consumed:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    Cancelled:
      "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] ??
        "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}