import { useState } from "react";
import api from "@/services/api";
export type Customer = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  isCompanyCustomer?: boolean;
  businessName?: string;
  address?: string;
  tin?: string;
};
export default function CustomerForm({
  onCreated,
  onCancel,
  customer,
}: {
  onCreated: (customer: Customer) => void;
  onCancel: () => void;
  customer?: Customer | null;
}) {
  const [form, setForm] = useState(() => ({ fullName: customer?.fullName || "", phone: customer?.phone || "", email: customer?.email || "", isCompanyCustomer: Boolean(customer?.isCompanyCustomer || customer?.businessName), businessName: customer?.businessName || "", address: customer?.address || "", tin: customer?.tin || "" }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="cana-panel space-y-4 p-4 sm:p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError("");
        try {
          const response = customer
            ? await api.patch<{ data: Customer }>(`/users/customers/${customer._id}`, form)
            : await api.post<{ data: Customer }>("/users/customers", form);
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
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><p className="cana-section-kicker">Customer profile</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">{customer ? "Edit customer" : "New customer"}</h2></div><button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-950">Close</button></div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["fullName", "Customer name", "text"],
            ["phone", "Phone number", "tel"],
            ["email", "Email (optional)", "email"],
            ["address", "Address", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="text-sm font-medium">
            {label}
            <input
              required={key === "fullName" || key === "phone" || key === "address"}
              minLength={key === "fullName" ? 3 : undefined}
              type={type}
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5"
            />
          </label>
        ))}
      </div>
      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">Is this a company customer?</legend>
        <div className="mt-2 flex gap-3">
          {[{ label: "No", value: false }, { label: "Yes", value: true }].map((option) => <button key={option.label} type="button" onClick={() => setForm((current) => ({ ...current, isCompanyCustomer: option.value }))} aria-pressed={form.isCompanyCustomer === option.value} className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${form.isCompanyCustomer === option.value ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600 hover:border-black"}`}>{option.label}</button>)}
        </div>
      </fieldset>
      {form.isCompanyCustomer && <div className="grid gap-4 rounded-2xl border border-red-100 bg-red-50/40 p-4 sm:grid-cols-2">{([ ["businessName", "Company name"], ["tin", "TIN number"] ] as const).map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input required value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5" /></label>)}</div>}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <button
          disabled={saving}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : customer ? "Update customer" : "Save customer"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
