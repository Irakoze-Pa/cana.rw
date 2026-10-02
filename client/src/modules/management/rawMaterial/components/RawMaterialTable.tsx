import {
  Edit,
  Package,
  Trash2,
} from "lucide-react";
import { Fragment } from "react";

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

const stockGroup = (category?: string) =>
  /^Packaging\b/i.test(category || "") ? "Packaging" : "Raw materials";

const stockSummary = (quantity: number, unit: string, packSizes?: number[]) => {
  if (!packSizes?.length) return "—";
  return `${formatNumber(quantity / packSizes[0])} packs @ ${formatNumber(packSizes[0])} ${unit}`;
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
        <table className="w-full min-w-[1050px] text-left">
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
                Available stock
              </th>

              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reference Price
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
            {[...materials].sort((left, right) => `${stockGroup(left.category)} ${left.category} ${left.name}`.localeCompare(`${stockGroup(right.category)} ${right.category} ${right.name}`)).map((material, index, sortedMaterials) => {
              const quantity =
                material.quantity ?? 0;

              const availableQuantity =
                material.availableQuantity ??
                quantity;

              const minimumStock =
                material.minimumStock ?? 0;

              const isOutOfStock = availableQuantity <= 0;

              const isLowStock =
                !isOutOfStock &&
                availableQuantity <= minimumStock;

              const startsCategory = index === 0 || stockGroup(sortedMaterials[index - 1].category) !== stockGroup(material.category);
              return (
                <Fragment key={material._id}>
                  {startsCategory && <tr className="bg-slate-50"><td colSpan={8} className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-[.12em] text-slate-600">{stockGroup(material.category)}</td></tr>}
                <tr
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
                        {material.packSizes?.length
                          ? `${stockSummary(availableQuantity, material.unit, material.packSizes)} · Min: ${formatNumber(minimumStock)} ${material.unit}`
                          : `Min: ${formatNumber(minimumStock)} ${material.unit}`}
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
                      <span className="text-xs font-normal text-gray-400">RWF / {material.unit}</span>
                    </span>
                    {material.packSizes?.length ? <p className="mt-0.5 text-xs text-gray-400">{formatNumber((material.costPerUnit || 0) * material.packSizes[0])} RWF / {material.packSizes[0]} {material.unit} pack</p> : null}
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
                          inline-flex
                          items-center
                          gap-1.5
                          rounded-lg
                          border
                          border-gray-200
                          bg-white
                          px-2.5
                          py-2
                          text-gray-500
                          transition
                          hover:bg-gray-100
                          hover:text-gray-900
                        "
                        title="Update material details and reference price"
                        aria-label={`Update ${material.name} and its reference price`}
                      >
                        <Edit size={17} />
                        <span className="text-xs font-semibold">
                          Update
                        </span>
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
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RawMaterialTable;
