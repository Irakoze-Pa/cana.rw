import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  createSupplier,
  updateSupplier,
} from "../services/supplierService";

import type {
  Supplier,
  CreateSupplierData,
  SupplierStatus,
} from "../types/supplier.types";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
  supplier?: Supplier | null;
}

const initialForm: CreateSupplierData = {
  name: "",
  code: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "Rwanda",
  paymentTerms: "",
  status: "Active",
  notes: "",
};

function SupplierModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierModalProps) {
  const [form, setForm] =
    useState<CreateSupplierData>(initialForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(supplier);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        code: supplier.code,
        contactPerson: supplier.contactPerson ?? "",
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        address: supplier.address ?? "",
        city: supplier.city ?? "",
        country: supplier.country ?? "Rwanda",
        paymentTerms: supplier.paymentTerms ?? "",
        status: supplier.status,
        notes: supplier.notes ?? "",
      });
    } else {
      setForm(initialForm);
    }

    setError("");
  }, [supplier, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    field: keyof CreateSupplierData,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    try {
      setLoading(true);

      let savedSupplier: Supplier;

      if (isEditMode && supplier) {
        savedSupplier = await updateSupplier(
          supplier._id,
          form
        );
      } else {
        savedSupplier = await createSupplier(form);
      }

      onSuccess(savedSupplier);

      onClose();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save supplier."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50
        p-4
      "
    >
      <div
        className="
          w-full max-w-3xl
          max-h-[90vh]
          overflow-y-auto
          rounded-2xl
          bg-white
          shadow-xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex items-center justify-between
            border-b
            px-6
            py-5
          "
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode
                ? "Edit Supplier"
                : "Add Supplier"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl
              p-2
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-gray-900
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* ERROR */}

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-600
              "
            >
              {error}
            </div>
          )}

          {/* BASIC INFORMATION */}

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              Basic Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Supplier Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  placeholder="ABC Chemicals Ltd"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Supplier Code
                </label>

                <input
                  type="text"
                  value={form.code || ""}
                  onChange={(e) =>
                    handleChange(
                      "code",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Supplier code"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Contact Person
                </label>

                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) =>
                    handleChange(
                      "contactPerson",
                      e.target.value
                    )
                  }
                  placeholder="John Doe"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    handleChange(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="+250 788 000 000"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    handleChange(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="info@supplier.com"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Terms
                </label>

                <input
                  type="text"
                  value={form.paymentTerms}
                  onChange={(e) =>
                    handleChange(
                      "paymentTerms",
                      e.target.value
                    )
                  }
                  placeholder="30 Days"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>
            </div>
          </div>

          {/* LOCATION */}

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              Location
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Address
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    handleChange(
                      "address",
                      e.target.value
                    )
                  }
                  placeholder="KN 5 Road"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  City
                </label>

                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    handleChange(
                      "city",
                      e.target.value
                    )
                  }
                  placeholder="Kigali"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Country
                </label>

                <input
                  type="text"
                  value={form.country}
                  onChange={(e) =>
                    handleChange(
                      "country",
                      e.target.value
                    )
                  }
                  placeholder="Rwanda"
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    handleChange(
                      "status",
                      e.target.value as SupplierStatus
                    )
                  }
                  className="
                    w-full rounded-xl border
                    border-gray-200
                    bg-white
                    px-4 py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                  "
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* NOTES */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                handleChange(
                  "notes",
                  e.target.value
                )
              }
              rows={4}
              placeholder="Additional supplier information..."
              className="
                w-full
                resize-none
                rounded-xl
                border
                border-gray-200
                px-4 py-3
                text-sm
                outline-none
                transition
                focus:border-red-500
                focus:ring-2
                focus:ring-red-100
              "
            />
          </div>

          {/* ACTIONS */}

          <div
            className="
              flex
              justify-end
              gap-3
              border-t
              pt-5
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                rounded-xl
                border
                border-gray-200
                px-5
                py-3
                text-sm
                font-semibold
                text-gray-700
                transition
                hover:bg-gray-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="
                flex
                items-center
                gap-2
                rounded-xl
                bg-red-600
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-red-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Saving..."
                : isEditMode
                ? "Update Supplier"
                : "Save Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SupplierModal;
