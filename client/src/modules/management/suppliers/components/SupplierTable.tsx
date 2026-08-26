import {
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";

import type { Supplier } from "../types/supplier.types";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onView: (supplier: Supplier) => void;
}

function SupplierTable({
  suppliers,
  onEdit,
  onDelete,
  onView,
}: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <MoreHorizontal className="text-gray-400" size={22} />
        </div>

        <h3 className="text-base font-semibold text-gray-900">
          No suppliers found
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Add your first supplier to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Supplier
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Contact
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Location
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Payment Terms
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {suppliers.map((supplier) => (
              <tr
                key={supplier._id}
                className="transition hover:bg-gray-50"
              >
                {/* SUPPLIER */}

                <td className="px-6 py-5">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {supplier.name}
                    </p>

                    <p className="mt-1 text-xs font-medium text-gray-400">
                      {supplier.code}
                    </p>
                  </div>
                </td>

                {/* CONTACT */}

                <td className="px-6 py-5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {supplier.contactPerson || "—"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {supplier.phone || "—"}
                    </p>

                    {supplier.email && (
                      <p className="mt-1 text-xs text-gray-400">
                        {supplier.email}
                      </p>
                    )}
                  </div>
                </td>

                {/* LOCATION */}

                <td className="px-6 py-5">
                  <p className="text-sm text-gray-700">
                    {supplier.city || "—"}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {supplier.country || "—"}
                  </p>
                </td>

                {/* PAYMENT TERMS */}

                <td className="px-6 py-5">
                  <span className="text-sm text-gray-700">
                    {supplier.paymentTerms || "—"}
                  </span>
                </td>

                {/* STATUS */}

                <td className="px-6 py-5">
                  <span
                    className={`
                      inline-flex
                      rounded-full
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      ${
                        supplier.status === "Active"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {supplier.status}
                  </span>
                </td>

                {/* ACTIONS */}

                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(supplier)}
                      title="View supplier"
                      className="
                        rounded-lg
                        p-2
                        text-gray-500
                        transition
                        hover:bg-gray-100
                        hover:text-gray-900
                      "
                    >
                      <Eye size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(supplier)}
                      title="Edit supplier"
                      className="
                        rounded-lg
                        p-2
                        text-gray-500
                        transition
                        hover:bg-gray-100
                        hover:text-gray-900
                      "
                    >
                      <Edit size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(supplier)}
                      title="Delete supplier"
                      className="
                        rounded-lg
                        p-2
                        text-red-500
                        transition
                        hover:bg-red-50
                        hover:text-red-600
                      "
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SupplierTable;