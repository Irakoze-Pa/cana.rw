import {
  Edit,
  Package,
  Trash2,
} from "lucide-react";

import type { RawMaterial } from "../types/rawMaterial.types";

interface RawMaterialTableProps {
  materials: RawMaterial[];
  loading?: boolean;
  onEdit: (material: RawMaterial) => void;
  onDelete: (id: string) => void;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

function RawMaterialTable({
  materials,
  loading = false,
  onEdit,
  onDelete,
}: RawMaterialTableProps) {
  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          Loading raw materials...
        </div>
      </div>
    );
  }

  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (materials.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Package
            size={26}
            className="text-gray-400"
          />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">
          No raw materials found
        </h3>

        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Add your first raw material to start
          managing production inventory.
        </p>
      </div>
    );
  }

  // =====================================================
  // TABLE
  // =====================================================

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px] text-left">
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Material
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Unit
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Stock
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reserved
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Available
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cost / Unit
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Supplier
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          {/* ================================================= */}
          {/* BODY */}
          {/* ================================================= */}

          <tbody className="divide-y divide-gray-100">
            {materials.map((material) => {
              const quantity =
                material.quantity ?? 0;

              const reservedQuantity =
                material.reservedQuantity ?? 0;

              const availableQuantity =
                material.availableQuantity ??
                Math.max(
                  0,
                  quantity -
                    reservedQuantity
                );

              const minimumStock =
                material.minimumStock ?? 0;

              const isOutOfStock =
                material.isOutOfStock ??
                quantity <= 0;

              const isLowStock =
                material.isLowStock ??
                quantity <= minimumStock;

              return (
                <tr
                  key={material._id}
                  className="
                    transition
                    hover:bg-gray-50/70
                  "
                >
                  {/* ================================================= */}
                  {/* MATERIAL */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div className="min-w-[190px]">
                      <p className="text-sm font-semibold text-gray-900">
                        {material.name}
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-gray-400">
                        {material.code}
                      </p>
                    </div>
                  </td>

                  {/* ================================================= */}
                  {/* CATEGORY */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600">
                      {material.category}
                    </span>
                  </td>

                  {/* ================================================= */}
                  {/* UNIT */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {material.unit}
                    </span>
                  </td>

                  {/* ================================================= */}
                  {/* TOTAL STOCK */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          isOutOfStock
                            ? "text-red-600"
                            : isLowStock
                              ? "text-amber-600"
                              : "text-gray-900"
                        }`}
                      >
                        {formatNumber(
                          quantity
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-400">
                        Min:{" "}
                        {formatNumber(
                          minimumStock
                        )}
                      </p>
                    </div>
                  </td>

                  {/* ================================================= */}
                  {/* RESERVED */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatNumber(
                          reservedQuantity
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-400">
                        {material.unit}
                      </p>
                    </div>
                  </td>

                  {/* ================================================= */}
                  {/* AVAILABLE */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div>
                      <p
                        className={`text-sm font-bold ${
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
                        {material.unit}
                      </p>
                    </div>
                  </td>

                  {/* ================================================= */}
                  {/* COST */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <span className="whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatNumber(
                        material.costPerUnit ??
                          0
                      )}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        RWF
                      </span>
                    </span>
                  </td>

                  {/* ================================================= */}
                  {/* SUPPLIER */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    {material.supplier ? (
                      <div className="min-w-[150px]">
                        <p className="text-sm font-medium text-gray-700">
                          {material.supplier.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400">
                          {material.supplier.code}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        No supplier
                      </span>
                    )}
                  </td>

                  {/* ================================================= */}
                  {/* STATUS */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <span
                        className={`
                          inline-flex
                          rounded-full
                          px-2.5
                          py-1
                          text-xs
                          font-semibold
                          ${
                            material.status ===
                            "Active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }
                        `}
                      >
                        {material.status}
                      </span>

                      {isOutOfStock ? (
                        <span className="text-[11px] font-semibold text-red-600">
                          Out of stock
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Low stock
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* ================================================= */}
                  {/* ACTIONS */}
                  {/* ================================================= */}

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(material)
                        }
                        className="
                          rounded-lg
                          p-2
                          text-gray-500
                          transition
                          hover:bg-gray-100
                          hover:text-gray-900
                        "
                        title="Edit material"
                        aria-label="Edit material"
                      >
                        <Edit size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(
                            material._id
                          )
                        }
                        className="
                          rounded-lg
                          p-2
                          text-gray-500
                          transition
                          hover:bg-red-50
                          hover:text-red-600
                        "
                        title="Delete material"
                        aria-label="Delete material"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RawMaterialTable;