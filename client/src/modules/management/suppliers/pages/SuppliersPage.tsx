import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Truck,
  AlertCircle,
} from "lucide-react";

import SupplierModal from "../components/SupplierModal";
import SupplierTable from "../components/SupplierTable";

import {
  deleteSupplier,
  getSuppliers,
} from "../services/supplierService";

import type { Supplier } from "../types/supplier.types";

function SuppliersPage() {
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
          .toLowerCase()
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
   * VIEW SUPPLIER
   */

  const handleViewSupplier = (
    supplier: Supplier
  ) => {
    alert(
      `Supplier: ${supplier.name}\nCode: ${supplier.code}\nContact: ${
        supplier.contactPerson || "N/A"
      }`
    );
  };

  /*
   * DELETE SUPPLIER
   */

  const handleDeleteSupplier = async (
    supplier: Supplier
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${supplier.name}"?`
    );

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
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

              <p className="mt-1 text-sm text-gray-500">
                Manage raw material suppliers and
                supplier information.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Total Suppliers
          </p>

          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {totalSuppliers}
          </p>
        </div>

        <div className="cana-panel p-5">
          <p className="text-sm text-gray-500">
            Active Suppliers
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeSuppliers}
          </p>
        </div>

        <div className="cana-panel p-5">
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
            mb-6
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

          <div>
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* FILTERS */}

      <div className="cana-panel mb-6 p-4">
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
        <SupplierTable
          suppliers={filteredSuppliers}
          onEdit={handleEditSupplier}
          onDelete={handleDeleteSupplier}
          onView={handleViewSupplier}
        />
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
