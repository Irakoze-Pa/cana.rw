import { useCallback, useEffect, useState } from "react";
import {
  ShoppingCart,
  FileText,
  User,
  ArrowRight,
  Package,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/context/authContext";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

interface QuotationProduct {
  _id: string;
  name: string;
  category?: string;
  price?: number;
  unit?: string;
  image?: string;
}

interface QuotationItem {
  product: QuotationProduct;
  quantity: number;
  unit: string;
}

interface Quotation {
  _id: string;
  items: QuotationItem[];
  message?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

interface QuotationsResponse {
  success: boolean;
  data: Quotation[];
  message?: string;
}

function CustomerDashboard() {
  const { user, token } = useAuth();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        setError("Please login to view your quotations.");
        return;
      }

      const response = await fetch(
        `${API_URL}/quotations/my`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result: QuotationsResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load quotations."
        );
      }

      setQuotations(result.data || []);
    } catch (error) {
      console.error(
        "Fetch quotations error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load quotations."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchQuotations();
  }, [fetchQuotations]);

  const totalQuotationValue = (quotation: Quotation) => {
    return quotation.items.reduce(
      (total, item) => {
        const price = Number(
          item.product?.price || 0
        );

        return (
          total +
          price * Number(item.quantity || 0)
        );
      },
      0
    );
  };

  const getStatusClass = (
    status: Quotation["status"]
  ) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-700";

      case "Rejected":
        return "bg-red-100 text-red-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const getStatusLabel = (
    status: Quotation["status"]
  ) => {
    switch (status) {
      case "Approved":
        return "Approved";

      case "Rejected":
        return "Rejected";

      default:
        return "Pending";
    }
  };

  const recentQuotations =
    quotations.slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* HEADER */}
        <section className="rounded-3xl bg-black px-6 py-8 text-white md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm font-medium text-gray-400">
                CANA Customer Portal
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                Welcome, {user?.fullName || "Customer"}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                Manage your quotations, orders and
                CANA account from one place.
              </p>
            </div>

            <Link
              to="/cana-paints/products"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
            >
              Browse Products
              <ArrowRight size={17} />
            </Link>

          </div>
        </section>

        {/* STATS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* QUOTES */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Quotes
                </p>

                <p className="mt-2 text-3xl font-extrabold text-black">
                  {quotations.length}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Your quotation requests
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <FileText
                  size={20}
                  className="text-red-600"
                />
              </div>

            </div>
          </div>

          {/* ORDERS */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Orders
                </p>

                <p className="mt-2 text-3xl font-extrabold text-black">
                  0
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Your orders
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <ShoppingCart
                  size={20}
                  className="text-gray-700"
                />
              </div>

            </div>
          </div>

          {/* ACCOUNT */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Account
                </p>

                <p className="mt-2 text-xl font-extrabold text-black">
                  Active
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Customer account
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                <User
                  size={20}
                  className="text-gray-700"
                />
              </div>

            </div>
          </div>

        </section>

        {/* MAIN CONTENT */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* QUOTATIONS */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>
                <h2 className="font-bold text-black">
                  My Quotations
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Your recent quotation requests.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchQuotations}
                disabled={loading}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-black disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

            </div>

            {/* LOADING */}
            {loading && (
              <div className="space-y-4 p-6">

                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-xl bg-gray-50 p-4"
                  >
                    <div className="h-4 w-32 rounded bg-gray-200" />

                    <div className="mt-3 h-3 w-48 rounded bg-gray-200" />

                    <div className="mt-3 h-3 w-24 rounded bg-gray-200" />
                  </div>
                ))}

              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div className="p-8 text-center">

                <p className="text-sm font-medium text-red-600">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchQuotations}
                  className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                  Try Again
                </button>

              </div>
            )}

            {/* EMPTY */}
            {!loading &&
              !error &&
              recentQuotations.length === 0 && (
                <div className="px-6 py-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <FileText
                      size={24}
                      className="text-gray-400"
                    />
                  </div>

                  <h3 className="mt-4 font-bold text-black">
                    No quotations yet
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Request a quote for the products
                    you need.
                  </p>

                  <Link
                    to="/cana-paints/products"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Browse Products
                    <ArrowRight size={16} />
                  </Link>

                </div>
              )}

            {/* QUOTATION LIST */}
            {!loading &&
              !error &&
              recentQuotations.length > 0 && (
                <div className="divide-y divide-gray-100">

                  {recentQuotations.map(
                    (quotation) => (
                      <div
                        key={quotation._id}
                        className="p-6 transition hover:bg-gray-50"
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-3">

                              <h3 className="font-bold text-black">
                                Quote #
                                {quotation._id
                                  .slice(-6)
                                  .toUpperCase()}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                  quotation.status
                                )}`}
                              >
                                {getStatusLabel(
                                  quotation.status
                                )}
                              </span>

                            </div>

                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(
                                quotation.createdAt
                              ).toLocaleDateString(
                                "en-RW",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>

                          </div>

                          <Link
                            to={`/dashboard/quotations/${quotation._id}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-black"
                          >
                            View
                            <ArrowRight
                              size={15}
                            />
                          </Link>

                        </div>

                        {/* PRODUCTS */}
                        <div className="mt-4 flex flex-wrap gap-2">

                          {quotation.items
                            .slice(0, 3)
                            .map((item) => (
                              <div
                                key={
                                  item.product._id
                                }
                                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                              >

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
                                    className="h-8 w-8 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200">
                                    <Package
                                      size={14}
                                      className="text-gray-400"
                                    />
                                  </div>
                                )}

                                <div>
                                  <p className="max-w-32 truncate text-xs font-semibold text-black">
                                    {
                                      item.product
                                        .name
                                    }
                                  </p>

                                  <p className="text-[11px] text-gray-400">
                                    Qty:{" "}
                                    {
                                      item.quantity
                                    }
                                  </p>
                                </div>

                              </div>
                            ))}

                          {quotation.items.length >
                            3 && (
                            <div className="flex items-center rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                              +
                              {quotation.items.length -
                                3}{" "}
                              more
                            </div>
                          )}

                        </div>

                        {/* VALUE */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">

                          <span className="text-xs text-gray-400">
                            Estimated value
                          </span>

                          <span className="text-sm font-bold text-black">
                            {totalQuotationValue(
                              quotation
                            ).toLocaleString()}{" "}
                            RWF
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

          </div>

          {/* QUICK ACTIONS */}
          <aside className="space-y-6">

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

              <h2 className="font-bold text-black">
                Quick Actions
              </h2>

              <div className="mt-4 space-y-3">

                <Link
                  to="/cana-paints/products"
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm font-semibold text-black transition hover:bg-red-600 hover:text-white"
                >
                  <Package size={18} />
                  Browse Products
                </Link>

                <Link
                  to="/cana-paints/request-quote"
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 text-sm font-semibold text-black transition hover:bg-red-600 hover:text-white"
                >
                  <FileText size={18} />
                  Request Quote
                </Link>

              </div>

            </div>

            {/* ACCOUNT */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                  <User size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-black">
                    {user?.fullName}
                  </p>

                  <p className="truncate text-xs text-gray-500">
                    {user?.phone}
                  </p>
                </div>

              </div>

              {user?.email && (
                <p className="mt-4 truncate text-sm text-gray-500">
                  {user.email}
                </p>
              )}

            </div>

          </aside>

        </section>

      </div>
    </main>
  );
}

export default CustomerDashboard;
