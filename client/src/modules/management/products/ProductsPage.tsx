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
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col justify-between gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:px-8 lg:py-8">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Commercial catalogue</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Finished products</h1><p className="mt-3 text-sm leading-6 text-slate-300">Manage saleable CANA Paints products, customer pack labels, kg-based stock and commercial pricing.</p></div>
          <button type="button" onClick={handleAddProduct} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"><Plus size={18} /> Add product</button>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3"><Metric label="Catalogue products" value={summary.total} icon={Box} /><Metric label="Active for sale" value={summary.active} icon={Package} /><Metric label="Finished stock" value={`${summary.stockKg.toLocaleString()} kg`} icon={Archive} /></div>
      </header>

      <section className="cana-panel p-4 sm:p-5">
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><span>Stock is controlled by production, adjustments, and store transfers.</span>{(search || category || status) && <button type="button" onClick={() => { setSearch(""); setCategory(""); setStatus(""); }} className="font-bold text-red-700 hover:text-slate-950">Clear filters</button>}</div>
      </section>

      {/* TABLE */}
      <ProductTable
        onEdit={handleEditProduct}
        search={search}
        category={category}
        status={status}
        onSummary={setSummary}
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
  return <div className="flex items-center gap-3 px-5 py-4 sm:px-7"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-red-300"><Icon size={18} /></span><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-0.5 text-xl font-extrabold text-white">{value}</p></div></div>;
}

export default ProductsPage;
