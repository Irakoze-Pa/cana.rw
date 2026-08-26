import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "@/context/authContext";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image?: string;
  description?: string;
  status?: "Active" | "Inactive";
}

interface QuoteItem {
  product: Product;
  quantity: number;
}

interface ProductsResponse {
  success?: boolean;
  data?: Product[];
  message?: string;
}

interface QuoteResponse {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    quoteNumber?: string;
    quotationNumber?: string;
  };
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

function RequestQuotePage() {
  const [searchParams] =
    useSearchParams();

  const productId =
    searchParams.get("product");

  const { token, user } = useAuth();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [items, setItems] =
    useState<QuoteItem[]>([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [quoteNumber, setQuoteNumber] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | FETCH PRODUCTS
  |--------------------------------------------------------------------------
  */

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/products`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        );

      if (!contentType?.includes("application/json")) {
        throw new Error(
          "Server returned an invalid response. Please check that the API server is running."
        );
      }

      const result =
        (await response.json()) as ProductsResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load products."
        );
      }

      if (
        result.success === false
      ) {
        throw new Error(
          result.message ||
            "Failed to load products."
        );
      }

      const productList =
        Array.isArray(result.data)
          ? result.data
          : [];

      const activeProducts =
        productList.filter(
          (product) =>
            product.status === undefined ||
            product.status === "Active"
        );

      setProducts(activeProducts);
    } catch (error) {
      console.error(
        "Request quote products error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTO SELECT PRODUCT FROM URL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !productId ||
      products.length === 0
    ) {
      return;
    }

    const selectedProduct =
      products.find(
        (product) =>
          product._id === productId
      );

    if (!selectedProduct) {
      return;
    }

    setItems((currentItems) => {
      const exists =
        currentItems.some(
          (item) =>
            item.product._id ===
            selectedProduct._id
        );

      if (exists) {
        return currentItems;
      }

      return [
        ...currentItems,
        {
          product: selectedProduct,
          quantity: 1,
        },
      ];
    });
  }, [productId, products]);

  /*
  |--------------------------------------------------------------------------
  | ADD PRODUCT
  |--------------------------------------------------------------------------
  */

  const addProduct = (
    product: Product
  ) => {
    setItems((currentItems) => {
      const existing =
        currentItems.find(
          (item) =>
            item.product._id ===
            product._id
        );

      if (existing) {
        return currentItems.map(
          (item) =>
            item.product._id ===
            product._id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
        );
      }

      return [
        ...currentItems,
        {
          product,
          quantity: 1,
        },
      ];
    });

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | INCREASE QUANTITY
  |--------------------------------------------------------------------------
  */

  const increaseQuantity = (
    id: string
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product._id === id
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | DECREASE QUANTITY
  |--------------------------------------------------------------------------
  */

  const decreaseQuantity = (
    id: string
  ) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.product._id === id
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | REMOVE ITEM
  |--------------------------------------------------------------------------
  */

  const removeItem = (
    id: string
  ) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.product._id !== id
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | TOTAL ITEMS
  |--------------------------------------------------------------------------
  */

  const totalItems = items.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  /*
  |--------------------------------------------------------------------------
  | MESSAGE CHANGE
  |--------------------------------------------------------------------------
  */

  const handleMessageChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMessage(e.target.value);
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT QUOTATION
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    /*
    | Authentication
    */

    if (!user || !token) {
      setError(
        "Your session has expired. Please login again."
      );

      return;
    }

    /*
    | Products validation
    */

    if (items.length === 0) {
      setError(
        "Please select at least one product."
      );

      return;
    }

    /*
    | Quantity validation
    */

    const invalidQuantity =
      items.some(
        (item) =>
          !Number.isFinite(
            item.quantity
          ) ||
          item.quantity <= 0
      );

    if (invalidQuantity) {
      setError(
        "Please enter a valid quantity for every product."
      );

      return;
    }

    try {
      setSubmitting(true);

      /*
      | IMPORTANT:
      | Do NOT send price from frontend.
      | Backend should read the current product
      | price from MongoDB.
      */

      const payload = {
        items: items.map((item) => ({
          product:
            item.product._id,

          quantity:
            item.quantity,

          unit:
            item.product.unit,
        })),

        message:
          message.trim(),
      };

      const response =
        await fetch(
          `${API_URL}/quotations`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            credentials: "include",

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      /*
      | Check response type before JSON
      */

      const contentType =
        response.headers.get(
          "content-type"
        );

      let result:
        | QuoteResponse
        | null = null;

      if (
        contentType?.includes(
          "application/json"
        )
      ) {
        result =
          (await response.json()) as QuoteResponse;
      } else {
        const text =
          await response.text();

        console.error(
          "Quotation API returned non-JSON:",
          text
        );

        throw new Error(
          response.status === 404
            ? "Quotation API endpoint was not found. Please check the backend route."
            : "The server returned an invalid response."
        );
      }

      /*
      | API error
      */

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to submit quotation."
        );
      }

      /*
      | Save quotation number
      */

      const generatedQuoteNumber =
        result?.data?.quoteNumber ||
        result?.data?.quotationNumber ||
        "";

      setQuoteNumber(
        generatedQuoteNumber
      );

      /*
      | Success
      */

      setSuccess(true);

      setItems([]);

      setMessage("");
    } catch (error) {
      console.error(
        "Quotation submission error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit quotation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-red-600"
            />

            <p className="mt-4 text-sm font-medium text-gray-500">
              Loading products...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUCCESS
  |--------------------------------------------------------------------------
  */

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center px-5 py-16">
          <div className="w-full rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2
                size={42}
                className="text-green-600"
              />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-red-600">
              CANA Paints
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-black">
              Quote Request Sent
            </h1>

            <p className="mt-4 text-sm leading-7 text-gray-500">
              Thank you,{" "}
              <span className="font-semibold text-black">
                {user?.fullName ||
                  "Customer"}
              </span>
              . Your quotation request has been
              successfully submitted.
            </p>

            {quoteNumber && (
              <div className="mx-auto mt-5 max-w-sm rounded-2xl bg-gray-50 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Quotation Reference
                </p>

                <p className="mt-1 text-lg font-extrabold text-black">
                  {quoteNumber}
                </p>
              </div>
            )}

            <p className="mt-4 text-sm leading-7 text-gray-500">
              Our CANA Paints team will review
              your request and contact you shortly.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                to="/dashboard"
                className="rounded-xl bg-black px-6 py-3.5 text-sm font-bold text-white transition hover:bg-red-600"
              >
                View My Quotations
              </Link>

              <Link
                to="/cana-paints/products"
                className="rounded-xl border border-gray-200 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-gray-50"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HERO / HEADER */}

      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <Link
            to="/cana-paints/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft size={16} />

            Back to products
          </Link>

          <div className="mt-8 max-w-3xl">
            <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-600">
              CANA Paints
            </span>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-black md:text-5xl">
              Request a Quote
            </h1>

            <p className="mt-4 text-base leading-7 text-gray-500 md:text-lg">
              Select the products you need,
              choose quantities and tell us about
              your project. Our team will prepare
              a quotation for you.
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {/* ERROR */}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* NO PRODUCTS */}

        {products.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-lg font-bold text-black">
              No products available
            </p>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no active products
              available for quotation.
            </p>

            <Link
              to="/cana-paints/products"
              className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-bold text-white hover:bg-red-600"
            >
              Back to Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
            {/* PRODUCTS */}

            <div>
              <div className="mb-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                      Products
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold text-black">
                      Select Products
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Add the products you want
                      included in your quotation.
                    </p>
                  </div>

                  <div className="hidden rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm sm:block">
                    {products.length} products
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {products.map((product) => {
                  const selected =
                    items.some(
                      (item) =>
                        item.product._id ===
                        product._id
                    );

                  return (
                    <article
                      key={product._id}
                      className={`overflow-hidden rounded-3xl border bg-white transition duration-300 ${
                        selected
                          ? "border-black shadow-lg"
                          : "border-gray-100 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      {/* IMAGE */}

                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-gray-400">
                            No image
                          </div>
                        )}

                        {selected && (
                          <div className="absolute right-4 top-4 rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">
                            Selected
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}

                      <div className="p-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">
                          {product.category}
                        </p>

                        <h3 className="mt-2 text-lg font-bold text-black">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {product.unit}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            addProduct(
                              product
                            )
                          }
                          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                            selected
                              ? "bg-gray-100 text-black hover:bg-gray-200"
                              : "bg-black text-white hover:bg-red-600"
                          }`}
                        >
                          <Plus size={17} />

                          {selected
                            ? "Add Another"
                            : "Add to Quote"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* QUOTE SUMMARY */}

            <aside>
              <div className="sticky top-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                {/* HEADER */}

                <div className="border-b border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                        Your Request
                      </p>

                      <h2 className="mt-1 text-xl font-extrabold text-black">
                        Quote Summary
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-black">
                      {totalItems}
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    {totalItems === 1
                      ? "1 item selected"
                      : `${totalItems} items selected`}
                  </p>
                </div>

                {/* ITEMS */}

                <div className="max-h-[430px] overflow-y-auto p-6">
                  {items.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 px-5 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
                        <Plus
                          size={20}
                          className="text-gray-400"
                        />
                      </div>

                      <p className="mt-4 text-sm font-bold text-gray-700">
                        No products selected
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        Add products from the list
                        to start your quotation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div
                          key={
                            item.product
                              ._id
                          }
                          className="rounded-2xl border border-gray-100 p-4"
                        >
                          <div className="flex gap-3">
                            {/* IMAGE */}

                            {item.product.image ? (
                              <img
                                src={
                                  item.product
                                    .image
                                }
                                alt={
                                  item.product
                                    .name
                                }
                                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100" />
                            )}

                            {/* DETAILS */}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-black">
                                    {
                                      item
                                        .product
                                        .name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-gray-400">
                                    {
                                      item
                                        .product
                                        .unit
                                    }
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(
                                      item
                                        .product
                                        ._id
                                    )
                                  }
                                  className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                  aria-label={`Remove ${item.product.name}`}
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>
                              </div>

                              {/* QUANTITY */}

                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      decreaseQuantity(
                                        item
                                          .product
                                          ._id
                                      )
                                    }
                                    className="p-2 text-gray-500 transition hover:bg-gray-50 hover:text-black"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus
                                      size={13}
                                    />
                                  </button>

                                  <span className="min-w-9 text-center text-xs font-bold text-black">
                                    {
                                      item.quantity
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      increaseQuantity(
                                        item
                                          .product
                                          ._id
                                      )
                                    }
                                    className="p-2 text-gray-500 transition hover:bg-gray-50 hover:text-black"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus
                                      size={13}
                                    />
                                  </button>
                                </div>

                                <span className="text-xs text-gray-400">
                                  {
                                    item
                                      .product
                                      .unit
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FORM */}

                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="border-t border-gray-100 p-6"
                >
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-bold text-gray-700"
                  >
                    Project Details
                  </label>

                  <textarea
                    id="message"
                    value={message}
                    onChange={
                      handleMessageChange
                    }
                    rows={5}
                    placeholder="Tell us about your project, required colors, delivery location, estimated quantity or any other details..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black"
                  />

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      items.length === 0
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Sending Request...
                      </>
                    ) : (
                      <>
                        <Send size={18} />

                        Submit Quote Request
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-center text-[11px] leading-5 text-gray-400">
                    Your request will be sent to
                    the CANA Paints team for review.
                  </p>
                </form>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default RequestQuotePage;
