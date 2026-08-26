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
} from "lucide-react";

import RawMaterialModal from "../components/RawMaterialModal";
import RawMaterialTable from "../components/RawMaterialTable";

import {
  getRawMaterials,
  deleteRawMaterial,
} from "../services/rawMaterialService";

import type {
  RawMaterial,
} from "../types/rawMaterial.types";

function RawMaterialsPage() {
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

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = useMemo(() => {
    const totalMaterials =
      materials.length;

    const activeMaterials =
      materials.filter(
        (material) =>
          material.status === "Active"
      ).length;

    const lowStockMaterials =
      materials.filter((material) => {
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
      materials.reduce(
        (total, material) =>
          total +
          Number(
            material.quantity
          ),
        0
      );

    const totalReserved =
      materials.reduce(
        (total, material) =>
          total +
          Number(
            material.reservedQuantity ??
              0
          ),
        0
      );

    const totalAvailable =
      materials.reduce(
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
        "Are you sure you want to delete this raw material?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteRawMaterial(id);

      await loadMaterials();
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
      setModalOpen(false);
      setSelectedMaterial(null);

      await loadMaterials();
    };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMaterial(null);
  };

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
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Raw Materials
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage raw materials used in
                your paint production.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Stock Overview
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Current raw material quantities.
              Inventory movements will be
              managed separately.
            </p>
          </div>

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

      {/* =================================================
          TABLE
      ================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <RawMaterialTable
          materials={materials}
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