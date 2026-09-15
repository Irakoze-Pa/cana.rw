import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import api from "@/services/api";
import CustomerForm, { type Customer } from "./CustomerForm";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "company" | "personal">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const response = await api.get<{ data: Customer[] }>("/users/customers"); setCustomers(response.data.data || []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customers."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => customers.filter((customer) => {
    const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName);
    const matchesAccount = accountFilter === "all" || (accountFilter === "company" ? isCompany : !isCompany);
    const text = `${customer.fullName} ${customer.businessName || ""} ${customer.phone} ${customer.email || ""} ${customer.address || ""} ${customer.tin || ""}`.toLowerCase();
    return matchesAccount && text.includes(search.toLowerCase());
  }), [accountFilter, customers, search]);

  return <div className="mx-auto max-w-[1500px] space-y-4">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div><p className="cana-section-kicker">Sales administration</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Customers</h1></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button><button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"><Plus size={16} />New customer</button></div>
    </header>

    {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Try again</button></div>}
    {(creating || editing) && <CustomerForm customer={editing} onCancel={() => { setCreating(false); setEditing(null); }} onCreated={(customer) => { setCustomers((current) => (editing ? current.map((item) => item._id === customer._id ? customer : item) : [...current, customer]).sort((a, b) => a.fullName.localeCompare(b.fullName))); setCreating(false); setEditing(null); }} />}

    <section className="cana-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <label className="relative block min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, company, phone or TIN" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-950" /></label><div className="flex gap-1.5">{([ ["all", "All"], ["company", "Companies"], ["personal", "Personal"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAccountFilter(value)} className={`rounded-lg px-3 py-2 text-sm font-bold ${accountFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div><span className="text-sm text-slate-500"><strong className="text-slate-950">{visible.length}</strong> shown</span>
    </section>

    <section className="cana-panel overflow-hidden"><div className="hidden overflow-x-auto lg:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Contact & delivery address</th><th className="px-6 py-4">Account</th><th className="px-6 py-4">Company & tax</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <LoadingRow /> : visible.map((customer) => <CustomerRow key={customer._id} customer={customer} onEdit={setEditing} />)}{!loading && !visible.length && <EmptyRow query={search} />}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{loading ? <p className="p-8 text-center text-sm text-slate-500">Loading customer records…</p> : visible.map((customer) => <CustomerCard key={customer._id} customer={customer} onEdit={setEditing} />)}{!loading && !visible.length && <p className="p-8 text-center text-sm text-slate-500">{search ? "No customer matches this search." : "No customers yet. Add the first customer to begin."}</p>}</div></section>
  </div>;
}

function AccountBadge({ customer }: { customer: Customer }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isCompany ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{isCompany ? <Building2 size={13} /> : <UserRound size={13} />}{isCompany ? "Company" : "Personal"}</span>; }
function CustomerRow({ customer, onEdit }: { customer: Customer; onEdit: (customer: Customer) => void }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <tr className="transition hover:bg-slate-50/70"><td className="px-6 py-5"><p className="font-bold text-slate-950">{customer.fullName}</p><p className="mt-1 text-xs text-slate-500">{customer.email || "No email recorded"}</p></td><td className="px-6 py-5"><p className="font-semibold text-slate-800">{customer.phone}</p><p className="mt-1 flex max-w-xs items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" />{customer.address || "No address recorded"}</p></td><td className="px-6 py-5"><AccountBadge customer={customer} /></td><td className="px-6 py-5">{isCompany ? <><p className="font-bold text-slate-900">{customer.businessName || "Company name missing"}</p><p className="mt-1 text-xs text-slate-500">TIN: {customer.tin || "Not recorded"}</p></> : <span className="text-slate-400">—</span>}</td><td className="px-6 py-5 text-right"><button type="button" onClick={() => onEdit(customer)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil size={13} />Edit</button></td></tr>; }
function CustomerCard({ customer, onEdit }: { customer: Customer; onEdit: (customer: Customer) => void }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <article className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-950">{customer.fullName}</h2><p className="mt-1 text-sm text-slate-500">{customer.phone}</p></div><AccountBadge customer={customer} /></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm"><p className="text-slate-600">{customer.email || "No email recorded"}</p><p className="flex gap-1.5 text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />{customer.address || "No address recorded"}</p>{isCompany && <div className="rounded-xl bg-red-50/70 p-3 text-sm"><p className="font-bold text-slate-900">{customer.businessName || "Company name missing"}</p><p className="mt-1 text-slate-600">TIN: {customer.tin || "Not recorded"}</p></div>}<button type="button" onClick={() => onEdit(customer)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={13} />Edit customer</button></div></article>; }
function LoadingRow() { return <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500">Loading customer records…</td></tr>; }
function EmptyRow({ query }: { query: string }) { return <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500">{query ? "No customer matches this search." : "No customers yet. Add the first customer to begin."}</td></tr>; }
