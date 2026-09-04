import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import api from "@/services/api";
import CustomerForm, { type Customer } from "./CustomerForm";
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<{ data: Customer[] }>("/users/customers");
      setCustomers(response.data.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = customers.filter((customer) =>
    `${customer.fullName} ${customer.businessName || ""} ${customer.phone} ${customer.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white">
        <div>
          <Users className="mb-3 text-red-300" />
          <h1 className="text-2xl font-bold">Customer directory</h1>
          <p className="mt-2 text-sm text-slate-300">
            {customers.length} active customers · Quotations, orders & billing
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold"
        >
          <Plus size={16} />
          New customer
        </button>
      </header>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}{" "}
          <button onClick={() => void load()} className="underline">
            Retry
          </button>
        </div>
      )}
      {creating && (
        <CustomerForm
          onCancel={() => setCreating(false)}
          onCreated={(customer) => {
            setCustomers((current) =>
              [...current, customer].sort((a, b) =>
                a.fullName.localeCompare(b.fullName),
              ),
            );
            setCreating(false);
          }}
        />
      )}
      <input
        aria-label="Search customers"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search name, phone or email"
        className="h-11 w-full max-w-md rounded-xl border border-gray-200 bg-white px-3 text-sm"
      />
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {["Customer", "Phone", "Email"].map((label) => (
                <th key={label} className="px-5 py-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="p-8 text-center">
                  Loading customers…
                </td>
              </tr>
            ) : (
              visible.map((customer) => (
                <tr key={customer._id}>
                  <td className="px-5 py-4 font-semibold">
                    {customer.fullName}
                  </td>
                  <td className="px-5 py-4">{customer.phone}</td>
                  <td className="px-5 py-4 text-gray-500">
                    {customer.email || "—"}
                  </td>
                </tr>
              ))
            )}
            {!loading && !visible.length && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  No customers found. Add a customer to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
