import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  MoreHorizontal,
  Settings2,
  XCircle,
} from "lucide-react";

import type { Inventory } from "../types/inventory.types";

interface InventoryTableProps {
  inventory: Inventory[];
  loading?: boolean;
  onAddStock: (item: Inventory) => void;
  onRemoveStock: (item: Inventory) => void;
  onAdjustStock: (item: Inventory) => void;
  onViewTransactions?: (item: Inventory) => void;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const getStatus = (item: Inventory) => {
  if (item.status === "Inactive") {
    return {
      label: "Inactive",
      className:
        "border-gray-200 bg-gray-100 text-gray-600",
      icon: XCircle,
    };
  }

  const quantity = item.quantity || 0;
  const minimumStock = item.minimumStock || 0;

  if (
    item.isOutOfStock ||
    quantity <= 0 ||
    item.status === "Out of Stock"
  ) {
    return {
      label: "Out of Stock",
      className:
        "border-red-200 bg-red-50 text-red-700",
      icon: XCircle,
    };
  }

  if (
    item.isLowStock ||
    item.status === "Low Stock" ||
    quantity <= minimumStock
  ) {
    return {
      label: "Low Stock",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Available",
    className:
      "border-green-200 bg-green-50 text-green-700",
    icon: CheckCircle2,
  };
};

const InventoryTable = ({
  inventory,
  loading = false,
  onAddStock,
  onRemoveStock,
  onAdjustStock,
  onViewTransactions,
}: InventoryTableProps) => {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-72 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />

            <p className="text-sm text-gray-500">
              Loading inventory...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!inventory.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <Boxes className="h-7 w-7 text-gray-400" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No inventory records
          </h3>

          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Inventory records will appear here once raw
            materials are added to inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Raw Material Inventory
          </h3>

          <p className="mt-0.5 text-xs text-gray-500">
            Current stock position and inventory status
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
          {inventory.length}{" "}
          {inventory.length === 1 ? "item" : "items"}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Raw Material
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Total Stock
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Reserved
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Available
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Min. Stock
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Avg. Cost
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {inventory.map((item) => {
              const status = getStatus(item);
              const StatusIcon = status.icon;

              const quantity = item.quantity || 0;

              const reservedQuantity =
                item.reservedQuantity || 0;

              const availableQuantity =
                item.availableQuantity ??
                Math.max(
                  0,
                  quantity - reservedQuantity
                );

              const minimumStock =
                item.minimumStock || 0;

              return (
                <tr
                  key={item._id}
                  className="group transition hover:bg-gray-50/70"
                >
                  {/* Raw Material */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                        <Boxes className="h-5 w-5 text-red-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.rawMaterialName}
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-gray-400">
                          {item.rawMaterialCode}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Total Stock */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNumber(quantity)}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.unit}
                    </p>
                  </td>

                  {/* Reserved */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-gray-700">
                      {formatNumber(reservedQuantity)}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.unit}
                    </p>
                  </td>

                  {/* Available */}
                  <td className="px-4 py-4">
                    <p
                      className={`text-sm font-semibold ${
                        availableQuantity <= 0
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {formatNumber(
                        availableQuantity
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.unit}
                    </p>
                  </td>

                  {/* Minimum Stock */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-gray-700">
                      {formatNumber(minimumStock)}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.unit}
                    </p>
                  </td>

                  {/* Average Cost */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNumber(
                        item.averageCostPerUnit || 0
                      )}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />

                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Add */}
                      <button
                        type="button"
                        title="Add Stock"
                        onClick={() =>
                          onAddStock(item)
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <ArrowDownToLine className="h-4 w-4" />

                        <span className="hidden xl:inline">
                          Add
                        </span>
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        title="Remove Stock"
                        onClick={() =>
                          onRemoveStock(item)
                        }
                        disabled={
                          availableQuantity <= 0
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUpFromLine className="h-4 w-4" />

                        <span className="hidden xl:inline">
                          Remove
                        </span>
                      </button>

                      {/* Adjust */}
                      <button
                        type="button"
                        title="Adjust Stock"
                        onClick={() =>
                          onAdjustStock(item)
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Settings2 className="h-4 w-4" />

                        <span className="hidden xl:inline">
                          Adjust
                        </span>
                      </button>

                      {/* Transactions */}
                      {onViewTransactions && (
                        <button
                          type="button"
                          title="View Transactions"
                          onClick={() =>
                            onViewTransactions(item)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-5 py-3">
        <p className="text-xs text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-700">
            {inventory.length}
          </span>{" "}
          inventory{" "}
          {inventory.length === 1
            ? "record"
            : "records"}
        </p>

        <div className="hidden items-center gap-2 text-xs text-gray-400 sm:flex">
          <CheckCircle2 className="h-3.5 w-3.5" />

          Inventory is managed through stock
          transactions
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;