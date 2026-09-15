import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  RefreshCw,
  Boxes,
  AlertTriangle,
  PackageCheck,
  Archive,
  Search,
  Layers,
  Truck,
  Printer,
} from "lucide-react";
import { Link } from "react-router-dom";

import RawMaterialModal from "../components/RawMaterialModal";
import RawMaterialTable from "../components/RawMaterialTable";

import {
  getRawMaterials,
  deleteRawMaterial,
} from "../services/rawMaterialService";

import type {
  RawMaterial,
} from "../types/rawMaterial.types";
import { printCanaDocument } from "../../utils/printCanaDocument";
import { useToast } from "@/context/toastContext";

function RawMaterialsPage() {
  const { toast } = useToast();
  const [materials, setMaterials] =
    useState<RawMaterial[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    selectedMaterial,
    setSelectedMaterial,
  ] = useState<RawMaterial | null>(null);

  const [error, setError] =
    useState("");

  const [search, setSearch] = useState("");

  // =====================================================
  // LOAD RAW MATERIALS
  // =====================================================

  const loadMaterials =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getRawMaterials();

        setMaterials(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load raw materials:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load raw materials."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    const refreshStockRows = () => {
      void loadMaterials();
    };

    window.addEventListener(
      "cana:stock-updated",
      refreshStockRows,
    );
    window.addEventListener(
      "focus",
      refreshStockRows,
    );

    return () => {
      window.removeEventListener(
        "cana:stock-updated",
        refreshStockRows,
      );
      window.removeEventListener(
        "focus",
        refreshStockRows,
      );
    };
  }, [loadMaterials]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = useMemo(() => {
    const activeCatalog = materials.filter(
      (material) => material.status === "Active"
    );
    const totalMaterials =
      activeCatalog.length;

    const activeMaterials =
      activeCatalog.length;

    const lowStockMaterials =
      activeCatalog.filter((material) => {
        if (
          typeof material.isLowStock ===
          "boolean"
        ) {
          return material.isLowStock;
        }

        return (
          Number(material.quantity) <=
          Number(
            material.minimumStock
          )
        );
      }).length;

    const totalStock =
      activeCatalog.reduce(
        (total, material) =>
          total +
          Number(
            material.quantity
          ),
        0
      );

    const totalReserved =
      activeCatalog.reduce(
        (total, material) =>
          total +
          Number(
            material.reservedQuantity ??
              0
          ),
        0
      );

    const totalAvailable =
      activeCatalog.reduce(
        (total, material) =>
          total +
          Number(
            material.availableQuantity ??
              Math.max(
                0,
                Number(
                  material.quantity
                ) -
                  Number(
                    material.reservedQuantity ??
                      0
                  )
              )
          ),
        0
      );

    return {
      totalMaterials,
      activeMaterials,
      lowStockMaterials,
      totalStock,
      totalReserved,
      totalAvailable,
    };
  }, [materials]);

  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (material.status !== "Active") return false;
      const matchesSearch = !query || [material.name, material.code, material.category, material.supplier?.name].filter(Boolean).join(" ").toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [materials, search]);

  // =====================================================
  // ADD
  // =====================================================

  const handleAdd = () => {
    setError("");
    setSelectedMaterial(null);
    setModalOpen(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (
    material: RawMaterial
  ) => {
    setError("");
    setSelectedMaterial(material);
    setModalOpen(true);
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    id: string
  ) => {
    const confirmed =
      window.confirm(
        "Delete this unused test material and permanently remove its lots, supplier offers, stock, and inventory ledger? This cannot be undone. Materials used by formulas or production cannot be deleted."
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteRawMaterial(id, true);

      await loadMaterials();
      toast("Raw material and its unused setup records were deleted.", "success");
    } catch (error) {
      console.error(
        "Failed to delete raw material:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete raw material."
      );
    }
  };

  // =====================================================
  // MODAL SUCCESS
  // =====================================================

  const handleSuccess =
    async () => {
      const message = selectedMaterial
        ? `${selectedMaterial.name} was updated.`
        : "Raw material was added to the catalogue.";
      setModalOpen(false);
      setSelectedMaterial(null);

      await loadMaterials();
      toast(message, "success");
    };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMaterial(null);
  };
  const printRegister = () => printCanaDocument({ title: "Raw material register", reference: `RM-LIST-${new Date().toISOString().slice(0, 10)}`, details: [{ label: "Materials listed", value: visibleMaterials.length }, { label: "Current stock", value: formatQuantity(summary.totalStock) }, { label: "Reserved for production", value: formatQuantity(summary.totalReserved) }, { label: "Available stock", value: formatQuantity(summary.totalAvailable) }, { label: "Low-stock materials", value: summary.lowStockMaterials }], table: { headers: ["Material", "Code", "Current", "Reserved", "Available", "Minimum", "Unit cost"], rows: visibleMaterials.map((material) => [material.name, material.code, `${material.quantity} ${material.unit}`, `${material.reservedQuantity || 0} ${material.unit}`, `${material.availableQuantity ?? Math.max(0, material.quantity - (material.reservedQuantity || 0))} ${material.unit}`, `${material.minimumStock} ${material.unit}`, `${Number(material.costPerUnit || 0).toLocaleString()} RWF`]) }, notes: "Current stock is physical stock. Available stock excludes quantities reserved for production." });

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Boxes size={22} />
            </div>

            <div>
              <p className="cana-section-kicker">Procurement & materials</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Raw-material catalogue
              </h1>

            </div>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/management/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Archive size={17} />
              Raw-material store
            </Link>
            <button type="button" onClick={printRegister} disabled={loading || visibleMaterials.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"><Printer size={17} />Print list</button>
            <Link
              to="/management/supplier-materials"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Truck size={17} />
              Supplier offers
            </Link>

            <Link
              to="/management/raw-materials/lots"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Layers size={17} />
              Material lots
            </Link>
          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              void loadMaterials()
            }
            disabled={loading}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              border
              border-gray-200
              bg-white
              px-4
              py-3
              text-sm
              font-semibold
              text-gray-700
              shadow-sm
              transition
              hover:bg-gray-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {/* ADD */}

          <button
            type="button"
            onClick={handleAdd}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-red-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-red-700
              focus:outline-none
              focus:ring-2
              focus:ring-red-500
              focus:ring-offset-2
            "
          >
            <Plus size={18} />

            Add Raw Material
          </button>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================== */}

      {error && (
        <div
          role="alert"
          className="
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

      {/* =================================================
          SUMMARY CARDS
      ================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* TOTAL MATERIALS */}

        <SummaryCard
          label="Total Materials"
          value={
            summary.totalMaterials
          }
          icon={
            <Boxes
              size={20}
            />
          }
        />

        {/* ACTIVE */}

        <SummaryCard
          label="Active Materials"
          value={
            summary.activeMaterials
          }
          icon={
            <PackageCheck
              size={20}
            />
          }
        />

        {/* TOTAL STOCK */}

        <SummaryCard
          label="Total Stock"
          value={formatQuantity(
            summary.totalStock
          )}
          icon={
            <Archive
              size={20}
            />
          }
        />

        {/* AVAILABLE */}

        <SummaryCard
          label="Available Stock"
          value={formatQuantity(
            summary.totalAvailable
          )}
          icon={
            <PackageCheck
              size={20}
            />
          }
        />

        {/* LOW STOCK */}

        <SummaryCard
          label="Low Stock"
          value={
            summary.lowStockMaterials
          }
          danger={
            summary.lowStockMaterials >
            0
          }
          icon={
            <AlertTriangle
              size={20}
            />
          }
        />
      </div>

      {/* =================================================
          STOCK OVERVIEW
      ================================================== */}

      <div className="cana-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-gray-900">Stock overview</h2>

          <div className="flex flex-wrap gap-5 text-sm">
            <StockMetric
              label="Current Stock"
              value={formatQuantity(
                summary.totalStock
              )}
            />

            <StockMetric
              label="Reserved"
              value={formatQuantity(
                summary.totalReserved
              )}
            />

            <StockMetric
              label="Available"
              value={formatQuantity(
                summary.totalAvailable
              )}
            />
          </div>
        </div>
      </div>

      <div className="cana-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-lg">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search material name, code, category, or default supplier…" className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100" />
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Approved register</span>
            <span className="text-sm text-gray-500"><strong className="text-gray-900">{visibleMaterials.length}</strong> materials</span>
          </div>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================== */}

      <div className="cana-panel overflow-hidden">
        <RawMaterialTable
          materials={visibleMaterials}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* =================================================
          MODAL
      ================================================== */}

      <RawMaterialModal
        isOpen={modalOpen}
        material={selectedMaterial}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default RawMaterialsPage;

// =========================================================
// HELPERS
// =========================================================

function formatQuantity(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

// =========================================================
// SUMMARY CARD
// =========================================================

interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  danger?: boolean;
}

function SummaryCard({
  label,
  value,
  icon,
  danger = false,
}: SummaryCardProps) {
  return (
    <div
      className={`
        rounded-2xl
        border
        bg-white
        p-5
        shadow-sm
        ${
          danger
            ? "border-red-100"
            : "border-gray-100"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {label}
          </p>

          <p
            className={`
              mt-2
              text-2xl
              font-bold
              ${
                danger
                  ? "text-red-600"
                  : "text-gray-900"
              }
            `}
          >
            {value}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${
              danger
                ? "bg-red-50 text-red-600"
                : "bg-gray-50 text-gray-600"
            }
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// STOCK METRIC
// =========================================================

interface StockMetricProps {
  label: string;
  value: string;
}

function StockMetric({
  label,
  value,
}: StockMetricProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}
