import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PackageCheck, Plus, Printer, RefreshCw, ShoppingCart, X } from "lucide-react";
import CustomerForm from "../users/CustomerForm";
import api from "@/services/api";
import { useToast } from "@/context/toastContext";
import { printCanaDocument } from "../utils/printCanaDocument";

type Order = {
  _id: string;
  orderNumber: string;
  customer?: { fullName?: string; phone?: string; email?: string };
  subtotal?: number;
  tax?: number;
  total: number;
  status: string;
  deliveryAddress?: string;
  requestedDeliveryDate?: string;
  notes?: string;
  items: {
    product: string;
    productName: string;
    productCode?: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    total?: number;
  }[];
  createdAt: string;
};
type Customer = { _id: string; fullName: string; phone: string };
type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  status: string;
};
const next: Record<string, string[]> = {
  draft: ["confirmed", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["in_production", "ready_for_delivery", "cancelled"],
  in_production: ["ready_for_delivery", "cancelled"],
  ready_for_delivery: ["delivered", "cancelled"],
};
const money = (amount: number) =>
  Number(amount || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });
function printSalesOrder(order: Order) {
  printCanaDocument({
    title: "Sales order",
    issueDate: order.createdAt,
    reference: order.orderNumber,
    status: order.status.replaceAll("_", " "),
    recipient: {
      label: "Customer",
      name: order.customer?.fullName || "Customer",
      lines: [
        order.customer?.phone,
        order.customer?.email,
        order.deliveryAddress,
      ],
    },
    details: [
      { label: "Customer", value: order.customer?.fullName || "Customer" },
      { label: "Phone", value: order.customer?.phone },
      { label: "Email", value: order.customer?.email },
      {
        label: "Order total",
        value: `${money(order.total)} RWF`,
      },
      {
        label: "Order date",
        value: new Date(order.createdAt).toLocaleDateString("en-RW"),
      },
      { label: "Items", value: `${order.items.length}` },
    ],
    table: {
      headers: [
        "Product",
        "Code",
        "Quantity",
        "Unit price (RWF)",
        "Amount (RWF)",
      ],
      rows: order.items.map((item) => [
        item.productName,
        item.productCode,
        `${item.quantity} ${item.unit}`,
        `${money(item.unitPrice || 0)} RWF`,
        `${money(item.total ?? Number(item.unitPrice || 0) * item.quantity)} RWF`,
      ]),
    },
    notes: order.notes,
  });
}

export default function SalesOrdersPage({ view = "orders" }: { view?: "orders" | "fulfilment" }) {
  const { toast } = useToast();
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    deliveryAddress: "",
    requestedDeliveryDate: "",
    notes: "",
  });
  const [orderLines, setOrderLines] = useState([
    { product: "", quantity: "1", unitPrice: "" },
  ]);
  const fulfilmentView = view === "fulfilment";
  const pageTitle = fulfilmentView ? "Order fulfilment" : "Sales orders";
  const pageDescription = fulfilmentView ? "Track confirmed orders from production through dispatch and delivery." : "Create, price and confirm client orders before fulfilment.";
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";
    return (!statusFilter || order.status === statusFilter) && (!fulfilmentView || ["confirmed", "in_production", "ready_for_delivery"].includes(order.status)) && (!dateFrom || orderDate >= dateFrom) && (!dateTo || orderDate <= dateTo) && `${order.orderNumber} ${order.customer?.fullName || ""}`.toLowerCase().includes(search.toLowerCase());
  }), [orders, statusFilter, fulfilmentView, dateFrom, dateTo, search]);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [sales, customerData, productData] = await Promise.all([
        api.get<{ data: Order[] }>("/sales-orders"),
        api.get<{ data: Customer[] }>("/users/customers"),
        api.get<{ data: Product[] }>("/products"),
      ]);
      setOrders(sales.data.data || []);
      setCustomers(customerData.data.data || []);
      setProducts(
        (productData.data.data || []).filter(
          (product) => product.status === "Active",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sales data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const transition = async (id: string, status: string) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.patch<{ data: Order }>(
        `/sales-orders/${id}/status`,
        { status },
      );
      setOrders((current) =>
        current.map((order) => (order._id === id ? response.data.data : order)),
      );
      toast("Sales order status updated.", "success");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update sales order.",
      );
    } finally {
      setSaving(false);
    }
  };
  const setAgreedPrices = async (order: Order) => {
    const prices = [] as Array<{ product: string; unitPrice: number }>;
    for (const item of order.items) {
      const value = window.prompt(`Agreed price for ${item.productName} (RWF per ${item.unit})`, String(item.unitPrice ?? 0));
      if (value === null) return;
      const unitPrice = Number(value);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError(`Enter a valid price for ${item.productName}.`);
      prices.push({ product: item.product, unitPrice });
    }
    try {
      setSaving(true);
      const response = await api.patch<{ data: Order }>(`/sales-orders/${order._id}/prices`, { prices });
      setOrders((current) => current.map((item) => item._id === order._id ? response.data.data : item));
      toast("Agreed prices saved. You can now confirm the order.", "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save agreed prices."); } finally { setSaving(false); }
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const items = orderLines.map((line) => {
      const product = products.find((item) => item._id === line.product);
      return product
        ? {
            product: product._id,
            quantity: Number(line.quantity),
            unit: product.unit,
            unitPrice: Number(line.unitPrice),
          }
        : null;
    });
    if (
      items.some(
        (item) =>
          !item ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0,
      )
    )
      return setError(
        "Select a product, quantity, and valid unit price for every order line.",
      );
    if (
      new Set(orderLines.map((line) => line.product)).size !== orderLines.length
    )
      return setError("Combine repeated products into one line.");
    setSaving(true);
    setError("");
    try {
      const response = await api.post<{ data: Order }>("/sales-orders", {
        ...form,
        items,
        deliveryAddress: form.deliveryAddress,
        requestedDeliveryDate: form.requestedDeliveryDate || undefined,
        notes: form.notes,
      });
      setOrders((current) => [response.data.data, ...current]);
      setCreating(false);
      setForm({
        customer: "",
        deliveryAddress: "",
        requestedDeliveryDate: "",
        notes: "",
      });
      setOrderLines([{ product: "", quantity: "1", unitPrice: "" }]);
      toast("Draft sales order created.", "success");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create sales order.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-red-600">Sales workspace</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {pageDescription}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!fulfilmentView && <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            New sales order
          </button>}
          {fulfilmentView && <Link to="/management/sales/orders" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>New sales order</Link>}
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {!fulfilmentView && addingCustomer && (
        <CustomerForm
          onCancel={() => setAddingCustomer(false)}
          onCreated={(customer) => {
            setCustomers((current) => [...current, customer]);
            setForm((current) => ({ ...current, customer: customer._id }));
            setAddingCustomer(false);
          }}
        />
      )}
      {!fulfilmentView && creating && (
        <form
          onSubmit={create}
          className="grid gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-5 md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <h2 className="font-bold">New sales order</h2>
            <button type="button" onClick={() => setCreating(false)}>
              <X size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setAddingCustomer(true)}
            className="text-left text-sm font-semibold text-red-600"
          >
            + Add a new customer
          </button>
          <select
            aria-label="Customer"
            required
            value={form.customer}
            onChange={(event) =>
              setForm({ ...form, customer: event.target.value })
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.fullName} · {customer.phone}
              </option>
            ))}
          </select>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Order items</p>
              <button
                type="button"
                onClick={() =>
                  setOrderLines((current) => [
                    ...current,
                    { product: "", quantity: "1", unitPrice: "" },
                  ])
                }
                className="text-xs font-bold text-red-600"
              >
                + Add item
              </button>
            </div>
            {orderLines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-2 sm:grid-cols-[1fr_100px_140px_auto] gap-2"
              >
                <select
                  required
                  value={line.product}
                  onChange={(event) =>
                    setOrderLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              product: event.target.value,
                              unitPrice: String(
                                products.find(
                                  (product) =>
                                    product._id === event.target.value,
                                )?.price ?? "",
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} · {money(product.price)} RWF/{product.unit}
                    </option>
                  ))}
                </select>
                <input
                  required
                  min="0.0001"
                  step="any"
                  type="number"
                  value={line.quantity}
                  onChange={(event) =>
                    setOrderLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  aria-label="Quantity"
                  placeholder="Qty"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
                <input
                  required
                  min="0"
                  step="any"
                  type="number"
                  value={line.unitPrice}
                  onChange={(event) =>
                    setOrderLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, unitPrice: event.target.value }
                          : item,
                      ),
                    )
                  }
                  aria-label="Unit price in RWF"
                  placeholder="Price (RWF)"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  disabled={orderLines.length === 1}
                  onClick={() =>
                    setOrderLines((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="rounded-xl px-2 text-xs font-bold text-red-600 disabled:text-gray-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <input
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="Order notes (optional)"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <label className="text-sm">
            Delivery address
            <input
              value={form.deliveryAddress}
              onChange={(event) =>
                setForm({ ...form, deliveryAddress: event.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5"
            />
          </label>
          <label className="text-sm">
            Requested delivery date
            <input
              type="date"
              value={form.requestedDeliveryDate}
              onChange={(event) =>
                setForm({ ...form, requestedDeliveryDate: event.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5"
            />
          </label>
          <p className="text-right font-bold md:col-span-2">
            Order total:{" "}
            {money(
              orderLines.reduce(
                (sum, line) =>
                  sum + Number(line.quantity) * Number(line.unitPrice),
                0,
              ),
            )}{" "}
            RWF
          </p>
          <button
            disabled={saving}
            className="disabled:opacity-50 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2"
          >
            Create draft order
          </button>
        </form>
      )}
      {fulfilmentView && <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><span className="rounded-xl bg-white p-2 text-blue-700"><PackageCheck size={18}/></span><span><strong>Fulfilment queue:</strong> confirmed, in-production and ready-for-delivery orders only. Update each stage here so sales, production and dispatch remain aligned.</span><Link to="/management/sales/orders" className="ml-auto inline-flex items-center gap-1 font-bold text-blue-800">All orders <ArrowRight size={15}/></Link></section>}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="min-w-52 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">Search<input aria-label="Search orders" placeholder="Order number or customer" value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900"/></label><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Order date from<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1.5 block rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900"/></label><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Order date to<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1.5 block rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900"/></label>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status<select aria-label="Filter order status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="mt-1.5 block rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900"
        >
          <option value="">All statuses</option>
          {[...Object.keys(next), "delivered", "cancelled"].map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select></label><div className="ml-auto pb-1 text-sm text-slate-500"><strong className="text-slate-900">{visibleOrders.length}</strong> transaction{visibleOrders.length === 1 ? "" : "s"} shown</div>{(dateFrom || dateTo || search || statusFilter) && <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }} className="pb-1 text-sm font-bold text-red-700">Clear filters</button>}</section>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Loading sales orders…
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-5 py-4 font-semibold">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4">
                      {order.customer?.fullName || "Customer"}
                    </td>
                    <td className="px-5 py-4">
                      {order.items
                        .map(
                          (item) =>
                            `${item.productName} (${item.quantity} ${item.unit})`,
                        )
                        .join(", ")}
                    </td>
                    <td className="px-5 py-4">{money(order.total)} RWF</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => printSalesOrder(order)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-950"
                      >
                        <Printer size={13} />
                        Print order
                      </button>
                      {['draft', 'submitted'].includes(order.status) && <button type="button" disabled={saving} onClick={() => void setAgreedPrices(order)} className="mr-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Set agreed prices</button>}
                      {next[order.status]?.map((status) => (
                        <button
                          key={status}
                          disabled={saving}
                          onClick={() => void transition(order._id, status)}
                          className="mr-2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          {status.replaceAll("_", " ")}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Create the first sales order above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
