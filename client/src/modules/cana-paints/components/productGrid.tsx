import ProductCard from "./productCard";

import type { Product } from "./productCard";

type ProductGridProps = {
  products: Product[];
  onRequestQuote: (productId: string) => void;
};

const ProductGrid = ({
  products,
  onRequestQuote,
}: ProductGridProps) => {
  if (!products.length) {
    return null;
  }

  return (
    <div
      className="
        grid
        items-stretch
        gap-4
        sm:grid-cols-2
        lg:grid-cols-3
        2xl:grid-cols-4
      "
    >
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onRequestQuote={onRequestQuote}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
