import {
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { RawMaterial } from "../types/rawMaterial.types";

import {
  createRawMaterial,
  updateRawMaterial,
} from "../services/rawMaterialService";

import { getSuppliers } from "../../suppliers/services/supplierService";

import type { Supplier } from "../../suppliers/types/supplier.types";

interface RawMaterialModalProps {
  isOpen: boolean;
  material?: RawMaterial | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  category: string;
  supplier: string;
  unit: string;
  quantity: string;
  minimumStock: string;
  costPerUnit: string;
  status: "Active" | "Inactive";
}

const initialForm: FormData = {
  name: "",
  category: "",
  supplier: "",
  unit: "",
  quantity: "",
  minimumStock: "",
  costPerUnit: "",
  status: "Active",
};

function RawMaterialModal({
  isOpen,
  material,
  onClose,
  onSuccess,
}: RawMaterialModalProps) {
  const [loading, setLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [suppliersLoading, setSuppliersLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] =
    useState<FormData>(initialForm);

  const isEditMode = Boolean(material);

  // =====================================================
  // LOAD SUPPLIERS
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    const loadSuppliers = async () => {
      try {
        setSuppliersLoading(true);
        setError("");

        const data = await getSuppliers();

        setSuppliers(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(
          "Failed to load suppliers:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load suppliers."
        );
      } finally {
        setSuppliersLoading(false);
      }
    };

    loadSuppliers();
  }, [isOpen]);

  // =====================================================
  // LOAD MATERIAL WHEN EDITING
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    if (material) {
      setFormData({
        name: material.name ?? "",

        category:
          material.category ?? "",

        supplier:
          material.supplier?._id ?? "",

        unit:
          material.unit ?? "",

        quantity:
          material.quantity !== undefined
            ? String(material.quantity)
            : "",

        minimumStock:
          material.minimumStock !== undefined
            ? String(material.minimumStock)
            : "",

        costPerUnit:
          material.costPerUnit !== undefined
            ? String(material.costPerUnit)
            : "",

        status:
          material.status ?? "Active",
      });
    } else {
      setFormData({
        ...initialForm,
      });
    }

    setError("");
  }, [isOpen, material]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Material name is required.";
    }

    if (!formData.category) {
      return "Please select a category.";
    }

    if (!formData.supplier) {
      return "Please select a supplier.";
    }

    if (!formData.unit) {
      return "Please select a unit.";
    }

    const quantity = Number(
      formData.quantity || 0
    );

    const minimumStock = Number(
      formData.minimumStock || 0
    );

    const costPerUnit = Number(
      formData.costPerUnit || 0
    );

    if (
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      return "Quantity must be a valid number greater than or equal to 0.";
    }

    if (
      !Number.isFinite(minimumStock) ||
      minimumStock < 0
    ) {
      return "Minimum stock must be a valid number greater than or equal to 0.";
    }

    if (
      !Number.isFinite(costPerUnit) ||
      costPerUnit < 0
    ) {
      return "Cost per unit must be a valid number greater than or equal to 0.";
    }

    return null;
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Code:
       * - On create, generate a temporary unique code.
       * - On edit, preserve existing material code.
       *
       * The backend remains responsible for
       * final validation.
       */
      const code =
        material?.code ||
        `RM-${Date.now()}`;

      const quantity = Number(
        formData.quantity || 0
      );

      const minimumStock = Number(
        formData.minimumStock || 0
      );

      const costPerUnit = Number(
        formData.costPerUnit || 0
      );

      const payload = {
        name: formData.name.trim(),

        code,

        category:
          formData.category.trim(),

        unit:
          formData.unit,

        quantity,

        minimumStock,

        costPerUnit,

        supplier:
          formData.supplier,

        status:
          formData.status,
      };

      console.log(
        "Sending Raw Material:",
        payload
      );

      if (
        isEditMode &&
        material?._id
      ) {
        await updateRawMaterial(
          material._id,
          payload
        );
      } else {
        await createRawMaterial(
          payload
        );
      }

      onSuccess?.();

      onClose();
    } catch (error) {
      console.error(
        "Failed to save raw material:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the raw material."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MODAL
  // =====================================================

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        p-4
        backdrop-blur-[2px]
      "
    >
      <div
        className="
          w-full
          max-w-3xl
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-gray-100
            px-6
            py-5
          "
        >
          <div>
            <h2
              className="
                text-xl
                font-bold
                tracking-tight
                text-gray-900
              "
            >
              {isEditMode
                ? "Edit Raw Material"
                : "Add Raw Material"}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              {isEditMode
                ? "Update raw material information and stock settings."
                : "Add a new raw material to your production inventory."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              rounded-xl
              p-2
              text-gray-400
              transition
              hover:bg-gray-100
              hover:text-gray-900
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div
            className="
              mx-6
              mt-5
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-600
            "
          >
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {/* ================================================= */}
        {/* FORM */}
        {/* ================================================= */}

        <form onSubmit={handleSubmit}>
          <div
            className="
              max-h-[65vh]
              overflow-y-auto
              px-6
              py-6
            "
          >
            <div
              className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-2
              "
            >
              {/* ================================================= */}
              {/* NAME */}
              {/* ================================================= */}

              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Material Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Titanium Dioxide"
                  required
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                />
              </div>

              {/* ================================================= */}
              {/* CATEGORY */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="category"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Category
                </label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                >
                  <option value="">
                    Select category
                  </option>

                  <option value="Pigment">
                    Pigment
                  </option>

                  <option value="Resin">
                    Resin
                  </option>

                  <option value="Solvent">
                    Solvent
                  </option>

                  <option value="Additive">
                    Additive
                  </option>

                  <option value="Filler">
                    Filler
                  </option>

                  <option value="Packaging">
                    Packaging
                  </option>
                </select>
              </div>

              {/* ================================================= */}
              {/* SUPPLIER */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="supplier"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Supplier
                </label>

                <select
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  required
                  disabled={
                    loading ||
                    suppliersLoading
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                >
                  <option value="">
                    {suppliersLoading
                      ? "Loading suppliers..."
                      : "Select supplier"}
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier._id}
                        value={supplier._id}
                      >
                        {supplier.name} (
                        {supplier.code})
                      </option>
                    )
                  )}
                </select>

                {!suppliersLoading &&
                  suppliers.length === 0 && (
                    <p className="mt-1.5 text-xs text-red-500">
                      No suppliers available.
                    </p>
                  )}
              </div>

              {/* ================================================= */}
              {/* UNIT */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="unit"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Unit
                </label>

                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                >
                  <option value="">
                    Select unit
                  </option>

                  <option value="kg">
                    Kilogram (kg)
                  </option>

                  <option value="L">
                    Liter (L)
                  </option>

                  <option value="pcs">
                    Pieces
                  </option>

                  <option value="drum">
                    Drum
                  </option>

                  <option value="bag">
                    Bag
                  </option>
                </select>
              </div>

              {/* ================================================= */}
              {/* CURRENT QUANTITY */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="quantity"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Current Quantity
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Current stock snapshot. Stock
                  movements will later be managed by
                  Inventory.
                </p>
              </div>

              {/* ================================================= */}
              {/* MINIMUM STOCK */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="minimumStock"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Minimum Stock
                </label>

                <input
                  id="minimumStock"
                  name="minimumStock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumStock}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
                  "
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Used to identify low-stock materials.
                </p>
              </div>

              {/* ================================================= */}
              {/* COST PER UNIT */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="costPerUnit"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Cost Per Unit
                </label>

                <div className="relative">
                  <input
                    id="costPerUnit"
                    name="costPerUnit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    disabled={loading}
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      px-4
                      py-3
                      pr-16
                      text-sm
                      text-gray-900
                      outline-none
                      transition
                      placeholder:text-gray-400
                      focus:border-red-500
                      focus:ring-2
                      focus:ring-red-100
                      disabled:bg-gray-50
                    "
                  />

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-xs
                      font-semibold
                      text-gray-400
                    "
                  >
                    RWF
                  </span>
                </div>
              </div>

              {/* ================================================= */}
              {/* STATUS */}
              {/* ================================================= */}

              <div>
                <label
                  htmlFor="status"
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    focus:border-red-500
                    focus:ring-2
                    focus:ring-red-100
                    disabled:bg-gray-50
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

              {/* ================================================= */}
              {/* STOCK INFORMATION */}
              {/* ================================================= */}

              {isEditMode && material && (
                <div
                  className="
                    md:col-span-2
                    rounded-2xl
                    border
                    border-gray-100
                    bg-gray-50
                    p-4
                  "
                >
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Stock Information
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      These values are calculated by the
                      system and are not manually edited here.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* AVAILABLE */}

                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Available
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {material.availableQuantity ??
                          Math.max(
                            0,
                            (material.quantity ?? 0) -
                              (material.reservedQuantity ??
                                0)
                          )}{" "}
                        <span className="text-xs font-medium text-gray-400">
                          {material.unit}
                        </span>
                      </p>
                    </div>

                    {/* RESERVED */}

                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Reserved
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {material.reservedQuantity ??
                          0}{" "}
                        <span className="text-xs font-medium text-gray-400">
                          {material.unit}
                        </span>
                      </p>
                    </div>

                    {/* TOTAL */}

                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Total Stock
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {material.quantity ?? 0}{" "}
                        <span className="text-xs font-medium text-gray-400">
                          {material.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <div
            className="
              flex
              justify-end
              gap-3
              border-t
              border-gray-100
              bg-gray-50/50
              px-6
              py-5
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
                bg-white
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
              disabled={
                loading ||
                suppliersLoading
              }
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
                shadow-sm
                transition
                hover:bg-red-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Saving..."
                : isEditMode
                  ? "Update Material"
                  : "Add Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RawMaterialModal;