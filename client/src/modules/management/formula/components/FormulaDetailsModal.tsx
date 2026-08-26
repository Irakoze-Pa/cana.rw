import {
  X,
  Pencil,
  Power,
  FlaskConical,
  Package,
  Calculator,
  FileText,
} from "lucide-react";

import type {
  Formula,
  RawMaterial,
} from "../types/formula.types";

interface FormulaDetailsProps {
  isOpen: boolean;

  formula: Formula | null;

  onClose: () => void;

  onEdit: (
    formula: Formula
  ) => void;

  onDeactivate: (
    formula: Formula
  ) => void;
}

export default function FormulaDetails({
  isOpen,
  formula,
  onClose,
  onEdit,
  onDeactivate,
}: FormulaDetailsProps) {
  if (!isOpen || !formula) {
    return null;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  const formatMoney = (
    value: number
  ) => {
    return `${Number(
      value || 0
    ).toLocaleString("en-RW")} RWF`;
  };

  const getMaterial =
    (
      material:
        | string
        | RawMaterial
    ): RawMaterial | null => {
      if (
        typeof material ===
        "string"
      ) {
        return null;
      }

      return material;
    };

  const product =
    typeof formula.product ===
    "string"
      ? null
      : formula.product;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FlaskConical
                size={22}
              />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Formula Details
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {formula.name}
                </h2>

                {formula.status ===
                "Active" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">
            {/* =================================================
                BASIC INFO
            ================================================= */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label="Formula Code"
                value={formula.code}
              />

              <InfoCard
                label="Version"
                value={`Version ${formula.version}`}
              />

              <InfoCard
                label="Batch Size"
                value={`${Number(
                  formula.batchSize
                ).toLocaleString(
                  "en-RW"
                )} ${formula.batchUnit}`}
              />

              <InfoCard
                label="Product"
                value={
                  product
                    ? `${product.name} (${product.code})`
                    : "Product unavailable"
                }
              />
            </div>

            {/* =================================================
                COST SUMMARY
            ================================================= */}

            <div className="mt-7">
              <div className="flex items-center gap-2">
                <Calculator
                  size={17}
                  className="text-red-600"
                />

                <h3 className="text-sm font-bold text-gray-900">
                  Cost Summary
                </h3>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <CostCard
                  label="Material Cost"
                  value={
                    formula.estimatedMaterialCost
                  }
                />

                <CostCard
                  label="Labor Cost"
                  value={
                    formula.laborCost
                  }
                />

                <CostCard
                  label="Energy Cost"
                  value={
                    formula.energyCost
                  }
                />

                <CostCard
                  label="Other Cost"
                  value={
                    formula.otherCost
                  }
                />
              </div>

              <div className="mt-4 rounded-2xl bg-gray-900 p-5 text-white">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Estimated Production Cost
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      For one{" "}
                      {formula.batchSize}{" "}
                      {formula.batchUnit}{" "}
                      batch
                    </p>
                  </div>

                  <p className="text-2xl font-bold">
                    {formatMoney(
                      formula.estimatedTotalCost
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                RAW MATERIALS
            ================================================= */}

            <div className="mt-8">
              <div className="flex items-center gap-2">
                <Package
                  size={17}
                  className="text-red-600"
                />

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Raw Materials
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Materials required to
                    produce this batch.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Material
                        </th>

                        <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Quantity
                        </th>

                        <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Unit
                        </th>

                        <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Waste
                        </th>

                        <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Unit Cost
                        </th>

                        <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {formula.items?.map(
                        (
                          item,
                          index
                        ) => {
                          const material =
                            getMaterial(
                              item.rawMaterial
                            );

                          const quantity =
                            Number(
                              item.quantity ||
                                0
                            );

                          const waste =
                            Number(
                              item.wastePercentage ||
                                0
                            );

                          const quantityWithWaste =
                            quantity *
                            (1 +
                              waste /
                                100);

                          const unitCost =
                            Number(
                              material?.costPerUnit ||
                                0
                            );

                          const total =
                            quantityWithWaste *
                            unitCost;

                          return (
                            <tr
                              key={`${formula._id}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4">
                                {material ? (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {
                                        material.name
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                      {
                                        material.code
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    Material unavailable
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-sm font-semibold text-gray-800">
                                  {quantity.toLocaleString(
                                    "en-RW"
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                  {
                                    item.unit
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-sm text-gray-600">
                                  {waste}%
                                </span>

                                {waste >
                                  0 && (
                                  <p className="mt-1 text-[11px] text-gray-400">
                                    +
                                    {quantityWithWaste -
                                      quantity >
                                    0
                                      ? (
                                          quantityWithWaste -
                                          quantity
                                        ).toFixed(
                                          3
                                        )
                                      : "0"}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <span className="text-sm text-gray-700">
                                  {formatMoney(
                                    unitCost
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <span className="text-sm font-bold text-gray-900">
                                  {formatMoney(
                                    total
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td
                          colSpan={5}
                          className="px-5 py-4 text-right text-sm font-bold text-gray-700"
                        >
                          Estimated Material
                          Cost
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-bold text-gray-900">
                          {formatMoney(
                            formula.estimatedMaterialCost
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            {formula.notes &&
              formula.notes.trim() && (
                <div className="mt-7">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={17}
                      className="text-red-600"
                    />

                    <h3 className="text-sm font-bold text-gray-900">
                      Notes
                    </h3>
                  </div>

                  <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {
                        formula.notes
                      }
                    </p>
                  </div>
                </div>
              )}

            {/* =================================================
                DATES
            ================================================= */}

            <div className="mt-7 grid grid-cols-1 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-400">
                  Created
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {new Date(
                    formula.createdAt
                  ).toLocaleString(
                    "en-RW"
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400">
                  Last Updated
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700">
                  {new Date(
                    formula.updatedAt
                  ).toLocaleString(
                    "en-RW"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="text-xs text-gray-400">
            Formula{" "}
            <span className="font-semibold text-gray-600">
              {formula.code}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() =>
                onEdit(formula)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Pencil size={16} />

              Edit
            </button>

            {formula.status ===
              "Active" && (
              <button
                type="button"
                onClick={() =>
                  onDeactivate(
                    formula
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Power size={16} />

                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INFO CARD
// =====================================================

interface InfoCardProps {
  label: string;
  value: string;
}

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// COST CARD
// =====================================================

interface CostCardProps {
  label: string;
  value: number;
}

function CostCard({
  label,
  value,
}: CostCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-base font-bold text-gray-900">
        {Number(
          value || 0
        ).toLocaleString(
          "en-RW"
        )}{" "}
        RWF
      </p>
    </div>
  );
}