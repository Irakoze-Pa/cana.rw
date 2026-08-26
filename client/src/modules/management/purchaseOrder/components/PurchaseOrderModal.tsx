import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  X,
  Plus,
  Trash2,
  PackageOpen,
  CalendarDays,
  Truck,
  FileText,
  Loader2,
} from "lucide-react";

// =====================================================
// API
// =====================================================

const API_URL = "http://localhost:5050/api";

// =====================================================
// TYPES
// =====================================================

interface Supplier {
  _id: string;
  name: string;
  code: string;
  status?: "Active" | "Inactive";
}

interface RawMaterialSupplier {
  _id: string;
  name: string;
  code: string;
}

interface RawMaterial {
  _id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock?: number;
  costPerUnit: number;
  supplier:
    | string
    | RawMaterialSupplier
    | null
    | undefined;
  status?: "Active" | "Inactive";
}

interface PurchaseOrderItemForm {
  rawMaterial: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderFormData {
  supplier: string;
  orderDate: string;
  expectedDeliveryDate?: string;

  items: PurchaseOrderItemForm[];

  subtotal: number;
  tax: number;
  total: number;

  notes?: string;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: PurchaseOrderFormData
  ) => Promise<void> | void;
}

// =====================================================
// EMPTY ITEM
// =====================================================

const createEmptyItem = (): PurchaseOrderItemForm => ({
  rawMaterial: "",
  quantity: 1,
  unit: "",
  unitPrice: 0,
  total: 0,
});

// =====================================================
// COMPONENT
// =====================================================

function PurchaseOrderModal({
  isOpen,
  onClose,
  onSubmit,
}: PurchaseOrderModalProps) {
  // ===================================================
  // STATE
  // ===================================================

  const [suppliers, setSuppliers] = useState<Supplier[]>(
    []
  );

  const [rawMaterials, setRawMaterials] = useState<
    RawMaterial[]
  >([]);

  const [supplier, setSupplier] = useState("");

  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [expectedDeliveryDate, setExpectedDeliveryDate] =
    useState("");

  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<
    PurchaseOrderItemForm[]
  >([createEmptyItem()]);

  const [tax, setTax] = useState(0);

  const [loadingSuppliers, setLoadingSuppliers] =
    useState(false);

  const [loadingRawMaterials, setLoadingRawMaterials] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // ===================================================
  // FETCH SUPPLIERS
  // ===================================================

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);

      const response = await fetch(
        `${API_URL}/suppliers`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load suppliers. Status: ${response.status}`
        );
      }

      const result = await response.json();

      const supplierData = Array.isArray(result?.data)
        ? result.data
        : [];

      setSuppliers(supplierData);
    } catch (error) {
      console.error(
        "Fetch Suppliers Error:",
        error
      );

      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // ===================================================
  // FETCH RAW MATERIALS
  // ===================================================

  const fetchRawMaterials = async () => {
    try {
      setLoadingRawMaterials(true);

      const response = await fetch(
        `${API_URL}/raw-materials`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load raw materials. Status: ${response.status}`
        );
      }

      const result = await response.json();

      const materialData = Array.isArray(result?.data)
        ? result.data
        : [];

      setRawMaterials(materialData);
    } catch (error) {
      console.error(
        "Fetch Raw Materials Error:",
        error
      );

      setRawMaterials([]);
    } finally {
      setLoadingRawMaterials(false);
    }
  };

  // ===================================================
  // LOAD DATA WHEN MODAL OPENS
  // ===================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetchSuppliers();
    fetchRawMaterials();
  }, [isOpen]);

  // ===================================================
  // GET SUPPLIER ID FROM RAW MATERIAL
  // ===================================================

  const getRawMaterialSupplierId = (
    material: RawMaterial
  ): string => {
    if (!material.supplier) {
      return "";
    }

    if (typeof material.supplier === "string") {
      return material.supplier;
    }

    return material.supplier._id;
  };

  // ===================================================
  // AVAILABLE RAW MATERIALS
  // ===================================================

  const availableRawMaterials = useMemo(() => {
    if (!supplier) {
      return [];
    }

    return rawMaterials.filter((material) => {
      if (material.status === "Inactive") {
        return false;
      }

      const materialSupplierId =
        getRawMaterialSupplierId(material);

      return materialSupplierId === supplier;
    });
  }, [rawMaterials, supplier]);

  // ===================================================
  // SUBTOTAL
  // ===================================================

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.total || 0),
      0
    );
  }, [items]);

  // ===================================================
  // GRAND TOTAL
  // ===================================================

  const grandTotal = useMemo(() => {
    return subtotal + Number(tax || 0);
  }, [subtotal, tax]);

  // ===================================================
  // ADD ITEM
  // ===================================================

  const addItem = () => {
    if (!supplier) {
      return;
    }

    setItems((previousItems) => [
      ...previousItems,
      createEmptyItem(),
    ]);
  };

  // ===================================================
  // REMOVE ITEM
  // ===================================================

  const removeItem = (index: number) => {
    setItems((previousItems) => {
      if (previousItems.length === 1) {
        return previousItems;
      }

      return previousItems.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  // ===================================================
  // SELECT RAW MATERIAL
  // ===================================================

  const handleRawMaterialChange = (
    index: number,
    rawMaterialId: string
  ) => {
    const selectedMaterial =
      availableRawMaterials.find(
        (material) =>
          material._id === rawMaterialId
      );

    setItems((previousItems) =>
      previousItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (!selectedMaterial) {
          return {
            ...item,
            rawMaterial: "",
            unit: "",
            unitPrice: 0,
            total: 0,
          };
        }

        const quantity =
          Number(item.quantity) > 0
            ? Number(item.quantity)
            : 1;

        const unitPrice = Number(
          selectedMaterial.costPerUnit || 0
        );

        return {
          ...item,
          rawMaterial: selectedMaterial._id,
          unit: selectedMaterial.unit,
          unitPrice,
          total: quantity * unitPrice,
        };
      })
    );
  };

  // ===================================================
  // UPDATE QUANTITY
  // ===================================================

  const handleQuantityChange = (
    index: number,
    value: number
  ) => {
    const quantity = Math.max(
      0,
      Number(value || 0)
    );

    setItems((previousItems) =>
      previousItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          quantity,
          total:
            quantity *
            Number(item.unitPrice || 0),
        };
      })
    );
  };

  // ===================================================
  // UPDATE UNIT PRICE
  // ===================================================

  const handleUnitPriceChange = (
    index: number,
    value: number
  ) => {
    const unitPrice = Math.max(
      0,
      Number(value || 0)
    );

    setItems((previousItems) =>
      previousItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          unitPrice,
          total:
            Number(item.quantity || 0) *
            unitPrice,
        };
      })
    );
  };

  // ===================================================
  // SUPPLIER CHANGE
  // ===================================================

  const handleSupplierChange = (
    value: string
  ) => {
    setSupplier(value);

    // Important:
    // When supplier changes, remove previously
    // selected raw materials.
    setItems([createEmptyItem()]);
  };

  // ===================================================
  // RESET FORM
  // ===================================================

  const resetForm = () => {
    setSupplier("");

    setOrderDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setExpectedDeliveryDate("");

    setNotes("");

    setTax(0);

    setItems([createEmptyItem()]);
  };

  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    // -------------------------------------------------
    // SUPPLIER VALIDATION
    // -------------------------------------------------

    if (!supplier) {
      alert("Please select a supplier.");
      return;
    }

    // -------------------------------------------------
    // ITEM VALIDATION
    // -------------------------------------------------

    if (items.length === 0) {
      alert(
        "Please add at least one raw material."
      );
      return;
    }

    const invalidItem = items.some(
      (item) =>
        !item.rawMaterial ||
        Number(item.quantity) <= 0 ||
        Number(item.unitPrice) < 0
    );

    if (invalidItem) {
      alert(
        "Please select a raw material and enter a valid quantity and price."
      );
      return;
    }

    // -------------------------------------------------
    // DUPLICATE MATERIAL VALIDATION
    // -------------------------------------------------

    const materialIds = items.map(
      (item) => item.rawMaterial
    );

    const hasDuplicates =
      new Set(materialIds).size !==
      materialIds.length;

    if (hasDuplicates) {
      alert(
        "You cannot add the same raw material more than once."
      );
      return;
    }

    // -------------------------------------------------
    // CHECK MATERIALS BELONG TO SELECTED SUPPLIER
    // -------------------------------------------------

    const invalidSupplierMaterial =
      items.some((item) => {
        const material =
          rawMaterials.find(
            (material) =>
              material._id ===
              item.rawMaterial
          );

        if (!material) {
          return true;
        }

        return (
          getRawMaterialSupplierId(
            material
          ) !== supplier
        );
      });

    if (invalidSupplierMaterial) {
      alert(
        "One or more raw materials do not belong to the selected supplier."
      );
      return;
    }

    // -------------------------------------------------
    // FORM DATA
    // -------------------------------------------------

    const formData: PurchaseOrderFormData = {
      supplier,

      orderDate,

      expectedDeliveryDate:
        expectedDeliveryDate || undefined,

      items: items.map((item) => ({
        rawMaterial: item.rawMaterial,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),

      subtotal: Number(subtotal),

      tax: Number(tax),

      total: Number(grandTotal),

      notes:
        notes.trim() || undefined,
    };

    // -------------------------------------------------
    // CREATE PURCHASE ORDER
    // -------------------------------------------------

    try {
      setIsSubmitting(true);

      await onSubmit(formData);

      resetForm();

      onClose();
    } catch (error) {
      console.error(
        "Create Purchase Order Error:",
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================================================
  // CLOSE
  // ===================================================

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  // ===================================================
  // FORMAT CURRENCY
  // ===================================================

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      "en-RW",
      {
        style: "currency",
        currency: "RWF",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  // ===================================================
  // CHECK IF MATERIAL ALREADY SELECTED
  // ===================================================

  const isMaterialAlreadySelected = (
    materialId: string,
    currentIndex: number
  ) => {
    return items.some(
      (item, index) =>
        index !== currentIndex &&
        item.rawMaterial === materialId
    );
  };

  // ===================================================
  // DO NOT RENDER
  // ===================================================

  if (!isOpen) {
    return null;
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/40
        p-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-6xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            px-6
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-600
              "
            >
              <PackageOpen size={20} />
            </div>

            <div>
              <h2
                className="
                  text-lg
                  font-bold
                  tracking-tight
                  text-gray-900
                "
              >
                Create Purchase Order
              </h2>

              <p className="text-xs text-gray-500">
                Purchase raw materials from a supplier
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-gray-900
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="
            flex
            min-h-0
            flex-1
            flex-col
          "
        >
          {/* =================================================
              CONTENT
          ================================================= */}

          <div
            className="
              flex-1
              overflow-y-auto
              px-6
              py-6
            "
          >
            {/* =================================================
                BASIC INFORMATION
            ================================================= */}

            <div
              className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-3
              "
            >
              {/* SUPPLIER */}

              <div>
                <label
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

                <div className="relative">
                  <Truck
                    size={17}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    "
                  />

                  <select
                    value={supplier}
                    onChange={(event) =>
                      handleSupplierChange(
                        event.target.value
                      )
                    }
                    disabled={
                      loadingSuppliers ||
                      isSubmitting
                    }
                    className="
                      h-11
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      pl-10
                      pr-3
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
                      {loadingSuppliers
                        ? "Loading suppliers..."
                        : "Select supplier"}
                    </option>

                    {suppliers
                      .filter(
                        (item) =>
                          item.status !==
                          "Inactive"
                      )
                      .map((item) => (
                        <option
                          key={item._id}
                          value={item._id}
                        >
                          {item.name} ({item.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* ORDER DATE */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Order Date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    "
                  />

                  <input
                    type="date"
                    value={orderDate}
                    onChange={(event) =>
                      setOrderDate(
                        event.target.value
                      )
                    }
                    disabled={isSubmitting}
                    className="
                      h-11
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      pl-10
                      pr-3
                      text-sm
                      text-gray-900
                      outline-none
                      focus:border-red-500
                      focus:ring-2
                      focus:ring-red-100
                    "
                  />
                </div>
              </div>

              {/* EXPECTED DELIVERY */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Expected Delivery
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-gray-400
                    "
                  />

                  <input
                    type="date"
                    value={
                      expectedDeliveryDate
                    }
                    onChange={(event) =>
                      setExpectedDeliveryDate(
                        event.target.value
                      )
                    }
                    disabled={isSubmitting}
                    className="
                      h-11
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      pl-10
                      pr-3
                      text-sm
                      text-gray-900
                      outline-none
                      focus:border-red-500
                      focus:ring-2
                      focus:ring-red-100
                    "
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                MATERIALS HEADER
            ================================================= */}

            <div
              className="
                mt-8
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <h3
                  className="
                    text-sm
                    font-bold
                    text-gray-900
                  "
                >
                  Raw Materials
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">
                  Select materials from the database
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={
                  !supplier ||
                  isSubmitting ||
                  availableRawMaterials.length === 0
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-gray-700
                  transition
                  hover:border-red-200
                  hover:bg-red-50
                  hover:text-red-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Plus size={17} />
                Add Material
              </button>
            </div>

            {/* =================================================
                NO SUPPLIER
            ================================================= */}

            {!supplier && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-dashed
                  border-gray-300
                  bg-gray-50
                  p-6
                  text-center
                "
              >
                <Truck
                  size={24}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-2 text-sm font-medium text-gray-700">
                  Select a supplier first
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Available raw materials will appear after
                  selecting a supplier.
                </p>
              </div>
            )}

            {/* =================================================
                LOADING MATERIALS
            ================================================= */}

            {supplier &&
              loadingRawMaterials && (
                <div
                  className="
                    mt-4
                    flex
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    p-8
                  "
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Loading raw materials...
                  </div>
                </div>
              )}

            {/* =================================================
                NO MATERIALS
            ================================================= */}

            {supplier &&
              !loadingRawMaterials &&
              availableRawMaterials.length ===
                0 && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-dashed
                    border-gray-300
                    bg-gray-50
                    p-6
                    text-center
                  "
                >
                  <PackageOpen
                    size={24}
                    className="mx-auto text-gray-400"
                  />

                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No raw materials found
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    This supplier does not have active raw
                    materials assigned to it.
                  </p>
                </div>
              )}

            {/* =================================================
                ITEMS TABLE
            ================================================= */}

            {supplier &&
              !loadingRawMaterials &&
              availableRawMaterials.length > 0 && (
                <div
                  className="
                    mt-4
                    overflow-hidden
                    rounded-xl
                    border
                    border-gray-200
                  "
                >
                  {/* TABLE HEADER */}

                  <div
                    className="
                      hidden
                      grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_44px]
                      gap-3
                      bg-gray-50
                      px-4
                      py-3
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-500
                      md:grid
                    "
                  >
                    <span>Raw Material</span>
                    <span>Quantity</span>
                    <span>Unit</span>
                    <span>Unit Price</span>
                    <span>Total</span>
                    <span />
                  </div>

                  {/* ITEMS */}

                  <div className="divide-y divide-gray-100">
                    {items.map(
                      (item, index) => (
                        <div
                          key={`po-item-${index}`}
                          className="
                            grid
                            grid-cols-1
                            gap-3
                            px-4
                            py-4
                            md:grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_44px]
                            md:items-center
                          "
                        >
                          {/* MATERIAL */}

                          <div>
                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-gray-500
                                md:hidden
                              "
                            >
                              Raw Material
                            </label>

                            <select
                              value={
                                item.rawMaterial
                              }
                              onChange={(event) =>
                                handleRawMaterialChange(
                                  index,
                                  event.target.value
                                )
                              }
                              disabled={
                                loadingRawMaterials ||
                                isSubmitting
                              }
                              className="
                                h-10
                                w-full
                                rounded-lg
                                border
                                border-gray-200
                                bg-white
                                px-3
                                text-sm
                                text-gray-900
                                outline-none
                                focus:border-red-500
                                focus:ring-2
                                focus:ring-red-100
                                disabled:bg-gray-50
                              "
                            >
                              <option value="">
                                Select raw material
                              </option>

                              {availableRawMaterials.map(
                                (material) => {
                                  const alreadySelected =
                                    isMaterialAlreadySelected(
                                      material._id,
                                      index
                                    );

                                  return (
                                    <option
                                      key={
                                        material._id
                                      }
                                      value={
                                        material._id
                                      }
                                      disabled={
                                        alreadySelected
                                      }
                                    >
                                      {material.name} (
                                      {
                                        material.code
                                      }
                                      )
                                      {alreadySelected
                                        ? " - Already selected"
                                        : ""}
                                    </option>
                                  );
                                }
                              )}
                            </select>
                          </div>

                          {/* QUANTITY */}

                          <div>
                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-gray-500
                                md:hidden
                              "
                            >
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={
                                item.quantity
                              }
                              onChange={(event) =>
                                handleQuantityChange(
                                  index,
                                  Number(
                                    event.target.value
                                  )
                                )
                              }
                              disabled={
                                isSubmitting
                              }
                              className="
                                h-10
                                w-full
                                rounded-lg
                                border
                                border-gray-200
                                px-3
                                text-sm
                                outline-none
                                focus:border-red-500
                                focus:ring-2
                                focus:ring-red-100
                              "
                            />
                          </div>

                          {/* UNIT */}

                          <div>
                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-gray-500
                                md:hidden
                              "
                            >
                              Unit
                            </label>

                            <div
                              className="
                                flex
                                h-10
                                items-center
                                rounded-lg
                                bg-gray-50
                                px-3
                                text-sm
                                font-medium
                                text-gray-700
                              "
                            >
                              {item.unit || "-"}
                            </div>
                          </div>

                          {/* UNIT PRICE */}

                          <div>
                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-gray-500
                                md:hidden
                              "
                            >
                              Unit Price
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitPrice
                              }
                              onChange={(event) =>
                                handleUnitPriceChange(
                                  index,
                                  Number(
                                    event.target.value
                                  )
                                )
                              }
                              disabled={
                                isSubmitting
                              }
                              className="
                                h-10
                                w-full
                                rounded-lg
                                border
                                border-gray-200
                                px-3
                                text-sm
                                outline-none
                                focus:border-red-500
                                focus:ring-2
                                focus:ring-red-100
                              "
                            />
                          </div>

                          {/* TOTAL */}

                          <div>
                            <label
                              className="
                                mb-1.5
                                block
                                text-xs
                                font-medium
                                text-gray-500
                                md:hidden
                              "
                            >
                              Total
                            </label>

                            <div
                              className="
                                flex
                                h-10
                                items-center
                                rounded-lg
                                bg-gray-50
                                px-3
                                text-sm
                                font-semibold
                                text-gray-900
                              "
                            >
                              {formatCurrency(
                                Number(
                                  item.total || 0
                                )
                              )}
                            </div>
                          </div>

                          {/* DELETE */}

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(index)
                              }
                              disabled={
                                items.length ===
                                  1 ||
                                isSubmitting
                              }
                              title="Remove item"
                              className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-lg
                                text-gray-400
                                transition
                                hover:bg-red-50
                                hover:text-red-600
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* =================================================
                NOTES + TOTAL
            ================================================= */}

            <div
              className="
                mt-6
                grid
                grid-cols-1
                gap-6
                md:grid-cols-2
              "
            >
              {/* NOTES */}

              <div>
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Notes
                </label>

                <div className="relative">
                  <FileText
                    size={17}
                    className="
                      absolute
                      left-3
                      top-3
                      text-gray-400
                    "
                  />

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    placeholder="Additional notes..."
                    rows={4}
                    disabled={isSubmitting}
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-gray-200
                      px-10
                      py-2.5
                      text-sm
                      outline-none
                      focus:border-red-500
                      focus:ring-2
                      focus:ring-red-100
                    "
                  />
                </div>
              </div>

              {/* TOTAL */}

              <div className="flex items-end justify-end">
                <div
                  className="
                    w-full
                    max-w-sm
                    rounded-xl
                    bg-gray-50
                    p-5
                  "
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Total Items
                    </span>

                    <span className="text-sm font-semibold text-gray-900">
                      {items.length}
                    </span>
                  </div>

                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                      border-t
                      border-gray-200
                      pt-3
                    "
                  >
                    <span className="text-sm font-medium text-gray-600">
                      Subtotal
                    </span>

                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(
                        subtotal
                      )}
                    </span>
                  </div>

                  {/* TAX */}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Tax
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onChange={(event) =>
                        setTax(
                          Math.max(
                            0,
                            Number(
                              event.target.value ||
                                0
                            )
                          )
                        )
                      }
                      disabled={isSubmitting}
                      className="
                        h-9
                        w-32
                        rounded-lg
                        border
                        border-gray-200
                        bg-white
                        px-3
                        text-right
                        text-sm
                        outline-none
                        focus:border-red-500
                        focus:ring-2
                        focus:ring-red-100
                      "
                    />
                  </div>

                  {/* GRAND TOTAL */}

                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-between
                      border-t
                      border-gray-200
                      pt-3
                    "
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      Grand Total
                    </span>

                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(
                        grandTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              justify-end
              gap-3
              border-t
              border-gray-200
              bg-gray-50
              px-6
              py-4
            "
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="
                rounded-xl
                border
                border-gray-200
                bg-white
                px-5
                py-2.5
                text-sm
                font-semibold
                text-gray-700
                transition
                hover:bg-gray-100
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !supplier ||
                items.length === 0
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-red-600
                px-5
                py-2.5
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
              {isSubmitting && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {isSubmitting
                ? "Creating..."
                : "Create Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PurchaseOrderModal;