import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import type { Product } from "./product.types";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

interface ProductTableProps {
  onEdit: (product: Product) => void;
  search?: string;
  category?: string;
  status?: string;
  onSummary?: (summary: { total: number; active: number; stockKg: number }) => void;
  refreshToken?: number;
}

function ProductTable({
  onEdit,
  search = "",
  category = "",
  status = "",
  onSummary,
  refreshToken = 0,
}: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState("");

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

      const nextProducts = result.data || [];
      setProducts(nextProducts);
      onSummary?.({ total: nextProducts.length, active: nextProducts.filter((product: Product) => product.status === "Active").length, stockKg: nextProducts.reduce((total: number, product: Product) => total + Number(product.stock || 0), 0) });
    } catch (error) {
      console.error("Fetch products error:", error);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, [refreshToken]);

  // FILTER PRODUCTS
  const filteredProducts = products.filter((product) => {
    const matchesSearch = [product.name, product.code, product.category]
      .filter(Boolean)
      .join(" ")
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

  const handlePriceUpdated = (updated: Product) => {
    setProducts((previous) => {
      const next = previous.map((product) => product._id === updated._id ? updated : product);
      onSummary?.({ total: next.length, active: next.filter((product) => product.status === "Active").length, stockKg: next.reduce((total, product) => total + Number(product.stock || 0), 0) });
      return next;
    });
    setPriceProduct(null);
    setNotice(`${updated.name} price updated successfully.`);
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

      setProducts((prev) => {
        const next = prev.filter((item) => item._id !== product._id);
        onSummary?.({ total: next.length, active: next.filter((item) => item.status === "Active").length, stockKg: next.reduce((total, item) => total + Number(item.stock || 0), 0) });
        return next;
      });
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
    <>
    <div className="cana-panel overflow-hidden">
      {/* TABLE HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <p className="cana-section-kicker">Catalogue records</p><h2 className="mt-1 font-extrabold text-slate-950">Product list</h2>

          <p className="mt-1 text-xs text-gray-500">
            {filteredProducts.length} product
            {filteredProducts.length !== 1
              ? "s"
              : ""}
          </p>
        </div>
        {notice && <button type="button" onClick={() => setNotice("")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{notice} ×</button>}
      </div>

      {/* TABLE */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[750px]">
          <thead className="bg-slate-50">
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
                className="transition hover:bg-slate-50/70"
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
                        onClick={() => { setMenuOpen(null); setPriceProduct(product); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <CircleDollarSign size={16} />
                        Update price
                      </button>
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
      <div className="divide-y divide-slate-100 lg:hidden">{filteredProducts.map((product) => <article key={product._id} className="p-5"><div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-400">No image</span>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold text-slate-950">{product.name}</h3><p className="mt-1 text-xs text-slate-500">{product.code} · {product.category}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pack & price</p><p className="mt-1 font-bold text-slate-900">{Number(product.packSizeKg || 0).toLocaleString()} kg · {Number(product.price).toLocaleString()} RWF</p><p className="mt-1 text-xs text-slate-500">{product.pricePerKg != null ? `${Number(product.pricePerKg).toLocaleString()} RWF / kg` : "Set pack weight"}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Finished stock</p><p className="mt-1 font-bold text-slate-900">{Number(product.stock || 0).toLocaleString()} kg</p><p className="mt-1 text-xs text-slate-500">{Number(product.packSizeKg || 0) > 0 ? `${(Number(product.stock || 0) / Number(product.packSizeKg)).toLocaleString("en-RW", { maximumFractionDigits: 2 })} packs` : "No pack set"}</p></div></div><div className="mt-4 flex gap-4"><button type="button" onClick={() => setPriceProduct(product)} className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700"><CircleDollarSign size={15} /> Update price</button><button type="button" onClick={() => handleEdit(product)} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700"><Pencil size={15} /> Edit details</button></div></div></div></article>)}</div>
    </div>
    {priceProduct && <PriceEditor product={priceProduct} onClose={() => setPriceProduct(null)} onSaved={handlePriceUpdated} />}
    </>
  );
}

function PriceEditor({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: (product: Product) => void }) {
  const [price, setPrice] = useState(String(product.price || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const packWeight = Number(product.packSizeKg || 0);
  const nextPrice = Number(price);
  const nextPerKg = packWeight > 0 && Number.isFinite(nextPrice) ? nextPrice / packWeight : null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(nextPrice) || nextPrice < 0) { setError("Enter a valid selling price."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_URL}/products/${product._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, body: JSON.stringify({ price: nextPrice }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update product price.");
      onSaved(result.data as Product);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update product price."); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="presentation"><form onSubmit={save} className="w-full max-w-md rounded-xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className="cana-section-kicker text-red-700">Commercial price</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">Update {product.name}</h2></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="space-y-4 p-5"><div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-bold text-slate-900">Current price: {Number(product.price).toLocaleString()} RWF / {product.unit || "pack"}</p><p className="mt-1 text-xs text-slate-500">Net pack weight: {packWeight.toLocaleString()} kg · Current price per kg: {product.pricePerKg != null ? `${Number(product.pricePerKg).toLocaleString()} RWF` : "not available"}</p></div><label className="block text-xs font-bold uppercase tracking-wide text-slate-600">New selling price (RWF)<input autoFocus required min="0" step="1" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-bold text-slate-950 outline-none focus:border-slate-950" /></label>{nextPerKg != null && <p className="text-xs text-slate-500">New calculated price: <strong className="text-slate-950">{nextPerKg.toLocaleString("en-RW", { maximumFractionDigits: 2 })} RWF / kg</strong></p>}{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save new price"}</button></div></form></div>;
}

export default ProductTable;
