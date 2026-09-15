import { useState } from "react";
import { Archive, Box, Package, Plus, Search } from "lucide-react";

import ProductTable from "./ProductTable";
import ProductModal from "./ProductModal";
import type { Product } from "./product.types";

function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState({ total: 0, active: 0, stockKg: 0 });
  const [catalogueVersion, setCatalogueVersion] = useState(0);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setCatalogueVersion((version) => version + 1);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl"><p className="cana-section-kicker text-red-700">Commercial catalogue</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Products & finished stock</h1><p className="mt-2 text-sm leading-6 text-slate-500">Maintain saleable products, customer pack labels, commercial prices, and finished-goods quantities in kilograms.</p></div>
          <button type="button" onClick={handleAddProduct} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"><Plus size={17} /> Add product</button>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3"><Metric label="Catalogue products" value={summary.total} icon={Box} /><Metric label="Active for sale" value={summary.active} icon={Package} /><Metric label="Finished stock" value={`${summary.stockKg.toLocaleString()} kg`} icon={Archive} /></div>
      </header>

      <section className="cana-panel p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="relative md:col-span-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or code..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5"
            />
          </div>

          {/* CATEGORY */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5"
          >
            <option value="">All Categories</option>
            <option value="Interior">Interior</option>
            <option value="Exterior">Exterior</option>
            <option value="Primer">Primer</option>
            <option value="Undercoat">Undercoat</option>
            <option value="Wall Master">Wall Master / Putty</option>
            <option value="Other">Other</option>
          </select>

          {/* STATUS */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><span>Stock is controlled by production, authorised adjustments, and store transfers. Pack counts are calculated from kg stock.</span>{(search || category || status) && <button type="button" onClick={() => { setSearch(""); setCategory(""); setStatus(""); }} className="font-bold text-red-700 hover:text-slate-950">Clear filters</button>}</div>
      </section>

      {/* TABLE */}
      <ProductTable
        onEdit={handleEditProduct}
        search={search}
        category={category}
        status={status}
        onSummary={setSummary}
        refreshToken={catalogueVersion}
      />

      {/* MODAL */}
      {isModalOpen && (
        <ProductModal
          isOpen={isModalOpen}
          product={selectedProduct}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Box }) {
  return <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3.5 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm"><Icon size={16} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">{label}</p><p className="mt-0.5 text-lg font-extrabold text-slate-950">{value}</p></div></div>;
}

export default ProductsPage;
