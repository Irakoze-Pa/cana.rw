import { useEffect, useState } from "react";
import { Plus, Printer, RefreshCw, ShoppingCart, X } from "lucide-react";
import api from "@/services/api";
import { printCanaDocument } from "../utils/printCanaDocument";

type Order = {
  _id: string;
  orderNumber: string;
  customer?: { fullName?: string; phone?: string; email?: string };
  subtotal?: number;
  tax?: number;
  total: number;
  status: string;
  notes?: string;
  items: {
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
  confirmed: ["in_production", "ready_for_delivery", "cancelled"],
  in_production: ["ready_for_delivery", "cancelled"],
  ready_for_delivery: ["delivered", "cancelled"],
};
const money = (amount: number) =>
  Number(amount || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
function printSalesOrder(order: Order) {
  printCanaDocument({
    title: order.status === "delivered" ? "Delivery note" : "Sales order",
    reference: order.orderNumber,
    status: order.status.replaceAll("_", " "),
    details: [
      { label: "Customer", value: order.customer?.fullName || "Customer" },
      { label: "Phone", value: order.customer?.phone },
      { label: "Email", value: order.customer?.email },
      {
        label: "Order total",
        value: `${money(order.total)} RWF (tax inclusive)`,
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
        "Unit price (tax incl.)",
        "Amount (tax incl.)",
      ],
      rows: order.items.map((item) => [
        item.productName,
        item.productCode,
        `${item.quantity} ${item.unit}`,
        `${money(item.unitPrice || 0)} RWF`,
        `${money(item.total ?? Number(item.unitPrice || 0) * item.quantity)} RWF`,
      ]),
    },
    notes: order.notes || "All sales prices are tax-inclusive.",
  });
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    notes: "",
  });
  const [orderLines, setOrderLines] = useState([
    { product: "", quantity: "1", unitPrice: "" },
  ]);
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
    try {
      const response = await api.patch<{ data: Order }>(
        `/sales-orders/${id}/status`,
        { status },
      );
      setOrders((current) =>
        current.map((order) => (order._id === id ? response.data.data : order)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update sales order.",
      );
    }
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
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
    try {
      const response = await api.post<{ data: Order }>("/sales-orders", {
        customer: form.customer,
        items,
        notes: form.notes,
      });
      setOrders((current) => [response.data.data, ...current]);
      setCreating(false);
      setForm({ customer: "", notes: "" });
      setOrderLines([{ product: "", quantity: "1", unitPrice: "" }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to create sales order.",
      );
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
            <h1 className="text-2xl font-bold text-gray-900">Sales & orders</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create client orders, then move them through production and
              delivery.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            New sales order
          </button>
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
      {creating && (
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
          <select
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
                className="grid grid-cols-[1fr_100px_140px_auto] gap-2"
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
          <button className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2">
            Create draft order
          </button>
        </form>
      )}
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
              orders.map((order) => (
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
                  <td className="px-5 py-4">{order.total.toLocaleString()}</td>
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
                    {next[order.status]?.map((status) => (
                      <button
                        key={status}
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
