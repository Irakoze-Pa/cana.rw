import { ArrowUpRight, Package, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Product = { _id: string; name: string; category?: string; description?: string; image?: string; price?: number; unit?: string; status?: string };
const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/products`);
        const result = await response.json() as { data?: Product[] };
        setProducts((result.data || []).filter((product) => product.status === "Active").slice(0, 3));
      } catch {
        setProducts([]);
      }
    };
    void load();
  }, []);

  return <section className="bg-white py-24 lg:py-32"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><div className="flex items-center gap-3"><span className="h-px w-10 bg-red-600" /><span className="text-xs font-semibold uppercase tracking-[0.25em] text-red-600">CANA Paints</span></div><h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-5xl">Quality for every<br /><span className="text-gray-400">surface and space.</span></h2></div><Link to="/cana-paints/products" className="group inline-flex w-fit items-center gap-3 border-b border-gray-900 pb-2 text-sm font-semibold text-gray-900 transition hover:border-red-600 hover:text-red-600">View all products <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></div>{products.length > 0 ? <div className="mt-16 grid gap-5 md:grid-cols-3">{products.map((product, index) => <Link key={product._id} to={`/cana-paints/request-quote?product=${product._id}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-[#fafafa] transition hover:-translate-y-1 hover:shadow-xl"><div className="relative flex h-72 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 via-white to-gray-100 p-7"><span className="absolute left-5 top-5 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">0{index + 1}</span>{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" /> : <Package size={48} className="text-gray-300" />}</div><div className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">{product.category || "CANA Paints"}</p><h3 className="mt-3 text-xl font-semibold text-gray-950">{product.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-gray-500">{product.description || "A dependable CANA Paints finish for your next project."}</p><div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4"><span className="text-sm font-semibold">{Number(product.price || 0).toLocaleString()} RWF <span className="font-normal text-gray-400">/ {product.unit || "unit"}</span></span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-950 text-white transition group-hover:bg-red-600"><ArrowUpRight size={15} /></span></div></div></Link>)}</div> : <div className="mt-16 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center"><Sparkles className="mx-auto text-red-600" /><p className="mt-3 font-semibold text-gray-900">Our product range is being prepared.</p><Link to="/cana-paints/products" className="mt-4 inline-block text-sm font-semibold text-red-600">Browse the catalogue</Link></div>}</div></section>;
}
