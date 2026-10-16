import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  Printer,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

import InventoryTable from "../components/InventoryTable";
import StockTransactionModal from "../components/InventoryTransactionModal";
import inventoryService from "../services/inventoryService";

import type { Inventory, InventorySummary } from "../types/inventory.types";

type TransactionMode = "add" | "remove" | "adjust";

const InventoryPage = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState<
    "All" | "Raw materials" | "Packaging"
  >("All");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<TransactionMode>("add");

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );

  const loadInventory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [inventoryData, summaryData] = await Promise.all([
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

      setInventory(Array.isArray(inventoryData) ? inventoryData : []);

      setSummary(summaryData ?? null);
    } catch (error) {
      console.error("Failed to load inventory:", error);

      setInventory([]);
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !query ||
        item.rawMaterialName?.toLowerCase().includes(query) ||
        item.rawMaterialCode?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const category =
        typeof item.rawMaterial === "object"
          ? item.rawMaterial?.category || ""
          : "";
      const group = /^Packaging\b/i.test(category)
        ? "Packaging"
        : "Raw materials";
      return (
        matchesSearch &&
        matchesStatus &&
        (groupFilter === "All" || group === groupFilter)
      );
    });
  }, [inventory, search, statusFilter, groupFilter]);

  const groupCounts = useMemo(
    () => ({
      rawMaterials: inventory.filter(
        (item) =>
          !/^Packaging\b/i.test(
            typeof item.rawMaterial === "object"
              ? item.rawMaterial?.category || ""
              : "",
          ),
      ).length,
      packaging: inventory.filter((item) =>
        /^Packaging\b/i.test(
          typeof item.rawMaterial === "object"
            ? item.rawMaterial?.category || ""
            : "",
        ),
      ).length,
    }),
    [inventory],
  );

  const totalItems = summary?.totalItems ?? inventory.length;

  const totalAvailable =
    summary?.totalAvailableQuantity ??
    inventory.reduce(
      (sum, item) => sum + (item.availableQuantity ?? item.quantity ?? 0),
      0,
    );

  const totalInventoryValue =
    Number(summary?.totalInventoryValue ?? summary?.totalValue) ||
    inventory.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.averageCostPerUnit || 0),
      0,
    );

  const visibleInventoryValue = filteredInventory.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.averageCostPerUnit || 0),
    0,
  );

  const groupValues = useMemo(
    () => ({
      rawMaterials: inventory
        .filter(
          (item) =>
            !/^Packaging\b/i.test(
              typeof item.rawMaterial === "object"
                ? item.rawMaterial?.category || ""
                : "",
            ),
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.quantity || 0) * Number(item.averageCostPerUnit || 0),
          0,
        ),
      packaging: inventory
        .filter((item) =>
          /^Packaging\b/i.test(
            typeof item.rawMaterial === "object"
              ? item.rawMaterial?.category || ""
              : "",
          ),
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.quantity || 0) * Number(item.averageCostPerUnit || 0),
          0,
        ),
    }),
    [inventory],
  );

  const printInventoryValuation = () =>
    printCanaDocument({
      title: "Raw-material inventory valuation",
      reference: `RMV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: "Official stock valuation",
      details: [
        {
          label: "Report date",
          value: new Date().toLocaleDateString("en-RW"),
        },
        { label: "Materials", value: String(filteredInventory.length) },
        {
          label: "Raw-material value",
          value: `${formatMoney(groupValues.rawMaterials)} RWF`,
        },
        {
          label: "Packaging value",
          value: `${formatMoney(groupValues.packaging)} RWF`,
        },
        {
          label: "Displayed stock value",
          value: `${formatMoney(visibleInventoryValue)} RWF`,
        },
      ],
      table: {
        headers: [
          "Code",
          "Raw material",
          "Category",
          "Stock",
          "Average cost / unit",
          "Stock value (RWF)",
          "Status",
        ],
        rows: filteredInventory.map((item) => [
          item.rawMaterialCode,
          item.rawMaterialName,
          typeof item.rawMaterial === "object"
            ? item.rawMaterial?.category || "Raw material"
            : "Raw material",
          `${formatNumber(item.quantity || 0)} ${item.unit}`,
          formatMoney(item.averageCostPerUnit || 0),
          formatMoney(
            Number(item.quantity || 0) * Number(item.averageCostPerUnit || 0),
          ),
          item.status,
        ]),
      },
      notes:
        "Stock value is calculated using current quantity multiplied by the weighted-average inventory cost. Supplier offer prices are not used unless goods are received into stock.",
    });

  const lowStock =
    summary?.lowStockCount ??
    summary?.lowStockItems ??
    inventory.filter((item) => item.status === "Low Stock").length;

  const outOfStock =
    summary?.outOfStockCount ??
    summary?.outOfStockItems ??
    inventory.filter((item) => item.status === "Out of Stock").length;

  const openStockModal = (item: Inventory, mode: TransactionMode) => {
    setSelectedInventory(item);
    setStockModalMode(mode);
    setStockModalOpen(true);
  };

  const handleAddStock = (item: Inventory) => {
    const rawMaterialId =
      typeof item.rawMaterial === "string"
        ? item.rawMaterial
        : item.rawMaterial?._id;
    window.location.assign(
      `/management/raw-materials/lots${rawMaterialId ? `?material=${rawMaterialId}` : ""}`,
    );
  };

  const handleRemoveStock = (item: Inventory) => {
    window.location.assign("/management/production/batches");
  };

  const handleAdjustStock = (item: Inventory) => {
    openStockModal(item, "adjust");
  };

  const handleCloseModal = () => {
    setStockModalOpen(false);
    setSelectedInventory(null);
  };

  const handleStockSuccess = (updatedInventory: Inventory) => {
    setInventory((current) =>
      current.map((item) =>
        item._id === updatedInventory._id ? updatedInventory : item,
      ),
    );

    handleCloseModal();

    window.dispatchEvent(new Event("cana:stock-updated"));
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
    <div className="mx-auto max-w-[1500px] space-y-4">
      {/* Header */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Warehouse size={22} />
              </div>

              <div>
                <p className="cana-section-kicker">Inventory & stores</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  Raw-material store
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/management/raw-materials"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Materials setup
            </Link>
            <Link
              to="/management/raw-materials/lots"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Goods received & lots
            </Link>
            <Link
              to="/management/inventory/stock"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Stock movements
            </Link>
            <button
              type="button"
              onClick={() => void loadInventory(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={printInventoryValuation}
              disabled={!filteredInventory.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer size={16} />
              Print valuation
            </button>
          </div>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<Boxes size={19} />}
          label="Inventory Items"
          value={formatNumber(totalItems)}
        />

        <SummaryCard
          icon={<PackagePlus size={19} />}
          label="Available Stock"
          value={`${formatNumber(totalAvailable)} kg`}
        />

        <SummaryCard
          icon={<CircleDollarSign size={19} />}
          label="Inventory value"
          value={`${formatMoney(totalInventoryValue)} RWF`}
        />

        <SummaryCard
          icon={<AlertTriangle size={19} />}
          label="Low Stock"
          value={formatNumber(lowStock)}
          danger={lowStock > 0}
        />

        <SummaryCard
          icon={<AlertTriangle size={19} />}
          label="Out of Stock"
          value={formatNumber(outOfStock)}
          danger={outOfStock > 0}
        />
      </div>

      <section className="cana-panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-950">
              Stock groups
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Receive and monitor production inputs separately from Indobo,
              stickers and other packaging.
            </p>
          </div>
          <Link
            to="/management/raw-materials"
            className="text-sm font-bold text-red-700 hover:text-red-800"
          >
            Manage material setup
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["All", inventory.length, totalInventoryValue],
            [
              "Raw materials",
              groupCounts.rawMaterials,
              groupValues.rawMaterials,
            ],
            ["Packaging", groupCounts.packaging, groupValues.packaging],
          ].map(([label, count, value]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() =>
                setGroupFilter(label as "All" | "Raw materials" | "Packaging")
              }
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition ${groupFilter === label ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <span>
                <b className="block text-xs">{label}</b>
                <small className="text-[10px] opacity-70">{count} items</small>
              </span>
              <strong className="text-xs">
                {formatMoney(Number(value))} RWF
              </strong>
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="cana-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-lg">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search raw material or code..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              <option value="All">All Status</option>

              <option value="Available">Available</option>

              <option value="Low Stock">Low Stock</option>

              <option value="Out of Stock">Out of Stock</option>

              <option value="Inactive">Inactive</option>
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
      <div className="cana-panel overflow-hidden">
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
    <div className="cana-panel p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-500">
            {label}
          </p>
          <p
            className={`mt-0.5 text-xl font-extrabold tracking-tight ${danger ? "text-red-700" : "text-slate-950"}`}
          >
            {value}
          </p>
        </div>
        {danger && (
          <span className="ml-auto rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
            Attention
          </span>
        )}
      </div>
    </div>
  );
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(value || 0);

export default InventoryPage;
