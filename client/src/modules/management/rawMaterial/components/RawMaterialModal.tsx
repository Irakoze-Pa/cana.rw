import {
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { RawMaterial } from "../types/rawMaterial.types";

import {
  createRawMaterial,
  updateRawMaterial,
} from "../services/rawMaterialService";

interface RawMaterialModalProps {
  isOpen: boolean;
  material?: RawMaterial | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  category: string;
  unit: string;
  quantity: string;
  minimumStock: string;
  status: "Active" | "Inactive";
}

const initialForm: FormData = {
  name: "",
  category: "",
  unit: "kg",
  quantity: "0",
  minimumStock: "0",
  status: "Active",
};

function RawMaterialModal({
  isOpen,
  material,
  onClose,
  onSuccess,
}: RawMaterialModalProps) {
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] =
    useState<FormData>(initialForm);

  const isEditMode = Boolean(material);
  const hasRecordedStock =
    Number(material?.quantity ?? 0) > 0 ||
    Number(material?.reservedQuantity ?? 0) > 0;

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

    if (!formData.unit) {
      return "Please select a unit.";
    }

    const quantity = Number(
      formData.quantity || 0
    );

    const minimumStock = Number(
      formData.minimumStock || 0
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

      // Codes are generated once and kept stable for lots, supplier offers,
      // formulas and inventory traceability.
      const code = material?.code;

      const quantity = Number(
        formData.quantity || 0
      );

      const minimumStock = Number(
        formData.minimumStock || 0
      );

      const payload = {
        name: formData.name.trim(),

        ...(code ? { code } : {}),

        category:
          formData.category.trim(),

        unit: formData.unit,

        ...(!isEditMode ? { quantity } : {}),

        minimumStock,

        // Price is set when a supplier offer is selected or a goods-received
        // note is posted. A material master does not own supplier pricing.
        ...(!isEditMode ? { costPerUnit: 0 } : {}),

        status:
          formData.status,
      };

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
                ? "Update master data and planning levels. Stock and lots remain controlled by Inventory."
                : "Create the material master. Supplier pricing is recorded separately when materials are sourced or received."}
            </p>
            {isEditMode && material?.code && (
              <p className="mt-2 inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                Material code: {material.code}
              </p>
            )}
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

                  <option value="Other">
                    Other
                  </option>
                </select>
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
                  Base Unit
                </label>

                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  disabled={loading || hasRecordedStock}
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
                  Opening Quantity
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
                  disabled={loading || isEditMode}
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

                    <Link to="/management/inventory" className="mt-2 inline-flex text-xs font-semibold text-red-600 hover:text-red-700">
                      Open Raw-material Store →
                    </Link>
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
