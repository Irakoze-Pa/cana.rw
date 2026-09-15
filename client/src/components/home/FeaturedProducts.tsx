import { ArrowUpRight, Package, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Product = {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  image?: string;
  price?: number;
  unit?: string;
  status?: string;
};

const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl}/products`);
        const result = (await response.json()) as { data?: Product[] };
        const active = (result.data || []).filter((product) => product.status === "Active");
        const terms = ["silk vinyl", "weather guard", "wall master"];
        const featured = terms.flatMap((term) => active.filter((product) => product.name.toLowerCase().includes(term)));
        setProducts((featured.length ? featured : active).slice(0, 3));
      } catch {
        setProducts([]);
      }
    };

    void load();
  }, []);

  return (
    <section className="bg-neutral-50 py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-red-700">
              <span className="h-px w-8 bg-red-700" /> CANA Paints
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-neutral-950 sm:text-4xl">
              Products for every surface.
            </h2>
          </div>
          <Link to="/cana-paints/products" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-neutral-950 transition hover:text-red-700">
            View catalogue <ArrowUpRight size={16} />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {products.map((product) => (
              <Link key={product._id} to={`/cana-paints/request-quote?product=${product._id}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-lg">
                <div className="flex h-44 items-center justify-center bg-neutral-50 p-4 sm:h-48">
                  {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]" /> : <Package size={38} className="text-neutral-300" />}
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-red-700">{product.category || "CANA Paints"}</p>
                  <h3 className="mt-2 text-lg font-bold text-neutral-950">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-neutral-500">{product.description || "A dependable CANA finish for your project."}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <span className="text-sm font-bold text-neutral-950">{Number(product.price || 0).toLocaleString()} RWF <span className="font-medium text-neutral-400">/ {product.unit || "unit"}</span></span>
                    <span className="text-xs font-bold text-red-700">Request quote</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-7 text-center">
            <Sparkles className="mx-auto text-red-700" size={20} />
            <p className="mt-2 text-sm font-semibold text-neutral-900">Our product range is being prepared.</p>
            <Link to="/cana-paints/products" className="mt-3 inline-block text-sm font-bold text-red-700">Browse the catalogue</Link>
          </div>
        )}
      </div>
    </section>
  );
}
