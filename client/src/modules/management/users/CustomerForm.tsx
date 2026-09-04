import { useState } from "react";
import api from "@/services/api";
export type Customer = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  businessName?: string;
  address?: string;
  tin?: string;
};
export default function CustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (customer: Customer) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", businessName: "", address: "", tin: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError("");
        try {
          const response = await api.post<{ data: Customer }>(
            "/users/customers",
            form,
          );
          onCreated(response.data.data);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to create customer.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">New customer</h2>
      <p className="text-sm text-gray-500">
        Add a customer for quotations, orders, and billing. Portal access can be
        set up separately.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["fullName", "Customer name", "text"],
            ["phone", "Phone number", "tel"],
            ["email", "Email (optional)", "email"],
            ["businessName", "Business / company (optional)", "text"],
            ["address", "Address (optional)", "text"],
            ["tin", "TIN (optional)", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="text-sm font-medium">
            {label}
            <input
              required={key === "fullName" || key === "phone"}
              minLength={key === "fullName" ? 3 : undefined}
              type={type}
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          disabled={saving}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save customer"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
