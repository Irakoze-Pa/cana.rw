import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Plus, RefreshCw, Search, UserRound, Users } from "lucide-react";
import api from "@/services/api";
import CustomerForm, { type Customer } from "./CustomerForm";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "company" | "personal">("all");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const response = await api.get<{ data: Customer[] }>("/users/customers"); setCustomers(response.data.data || []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customers."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const companyCustomers = customers.filter((customer) => customer.isCompanyCustomer || customer.businessName);
  const visible = useMemo(() => customers.filter((customer) => {
    const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName);
    const matchesAccount = accountFilter === "all" || (accountFilter === "company" ? isCompany : !isCompany);
    const text = `${customer.fullName} ${customer.businessName || ""} ${customer.phone} ${customer.email || ""} ${customer.address || ""} ${customer.tin || ""}`.toLowerCase();
    return matchesAccount && text.includes(search.toLowerCase());
  }), [accountFilter, customers, search]);

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-950/10">
      <div className="flex flex-col justify-between gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:px-8 lg:py-8">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Sales administration</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Customer directory</h1><p className="mt-3 text-sm leading-6 text-slate-300">Maintain complete customer profiles so quotations, orders, delivery and billing documents stay accurate.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button><button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"><Plus size={17} /> New customer</button></div>
      </div>
      <div className="grid border-t border-white/10 sm:grid-cols-3"><HeaderMetric label="Active customers" value={customers.length} icon={Users} /><HeaderMetric label="Company accounts" value={companyCustomers.length} icon={Building2} /><HeaderMetric label="Personal accounts" value={customers.length - companyCustomers.length} icon={UserRound} /></div>
    </header>

    {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Try again</button></div>}
    {creating && <CustomerForm onCancel={() => setCreating(false)} onCreated={(customer) => { setCustomers((current) => [...current, customer].sort((a, b) => a.fullName.localeCompare(b.fullName))); setCreating(false); }} />}

    <section className="cana-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><label className="block min-w-0 flex-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Find a customer<span className="relative mt-2 block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, company, TIN, phone or address" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/5" /></span></label><div className="flex flex-wrap gap-2">{([ ["all", "All customers"], ["company", "Companies"], ["personal", "Personal"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAccountFilter(value)} className={`rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${accountFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950"}`}>{label}</button>)}</div></div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>Customer records used by sales and finance.</span><span><strong className="text-slate-950">{visible.length}</strong> shown</span></div>
    </section>

    <section className="cana-panel overflow-hidden"><div className="hidden overflow-x-auto lg:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Contact & delivery address</th><th className="px-6 py-4">Account</th><th className="px-6 py-4">Company & tax</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <LoadingRow /> : visible.map((customer) => <CustomerRow key={customer._id} customer={customer} />)}{!loading && !visible.length && <EmptyRow query={search} />}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{loading ? <p className="p-8 text-center text-sm text-slate-500">Loading customer records…</p> : visible.map((customer) => <CustomerCard key={customer._id} customer={customer} />)}{!loading && !visible.length && <p className="p-8 text-center text-sm text-slate-500">{search ? "No customer matches this search." : "No customers yet. Add the first customer to begin."}</p>}</div></section>
  </div>;
}

function HeaderMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <div className="flex items-center gap-3 px-5 py-4 sm:px-7"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-red-300"><Icon size={18} /></span><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-0.5 text-xl font-extrabold text-white">{value}</p></div></div>; }
function AccountBadge({ customer }: { customer: Customer }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isCompany ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{isCompany ? <Building2 size={13} /> : <UserRound size={13} />}{isCompany ? "Company" : "Personal"}</span>; }
function CustomerRow({ customer }: { customer: Customer }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <tr className="transition hover:bg-slate-50/70"><td className="px-6 py-5"><p className="font-bold text-slate-950">{customer.fullName}</p><p className="mt-1 text-xs text-slate-500">{customer.email || "No email recorded"}</p></td><td className="px-6 py-5"><p className="font-semibold text-slate-800">{customer.phone}</p><p className="mt-1 flex max-w-xs items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" />{customer.address || "No address recorded"}</p></td><td className="px-6 py-5"><AccountBadge customer={customer} /></td><td className="px-6 py-5">{isCompany ? <><p className="font-bold text-slate-900">{customer.businessName || "Company name missing"}</p><p className="mt-1 text-xs text-slate-500">TIN: {customer.tin || "Not recorded"}</p></> : <span className="text-slate-400">—</span>}</td></tr>; }
function CustomerCard({ customer }: { customer: Customer }) { const isCompany = Boolean(customer.isCompanyCustomer || customer.businessName); return <article className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-950">{customer.fullName}</h2><p className="mt-1 text-sm text-slate-500">{customer.phone}</p></div><AccountBadge customer={customer} /></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm"><p className="text-slate-600">{customer.email || "No email recorded"}</p><p className="flex gap-1.5 text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />{customer.address || "No address recorded"}</p>{isCompany && <div className="rounded-xl bg-red-50/70 p-3 text-sm"><p className="font-bold text-slate-900">{customer.businessName || "Company name missing"}</p><p className="mt-1 text-slate-600">TIN: {customer.tin || "Not recorded"}</p></div>}</div></article>; }
function LoadingRow() { return <tr><td colSpan={4} className="p-10 text-center text-sm text-slate-500">Loading customer records…</td></tr>; }
function EmptyRow({ query }: { query: string }) { return <tr><td colSpan={4} className="p-10 text-center text-sm text-slate-500">{query ? "No customer matches this search." : "No customers yet. Add the first customer to begin."}</td></tr>; }
