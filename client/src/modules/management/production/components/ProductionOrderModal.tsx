import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";

import type {
  ProductionOrder,
  ProductionOrderPriority,
  ProductionOrderStatus,
  CreateProductionOrderData,
  UpdateProductionOrderData,
} from "../types/productionOrder.types";

interface ProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;

  onCreate: (
    data: CreateProductionOrderData
  ) => Promise<void>;

  onUpdate: (
    data: UpdateProductionOrderData
  ) => Promise<void>;

  editingOrder?: ProductionOrder | null;
}

interface ProductOption {
  _id: string;
  name: string;
  code?: string;
  productCode?: string;
  sku?: string;
  unit?: string;
}

interface FormulaOption {
  _id: string;
  name: string;
  code?: string;
  formulaCode?: string;
  version?: number;
  batchSize?: number;
  batchUnit?: string;
  status?: "Active" | "Inactive";
}

function normalizeArray<T>(
  payload: unknown
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as {
      data?: unknown;
      products?: unknown;
      formulas?: unknown;
      items?: unknown;
    };

    if (Array.isArray(data.data)) {
      return data.data as T[];
    }

    if (Array.isArray(data.products)) {
      return data.products as T[];
    }

    if (Array.isArray(data.formulas)) {
      return data.formulas as T[];
    }

    if (Array.isArray(data.items)) {
      return data.items as T[];
    }
  }

  return [];
}

function getReferenceId(
  value:
    | string
    | { _id: string }
    | null
    | undefined
): string {
  if (!value) {
    return "";
  }

  return typeof value === "string"
    ? value
    : value._id;
}

function toInputDate(
  value?: string
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProductionOrderModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingOrder = null,
}: ProductionOrderModalProps) {
  const isEdit = Boolean(editingOrder);

  const [products, setProducts] =
    useState<ProductOption[]>([]);

  const [formulas, setFormulas] =
    useState<FormulaOption[]>([]);

  const [loadingOptions, setLoadingOptions] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [productId, setProductId] =
    useState("");

  const [formulaId, setFormulaId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [priority, setPriority] =
    useState<ProductionOrderPriority>(
      "Normal"
    );

  const [status, setStatus] =
    useState<ProductionOrderStatus>(
      "Draft"
    );

  const [plannedDate, setPlannedDate] =
    useState("");

  const [
    expectedCompletionDate,
    setExpectedCompletionDate,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (item) =>
            item._id === productId
        ) || null,
      [products, productId]
    );

  const selectedFormula =
    useMemo(
      () =>
        formulas.find(
          (item) =>
            item._id === formulaId
        ) || null,
      [formulas, formulaId]
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD OPTIONS                                                             */
  /* ------------------------------------------------------------------------ */

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setError("");

      const [
        productsResponse,
        formulasResponse,
      ] = await Promise.all([
        fetch(
          "http://localhost:5050/api/products"
        ),
        fetch(
          "http://localhost:5050/api/formulas"
        ),
      ]);

      if (!productsResponse.ok) {
        throw new Error(
          "Failed to load products."
        );
      }

      if (!formulasResponse.ok) {
        throw new Error(
          "Failed to load formulas."
        );
      }

      const productsJson =
        await productsResponse.json();

      const formulasJson =
        await formulasResponse.json();

      setProducts(
        normalizeArray<ProductOption>(
          productsJson
        )
      );

      setFormulas(
        normalizeArray<FormulaOption>(
          formulasJson
        )
      );
    } catch (err) {
      console.error(
        "Production Order Options Error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products and formulas."
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* RESET                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError("");

    if (editingOrder) {
      setProductId(
        getReferenceId(
          editingOrder.product
        )
      );

      setFormulaId(
        getReferenceId(
          editingOrder.formula
        )
      );

      setQuantity(
        String(
          editingOrder.quantity ?? ""
        )
      );

      setUnit(
        editingOrder.unit || ""
      );

      setPriority(
        editingOrder.priority ||
          "Normal"
      );

      setStatus(
        editingOrder.status || "Draft"
      );

      setPlannedDate(
        toInputDate(
          editingOrder.plannedDate
        )
      );

      setExpectedCompletionDate(
        toInputDate(
          editingOrder.expectedCompletionDate
        )
      );

      setNotes(
        editingOrder.notes || ""
      );
    } else {
      setProductId("");
      setFormulaId("");
      setQuantity("");
      setUnit("");
      setPriority("Normal");
      setStatus("Draft");
      setPlannedDate("");
      setExpectedCompletionDate("");
      setNotes("");
    }

    void loadOptions();
  }, [isOpen, editingOrder]);

  /* ------------------------------------------------------------------------ */
  /* PRODUCT → UNIT                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      isEdit ||
      !selectedProduct
    ) {
      return;
    }

    /*
     * IMPORTANT:
     * Production Order unit comes from Product.
     */
    setUnit(
      selectedProduct.unit || ""
    );
  }, [
    isEdit,
    selectedProduct,
  ]);

  /* ------------------------------------------------------------------------ */
  /* ESC                                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    onClose,
    submitting,
  ]);

  /* ------------------------------------------------------------------------ */
  /* VALIDATION                                                               */
  /* ------------------------------------------------------------------------ */

  const validate = () => {
    if (!isEdit && !productId) {
      return "Please select a product.";
    }

    if (!isEdit && !formulaId) {
      return "Please select a formula.";
    }

    const numericQuantity =
      Number(quantity);

    if (
      !quantity ||
      Number.isNaN(
        numericQuantity
      ) ||
      numericQuantity <= 0
    ) {
      return "Quantity must be greater than 0.";
    }

    if (!unit.trim()) {
      return "Unit is required.";
    }

    if (
      plannedDate &&
      expectedCompletionDate
    ) {
      if (
        new Date(
          expectedCompletionDate
        ).getTime() <
        new Date(
          plannedDate
        ).getTime()
      ) {
        return "Expected completion date cannot be earlier than planned date.";
      }
    }

    return "";
  };

  /* ------------------------------------------------------------------------ */
  /* SUBMIT                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const numericQuantity =
        Number(quantity);

      if (isEdit) {
        await onUpdate({
          quantity: numericQuantity,
          unit: unit.trim(),
          priority,
          status,
          plannedDate:
            plannedDate || undefined,
          expectedCompletionDate:
            expectedCompletionDate ||
            undefined,
          notes:
            notes.trim() ||
            undefined,
        });
      } else {
        await onCreate({
          product: productId,
          formula: formulaId,
          quantity: numericQuantity,
          unit: unit.trim(),
          priority,
          plannedDate:
            plannedDate || undefined,
          expectedCompletionDate:
            expectedCompletionDate ||
            undefined,
          notes:
            notes.trim() ||
            undefined,
        });
      }

      onClose();
    } catch (err) {
      console.error(
        "Production Order Submit Error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save production order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
            event.target &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit
                ? "Edit Production Order"
                : "New Production Order"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {isEdit
                ? "Update order details."
                : "Create a production order from a product and formula."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="overflow-y-auto px-6 py-6">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              {/* PRODUCT */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Product
                  {!isEdit && (
                    <span className="ml-1 text-red-600">
                      *
                    </span>
                  )}
                </label>

                {isEdit ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {selectedProduct?.name ||
                        editingOrder?.productName ||
                        "—"}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={productId}
                      onChange={(e) =>
                        setProductId(
                          e.target.value
                        )
                      }
                      disabled={
                        loadingOptions ||
                        submitting
                      }
                      className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm outline-none focus:border-red-500"
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map(
                        (product) => (
                          <option
                            key={product._id}
                            value={product._id}
                          >
                            {product.name}
                            {product.code
                              ? ` — ${product.code}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* FORMULA */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Formula
                  {!isEdit && (
                    <span className="ml-1 text-red-600">
                      *
                    </span>
                  )}
                </label>

                {isEdit ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {selectedFormula?.name ||
                        editingOrder?.formulaName ||
                        "—"}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formulaId}
                      onChange={(e) =>
                        setFormulaId(
                          e.target.value
                        )
                      }
                      disabled={
                        loadingOptions ||
                        submitting
                      }
                      className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm outline-none focus:border-red-500"
                    >
                      <option value="">
                        Select formula
                      </option>

                      {formulas
                        .filter(
                          (item) =>
                            item.status !==
                            "Inactive"
                        )
                        .map(
                          (formula) => (
                            <option
                              key={
                                formula._id
                              }
                              value={
                                formula._id
                              }
                            >
                              {formula.name}
                              {formula.code ||
                              formula.formulaCode
                                ? ` — ${
                                    formula.code ||
                                    formula.formulaCode
                                  }`
                                : ""}
                            </option>
                          )
                        )}
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* QUANTITY */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Quantity
                  <span className="ml-1 text-red-600">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value
                    )
                  }
                  disabled={submitting}
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-red-500"
                  placeholder="Enter quantity"
                />
              </div>

              {/* UNIT */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Unit
                  <span className="ml-1 text-red-600">
                    *
                  </span>
                </label>

                <input
                  value={unit}
                  onChange={(e) =>
                    setUnit(
                      e.target.value
                    )
                  }
                  disabled={
                    isEdit || submitting
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-red-500 disabled:bg-gray-50"
                  placeholder="kg, L, pcs..."
                />

                {!isEdit &&
                  selectedProduct?.unit && (
                    <p className="mt-1 text-xs text-gray-500">
                      From product:{" "}
                      {
                        selectedProduct.unit
                      }
                    </p>
                  )}
              </div>

              {/* PRIORITY */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      e.target
                        .value as ProductionOrderPriority
                    )
                  }
                  disabled={submitting}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-500"
                >
                  <option value="Low">
                    Low
                  </option>

                  <option value="Normal">
                    Normal
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Urgent">
                    Urgent
                  </option>
                </select>
              </div>

              {/* STATUS */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target
                        .value as ProductionOrderStatus
                    )
                  }
                  disabled={
                    !isEdit ||
                    submitting
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-red-500 disabled:bg-gray-50"
                >
                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Planned">
                    Planned
                  </option>

                  <option value="Released">
                    Released
                  </option>

                  <option value="In Production">
                    In Production
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>

                  <option value="On Hold">
                    On Hold
                  </option>
                </select>
              </div>

              {/* PLANNED */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Planned Date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) =>
                      setPlannedDate(
                        e.target.value
                      )
                    }
                    disabled={submitting}
                    className="h-12 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* EXPECTED */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Expected Completion
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="date"
                    value={
                      expectedCompletionDate
                    }
                    onChange={(e) =>
                      setExpectedCompletionDate(
                        e.target.value
                      )
                    }
                    disabled={submitting}
                    className="h-12 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {selectedFormula && (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Batch Size
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {
                        selectedFormula.batchSize
                      }{" "}
                      {
                        selectedFormula.batchUnit
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Version
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {selectedFormula.version
                        ? `v${selectedFormula.version}`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Formula Unit
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {
                        selectedFormula.batchUnit
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTES */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold">
                Notes
              </label>

              <textarea
                rows={5}
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                disabled={submitting}
                className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                placeholder="Production notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingOptions
              }
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {isEdit
                ? "Update Order"
                : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}