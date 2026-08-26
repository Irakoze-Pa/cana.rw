import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Copy,
} from "lucide-react";

import type {
  Formula,
  Product,
  RawMaterial,
  CreateFormulaData,
} from "../types/formula.types";

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFormulaData) => Promise<void>;
  editingFormula?: Formula | null;
  createNewVersion?: boolean;
}

interface FormulaItemForm {
  rawMaterial: string;
  quantity: number;
  unit: string;
  wastePercentage: number;
  notes: string;
}

const API_BASE_URL = "http://localhost:5050/api";

export default function FormulaModal({
  isOpen,
  onClose,
  onSubmit,
  editingFormula = null,
  createNewVersion = false,
}: FormulaModalProps) {
  // =====================================================
  // DATA
  // =====================================================

  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // FORM
  // =====================================================

  const [product, setProduct] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [version, setVersion] = useState(1);

  const [batchSize, setBatchSize] = useState(1000);
  const [batchUnit, setBatchUnit] = useState("kg");

  const [items, setItems] = useState<FormulaItemForm[]>([]);

  // =====================================================
  // COSTS
  // =====================================================

  const [laborCost, setLaborCost] = useState(0);
  const [energyCost, setEnergyCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);

  // =====================================================
  // STATUS
  // =====================================================

  const [status, setStatus] =
    useState<"Active" | "Inactive">("Active");

  const [notes, setNotes] = useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = async (): Promise<Product[]> => {
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
      const text = await response.text();

      console.error("Products API Error:", {
        status: response.status,
        statusText: response.statusText,
        response: text,
      });

      throw new Error(
        `Products API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    const data = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    return data;
  };

  // =====================================================
  // LOAD RAW MATERIALS
  // =====================================================

  const loadRawMaterials = async (): Promise<RawMaterial[]> => {
    const response = await fetch(
      `${API_BASE_URL}/raw-materials`
    );

    if (!response.ok) {
      const text = await response.text();

      console.error("Raw Materials API Error:", {
        status: response.status,
        statusText: response.statusText,
        response: text,
      });

      throw new Error(
        `Raw Materials API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    const data = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    return data;
  };

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadingData(true);

        const [productData, materialData] =
          await Promise.all([
            loadProducts(),
            loadRawMaterials(),
          ]);

        if (cancelled) return;

        setProducts(
          Array.isArray(productData)
            ? productData
            : []
        );

        setRawMaterials(
          Array.isArray(materialData)
            ? materialData
            : []
        );
      } catch (error) {
        console.error(
          "Formula Modal Load Error:",
          error
        );

        if (!cancelled) {
          alert(
            error instanceof Error
              ? error.message
              : "Failed to load products and raw materials."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setProduct("");
    setName("");
    setCode("");
    setVersion(1);

    setBatchSize(1000);
    setBatchUnit("kg");

    setItems([]);

    setLaborCost(0);
    setEnergyCost(0);
    setOtherCost(0);

    setStatus("Active");
    setNotes("");
  };

  // =====================================================
  // LOAD EDIT / VERSION DATA
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    if (!editingFormula) {
      resetForm();
      return;
    }

    const formulaProduct =
      typeof editingFormula.product === "string"
        ? editingFormula.product
        : editingFormula.product?._id || "";

    const currentVersion = Number(
      editingFormula.version || 1
    );

    setProduct(formulaProduct);

    setName(
      editingFormula.name || ""
    );

    setCode(
      editingFormula.code || ""
    );

    setVersion(
      createNewVersion
        ? currentVersion + 1
        : currentVersion
    );

    setBatchSize(
      Number(
        editingFormula.batchSize || 1000
      )
    );

    setBatchUnit(
      editingFormula.batchUnit || "kg"
    );

    const formulaItems =
      Array.isArray(editingFormula.items)
        ? editingFormula.items
        : [];

    setItems(
      formulaItems.map((item) => {
        const rawMaterialId =
          typeof item.rawMaterial === "string"
            ? item.rawMaterial
            : item.rawMaterial?._id || "";

        const rawMaterial =
          typeof item.rawMaterial === "object"
            ? item.rawMaterial
            : null;

        return {
          rawMaterial: rawMaterialId,

          quantity: Number(
            item.quantity || 0
          ),

          unit:
            item.unit ||
            rawMaterial?.unit ||
            "kg",

          wastePercentage: Number(
            item.wastePercentage || 0
          ),

          notes: item.notes || "",
        };
      })
    );

    setLaborCost(
      Number(
        editingFormula.laborCost || 0
      )
    );

    setEnergyCost(
      Number(
        editingFormula.energyCost || 0
      )
    );

    setOtherCost(
      Number(
        editingFormula.otherCost || 0
      )
    );

    setStatus(
      createNewVersion
        ? "Active"
        : editingFormula.status || "Active"
    );

    setNotes(
      editingFormula.notes || ""
    );
  }, [
    isOpen,
    editingFormula,
    createNewVersion,
  ]);

  // =====================================================
  // ADD ITEM
  // =====================================================

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        rawMaterial: "",
        quantity: 0,
        unit: batchUnit || "kg",
        wastePercentage: 0,
        notes: "",
      },
    ]);
  };

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeItem = (index: number) => {
    setItems((previous) =>
      previous.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  // =====================================================
  // UPDATE ITEM
  // =====================================================

  const updateItem = (
    index: number,
    field: keyof FormulaItemForm,
    value: string | number
  ) => {
    setItems((previous) =>
      previous.map(
        (item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          return {
            ...item,
            [field]: value,
          };
        }
      )
    );
  };

  // =====================================================
  // MATERIAL COST
  // =====================================================

  const materialCost = useMemo(() => {
    if (!Array.isArray(items)) {
      return 0;
    }

    if (!Array.isArray(rawMaterials)) {
      return 0;
    }

    return items.reduce(
      (total, item) => {
        const material =
          rawMaterials.find(
            (rawMaterial) =>
              String(rawMaterial._id) ===
              String(item.rawMaterial)
          );

        if (!material) {
          return total;
        }

        const quantity =
          Number(item.quantity) || 0;

        const waste =
          Number(
            item.wastePercentage
          ) || 0;

        const quantityWithWaste =
          quantity *
          (1 + waste / 100);

        const cost =
          quantityWithWaste *
          Number(
            material.costPerUnit || 0
          );

        return total + cost;
      },
      0
    );
  }, [items, rawMaterials]);

  // =====================================================
  // TOTAL COST
  // =====================================================

  const totalCost =
    materialCost +
    Number(laborCost || 0) +
    Number(energyCost || 0) +
    Number(otherCost || 0);

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    // -----------------------------------------------
    // PRODUCT
    // -----------------------------------------------

    if (!product) {
      alert("Please select a product.");
      return;
    }

    // -----------------------------------------------
    // NAME
    // -----------------------------------------------

    if (!name.trim()) {
      alert("Please enter formula name.");
      return;
    }

    // -----------------------------------------------
    // CODE
    // -----------------------------------------------

    if (!code.trim()) {
      alert("Please enter formula code.");
      return;
    }

    // -----------------------------------------------
    // BATCH SIZE
    // -----------------------------------------------

    if (
      !Number.isFinite(
        Number(batchSize)
      ) ||
      Number(batchSize) <= 0
    ) {
      alert(
        "Batch size must be greater than 0."
      );
      return;
    }

    // -----------------------------------------------
    // BATCH UNIT
    // -----------------------------------------------

    if (!batchUnit.trim()) {
      alert("Batch unit is required.");
      return;
    }

    // -----------------------------------------------
    // RAW MATERIALS
    // -----------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      alert(
        "Please add at least one raw material."
      );
      return;
    }

    // -----------------------------------------------
    // VALIDATE ITEMS
    // -----------------------------------------------

    const invalidItem =
      items.find(
        (item) =>
          !item.rawMaterial ||
          !Number.isFinite(
            Number(item.quantity)
          ) ||
          Number(item.quantity) <= 0
      );

    if (invalidItem) {
      alert(
        "Please complete all raw material items."
      );
      return;
    }

    // -----------------------------------------------
    // VALIDATE WASTE
    // -----------------------------------------------

    const invalidWaste =
      items.find(
        (item) =>
          Number(
            item.wastePercentage
          ) < 0 ||
          Number(
            item.wastePercentage
          ) > 100
      );

    if (invalidWaste) {
      alert(
        "Waste percentage must be between 0 and 100."
      );
      return;
    }

    // -----------------------------------------------
    // DUPLICATES
    // -----------------------------------------------

    const rawMaterialIds =
      items.map(
        (item) => item.rawMaterial
      );

    if (
      new Set(rawMaterialIds).size !==
      rawMaterialIds.length
    ) {
      alert(
        "A raw material cannot be added more than once to the same formula."
      );
      return;
    }

    // -----------------------------------------------
    // COST VALIDATION
    // -----------------------------------------------

    if (
      Number(laborCost) < 0 ||
      Number(energyCost) < 0 ||
      Number(otherCost) < 0
    ) {
      alert(
        "Costs cannot be negative."
      );
      return;
    }

    try {
      setSubmitting(true);

      // IMPORTANT:
      // Backend determines the real version.
      // We still send current version for frontend compatibility.

      const payload: CreateFormulaData = {
        product,

        name: name.trim(),

        code: code
          .trim()
          .toUpperCase(),

        version: Number(version),

        batchSize:
          Number(batchSize),

        batchUnit:
          batchUnit.trim(),

        items: items.map(
          (item) => ({
            rawMaterial:
              item.rawMaterial,

            quantity:
              Number(item.quantity),

            unit:
              item.unit?.trim() ||
              "kg",

            wastePercentage:
              Number(
                item.wastePercentage || 0
              ),

            notes:
              item.notes?.trim() ||
              "",
          })
        ),

        laborCost:
          Number(
            laborCost || 0
          ),

        energyCost:
          Number(
            energyCost || 0
          ),

        otherCost:
          Number(
            otherCost || 0
          ),

        status,

        notes:
          notes.trim(),
      };

      await onSubmit(payload);

      onClose();
    } catch (error) {
      console.error(
        "Save Formula Error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save formula."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // CLOSE
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Production
            </p>

            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">
                {createNewVersion
                  ? "Create New Formula Version"
                  : editingFormula
                    ? "Edit Formula"
                    : "Create Formula"}
              </h2>

              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                V{version}
              </span>
            </div>

            {createNewVersion && (
              <p className="mt-1 text-xs text-gray-500">
                Creating V{version} from V
                {Math.max(
                  version - 1,
                  1
                )}
                . Previous version remains unchanged.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">

            {/* =================================================
                LOADING
            ================================================= */}

            {loadingData ? (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2
                    size={28}
                    className="animate-spin text-red-600"
                  />

                  <p className="text-sm text-gray-500">
                    Loading products and raw materials...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* =================================================
                    FORMULA INFORMATION
                ================================================= */}

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Formula Information
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Define the product and standard production batch.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

                  {/* PRODUCT */}

                  <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Product *
                    </label>

                    <select
                      value={product}
                      onChange={(event) =>
                        setProduct(
                          event.target.value
                        )
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">
                        Select product
                      </option>

                      {Array.isArray(
                        products
                      ) &&
                        products.map(
                          (item) => (
                            <option
                              key={
                                item._id
                              }
                              value={
                                item._id
                              }
                            >
                              {item.name}
                              {item.code
                                ? ` (${item.code})`
                                : ""}
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  {/* NAME */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Formula Name *
                    </label>

                    <input
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="e.g. Interior White"
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  {/* CODE */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Formula Code *
                    </label>

                    <input
                      value={code}
                      onChange={(event) =>
                        setCode(
                          event.target.value
                        )
                      }
                      placeholder="e.g. INT-WHT"
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm uppercase outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  {/* VERSION */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Version
                    </label>

                    <div className="mt-1.5 flex h-11 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3">
                      <span className="text-sm font-bold text-gray-900">
                        V{version}
                      </span>

                      <span className="text-[10px] font-semibold uppercase text-gray-400">
                        Automatic
                      </span>
                    </div>
                  </div>

                  {/* BATCH SIZE */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Standard Batch Size *
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={batchSize}
                      onChange={(event) =>
                        setBatchSize(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  {/* BATCH UNIT */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Batch Unit
                    </label>

                    <select
                      value={batchUnit}
                      onChange={(event) =>
                        setBatchUnit(
                          event.target.value
                        )
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="kg">
                        kg
                      </option>

                      <option value="L">
                        L
                      </option>

                      <option value="unit">
                        unit
                      </option>
                    </select>
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Status
                    </label>

                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target
                            .value as
                            | "Active"
                            | "Inactive"
                        )
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
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

                {/* =================================================
                    RAW MATERIALS
                ================================================= */}

                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Raw Materials
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Define the raw materials required for this standard batch.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      <Plus size={16} />
                      Add Material
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                    {items.length === 0 ? (
                      <div className="flex min-h-[140px] items-center justify-center text-center">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            No raw materials added
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Click "Add Material" to start.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Material
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Quantity
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Unit
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Waste %
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                                Cost
                              </th>

                              <th className="w-12 px-4 py-3" />
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {items.map(
                              (
                                item,
                                index
                              ) => {
                                const material =
                                  Array.isArray(
                                    rawMaterials
                                  )
                                    ? rawMaterials.find(
                                        (
                                          rawMaterial
                                        ) =>
                                          String(
                                            rawMaterial._id
                                          ) ===
                                          String(
                                            item.rawMaterial
                                          )
                                      )
                                    : undefined;

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

                                const itemCost =
                                  material
                                    ? quantityWithWaste *
                                      Number(
                                        material.costPerUnit ||
                                          0
                                      )
                                    : 0;

                                return (
                                  <tr
                                    key={`${item.rawMaterial}-${index}`}
                                    className="hover:bg-gray-50"
                                  >
                                    {/* MATERIAL */}

                                    <td className="px-4 py-3">
                                      <select
                                        value={
                                          item.rawMaterial
                                        }
                                        onChange={(
                                          event
                                        ) => {
                                          const selected =
                                            Array.isArray(
                                              rawMaterials
                                            )
                                              ? rawMaterials.find(
                                                  (
                                                    rawMaterial
                                                  ) =>
                                                    String(
                                                      rawMaterial._id
                                                    ) ===
                                                    String(
                                                      event
                                                        .target
                                                        .value
                                                    )
                                                )
                                              : undefined;

                                          updateItem(
                                            index,
                                            "rawMaterial",
                                            event
                                              .target
                                              .value
                                          );

                                          if (
                                            selected
                                          ) {
                                            updateItem(
                                              index,
                                              "unit",
                                              selected.unit ||
                                                "kg"
                                            );
                                          }
                                        }}
                                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-red-500"
                                      >
                                        <option value="">
                                          Select material
                                        </option>

                                        {Array.isArray(
                                          rawMaterials
                                        ) &&
                                          rawMaterials.map(
                                            (
                                              material
                                            ) => (
                                              <option
                                                key={
                                                  material._id
                                                }
                                                value={
                                                  material._id
                                                }
                                              >
                                                {
                                                  material.name
                                                }

                                                {material.code
                                                  ? ` (${material.code})`
                                                  : ""}
                                              </option>
                                            )
                                          )}
                                      </select>
                                    </td>

                                    {/* QUANTITY */}

                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={
                                          item.quantity
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateItem(
                                            index,
                                            "quantity",
                                            Number(
                                              event
                                                .target
                                                .value
                                            )
                                          )
                                        }
                                        className="h-10 w-28 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-red-500"
                                      />
                                    </td>

                                    {/* UNIT */}

                                    <td className="px-4 py-3">
                                      <input
                                        value={
                                          item.unit
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateItem(
                                            index,
                                            "unit",
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        className="h-10 w-20 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-red-500"
                                      />
                                    </td>

                                    {/* WASTE */}

                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={
                                          item.wastePercentage
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateItem(
                                            index,
                                            "wastePercentage",
                                            Number(
                                              event
                                                .target
                                                .value
                                            )
                                          )
                                        }
                                        className="h-10 w-24 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-red-500"
                                      />
                                    </td>

                                    {/* COST */}

                                    <td className="px-4 py-3 text-right">
                                      <span className="text-xs font-bold text-gray-900">
                                        {itemCost.toLocaleString(
                                          "en-RW"
                                        )}{" "}
                                        RWF
                                      </span>
                                    </td>

                                    {/* DELETE */}

                                    <td className="px-4 py-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeItem(
                                            index
                                          )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Trash2
                                          size={
                                            15
                                          }
                                        />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    COSTS
                ================================================= */}

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

                  {/* ADDITIONAL COSTS */}

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Additional Costs
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Costs associated with the standard batch.
                    </p>

                    <div className="mt-4 space-y-4">

                      {/* LABOR */}

                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          Labor Cost
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={laborCost}
                          onChange={(event) =>
                            setLaborCost(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500"
                        />
                      </div>

                      {/* ENERGY */}

                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          Energy Cost
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={energyCost}
                          onChange={(event) =>
                            setEnergyCost(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500"
                        />
                      </div>

                      {/* OTHER */}

                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          Other Cost
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={otherCost}
                          onChange={(event) =>
                            setOtherCost(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COST SUMMARY */}

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Batch Cost
                    </h3>

                    <div className="mt-4 rounded-2xl bg-gray-50 p-5">

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Material Cost
                        </span>

                        <span className="font-semibold">
                          {materialCost.toLocaleString(
                            "en-RW"
                          )}{" "}
                          RWF
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Labor
                        </span>

                        <span className="font-semibold">
                          {Number(
                            laborCost || 0
                          ).toLocaleString(
                            "en-RW"
                          )}{" "}
                          RWF
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Energy
                        </span>

                        <span className="font-semibold">
                          {Number(
                            energyCost || 0
                          ).toLocaleString(
                            "en-RW"
                          )}{" "}
                          RWF
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Other
                        </span>

                        <span className="font-semibold">
                          {Number(
                            otherCost || 0
                          ).toLocaleString(
                            "en-RW"
                          )}{" "}
                          RWF
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                        <span className="text-sm font-bold text-gray-900">
                          Batch Total
                        </span>

                        <span className="text-xl font-bold text-gray-900">
                          {totalCost.toLocaleString(
                            "en-RW"
                          )}{" "}
                          RWF
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Standard Batch
                        </span>

                        <span className="text-sm font-bold text-gray-900">
                          {Number(
                            batchSize || 0
                          ).toLocaleString(
                            "en-RW"
                          )}{" "}
                          {batchUnit}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Cost per {batchUnit}
                        </span>

                        <span className="text-sm font-bold text-red-600">
                          {Number(
                            batchSize
                          ) > 0
                            ? (
                                totalCost /
                                Number(
                                  batchSize
                                )
                              ).toLocaleString(
                                "en-RW",
                                {
                                  maximumFractionDigits: 2,
                                }
                              )
                            : "0"}{" "}
                          RWF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    NOTES
                ================================================= */}

                <div className="mt-8">
                  <label className="text-xs font-semibold text-gray-600">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional notes..."
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </>
            )}
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex shrink-0 justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">

            <div className="flex items-center gap-2">
              {createNewVersion && (
                <>
                  <Copy
                    size={15}
                    className="text-red-500"
                  />

                  <span className="text-xs font-medium text-gray-500">
                    New version:
                    <strong className="ml-1 text-gray-900">
                      V{version}
                    </strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingData
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {createNewVersion
                  ? `Create V${version}`
                  : editingFormula
                    ? "Update Formula"
                    : "Create V1"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}