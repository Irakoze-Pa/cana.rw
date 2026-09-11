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
  import.meta.env.VITE_API_URL || "/api/v1";

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
  status: "Pending" | "Reviewed" | "Approved" | "Rejected";
  createdAt: string;
}

interface QuotationsResponse {
  success: boolean;
  data: Quotation[];
  message?: string;
}

interface CustomerOrder {
  _id: string;
}

function CustomerDashboard() {
  const { user, token } = useAuth();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
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

  useEffect(() => {
    if (!token) return;
    void fetch(`${API_URL}/sales-orders/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load orders.")))
      .then((result: { data?: CustomerOrder[] }) => setOrders(result.data || []))
      .catch(() => setOrders([]));
  }, [token]);

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

      case "Reviewed":
        return "bg-slate-100 text-slate-700";

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

      case "Reviewed":
        return "Under review";

      case "Rejected":
        return "Rejected";

      default:
        return "Pending";
    }
  };

  const recentQuotations =
    quotations.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.04))]" />
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="relative">
              <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400">
                CANAN Business Group · Customer Portal
              </p>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                Welcome, {user?.fullName || "Customer"}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Manage your quotations, orders and
                CANA account from one place.
              </p>
            </div>

            <div className="relative grid grid-cols-2 gap-2 sm:flex">
              <Link to="/dashboard/orders/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-600">Order now <ArrowRight size={16} /></Link>
              <Link to="/cana-paints/products" className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Products</Link>
            </div>

          </div>
        </section>

        {/* STATS */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:mt-6 lg:grid-cols-3 lg:gap-4">

          {/* QUOTES */}
          <div className="cana-panel p-4 sm:p-5">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Quotes
                </p>

                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">
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
          <div className="cana-panel p-4 sm:p-5">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Orders
                </p>

                <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">
                  {orders.length}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  <Link to="/dashboard/orders" className="font-semibold text-red-600 hover:text-red-700">View my orders</Link>
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
          <div className="cana-panel hidden p-5 lg:block">
            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Account
                </p>

                <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
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
        <section className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[1fr_320px] lg:gap-6">

          {/* QUOTATIONS */}
          <div className="cana-panel overflow-hidden">

            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">

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
                        className="p-4 transition hover:bg-gray-50 sm:p-6"
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
                            .map((item, index) => {
                              const product = item.product;
                              return (
                              <div
                                key={product?._id ?? `unavailable-${index}`}
                                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                              >

                                {product?.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name || "Unavailable product"}
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
                                      product?.name || "Unavailable product"
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
                              );
                            })}

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
          <aside className="order-first space-y-4 lg:order-none lg:space-y-6">

            <div className="cana-panel p-4 sm:p-6">

              <h2 className="font-bold text-black">
                Quick Actions
              </h2>

              <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">

                <Link
                  to="/dashboard/orders/new"
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-3 text-center text-xs font-semibold text-black transition hover:bg-red-600 hover:text-white lg:min-h-0 lg:flex-row lg:justify-start lg:text-sm"
                >
                  <Package size={18} />
                  Place an order
                </Link>

                <Link
                  to="/cana-paints/request-quote"
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-3 text-center text-xs font-semibold text-black transition hover:bg-red-600 hover:text-white lg:min-h-0 lg:flex-row lg:justify-start lg:text-sm"
                >
                  <FileText size={18} />
                  Request Quote
                </Link>

                <Link
                  to="/cana-paints/products"
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-3 text-center text-xs font-semibold text-black transition hover:bg-red-600 hover:text-white lg:min-h-0 lg:flex-row lg:justify-start lg:text-sm"
                >
                  <ShoppingCart size={18} />
                  Browse products
                </Link>

              </div>

            </div>

            {/* ACCOUNT */}
            <div className="cana-panel hidden p-6 lg:block">

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
  );
}

export default CustomerDashboard;
