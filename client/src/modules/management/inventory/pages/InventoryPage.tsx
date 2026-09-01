import {
  AlertTriangle,
  Boxes,
  PackagePlus,
  RefreshCw,
  Search,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import InventoryTable from "../components/InventoryTable";
import StockTransactionModal from "../components/InventoryTransactionModal";
import inventoryService from "../services/inventoryService";

import type {
  Inventory,
  InventorySummary,
} from "../types/inventory.types";

type TransactionMode = "add" | "remove" | "adjust";

const InventoryPage = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [summary, setSummary] =
    useState<InventorySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalMode, setStockModalMode] =
    useState<TransactionMode>("add");

  const [selectedInventory, setSelectedInventory] =
    useState<Inventory | null>(null);

  const loadInventory = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          inventoryData,
          summaryData,
        ] = await Promise.all([
          inventoryService.getInventory(),
          inventoryService.getInventorySummary(),
        ]);

        /*
         * inventoryService already unwraps backend response.
         *
         * Therefore:
         * inventoryData = Inventory[]
         * summaryData   = InventorySummary
         *
         * Do NOT use:
         * inventoryData.data
         * summaryData.data
         */

        setInventory(
          Array.isArray(inventoryData)
            ? inventoryData
            : []
        );

        setSummary(summaryData ?? null);
      } catch (error) {
        console.error(
          "Failed to load inventory:",
          error
        );

        setInventory([]);
        setSummary(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !query ||
        item.rawMaterialName
          ?.toLowerCase()
          .includes(query) ||
        item.rawMaterialCode
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inventory, search, statusFilter]);

  const totalItems =
    summary?.totalItems ?? inventory.length;

  const totalQuantity =
    summary?.totalQuantity ??
    inventory.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

  const totalReserved =
    summary?.totalReservedQuantity ??
    inventory.reduce(
      (sum, item) =>
        sum + (item.reservedQuantity || 0),
      0
    );

  const totalAvailable =
    summary?.totalAvailableQuantity ??
    inventory.reduce(
      (sum, item) =>
        sum + (item.availableQuantity || 0),
      0
    );

  const lowStock =
    summary?.lowStockCount ??
    summary?.lowStockItems ??
    inventory.filter(
      (item) => item.status === "Low Stock"
    ).length;

  const outOfStock =
    summary?.outOfStockCount ??
    summary?.outOfStockItems ??
    inventory.filter(
      (item) => item.status === "Out of Stock"
    ).length;

  const openStockModal = (
    item: Inventory,
    mode: TransactionMode
  ) => {
    setSelectedInventory(item);
    setStockModalMode(mode);
    setStockModalOpen(true);
  };

  const handleAddStock = (item: Inventory) => {
    openStockModal(item, "add");
  };

  const handleRemoveStock = (item: Inventory) => {
    openStockModal(item, "remove");
  };

  const handleAdjustStock = (item: Inventory) => {
    openStockModal(item, "adjust");
  };

  const handleCloseModal = () => {
    setStockModalOpen(false);
    setSelectedInventory(null);
  };

  const handleStockSuccess = (
    updatedInventory: Inventory
  ) => {
    setInventory((current) =>
      current.map((item) =>
        item._id === updatedInventory._id
          ? updatedInventory
          : item
      )
    );

    handleCloseModal();

    void loadInventory(true);
  };

  /*
   * Global Add Stock button:
   *
   * We intentionally do not automatically choose a random
   * raw material here. Stock transactions must always belong
   * to a specific raw material.
   *
   * Therefore the primary Add Stock action is available
   * directly from every inventory row.
   */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Warehouse size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Raw-material store
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Inputs only: materials received from suppliers and issued to production. This is not finished-product stock.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadInventory(true)}
          disabled={refreshing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          Refresh
        </button>
      </div>

      <section className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-900">Raw-material store workflow</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Purchase order → goods receipt → raw-material stock → production issue. Completed production moves output to the separate Finished Goods Stores.
          </p>
        </div>
        <Link to="/management/inventory/finished-goods" className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100">
          View finished goods stores
        </Link>
      </section>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          icon={<Boxes size={19} />}
          label="Inventory Items"
          value={formatNumber(totalItems)}
        />

        <SummaryCard
          icon={<Warehouse size={19} />}
          label="Total Quantity"
          value={formatNumber(totalQuantity)}
        />

        <SummaryCard
          icon={<PackagePlus size={19} />}
          label="Available Stock"
          value={formatNumber(totalAvailable)}
        />

        <SummaryCard
          icon={<TrendingDown size={19} />}
          label="Reserved Stock"
          value={formatNumber(totalReserved)}
        />

        <SummaryCard
          icon={<AlertTriangle size={19} />}
          label="Low / Out of Stock"
          value={`${lowStock} / ${outOfStock}`}
          danger={
            lowStock > 0 || outOfStock > 0
          }
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-lg">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search raw material or code..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              <option value="All">
                All Status
              </option>

              <option value="Available">
                Available
              </option>

              <option value="Low Stock">
                Low Stock
              </option>

              <option value="Out of Stock">
                Out of Stock
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

            <span className="hidden rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-500 sm:block">
              <strong className="text-gray-900">
                {filteredInventory.length}
              </strong>{" "}
              items
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <InventoryTable
          inventory={filteredInventory}
          loading={loading}
          onAddStock={handleAddStock}
          onRemoveStock={handleRemoveStock}
          onAdjustStock={handleAdjustStock}
        />
      </div>

      {/* Stock Modal */}
      <StockTransactionModal
        open={stockModalOpen}
        mode={stockModalMode}
        inventory={selectedInventory}
        onClose={handleCloseModal}
        onSuccess={handleStockSuccess}
      />
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  danger?: boolean;
}

const SummaryCard = ({
  icon,
  label,
  value,
  danger = false,
}: SummaryCardProps) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
          {icon}
        </div>

        {danger && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
            Attention
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);
};

export default InventoryPage;
