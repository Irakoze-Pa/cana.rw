import {
  ArrowRight,
  Check,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

export interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  image?: string;
  price: number;
  stock: number;
  unit: string;
  status?: "Active" | "Inactive";
}

type ProductCardProps = {
  product: Product;
  onRequestQuote: (productId: string) => void;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
};

const getStockStatus = (stock: number) => {
  const quantity = Number(stock) || 0;

  if (quantity <= 0) {
    return {
      label: "Out of stock",
      className:
        "border-red-100 bg-red-50 text-red-700",
    };
  }

  if (quantity <= 5) {
    return {
      label: "Limited stock",
      className:
        "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Available",
    className:
      "border-emerald-100 bg-emerald-50 text-emerald-700",
  };
};

const ProductCard = ({
  product,
  onRequestQuote,
}: ProductCardProps) => {
  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);
  const stock = Number(product.stock) || 0;
  const isOutOfStock = stock <= 0;
  const stockStatus = getStockStatus(stock);
  const description = product.description?.trim() ||
    "Professional CANA solution engineered for reliable, durable and beautiful finishes.";
  const hasLongDescription = description.length > 120;

  return (
    <article
      className="
        group
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-[1.5rem]
        border
        border-neutral-200
        bg-white
        shadow-sm
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-neutral-300
        hover:shadow-2xl
      "
    >
      {/* =====================================================
          IMAGE
      ====================================================== */}

      <div
        className="
          relative
          h-56
          w-full
          shrink-0
          overflow-hidden
          bg-neutral-50
          sm:h-64
        "
      >
        {/* Background */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-br
            from-neutral-100
            via-white
            to-neutral-100
          "
        />

        {/* Decorative circle */}

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-1/2
            h-[75%]
            w-[75%]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white
            shadow-[0_20px_60px_rgba(0,0,0,0.05)]
          "
        />

        {/* Product image */}

        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="
              absolute
              inset-0
              z-10
              h-full
              w-full
              object-contain
              p-2
              transition-transform
              duration-700
              ease-out
              group-hover:scale-[1.08]
            "
          />
        ) : (
          <div
            className="
              absolute
              inset-0
              z-10
              flex
              flex-col
              items-center
              justify-center
            "
          >
            <div
              className="
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-2xl
                bg-white
                shadow-sm
              "
            >
              <Package
                size={34}
                strokeWidth={1.5}
                className="text-neutral-300"
              />
            </div>

            <span className="mt-4 text-xs font-medium text-neutral-400">
              Product image unavailable
            </span>
          </div>
        )}

        {/* Bottom gradient */}

        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            z-20
            h-32
            bg-gradient-to-t
            from-black/10
            via-transparent
            to-transparent
          "
        />

        {/* Category */}

        <div className="absolute left-4 top-4 z-30">
          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-white/80
              bg-white/95
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-red-600
              shadow-md
              backdrop-blur-md
            "
          >
            {product.category || "CANA Paints"}
          </span>
        </div>

        {/* Stock */}

        <div className="absolute right-4 top-4 z-30">
          <span
            className={`
              inline-flex
              items-center
              rounded-full
              border
              px-3
              py-1.5
              text-[9px]
              font-bold
              uppercase
              tracking-[0.1em]
              shadow-md
              backdrop-blur-md
              ${stockStatus.className}
            `}
          >
            {stockStatus.label}
          </span>
        </div>

        {/* Product badge */}

        <div
          className="
            absolute
            bottom-4
            left-4
            z-30
            flex
            items-center
            gap-2
            rounded-full
            border
            border-white/70
            bg-white/90
            px-3
            py-2
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.1em]
            text-neutral-600
            shadow-sm
            backdrop-blur-md
          "
        >
          <ShoppingBag size={12} />

          CANA Paints
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Name */}

        <div>
          <h2
            className="
              line-clamp-1
              text-lg
              font-bold
              tracking-tight
              text-neutral-950
              sm:text-xl
            "
          >
            {product.name}
          </h2>

          <p
            className="
              mt-1.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.13em]
              text-neutral-400
            "
          >
            Available in {product.unit || "Unit"}
          </p>
        </div>

        {/* Description */}

        <div className="mt-3 min-h-[76px]">
          <p
            className={`text-xs leading-6 text-neutral-500 ${
              descriptionExpanded ? "" : "line-clamp-2"
            }`}
          >
            {description}
          </p>

          {hasLongDescription && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((expanded) => !expanded)}
              className="mt-1.5 text-xs font-bold text-red-600 transition hover:text-red-700"
              aria-expanded={descriptionExpanded}
            >
              {descriptionExpanded ? "View less" : "View more"}
            </button>
          )}
        </div>

        {/* Price */}

        <div
          className="
            mt-4
            border-t
            border-neutral-100
            pt-4
          "
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.15em]
                  text-neutral-400
                "
              >
                Price per {product.unit || "pack"}
              </p>

              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="
                    text-xl
                    font-bold
                    tracking-tight
                    text-neutral-950
                  "
                >
                  {formatPrice(product.price)}
                </span>

                <span
                  className="
                    text-[10px]
                    font-semibold
                    text-neutral-500
                  "
                >
                  RWF
                </span>
              </div>
            </div>

            {stock > 0 && (
              <div
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-emerald-50
                  px-2.5
                  py-1.5
                  text-[10px]
                  font-semibold
                  text-emerald-700
                "
              >
                <Check size={12} />

                In stock
              </div>
            )}
          </div>
        </div>

        {/* CTA */}

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() =>
            onRequestQuote(product._id)
          }
          className={`
            mt-5
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            px-4
            py-3.5
            text-xs
            font-bold
            transition-all
            duration-300
            ${
              isOutOfStock
                ? "cursor-not-allowed bg-neutral-100 text-neutral-400"
                : "bg-neutral-950 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-lg"
            }
          `}
        >
          {isOutOfStock ? (
            "Currently Unavailable"
          ) : (
            <>
              Request a Quote

              <ArrowRight
                size={15}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
