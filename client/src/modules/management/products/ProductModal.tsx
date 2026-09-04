import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  X,
} from "lucide-react";

import type { Product } from "./product.types";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

interface ProductModalProps {
  isOpen: boolean;
  product?: Product | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProductFormData {
  code: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  packSizeKg: string;
  densityKgPerL: string;
  unit: string;
  description: string;
  status: "Active" | "Inactive";
}

const emptyForm: ProductFormData = {
  code: "",
  name: "",
  category: "",
  price: "",
  stock: "0",
  packSizeKg: "",
  densityKgPerL: "",
  unit: "",
  description: "",
  status: "Active",
};

function ProductModal({
  isOpen,
  product,
  onClose,
  onSuccess,
}: ProductModalProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] =
    useState<ProductFormData>(emptyForm);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const isEditMode = Boolean(product);

  // =========================
  // LOAD PRODUCT
  // =========================

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setFormData({
        code: product.code || "",
        name: product.name || "",
        category: product.category || "",
        price: String(product.price ?? ""),
        stock: String(product.stock ?? "0"),
        packSizeKg: String(product.packSizeKg ?? ""),
        densityKgPerL: String(product.densityKgPerL ?? ""),
        unit: product.unit || "",
        description: product.description || "",
        status:
          product.status === "Inactive"
            ? "Inactive"
            : "Active",
      });

      setImagePreview(
        product.image || null
      );
    } else {
      setFormData({
        ...emptyForm,
      });

      setImagePreview(null);
    }

    setImageFile(null);
    setError("");
  }, [isOpen, product]);

  // =========================
  // CLEANUP OBJECT URL
  // =========================

  useEffect(() => {
    return () => {
      if (
        imagePreview?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  // =========================
  // INPUT CHANGE
  // =========================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const { name, value } =
      e.target;

    setFormData((prev) => {
      const isWallMaster = (name === "category" ? value === "Wall Master" : prev.category === "Wall Master") || /wall\s*master/i.test(name === "name" ? value : prev.name);
      if (name === "category" || name === "name") {
        return {
          ...prev,
          [name]: value,
          unit: isWallMaster ? "30kg" : prev.unit === "30kg" ? "4L" : prev.unit,
          packSizeKg: isWallMaster ? "30" : prev.packSizeKg,
          densityKgPerL: isWallMaster ? "" : prev.densityKgPerL,
        };
      }

      return { ...prev, [name]: value };
    });

    setError("");
  };

  const isWallMasterProduct = formData.category === "Wall Master" || /wall\s*master/i.test(formData.name);

  // =========================
  // IMAGE CHANGE
  // =========================

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be less than 5MB."
      );
      return;
    }

    if (
      imagePreview?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setImageFile(file);

    setImagePreview(
      URL.createObjectURL(file)
    );

    setError("");
  };

  // =========================
  // REMOVE IMAGE
  // =========================

  const removeImage = () => {
    if (
      imagePreview?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setImageFile(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================
  // VALIDATION
  // =========================

  const validateForm = () => {
    if (!formData.code.trim()) {
      return "Product code is required.";
    }

    if (!formData.name.trim()) {
      return "Product name is required.";
    }

    if (!formData.category) {
      return "Please select a category.";
    }

    if (
      !formData.price ||
      Number(formData.price) <= 0
    ) {
      return "Please enter a valid price.";
    }

    if (
      formData.stock === "" ||
      Number(formData.stock) < 0
    ) {
      return "Please enter a valid stock quantity.";
    }

    if (
      formData.category !== "Wall Master" &&
      (!formData.densityKgPerL || Number(formData.densityKgPerL) <= 0)
    ) {
      return "Enter the paint density in kg/L to calculate pack weight.";
    }

    if (!formData.unit) {
      return "Please select a unit.";
    }

    return "";
  };

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = new FormData();

      data.append(
        "code",
        formData.code
          .trim()
          .toUpperCase()
      );

      data.append(
        "name",
        formData.name.trim()
      );

      data.append(
        "category",
        formData.category
      );

      data.append(
        "price",
        formData.price
      );

      data.append(
        "stock",
        formData.stock
      );

      data.append(
        "packSizeKg",
        formData.packSizeKg,
      );

      if (formData.densityKgPerL) {
        data.append(
          "densityKgPerL",
          formData.densityKgPerL,
        );
      }

      data.append(
        "unit",
        formData.unit
      );

      data.append(
        "description",
        formData.description.trim()
      );

      data.append(
        "status",
        formData.status
      );

      if (imageFile) {
        data.append(
          "image",
          imageFile
        );
      }

      const url = isEditMode
        ? `${API_URL}/products/${product?._id}`
        : `${API_URL}/products`;

      const method = isEditMode
        ? "PUT"
        : "POST";

      const response =
        await fetch(url, {
          method,
          body: data,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

      let result: any = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to ${
              isEditMode
                ? "update"
                : "create"
            } product.`
        );
      }

      console.log(
        isEditMode
          ? "Product updated:"
          : "Product created:",
        result.data
      );

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(
        "Product submit error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // CLOSE
  // =========================

  const handleClose = () => {
    if (loading) return;

    setError("");
    onClose();
  };

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
        backdrop-blur-sm
      "
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-2xl
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}

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
                ? "Edit Product"
                : "Add Product"}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              {isEditMode
                ? "Update product information."
                : "Add a new product to your catalogue."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="
              rounded-xl
              p-2
              text-gray-400
              transition
              hover:bg-gray-100
              hover:text-gray-900
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="
            max-h-[80vh]
            overflow-y-auto
            px-6
            py-5
          "
        >
          {/* ERROR */}

          {error && (
            <div
              className="
                mb-5
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
              {error}
            </div>
          )}

          {/* IMAGE */}

          <div className="mb-6">
            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
              "
            >
              Product Image
            </label>

            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div
                  className="
                    relative
                    h-24
                    w-24
                    overflow-hidden
                    rounded-xl
                    border
                    border-gray-200
                  "
                >
                  <img
                    src={imagePreview}
                    alt={
                      formData.name ||
                      "Product"
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={loading}
                    className="
                      absolute
                      right-1
                      top-1
                      rounded-full
                      bg-black/70
                      p-1
                      text-white
                      hover:bg-black
                    "
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={loading}
                  className="
                    flex
                    h-24
                    w-24
                    flex-col
                    items-center
                    justify-center
                    rounded-xl
                    border-2
                    border-dashed
                    border-gray-300
                    bg-gray-50
                    text-gray-400
                    transition
                    hover:border-gray-900
                    hover:text-gray-900
                  "
                >
                  <ImagePlus size={22} />

                  <span className="mt-1 text-xs">
                    Upload
                  </span>
                </button>
              )}

              <div>
                <p
                  className="
                    text-sm
                    font-medium
                    text-gray-700
                  "
                >
                  Product photo
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-gray-500
                  "
                >
                  PNG, JPG or WEBP · Max 5MB
                </p>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={loading}
                    className="
                      mt-2
                      text-sm
                      font-medium
                      underline
                      hover:text-black
                    "
                  >
                    Change image
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* CODE + NAME */}

          <div
            className="
              mb-5
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
            <div>
              <label
                htmlFor="code"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                Product Code
              </label>

              <input
                id="code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleChange}
                disabled={loading}
                placeholder="CANA-001"
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  px-4
                  py-3
                  text-sm
                  uppercase
                  outline-none
                  transition
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-100
                  disabled:bg-gray-50
                "
              />

              <p className="mt-1.5 text-xs text-gray-400">
                Must be unique
              </p>
            </div>

            <div>
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
                Product Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                placeholder="CANA Premium Matt"
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  px-4
                  py-3
                  text-sm
                  outline-none
                  transition
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-100
                  disabled:bg-gray-50
                "
              />
            </div>
          </div>

          {/* CATEGORY + UNIT */}

          <div
            className="
              mb-5
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
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
                  outline-none
                  transition
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-100
                "
              >
                <option value="">
                  Select category
                </option>

                <option value="Interior">
                  Interior Paint
                </option>

                <option value="Exterior">
                  Exterior Paint
                </option>

                <option value="Primer">
                  Primer
                </option>

                <option value="Undercoat">
                  Undercoat
                </option>

                <option value="Wall Master">
                  Wall Master / Putty
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

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
                Sales pack size
              </label>

              <select
                id="unit"
                name="unit"
                value={formData.unit}
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
                  outline-none
                  transition
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-100
                "
              >
                <option value="">
                  Select unit
                </option>

                {isWallMasterProduct ? (
                  <option value="30kg">30 kg bag</option>
                ) : (
                  <>
                    <option value="4L">4 L bucket</option>
                    <option value="20L">20 L bucket</option>
                  </>
                )}
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Customer-facing pack label only. Production and stock are always measured in kilograms.
              </p>
            </div>

            <div>
              <label
                htmlFor="densityKgPerL"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                {isWallMasterProduct
                  ? "Net weight per bag"
                  : "Paint density (kg/L)"}
              </label>

              <input
                id={isWallMasterProduct ? "packSizeKg" : "densityKgPerL"}
                name={isWallMasterProduct ? "packSizeKg" : "densityKgPerL"}
                type="number"
                min="0.001"
                step="0.001"
                value={isWallMasterProduct ? "30" : formData.densityKgPerL}
                onChange={handleChange}
                disabled={loading || isWallMasterProduct}
                placeholder="Example: 1.35"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                {isWallMasterProduct
                  ? "Wall Master is fixed at 30 kg per bag."
                  : "The system multiplies this by the selected 4 L or 20 L pack to obtain net kg and price per kg."}
              </p>
            </div>
          </div>

          {/* PRICE + STOCK */}

          <div
            className="
              mb-5
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
            <div>
              <label
                htmlFor="price"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                Selling price per pack
              </label>

              <div className="relative">
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="32000"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    px-4
                    py-3
                    pr-14
                    text-sm
                    outline-none
                    transition
                    focus:border-gray-900
                    focus:ring-2
                    focus:ring-gray-100
                  "
                />

                <span
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-xs
                    font-medium
                    text-gray-400
                  "
                >
                  RWF
                </span>
              </div>

              {(isWallMasterProduct || Number(formData.densityKgPerL) > 0) &&
                Number(formData.price) >= 0 && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Calculated price: {Math.round((Number(formData.price) / (isWallMasterProduct ? 30 : Number(formData.unit.replace("L", "")) * Number(formData.densityKgPerL))) * 100) / 100} RWF per kg
                  </p>
                )}
            </div>

            <div>
              <label
                htmlFor="stock"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                Finished-goods opening balance
              </label>

              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={handleChange}
                disabled={loading}
                placeholder="120"
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  px-4
                  py-3
                  text-sm
                  outline-none
                  transition
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-100
                "
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Use this only for an initial physical count. Completed production batches increase finished-goods stock, and delivered sales orders reduce it.
              </p>
            </div>
          </div>

          {/* DESCRIPTION */}

          <div className="mb-5">
            <label
              htmlFor="description"
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
              "
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              placeholder="Describe this product..."
              className="
                w-full
                resize-none
                rounded-xl
                border
                border-gray-200
                px-4
                py-3
                text-sm
                outline-none
                transition
                focus:border-gray-900
                focus:ring-2
                focus:ring-gray-100
              "
            />
          </div>

          {/* STATUS */}

          <div className="mb-6">
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
                outline-none
                transition
                focus:border-gray-900
                focus:ring-2
                focus:ring-gray-100
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

          {/* FOOTER */}

          <div
            className="
              flex
              justify-end
              gap-3
              border-t
              border-gray-100
              pt-5
            "
          >
            <button
              type="button"
              onClick={handleClose}
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
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="
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
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Adding..."
                : isEditMode
                ? "Update Product"
                : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductModal;
