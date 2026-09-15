import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import LoginModal from "@/components/auth/loginModal";
import RegisterModal from "@/components/auth/registerModal";
import { useAuth } from "@/context/authContext";

/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
| Products.tsx is inside:
|
| cana-paints/pages/Products.tsx
|
| ProductCard + ProductGrid are inside:
|
| cana-paints/components/
|
*/

import ProductGrid from "../components/productGrid";
import type { Product } from "../components/productCard";

/* ============================================================
   API
============================================================ */

const API_URL =
  import.meta.env.VITE_API_URL || "/api/v1";

/* ============================================================
   API RESPONSE
============================================================ */

interface ProductsResponse {
  success: boolean;
  data: Product[];
}

/* ============================================================
   PRODUCTS PAGE
============================================================ */

const Products = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  /* ==========================================================
     STATE
  ========================================================== */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loginModalOpen, setLoginModalOpen] =
    useState(false);

  const [registerModalOpen, setRegisterModalOpen] =
    useState(false);

  const [selectedProductId, setSelectedProductId] =
    useState<string | null>(null);

  /* ==========================================================
     FETCH PRODUCTS
  ========================================================== */

  const fetchProducts = async () => {
    try {
      setLoading(true);

      setError("");

      const response = await fetch(
        `${API_URL}/products`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load products (${response.status}).`
        );
      }

      const contentType =
        response.headers.get("content-type");

      if (
        !contentType ||
        !contentType.includes("application/json")
      ) {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      const result: ProductsResponse =
        await response.json();

      if (
        !result.success ||
        !Array.isArray(result.data)
      ) {
        throw new Error(
          "Invalid products response."
        );
      }

      const activeProducts =
        result.data.filter(
          (product) =>
            !product.status ||
            product.status === "Active"
        );

      setProducts(activeProducts);
    } catch (err) {
      console.error(
        "Products fetch error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ==========================================================
     CATEGORIES
  ========================================================== */

  const categories = useMemo(() => {
    const uniqueCategories =
      Array.from(
        new Set(
          products
            .map((product) =>
              product.category?.trim()
            )
            .filter(Boolean)
        )
      );

    return ["All", ...uniqueCategories];
  }, [products]);

  /* ==========================================================
     FILTER PRODUCTS
  ========================================================== */

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" ||
        product.category?.trim() ===
          selectedCategory;

      const searchableText = [
        product.name,
        product.category,
        product.description,
        product.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch
        );

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    products,
    selectedCategory,
    search,
  ]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const availableCount = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock) > 0
    ).length;
  }, [products]);

  const categoryCount =
    Math.max(
      categories.length - 1,
      0
    );

  /* ==========================================================
     QUOTE
  ========================================================== */

  const handleRequestQuote = (
    productId: string
  ) => {
    setSelectedProductId(productId);

    if (user) {
      navigate(
        `/cana-paints/request-quote?product=${productId}`
      );

      setSelectedProductId(null);

      return;
    }

    setLoginModalOpen(true);
  };

  /* ==========================================================
     AFTER LOGIN
  ========================================================== */

  useEffect(() => {
    if (!user || !selectedProductId) {
      return;
    }

    setLoginModalOpen(false);

    setRegisterModalOpen(false);

    const productId =
      selectedProductId;

    setSelectedProductId(null);

    navigate(
      `/cana-paints/request-quote?product=${productId}`
    );
  }, [
    user,
    selectedProductId,
    navigate,
  ]);

  /* ==========================================================
     LOGIN
  ========================================================== */

  const handleCloseLogin = () => {
    setLoginModalOpen(false);

    setSelectedProductId(null);
  };

  const handleOpenRegister = () => {
    setLoginModalOpen(false);

    setRegisterModalOpen(true);
  };

  /* ==========================================================
     REGISTER
  ========================================================== */

  const handleCloseRegister = () => {
    setRegisterModalOpen(false);
  };

  const handleRegisterLogin = () => {
    setRegisterModalOpen(false);

    setLoginModalOpen(true);
  };

  /* ==========================================================
     GENERAL QUOTE
  ========================================================== */

  const handleGeneralQuote = () => {
    if (user) {
      navigate(
        "/cana-paints/request-quote"
      );

      return;
    }

    setSelectedProductId(null);

    setLoginModalOpen(true);
  };

  /* ==========================================================
     FILTER CLEAR
  ========================================================== */

  const clearFilters = () => {
    setSearch("");

    setSelectedCategory("All");
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCategory !== "All";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <main className="min-h-screen bg-white text-neutral-950">

        {/* ==================================================
            HERO
        ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            border-b
            border-neutral-200
            bg-neutral-50
          "
        >
          <div
            className="
              relative
              mx-auto
              max-w-7xl
              px-5
              py-10
              sm:px-8
              sm:py-12
              lg:px-12
              lg:py-14
            "
          >
            <div
              className="
                grid
                gap-8
                lg:grid-cols-[1.15fr_0.85fr]
                lg:items-end
              "
            >
              {/* LEFT */}

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-10 bg-neutral-900" />

                  <span
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.24em]
                      text-neutral-500
                    "
                  >
                    CANA Paints Catalogue
                  </span>
                </div>

                <h1
                  className="
                    max-w-4xl
                    text-4xl
                    font-semibold
                    leading-[0.94]
                    tracking-[-0.055em]
                    sm:text-5xl
                    lg:text-6xl
                  "
                >
                  Quality products.

                  <span className="block text-neutral-400">
                    Beautiful finishes.
                  </span>
                </h1>

                <p
                  className="
                    mt-5
                    max-w-2xl
                    text-sm
                    leading-7
                    text-neutral-500
                    sm:text-base
                    sm:leading-8
                  "
                >
                  Discover CANA Paints products
                  developed for residential,
                  commercial and professional
                  finishing applications.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(
                          "product-catalogue"
                        )
                        ?.scrollIntoView({
                          behavior: "smooth",
                        })
                    }
                    className="
                      group
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-neutral-950
                      px-5
                      py-3
                      text-sm
                      font-semibold
                      text-white
                      shadow-lg
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:bg-neutral-800
                    "
                  >
                    Browse Products

                    <ArrowRight
                      size={16}
                      className="
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                    />
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleGeneralQuote
                    }
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-neutral-300
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-semibold
                      text-neutral-700
                      transition-all
                      hover:border-neutral-950
                      hover:text-neutral-950
                    "
                  >
                    Request Quote
                  </button>
                </div>
              </div>

              {/* RIGHT STAT CARD */}

              <div>
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-neutral-200
                    bg-white
                    shadow-sm
                  "
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-xl
                          bg-neutral-100
                          text-neutral-700
                        "
                      >
                        <Package size={21} />
                      </div>

                      <Sparkles
                        size={19}
                        className="text-neutral-300"
                      />
                    </div>

                    <p
                      className="
                        mt-5
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.18em]
                        text-neutral-400
                      "
                    >
                      Product Collection
                    </p>

                    <div className="mt-3 grid grid-cols-3">
                      <div>
                        <p className="text-2xl font-semibold">
                          {products.length}
                        </p>

                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                          Products
                        </p>
                      </div>

                      <div className="border-x border-neutral-200 px-4">
                        <p className="text-2xl font-semibold">
                          {categoryCount}
                        </p>

                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                          Categories
                        </p>
                      </div>

                      <div className="pl-4">
                        <p className="text-2xl font-semibold">
                          {availableCount}
                        </p>

                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                          Available
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      border-t
                      border-neutral-100
                      bg-neutral-50
                      px-5
                      py-3
                      sm:px-6
                    "
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={14}
                        className="text-emerald-600"
                      />

                      <span className="text-xs font-medium text-neutral-500">
                        Professional paint solutions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            CATALOGUE
        ================================================== */}

        <section
          id="product-catalogue"
          className="
            scroll-mt-20
            mx-auto
            max-w-7xl
            px-5
            py-8
            sm:px-8
            sm:py-10
            lg:px-12
            lg:py-12
          "
        >
          {/* TOOLBAR */}

          {!loading &&
            !error &&
            products.length > 0 && (
              <div className="mb-6">
                <div
                  className="
                    flex
                    flex-col
                    gap-4
                    lg:flex-row
                    lg:items-end
                    lg:justify-between
                  "
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <Filter
                        size={16}
                        className="text-red-600"
                      />

                      <p
                        className="
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.2em]
                          text-red-600
                        "
                      >
                        Product Range
                      </p>
                    </div>

                    <h2
                      className="
                        mt-2
                        text-3xl
                        font-semibold
                        tracking-tight
                        sm:text-4xl
                      "
                    >
                      Find the right product.
                    </h2>

                    <p className="mt-2 text-sm text-neutral-500">
                      Browse our current CANA
                      Paints collection.
                    </p>
                  </div>

                  {/* SEARCH */}

                  <div className="w-full lg:max-w-sm">
                    <div className="relative">
                      <Search
                        size={17}
                        className="
                          pointer-events-none
                          absolute
                          left-4
                          top-1/2
                          -translate-y-1/2
                          text-neutral-400
                        "
                      />

                      <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                          setSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search products..."
                        className="
                          h-12
                          w-full
                          rounded-xl
                          border
                          border-neutral-200
                          bg-white
                          pl-11
                          pr-10
                          text-sm
                          outline-none
                          transition
                          placeholder:text-neutral-400
                          focus:border-neutral-950
                          focus:ring-4
                          focus:ring-neutral-950/5
                        "
                      />

                      {search && (
                        <button
                          type="button"
                          onClick={() =>
                            setSearch("")
                          }
                          aria-label="Clear search"
                          className="
                            absolute
                            right-3
                            top-1/2
                            flex
                            -translate-y-1/2
                            items-center
                            justify-center
                            rounded-lg
                            p-1.5
                            text-neutral-400
                            transition
                            hover:bg-neutral-100
                            hover:text-neutral-950
                          "
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FILTER BAR */}

                <div
                  className="
                    mt-5
                    flex
                    flex-col
                    gap-3
                    border-y
                    border-neutral-200
                    py-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                    {categories.map(
                      (category) => {
                        const active =
                          selectedCategory ===
                          category;

                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() =>
                              setSelectedCategory(
                                category
                              )
                            }
                            className={`
                              whitespace-nowrap
                              rounded-full
                              px-4
                              py-2.5
                              text-xs
                              font-semibold
                              transition-all
                              ${
                                active
                                  ? "bg-neutral-950 text-white"
                                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                              }
                            `}
                          >
                            {category}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <p className="text-xs text-neutral-500">
                      <span className="font-semibold text-neutral-950">
                        {
                          filteredProducts.length
                        }
                      </span>{" "}
                      {filteredProducts.length ===
                      1
                        ? "product"
                        : "products"}
                    </p>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="
                          text-xs
                          font-semibold
                          text-red-600
                          hover:text-red-700
                        "
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
                2xl:grid-cols-4
              "
            >
              {Array.from({
                length: 8,
              }).map((_, index) => (
                <div
                  key={index}
                  className="
                    overflow-hidden
                    rounded-[1.5rem]
                    border
                    border-neutral-200
                    bg-white
                  "
                >
                  <div
                    className="
                      h-[300px]
                      animate-pulse
                      bg-neutral-100
                      sm:h-[330px]
                      lg:h-[360px]
                    "
                  />

                  <div className="space-y-3 p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />

                    <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-100" />

                    <div className="h-10 w-full animate-pulse rounded bg-neutral-100" />

                    <div className="h-12 w-full animate-pulse rounded-xl bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {!loading && error && (
            <div
              className="
                mx-auto
                max-w-xl
                rounded-[2rem]
                border
                border-red-100
                bg-red-50
                p-8
                text-center
                sm:p-10
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  shadow-sm
                "
              >
                <RefreshCw
                  size={21}
                  className="text-red-600"
                />
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Unable to load products
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchProducts}
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-neutral-950
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-red-600
                "
              >
                <RefreshCw size={15} />

                Try Again
              </button>
            </div>
          )}

          {/* ==================================================
              EMPTY
          ================================================== */}

          {!loading &&
            !error &&
            products.length === 0 && (
              <div className="border-y border-neutral-200 py-16 text-center">
                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-neutral-100
                  "
                >
                  <Package
                    size={25}
                    className="text-neutral-400"
                  />
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  Product catalogue is being
                  updated
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-500">
                  Our current product collection
                  is being prepared. Please check
                  again soon.
                </p>

                <button
                  type="button"
                  onClick={fetchProducts}
                  className="
                    mt-6
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-neutral-950
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-red-600
                  "
                >
                  <RefreshCw size={15} />

                  Refresh Catalogue
                </button>
              </div>
            )}

          {/* ==================================================
              NO RESULTS
          ================================================== */}

          {!loading &&
            !error &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <div className="border-y border-neutral-200 py-16 text-center">
                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-neutral-100
                  "
                >
                  <Search
                    size={25}
                    className="text-neutral-400"
                  />
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  No matching products
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-500">
                  We couldn't find a product
                  matching your search or selected
                  category.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    mt-6
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-neutral-950
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-red-600
                  "
                >
                  View All Products

                  <ArrowRight size={15} />
                </button>
              </div>
            )}

          {/* ==================================================
              GRID
          ================================================== */}

          {!loading &&
            !error &&
            filteredProducts.length > 0 && (
              <ProductGrid
                products={filteredProducts}
                onRequestQuote={
                  handleRequestQuote
                }
              />
            )}
        </section>

        {/* ==================================================
            TRUST STRIP
        ================================================== */}

        {!loading &&
          !error &&
          products.length > 0 && (
            <section className="border-y border-neutral-200 bg-neutral-50">
              <div
                className="
                  mx-auto
                  grid
                  max-w-7xl
                  gap-px
                  bg-neutral-200
                  px-5
                  sm:px-8
                  lg:grid-cols-3
                  lg:px-12
                "
              >
                <div className="bg-neutral-50 px-6 py-8 sm:px-8">
                  <div className="flex items-start gap-4">
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-white
                        text-red-600
                        shadow-sm
                      "
                    >
                      <CheckCircle2 size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Quality-focused
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Reliable products for
                        professional finishing
                        applications.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-50 px-6 py-8 sm:px-8">
                  <div className="flex items-start gap-4">
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-white
                        text-red-600
                        shadow-sm
                      "
                    >
                      <Package size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Product availability
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Check current stock status
                        before requesting a
                        quotation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-50 px-6 py-8 sm:px-8">
                  <div className="flex items-start gap-4">
                    <div
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-white
                        text-red-600
                        shadow-sm
                      "
                    >
                      <Sparkles size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Professional support
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Our team can help you select
                        the right solution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* ==================================================
            FINAL CTA
        ================================================== */}

        <section className="relative overflow-hidden bg-neutral-950 text-white">
          <div
            className="
              pointer-events-none
              absolute
              -right-40
              -top-40
              h-96
              w-96
              rounded-full
              bg-red-600/20
              blur-3xl
            "
          />

          <div
            className="
              relative
              mx-auto
              max-w-7xl
              px-5
              py-10
              sm:px-8
              sm:py-12
              lg:px-12
              lg:py-14
            "
          >
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/[0.03]
                px-6
                py-7
                sm:px-8
                lg:px-14
                lg:py-9
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-6
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
                "
              >
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-red-600" />

                    <span
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.2em]
                        text-red-500
                      "
                    >
                      Need assistance?
                    </span>
                  </div>

                  <h2
                    className="
                      mt-4
                      text-3xl
                      font-semibold
                      leading-tight
                      tracking-tight
                      sm:text-4xl
                      lg:text-5xl
                    "
                  >
                    Not sure which paint
                    is right for your project?
                  </h2>

                  <p
                    className="
                      mt-5
                      max-w-xl
                      text-sm
                      leading-7
                      text-neutral-400
                      sm:text-base
                    "
                  >
                    Tell us about your project,
                    surfaces and finishing
                    requirements. Our team can
                    help you choose a suitable
                    CANA Paints solution.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGeneralQuote}
                  className="
                    group
                    inline-flex
                    shrink-0
                    items-center
                    justify-center
                    gap-3
                    rounded-xl
                    bg-red-600
                    px-7
                    py-4
                    text-sm
                    font-semibold
                    text-white
                    shadow-lg
                    shadow-red-600/20
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-white
                    hover:text-neutral-950
                  "
                >
                  Request a Quote

                  <ArrowRight
                    size={17}
                    className="
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ======================================================
          LOGIN MODAL
      ====================================================== */}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={handleCloseLogin}
        onRegister={handleOpenRegister}
        onForgotPassword={() => {
          setLoginModalOpen(false);

          navigate("/forgot-password");
        }}
      />

      {/* ======================================================
          REGISTER MODAL
      ====================================================== */}

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={handleCloseRegister}
        onLogin={handleRegisterLogin}
      />
    </>
  );
};

export default Products;
