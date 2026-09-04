import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import type { Product } from "./product.types";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

interface ProductTableProps {
  onEdit: (product: Product) => void;
  search?: string;
  category?: string;
  status?: string;
}

function ProductTable({
  onEdit,
  search = "",
  category = "",
  status = "",
}: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/products`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const result = await response.json();

      setProducts(result.data || []);
    } catch (error) {
      console.error("Fetch products error:", error);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // FILTER PRODUCTS
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      !category || product.category === category;

    const matchesStatus =
      !status || product.status === status;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus
    );
  });

  // EDIT
  const handleEdit = (product: Product) => {
    setMenuOpen(null);
    onEdit(product);
  };

  // DELETE
  const handleDelete = async (product: Product) => {
    setMenuOpen(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(product._id);

      const response = await fetch(
        `${API_URL}/products/${product._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete product."
        );
      }

      setProducts((prev) =>
        prev.filter(
          (item) => item._id !== product._id
        )
      );
    } catch (error) {
      console.error(
        "Delete product error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete product."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // LOADING
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading products...
        </div>
      </div>
    );
  }

  // ERROR
  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-600">
          {error}
        </p>

        <button
          type="button"
          onClick={fetchProducts}
          className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  // EMPTY
  if (filteredProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
          <span className="text-lg">📦</span>
        </div>

        <h3 className="mt-4 text-sm font-semibold text-gray-900">
          No products found
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* TABLE HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="font-semibold text-gray-900">
            Product List
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {filteredProducts.length} product
            {filteredProducts.length !== 1
              ? "s"
              : ""}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Product
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pack / kg price
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stock
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr
                key={product._id}
                className="transition hover:bg-gray-50"
              >
                {/* PRODUCT */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-11 w-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                        <span className="text-[9px] text-gray-400">
                          No image
                        </span>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {product.name}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {product.unit} · {Number(product.packSizeKg || 0).toLocaleString()} kg net
                      </p>
                    </div>
                  </div>
                </td>

                {/* CATEGORY */}
                <td className="px-6 py-4 text-sm text-gray-600">
                  {product.category}
                </td>

                {/* PRICE */}
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  {Number(
                    product.price
                  ).toLocaleString()}{" "}
                  RWF / pack

                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    {product.pricePerKg !== null && product.pricePerKg !== undefined
                      ? `${Number(product.pricePerKg).toLocaleString()} RWF / kg`
                      : "Set pack weight"}
                  </p>
                </td>

                {/* STOCK */}
                <td className="px-6 py-4 text-sm text-gray-600">
                  {Number(product.stock || 0).toLocaleString()} kg
                  {Number(product.packSizeKg || 0) > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {(Number(product.stock || 0) / Number(product.packSizeKg)).toLocaleString("en-RW", { maximumFractionDigits: 2 })} packs
                    </p>
                  )}
                </td>

                {/* STATUS */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      product.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>

                {/* ACTION */}
                <td className="relative px-6 py-4 text-right">
                  <button
                    type="button"
                    disabled={
                      deletingId === product._id
                    }
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === product._id
                          ? null
                          : product._id
                      )
                    }
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                  >
                    {deletingId === product._id ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <MoreHorizontal size={18} />
                    )}
                  </button>

                  {/* MENU */}
                  {menuOpen === product._id && (
                    <div className="absolute right-6 top-14 z-30 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(product)
                        }
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(product)
                        }
                        disabled={
                          deletingId === product._id
                        }
                        className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
