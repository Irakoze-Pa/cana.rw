import {
  CalendarDays,
  CheckCircle2,
  Factory,
  FileText,
  Hash,
  Package,
  User,
  X,
} from "lucide-react";

import type { ProductionBatch } from "../types/productionBatch.types";

interface ProductionBatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ProductionBatch | null;
}

function formatDate(
  value?: string
) {
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
) {
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

function getStatusClass(
  status: ProductionBatch["status"]
) {
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

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ProductionBatchDetailsModal({
  isOpen,
  onClose,
  batch,
}: ProductionBatchDetailsModalProps) {
  if (!isOpen || !batch) {
    return null;
  }

  const progress =
    batch.plannedQuantity > 0
      ? Math.min(
          100,
          (batch.actualQuantity /
            batch.plannedQuantity) *
            100
        )
      : 0;

  const productionOrderId =
    typeof batch.productionOrder ===
    "string"
      ? batch.productionOrder
      : batch.productionOrder._id;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
            event.target
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
              <Factory size={23} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {batch.batchNo}
                </h2>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                    batch.status
                  )}`}
                >
                  {batch.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Production batch details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* PROGRESS */}
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Production Progress
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {Number(
                      batch.actualQuantity
                    ).toLocaleString()}{" "}
                    /{" "}
                    {Number(
                      batch.plannedQuantity
                    ).toLocaleString()}{" "}
                    {batch.unit}
                  </p>
                </div>

                <p className="text-2xl font-bold text-gray-900">
                  {progress.toFixed(0)}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-600"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            {/* MAIN INFO */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="text-red-600" />

                  <h3 className="font-semibold">
                    Product
                  </h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {batch.productName}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Code:{" "}
                  {batch.productCode ||
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Hash className="text-red-600" />

                  <h3 className="font-semibold">
                    Formula
                  </h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {batch.formulaName}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {batch.formulaCode} · v
                  {batch.formulaVersion}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Factory className="text-red-600" />

                  <h3 className="font-semibold">
                    Production Order
                  </h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {typeof batch.productionOrder ===
                  "string"
                    ? productionOrderId
                    : batch
                        .productionOrder
                        .productionOrderNo}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <User className="text-red-600" />

                  <h3 className="font-semibold">
                    Supervisor
                  </h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {batch.supervisorName ||
                    "Not assigned"}
                </p>
              </div>
            </div>

            {/* BATCH / LOT */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500">
                  Batch Number
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {batch.batchNumber ||
                    "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500">
                  Lot Number
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {batch.lotNumber ||
                    "—"}
                </p>
              </div>
            </div>

            {/* DATES */}
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="text-red-600" />

                <h3 className="font-semibold">
                  Production Dates
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      batch.startDate
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    End Date
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      batch.endDate
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      batch.createdAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Updated
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      batch.updatedAt
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* NOTES */}
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="text-red-600" />

                <h3 className="font-semibold">
                  Notes
                </h3>
              </div>

              <p className="text-sm leading-6 text-gray-600">
                {batch.notes?.trim() ||
                  "No notes available."}
              </p>
            </div>

            {batch.status ===
              "Completed" && (
              <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                <CheckCircle2 size={20} />

                <p className="text-sm font-medium">
                  This production batch has been
                  completed.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}