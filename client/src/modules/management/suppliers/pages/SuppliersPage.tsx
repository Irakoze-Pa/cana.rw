import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Truck,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import SupplierModal from "../components/SupplierModal";
import SupplierTable from "../components/SupplierTable";

import {
  deleteSupplier,
  getSuppliers,
} from "../services/supplierService";

import type { Supplier } from "../types/supplier.types";
import { useToast } from "@/context/toastContext";
import { useConfirmation } from "@/context/confirmationContext";

function SuppliersPage() {
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  /*
   * LOAD SUPPLIERS
   */

  const loadSuppliers = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getSuppliers();

      setSuppliers(data);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load suppliers."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * INITIAL LOAD
   */

  useEffect(() => {
    loadSuppliers();
  }, []);

  /*
   * FILTER SUPPLIERS
   */

  const filteredSuppliers = useMemo(() => {
    const searchValue = search
      .toLowerCase()
      .trim();

    return suppliers.filter((supplier) => {
      const matchesSearch =
        !searchValue ||
        supplier.name
          .toLowerCase()
          .includes(searchValue) ||
        supplier.code
          ?.toLowerCase()
          .includes(searchValue) ||
        supplier.contactPerson
          ?.toLowerCase()
          .includes(searchValue) ||
        supplier.email
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        supplier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  /*
   * OPEN CREATE MODAL
   */

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  /*
   * OPEN EDIT MODAL
   */

  const handleEditSupplier = (
    supplier: Supplier
  ) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  /*
   * DELETE SUPPLIER
   */

  const handleDeleteSupplier = async (
    supplier: Supplier
  ) => {
    const confirmed = await confirm({ title: "Delete supplier", description: `Delete “${supplier.name}”? This cannot be undone.`, confirmLabel: "Delete supplier", tone: "danger" });

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteSupplier(supplier._id);

      setSuppliers((current) =>
        current.filter(
          (item) => item._id !== supplier._id
        )
      );
      toast(`${supplier.name} was deleted.`, "success");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete supplier."
      );
    }
  };

  /*
   * AFTER CREATE / UPDATE
   */

  const handleSupplierSuccess = (
    supplier: Supplier
  ) => {
    setSuppliers((current) => {
      const exists = current.some(
        (item) => item._id === supplier._id
      );

      if (exists) {
        return current.map((item) =>
          item._id === supplier._id
            ? supplier
            : item
        );
      }

      return [supplier, ...current];
    });
    toast(`${supplier.name} was saved.`, "success");
  };

  /*
   * STATISTICS
   */

  const totalSuppliers = suppliers.length;

  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.status === "Active"
  ).length;

  const inactiveSuppliers = suppliers.filter(
    (supplier) => supplier.status === "Inactive"
  ).length;

  return (
    <div className="space-y-4">
      {/* HEADER */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <Truck
                size={22}
                className="text-red-600"
              />
            </div>

            <div>
              <p className="cana-section-kicker">Procurement & materials</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Suppliers
              </h1>

            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadSuppliers(true)}
            disabled={refreshing}
            className="
              flex
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
              transition
              hover:bg-gray-50
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={17}
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
            onClick={handleAddSupplier}
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
              transition
              hover:bg-red-700
            "
          >
            <Plus size={18} />

            Add Supplier
          </button>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="cana-panel p-4">
          <p className="text-sm text-gray-500">
            Total Suppliers
          </p>

          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {totalSuppliers}
          </p>
        </div>

        <div className="cana-panel p-4">
          <p className="text-sm text-gray-500">
            Active Suppliers
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeSuppliers}
          </p>
        </div>

        <div className="cana-panel p-4">
          <p className="text-sm text-gray-500">
            Inactive Suppliers
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-500">
            {inactiveSuppliers}
          </p>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          className="
            flex
            items-start
            gap-3
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-4
            text-sm
            text-red-700
          "
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {/* FILTERS */}

      <div className="cana-panel p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          {/* SEARCH */}

          <div className="relative flex-1">
            <Search
              size={18}
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search suppliers..."
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                py-3
                pl-11
                pr-4
                text-sm
                outline-none
                transition
                focus:border-red-500
                focus:ring-2
                focus:ring-red-100
              "
            />
          </div>

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "All"
                  | "Active"
                  | "Inactive"
              )
            }
            className="
              rounded-xl
              border
              border-gray-200
              bg-white
              px-4
              py-3
              text-sm
              font-medium
              text-gray-700
              outline-none
              focus:border-red-500
              focus:ring-2
              focus:ring-red-100
            "
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
        </div>
      </div>

      {/* CONTENT */}

      {loading ? (
        <div className="cana-panel p-12 text-center">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-red-600"
          />

          <p className="mt-4 text-sm font-medium text-gray-600">
            Loading suppliers...
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 md:hidden">
            {filteredSuppliers.length === 0 ? (
              <div className="cana-panel p-8 text-center text-sm text-slate-500">
                No suppliers found.
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <article key={supplier._id} className="cana-panel space-y-3 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-slate-950">{supplier.name}</h2>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{supplier.code || "No supplier code"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${supplier.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {supplier.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-y border-slate-100 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Contact</p>
                      <p className="truncate font-semibold text-slate-800">{supplier.contactPerson || supplier.phone || "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Location</p>
                      <p className="truncate font-semibold text-slate-800">{[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}</p>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Email · Terms</p>
                      <p className="truncate text-slate-600">{[supplier.email, supplier.paymentTerms].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => handleEditSupplier(supplier)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50" aria-label={`Edit ${supplier.name}`}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteSupplier(supplier)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-bold text-red-700 hover:bg-red-50" aria-label={`Delete ${supplier.name}`}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="hidden md:block">
            <SupplierTable
              suppliers={filteredSuppliers}
              onEdit={handleEditSupplier}
              onDelete={handleDeleteSupplier}
            />
          </div>
        </>
      )}

      {/* MODAL */}

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={handleSupplierSuccess}
        supplier={selectedSupplier}
      />
    </div>
  );
}

export default SuppliersPage;
