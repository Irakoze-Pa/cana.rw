import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Power,
  FlaskConical,
  RefreshCw,
  Loader2,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";

import FormulaModal from "../components/FormulaModal";
import FormulaDetails from "../components/FormulaDetailsModal";

import type {
  Formula,
  CreateFormulaData,
} from "../types/formula.types";

import {
  getFormulas,
  createFormula,
  createNewFormulaVersion,
  updateFormula,
  deactivateFormula,
  deleteFormula,
} from "../services/formula.service";

export default function FormulasPage() {
  // =====================================================
  // STATE
  // =====================================================

  const [formulas, setFormulas] = useState<Formula[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");

  const [productFilter, setProductFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingFormula, setEditingFormula] =
    useState<Formula | null>(null);

  /*
   * false = Create / Edit
   * true  = Create New Version
   */
  const [createNewVersion, setCreateNewVersion] =
    useState(false);

  const [selectedFormula, setSelectedFormula] =
    useState<Formula | null>(null);

  const [showDetails, setShowDetails] = useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  // =====================================================
  // LOAD FORMULAS
  // =====================================================

  const loadFormulas = async (
    showRefreshLoader = false
  ) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getFormulas();

      setFormulas(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Load Formulas Error:",
        error
      );

      alert("Failed to load formulas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFormulas();
  }, []);

  // =====================================================
  // PRODUCTS
  // =====================================================

  const products = useMemo(() => {
    const map = new Map<string, string>();

    formulas.forEach((formula) => {
      if (
        typeof formula.product !== "string" &&
        formula.product?._id
      ) {
        map.set(
          formula.product._id,
          `${formula.product.name}${
            formula.product.code
              ? ` (${formula.product.code})`
              : ""
          }`
        );
      }
    });

    return Array.from(map.entries()).map(
      ([id, name]) => ({
        id,
        name,
      })
    );
  }, [formulas]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredFormulas = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return formulas.filter((formula) => {
      const productName =
        typeof formula.product === "string"
          ? ""
          : formula.product?.name || "";

      const productCode =
        typeof formula.product === "string"
          ? ""
          : formula.product?.code || "";

      const formulaName =
        formula.name?.toLowerCase() || "";

      const formulaCode =
        formula.code?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        formulaName.includes(query) ||
        formulaCode.includes(query) ||
        productName
          .toLowerCase()
          .includes(query) ||
        productCode
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        formula.status === statusFilter;

      const formulaProductId =
        typeof formula.product === "string"
          ? formula.product
          : formula.product?._id;

      const matchesProduct =
        productFilter === "All" ||
        formulaProductId === productFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProduct
      );
    });
  }, [
    formulas,
    search,
    statusFilter,
    productFilter,
  ]);

  // =====================================================
  // STATS
  // =====================================================

  const stats = useMemo(() => {
    const active = formulas.filter(
      (formula) =>
        formula.status === "Active"
    ).length;

    const inactive = formulas.filter(
      (formula) =>
        formula.status === "Inactive"
    ).length;

    const productsCount = new Set(
      formulas
        .map((formula) =>
          typeof formula.product === "string"
            ? formula.product
            : formula.product?._id
        )
        .filter(Boolean)
    ).size;

    return {
      total: formulas.length,
      active,
      inactive,
      products: productsCount,
    };
  }, [formulas]);

  // =====================================================
  // CREATE NEW FORMULA
  // =====================================================

  const handleCreate = async (
    data: CreateFormulaData
  ) => {
    try {
      await createFormula(data);

      await loadFormulas(true);

      closeModal();
    } catch (error: any) {
      console.error(
        "Create Formula Error:",
        error
      );

      throw new Error(
        error?.response?.data?.message ||
          "Failed to create formula."
      );
    }
  };

  // =====================================================
  // CREATE NEW VERSION
  // =====================================================

  const handleCreateNewVersion = async (
    data: CreateFormulaData
  ) => {
    if (!editingFormula) {
      throw new Error(
        "No formula selected for new version."
      );
    }

    try {
      await createNewFormulaVersion(
        editingFormula._id,
        data
      );

      await loadFormulas(true);

      closeModal();
    } catch (error: any) {
      console.error(
        "Create New Formula Version Error:",
        error
      );

      throw new Error(
        error?.response?.data?.message ||
          "Failed to create new formula version."
      );
    }
  };

  // =====================================================
  // UPDATE EXISTING FORMULA
  // =====================================================

  const handleUpdate = async (
    data: CreateFormulaData
  ) => {
    if (!editingFormula) {
      return;
    }

    try {
      await updateFormula(
        editingFormula._id,
        data
      );

      await loadFormulas(true);

      closeModal();
    } catch (error: any) {
      console.error(
        "Update Formula Error:",
        error
      );

      throw new Error(
        error?.response?.data?.message ||
          "Failed to update formula."
      );
    }
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFormula(null);
    setCreateNewVersion(false);
  };

  // =====================================================
  // OPEN CREATE
  // =====================================================

  const openCreateModal = () => {
    setEditingFormula(null);
    setCreateNewVersion(false);
    setIsModalOpen(true);
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEditModal = (
    formula: Formula
  ) => {
    setEditingFormula(formula);
    setCreateNewVersion(false);
    setIsModalOpen(true);
  };

  // =====================================================
  // OPEN NEW VERSION
  // =====================================================

  const openNewVersionModal = (
    formula: Formula
  ) => {
    setEditingFormula(formula);
    setCreateNewVersion(true);
    setIsModalOpen(true);
  };

  // =====================================================
  // DETAILS
  // =====================================================

  const openDetails = (
    formula: Formula
  ) => {
    setSelectedFormula(formula);
    setShowDetails(true);
  };

  // =====================================================
  // DEACTIVATE
  // =====================================================

  const handleDeactivate = async (
    formula: Formula
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to deactivate "${formula.name} V${formula.version}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(formula._id);

      await deactivateFormula(
        formula._id
      );

      await loadFormulas(true);

      if (
        selectedFormula?._id ===
        formula._id
      ) {
        setSelectedFormula(null);
        setShowDetails(false);
      }
    } catch (error: any) {
      console.error(
        "Deactivate Formula Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to deactivate formula."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    formula: Formula
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${formula.name} V${formula.version}"? This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(formula._id);

      await deleteFormula(
        formula._id
      );

      setFormulas((previous) =>
        previous.filter(
          (item) =>
            item._id !== formula._id
        )
      );

      if (
        selectedFormula?._id ===
        formula._id
      ) {
        setSelectedFormula(null);
        setShowDetails(false);
      }
    } catch (error: any) {
      console.error(
        "Delete Formula Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to delete formula."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // MONEY
  // =====================================================

  const formatMoney = (
    value: number
  ) => {
    return `${Number(
      value || 0
    ).toLocaleString("en-RW")} RWF`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-full w-full min-w-0 overflow-x-hidden bg-gray-50 p-4 md:p-6 lg:p-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="min-w-0">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
              <FlaskConical size={22} />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Production
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Formulas
              </h1>

            </div>
          </div>

          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Manage production formulas,
            raw material requirements,
            versions and batch costs.
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-3">

          <button
            type="button"
            onClick={() =>
              loadFormulas(true)
            }
            disabled={refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={18} />

            New Formula
          </button>

        </div>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="mt-7 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total Formulas"
          value={stats.total}
          icon={
            <FlaskConical size={18} />
          }
        />

        <StatCard
          label="Active"
          value={stats.active}
          icon={
            <CheckCircle2 size={18} />
          }
          iconClass="bg-green-50 text-green-600"
        />

        <StatCard
          label="Inactive"
          value={stats.inactive}
          icon={
            <XCircle size={18} />
          }
          iconClass="bg-gray-100 text-gray-500"
        />

        <StatCard
          label="Products Covered"
          value={stats.products}
          icon={
            <FlaskConical size={18} />
          }
          iconClass="bg-red-50 text-red-600"
        />

      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="mt-7 w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

        <div className="flex min-w-0 flex-col gap-3 xl:flex-row">

          {/* SEARCH */}

          <div className="relative min-w-0 flex-1">

            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search formula, code or product..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
            />

          </div>

          {/* PRODUCT */}

          <div className="relative shrink-0">

            <select
              value={productFilter}
              onChange={(event) =>
                setProductFilter(
                  event.target.value
                )
              }
              className="h-11 w-full min-w-[220px] appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 pr-10 text-sm outline-none focus:border-red-500"
            >

              <option value="All">
                All Products
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                )
              )}

            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

          </div>

          {/* STATUS */}

          <div className="relative shrink-0">

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | "Active"
                    | "Inactive"
                )
              }
              className="h-11 w-full min-w-[150px] appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 pr-10 text-sm outline-none focus:border-red-500"
            >

              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>

            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

          </div>

        </div>
      </div>

      {/* =====================================================
          TABLE CARD
      ===================================================== */}

      <div className="mt-5 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {loading ? (

          <div className="flex min-h-[420px] items-center justify-center">

            <div className="flex flex-col items-center gap-3">

              <Loader2
                size={28}
                className="animate-spin text-red-600"
              />

              <p className="text-sm text-gray-500">
                Loading formulas...
              </p>

            </div>
          </div>

        ) : filteredFormulas.length === 0 ? (

          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <FlaskConical size={25} />
            </div>

            <h3 className="mt-4 text-sm font-bold text-gray-900">
              No formulas found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {search ||
              statusFilter !== "All" ||
              productFilter !== "All"
                ? "Try changing your filters or search terms."
                : "Create your first production formula to get started."}
            </p>

            {!search &&
              statusFilter === "All" &&
              productFilter === "All" && (
                <button
                  type="button"
                  onClick={
                    openCreateModal
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <Plus size={16} />

                  Create Formula
                </button>
              )}

          </div>

        ) : (

          /*
           * ONLY TABLE CONTENT SCROLLS.
           * CARD NEVER EXPANDS OUTSIDE PAGE.
           */

          <div className="w-full max-w-full overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead>

                <tr className="border-b border-gray-200 bg-gray-50">

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Formula
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Product
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Version
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Batch
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Materials
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Batch Cost
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-center text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredFormulas.map(
                  (formula) => {

                    const product =
                      typeof formula.product ===
                      "string"
                        ? null
                        : formula.product;

                    const isActionLoading =
                      actionLoading ===
                      formula._id;

                    return (

                      <tr
                        key={formula._id}
                        className="transition hover:bg-gray-50/80"
                      >

                        {/* FORMULA */}

                        <td className="px-5 py-4">

                          <p className="whitespace-nowrap text-sm font-bold text-gray-900">
                            {formula.name}
                          </p>

                          <p className="mt-1 whitespace-nowrap text-xs font-medium text-gray-400">
                            {formula.code}
                          </p>

                        </td>

                        {/* PRODUCT */}

                        <td className="px-5 py-4">

                          {product ? (

                            <>
                              <p className="whitespace-nowrap text-sm font-semibold text-gray-800">
                                {product.name}
                              </p>

                              <p className="mt-1 whitespace-nowrap text-xs text-gray-400">
                                {product.code ||
                                  "—"}
                              </p>
                            </>

                          ) : (

                            <span className="whitespace-nowrap text-xs text-gray-400">
                              Product unavailable
                            </span>

                          )}

                        </td>

                        {/* VERSION */}

                        <td className="px-5 py-4">

                          <span className="inline-flex whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                            V{formula.version}
                          </span>

                        </td>

                        {/* BATCH */}

                        <td className="px-5 py-4">

                          <span className="whitespace-nowrap text-sm font-semibold text-gray-800">

                            {Number(
                              formula.batchSize ||
                                0
                            ).toLocaleString(
                              "en-RW"
                            )}{" "}

                            {formula.batchUnit ||
                              "kg"}

                          </span>

                        </td>

                        {/* MATERIALS */}

                        <td className="px-5 py-4">

                          <span className="text-sm font-semibold text-gray-800">
                            {formula.items
                              ?.length || 0}
                          </span>

                          <span className="ml-1 text-xs text-gray-400">
                            materials
                          </span>

                        </td>

                        {/* COST */}

                        <td className="px-5 py-4 text-right">

                          <span className="whitespace-nowrap text-sm font-bold text-gray-900">
                            {formatMoney(
                              formula.estimatedTotalCost
                            )}
                          </span>

                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4 text-center">

                          {formula.status ===
                          "Active" ? (

                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">

                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                              Active

                            </span>

                          ) : (

                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">

                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />

                              Inactive

                            </span>

                          )}

                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">

                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">

                            {/* DETAILS */}

                            <button
                              type="button"
                              onClick={() =>
                                openDetails(
                                  formula
                                )
                              }
                              title="View details"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                              <Eye size={17} />
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  formula
                                )
                              }
                              title="Edit formula"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* NEW VERSION */}

                            <button
                              type="button"
                              onClick={() =>
                                openNewVersionModal(
                                  formula
                                )
                              }
                              title="Create new version"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Copy size={16} />
                            </button>

                            {/* DEACTIVATE */}

                            {formula.status ===
                              "Active" && (

                              <button
                                type="button"
                                disabled={
                                  isActionLoading
                                }
                                onClick={() =>
                                  handleDeactivate(
                                    formula
                                  )
                                }
                                title="Deactivate"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                              >

                                {isActionLoading ? (

                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />

                                ) : (

                                  <Power
                                    size={16}
                                  />

                                )}

                              </button>

                            )}

                            {/* DELETE */}

                            <button
                              type="button"
                              disabled={
                                isActionLoading
                              }
                              onClick={() =>
                                handleDelete(
                                  formula
                                )
                              }
                              title="Delete formula"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>

                          </div>

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

      {/* =====================================================
          RESULT COUNT
      ===================================================== */}

      {!loading &&
        filteredFormulas.length > 0 && (

          <div className="mt-3 flex items-center justify-between px-1">

            <p className="text-xs text-gray-400">

              Showing{" "}

              <span className="font-semibold text-gray-600">
                {filteredFormulas.length}
              </span>{" "}

              of{" "}

              <span className="font-semibold text-gray-600">
                {formulas.length}
              </span>{" "}

              formulas

            </p>

          </div>

        )}

      {/* =====================================================
          FORMULA MODAL
      ===================================================== */}

      <FormulaModal
        isOpen={isModalOpen}
        onClose={closeModal}

        /*
         * IMPORTANT:
         *
         * New Formula
         *    -> handleCreate
         *
         * Edit
         *    -> handleUpdate
         *
         * New Version
         *    -> handleCreateNewVersion
         */

        onSubmit={
          createNewVersion
            ? handleCreateNewVersion
            : editingFormula
              ? handleUpdate
              : handleCreate
        }

        editingFormula={editingFormula}

        createNewVersion={
          createNewVersion
        }
      />

      {/* =====================================================
          DETAILS
      ===================================================== */}

      <FormulaDetails
        isOpen={showDetails}
        formula={selectedFormula}
        onClose={() => {
          setShowDetails(false);
          setSelectedFormula(null);
        }}
        onEdit={(formula) => {
          setShowDetails(false);
          setSelectedFormula(null);

          openEditModal(formula);
        }}
        onDeactivate={
          handleDeactivate
        }
      />

    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass?: string;
}

function StatCard({
  label,
  value,
  icon,
  iconClass = "bg-gray-100 text-gray-600",
}: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

      </div>

      <p className="mt-4 text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>

    </div>
  );
}