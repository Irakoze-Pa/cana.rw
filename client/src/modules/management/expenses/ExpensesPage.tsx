import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Plus, Printer, RefreshCw, WalletCards, XCircle } from "lucide-react";
import api from "@/services/api";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";
import { useConfirmation } from "@/context/confirmationContext";
import { useToast } from "@/context/toastContext";
type Expense = {
  _id: string;
  expenseNumber: string;
  date: string;
  category: string;
  description: string;
  payee?: string;
  amount: number;
  method: string;
  reference?: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  chequeStatus?: "issued" | "due" | "deposited" | "cleared" | "bounced" | "cancelled";
  notes?: string;
};
type TreasuryAccount = { _id: string; name: string; type: "cash" | "bank" | "mobile_money"; balance: number; status: string };
type ExpenseBreakdown = { code: string; name: string; group: string; amount: number };
type FinanceSummary = { revenue: number; expenses: number; netProfit: number; expenseBreakdown: ExpenseBreakdown[] };
const requiredTreasuryType = (method: string): TreasuryAccount["type"] =>
  method === "cash"
    ? "cash"
    : method === "mobile_money"
      ? "mobile_money"
      : "bank";
const treasuryTypeLabel = (type: TreasuryAccount["type"]) =>
  type === "mobile_money" ? "Mobile Money" : type === "cash" ? "Cash" : "Bank";
const categories = [
  "transport",
  "utilities",
  "rent",
  "maintenance",
  "packaging",
  "labour",
  "office",
  "marketing",
  "communication",
  "insurance",
  "security",
  "cleaning",
  "professional_fees",
  "licenses_fees",
  "bank_charges",
  "other",
];
const filterCategories = [...categories, "taxes_fees"];
const categoryLabels: Record<string, string> = {
  transport: "Fuel & transport",
  utilities: "Utilities",
  rent: "Rent",
  maintenance: "Repairs & maintenance",
  packaging: "Office / dispatch packaging",
  labour: "Casual labour",
  office: "Office & administration",
  marketing: "Marketing",
  communication: "Communication & internet",
  insurance: "Insurance",
  security: "Security",
  cleaning: "Cleaning & sanitation",
  professional_fees: "Professional services",
  licenses_fees: "Licences & permits",
  bank_charges: "Bank charges",
  taxes_fees: "Taxes & statutory fees",
  other: "Other operating cost",
};
const emptyExpenseForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  payee: "",
  method: "cash",
  treasuryAccount: "",
  reference: "",
  chequeNumber: "",
  bankName: "",
  chequeDate: new Date().toISOString().slice(0, 10),
  notes: "",
});
const emptyExpenseLine = () => ({ category: "transport", description: "", amount: "" });
const money = (v: number) =>
  Number(v || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const label = (v: string) => categoryLabels[v] || v.replaceAll("_", " ");
export default function ExpensesPage() {
  const { confirm } = useConfirmation();
  const { toast } = useToast();
  const [items, setItems] = useState<Expense[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyExpenseForm);
  const [lines, setLines] = useState([emptyExpenseLine()]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const load = async () => {
    try {
      const [response, treasury] = await Promise.all([
        api.get<{ data: Expense[] }>("/expenses"),
        api.get<{ data: { accounts: TreasuryAccount[] } }>("/accounting/treasury-accounts").catch(() => ({ data: { data: { accounts: [] } } })),
      ]);
      setItems(response.data.data || []);
      setTreasuryAccounts((treasury.data.data.accounts || []).filter((item) => item.status === "active"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load expenses.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    setFinanceLoading(true);
    api.get<{ data: { summary: FinanceSummary } }>(`/accounting/workspace${query.size ? `?${query}` : ""}`)
      .then((response) => { if (!cancelled) setFinanceSummary(response.data.data.summary); })
      .catch(() => { if (!cancelled) setFinanceSummary(null); })
      .finally(() => { if (!cancelled) setFinanceLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, financeRefreshKey]);
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!from || item.date.slice(0, 10) >= from) &&
          (!to || item.date.slice(0, 10) <= to) &&
          (category === "all" || item.category === category),
      ),
    [items, from, to, category],
  );
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const recordedByCategory = useMemo(() => filtered.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] || 0) + Number(item.amount || 0);
    return result;
  }, {}), [filtered]);
  const operatingCosts = (financeSummary?.expenseBreakdown || []).filter((item) => item.group === "Operating expenses").reduce((sum, item) => sum + item.amount, 0);
  const directCosts = (financeSummary?.expenseBreakdown || []).filter((item) => item.group === "Direct costs").reduce((sum, item) => sum + item.amount, 0);
  const financeCosts = (financeSummary?.expenseBreakdown || []).filter((item) => item.group === "Finance costs").reduce((sum, item) => sum + item.amount, 0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/expenses/batch", { ...form, lines: lines.map((line) => ({ ...line, amount: Number(line.amount) })) });
      setOpen(false);
      setForm(emptyExpenseForm());
      setLines([emptyExpenseLine()]);
      await load();
      setFinanceRefreshKey((value) => value + 1);
      toast("Expense recorded and added to the profit and loss view.", "success");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not record expense.",
      );
    }
  };
  const updateCheque = async (item: Expense, status: "deposited" | "cleared" | "bounced" | "cancelled") => {
    if (!item.chequeNumber) return;
    const approved = await confirm({
      title: `${status[0].toUpperCase()}${status.slice(1)} expense cheque`,
      description: status === "cleared" ? `Confirm that cheque ${item.chequeNumber} cleared the bank? Treasury is affected only after this confirmation.` : `Mark cheque ${item.chequeNumber} as ${status}?`,
      confirmLabel: `Mark ${status}`,
      tone: status === "bounced" || status === "cancelled" ? "danger" : "warning",
    });
    if (!approved) return;
    try {
      await api.patch(`/expenses/cheques/${encodeURIComponent(item.chequeNumber)}/status`, { status });
      await load();
      toast(`Expense cheque marked ${status}.`, "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update expense cheque.");
    }
  };
  const printExpense = (item: Expense) => {
    const isCheque = item.method === "bank_cheque";
    const status = isCheque
      ? `Cheque ${label(item.chequeStatus || "issued")}`
      : "Expense record";
    printCanaDocument({
      title: "Expense voucher",
      reference: item.expenseNumber,
      issueDate: item.date,
      status,
      company: "CANAN Business Group Ltd",
      details: [
        { label: "Expense date", value: new Date(item.date).toLocaleDateString("en-RW") },
        { label: "Category", value: label(item.category) },
        { label: "Payee", value: item.payee || "Not specified" },
        { label: "Payment method", value: label(item.method) },
        ...(item.reference ? [{ label: "Payment reference", value: item.reference }] : []),
        ...(item.chequeNumber ? [{ label: "Cheque number", value: item.chequeNumber }] : []),
        ...(item.bankName ? [{ label: "Bank", value: item.bankName }] : []),
        ...(item.chequeDate ? [{ label: "Cheque date", value: new Date(item.chequeDate).toLocaleDateString("en-RW") }] : []),
      ],
      table: {
        headers: ["Expense description", "Amount (RWF)"],
        rows: [[item.description, money(item.amount)]],
      },
      notes: item.notes || (isCheque
        ? `Cheque status at print time: ${label(item.chequeStatus || "issued")}.`
        : "Expense entry recorded in the CANA management system."),
      orientation: "portrait",
      theme: "corporate",
    });
  };
  const print = () =>
    printCanaDocument({
      title: "Expense register",
      reference: `EXP-${from || "START"}-${to || "TODAY"}`,
      status: "Management report",
      details: [
        {
          label: "Period",
          value: `${from || "Beginning"} to ${to || "Today"}`,
        },
        { label: "Expenses", value: filtered.length },
        { label: "Total", value: `${money(total)} RWF` },
      ],
      table: {
        headers: [
          "Date",
          "Reference",
          "Category",
          "Description / payee",
          "Method",
          "Amount (RWF)",
        ],
        rows: filtered.map((item) => [
          item.date.slice(0, 10),
          item.expenseNumber,
          label(item.category),
          `${item.description}${item.payee ? ` · ${item.payee}` : ""}`,
          label(item.method),
          money(item.amount),
        ]),
      },
      notes:
        "This register lists operational expenses recorded in the selected period.",
    });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            Finance control
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track operating costs and see their effect on the selected profit and loss period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={print}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            <Printer size={16} />
            Print register
          </button>
          <button
            onClick={() => {
              setError("");
              setForm(emptyExpenseForm());
              setLines([emptyExpenseLine()]);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={16} />
            Record expense
          </button>
        </div>
      </header>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-3 sm:p-4">
        <label className="min-w-[130px] flex-1 text-[10px] font-extrabold uppercase text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="min-w-[130px] flex-1 text-[10px] font-extrabold uppercase text-slate-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="min-w-[160px] flex-1 text-[10px] font-extrabold uppercase text-slate-500">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {filterCategories.map((x) => (
              <option key={x} value={x}>
                {label(x)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 border-l-2 border-red-700 bg-slate-50 px-3 py-2 sm:ml-auto sm:min-w-48">
          <div><span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Expense records</span><p className="text-[10px] text-slate-500">{filtered.length} entries in view</p></div>
          <p className="text-base font-extrabold tabular-nums text-slate-950">{money(total)} <small className="text-[10px]">RWF</small></p>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2 xl:grid-cols-6">
        {[
          { label: "Recorded expenses", value: total, note: `${filtered.length} expense records`, emphasis: false },
          { label: "Total P&L costs", value: financeSummary?.expenses ?? null, note: "All cost accounts in period", emphasis: false },
          { label: "Operating costs", value: financeSummary ? operatingCosts : null, note: "Includes payroll & statutory", emphasis: false },
          { label: "Cost of goods sold", value: financeSummary ? directCosts : null, note: "Recognized on delivered sales", emphasis: false },
          { label: "Finance costs", value: financeSummary ? financeCosts : null, note: "Interest & bank charges", emphasis: false },
          { label: "Profit / loss", value: financeSummary?.netProfit ?? null, note: "Income less all P&L costs", emphasis: true },
        ].map((metric) => <article key={metric.label} className={`min-w-0 border p-3 sm:p-4 ${metric.emphasis ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>
          <p className={`truncate text-[9px] font-extrabold uppercase tracking-wide ${metric.emphasis ? "text-slate-300" : "text-slate-500"}`}>{metric.label}</p>
          <p className={`mt-1.5 truncate text-base font-black tabular-nums sm:text-lg ${metric.emphasis && (metric.value || 0) < 0 ? "text-red-300" : metric.emphasis ? "text-white" : "text-slate-950"}`}>{financeLoading && metric.label !== "Recorded expenses" ? "—" : metric.value === null ? "—" : `${money(metric.value)} RWF`}</p>
          <p className={`mt-1 truncate text-[9px] ${metric.emphasis ? "text-slate-400" : "text-slate-500"}`}>{metric.note}</p>
        </article>)}
      </section>
      {financeSummary?.expenseBreakdown?.length ? <section className="border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5 sm:px-4"><div><h2 className="text-xs font-extrabold text-slate-950">All profit and loss costs</h2><p className="mt-0.5 text-[10px] text-slate-500">Operating spend, payroll, sold product costs and finance charges</p></div><span className="text-[10px] font-bold text-slate-500">{from || "All dates"}{to ? ` – ${to}` : ""}</span></div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
          {financeSummary.expenseBreakdown.map((item) => <article key={item.code} className="min-w-0 bg-white px-3 py-2.5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-800">{item.name}</p><p className="text-[9px] font-semibold text-slate-500">{item.group} · {item.code}</p></div><strong className="shrink-0 text-[11px] tabular-nums text-slate-950">{money(item.amount)} RWF</strong></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-700" style={{ width: `${Math.min(100, financeSummary.expenses > 0 ? Math.max(0, item.amount) / financeSummary.expenses * 100 : 0)}%` }} /></div></article>)}
        </div>
      </section> : null}
      {Object.keys(recordedByCategory).length > 0 && <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2.5 sm:px-4"><h2 className="text-xs font-extrabold text-slate-950">Expense register by category</h2><p className="mt-0.5 text-[10px] text-slate-500">Matches the date and category filters above</p></div>
        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 xl:grid-cols-5">{Object.entries(recordedByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([name, amount]) => <div key={name} className="flex min-w-0 items-center justify-between gap-2 bg-white px-3 py-2.5"><span className="truncate text-[10px] font-bold text-slate-600">{label(name)}</span><strong className="shrink-0 text-[10px] tabular-nums text-slate-950">{money(amount)} RWF</strong></div>)}</div>
      </section>}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 sm:hidden">
          {filtered.map((item) => <article key={item._id} className="p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-950">{item.expenseNumber} <span className="font-semibold text-slate-500">· {label(item.category)}</span></p><p className="mt-1 text-[10px] text-slate-500">{new Date(item.date).toLocaleDateString("en-RW")} · {item.payee || "Payee not listed"}</p></div><strong className="shrink-0 text-sm font-extrabold tabular-nums text-slate-950">{money(item.amount)} <small className="text-[9px]">RWF</small></strong></div>
            <p className="mt-2 text-xs font-medium text-slate-700">{item.description}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-bold capitalize text-slate-500">{label(item.method)}{item.chequeNumber ? ` · ${item.chequeNumber}` : ""}{item.method === "bank_cheque" ? ` · ${item.chequeStatus || "issued"}` : ""}</span>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => printExpense(item)} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700"><Printer size={12} /> Print</button>{item.method === "bank_cheque" && !["cleared", "bounced", "cancelled"].includes(item.chequeStatus || "issued") && <><button type="button" onClick={() => void updateCheque(item, "deposited")} disabled={item.chequeStatus === "deposited"} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 disabled:hidden">Deposit</button><button type="button" onClick={() => void updateCheque(item, "cleared")} className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white">Clear</button><button type="button" onClick={() => void updateCheque(item, "bounced")} className="rounded border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700">Bounced</button></>}</div>
            </div>
          </article>)}
          {!filtered.length && <p className="px-4 py-10 text-center text-sm text-slate-500">No expenses match this view.</p>}
        </div>
        <div className="hidden max-h-[520px] overflow-auto sm:block">
          <table className="min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Reference</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">Payment</th><th className="px-3 py-2.5 text-right">Amount / action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item._id}>
                  <td className="px-3 py-2.5">
                    {new Date(item.date).toLocaleDateString("en-RW")}
                  </td>
                  <td className="px-3 py-2.5 font-bold">{item.expenseNumber}</td>
                  <td className="px-3 py-2.5 capitalize">
                    {label(item.category)}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.description}
                    <small className="block text-slate-500">
                      {item.payee || "—"}
                    </small>
                  </td>
                  <td className="px-3 py-2.5 capitalize">
                    <p>{label(item.method)}{item.chequeNumber ? ` · ${item.chequeNumber}` : ""}</p>
                    {item.method === "bank_cheque" && <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">{item.chequeStatus || "cleared"}{item.chequeDate ? ` · ${new Date(item.chequeDate).toLocaleDateString("en-RW")}` : ""}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold">
                    <p>{money(item.amount)} RWF</p>
                    <div className="mt-1.5 flex justify-end gap-1"><button title="Print expense voucher" aria-label={`Print expense ${item.expenseNumber}`} type="button" onClick={() => printExpense(item)} className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><Printer size={12} /></button>{item.method === "bank_cheque" && !["cleared", "bounced", "cancelled"].includes(item.chequeStatus || "cleared") && <>{item.chequeStatus !== "deposited" && <button title="Mark deposited" type="button" onClick={() => void updateCheque(item, "deposited")} className="rounded border border-slate-200 p-1.5 text-slate-600"><Banknote size={12} /></button>}<button title="Mark cleared" type="button" onClick={() => void updateCheque(item, "cleared")} className="rounded bg-emerald-700 p-1.5 text-white"><CheckCircle2 size={12} /></button><button title="Mark bounced" type="button" onClick={() => void updateCheque(item, "bounced")} className="rounded border border-red-200 p-1.5 text-red-700"><XCircle size={12} /></button></>}</div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No expenses match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"
          >
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <WalletCards size={20} />
              Record expense
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use this register for operating costs. Supplier purchases, payroll, taxes, and production materials are tracked in their own workflows.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Date
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900">Expense lines</p>
                  <button type="button" onClick={() => setLines((current) => [...current, emptyExpenseLine()])} className="text-xs font-bold text-slate-700">+ Add reason</button>
                </div>
                <div className="space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_120px_auto]"><select value={line.category} onChange={(event) => setLines((current) => current.map((item, position) => position === index ? { ...item, category: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input required value={line.description} onChange={(event) => setLines((current) => current.map((item, position) => position === index ? { ...item, description: event.target.value } : item))} placeholder="Reason / description" className="rounded-lg border border-slate-200 px-2 py-2 text-sm" /><input required min="1" type="number" value={line.amount} onChange={(event) => setLines((current) => current.map((item, position) => position === index ? { ...item, amount: event.target.value } : item))} placeholder="Amount" className="rounded-lg border border-slate-200 px-2 py-2 text-sm" />{lines.length > 1 ? <button type="button" onClick={() => setLines((current) => current.filter((_, position) => position !== index))} className="px-2 text-xs font-bold text-red-700">Remove</button> : <span />}</div>)}</div>
                <p className="mt-2 text-right text-sm font-bold text-slate-700">Total: {money(lines.reduce((sum, line) => sum + Number(line.amount || 0), 0))} RWF</p>
              </div>
              <label className="text-sm font-bold">
                Payee
                <input
                  value={form.payee}
                  onChange={(e) => setForm({ ...form, payee: e.target.value })}
                  placeholder="Who was paid"
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              <label className="text-sm font-bold">
                Payment method
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value, treasuryAccount: "" })}
                  className="mt-1 w-full rounded-xl border p-2.5"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="bank_cheque">Bank cheque</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {treasuryAccounts.length > 0 && <label className="text-sm font-bold">
                Payment account (optional)
                <select
                  value={form.treasuryAccount}
                  onChange={(e) => setForm({ ...form, treasuryAccount: e.target.value })}
                  className="mt-1 w-full rounded-xl border p-2.5"
                >
                  <option value="">Record without treasury posting</option>
                  {treasuryAccounts.map((item) => {
                    const compatible = item.type === requiredTreasuryType(form.method);
                    return (
                      <option key={item._id} value={item._id} disabled={!compatible}>
                        {item.name} · {treasuryTypeLabel(item.type)} · {money(item.balance)} RWF{compatible ? "" : " — change payment method"}
                      </option>
                    );
                  })}
                </select>
              </label>}
              <label className="text-sm font-bold">
                Reference
                <input
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              {form.method === "bank_cheque" && (
                <>
                  <label className="text-sm font-bold">
                    Cheque number
                    <input
                      required
                      value={form.chequeNumber}
                      onChange={(e) =>
                        setForm({ ...form, chequeNumber: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border p-2.5"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Bank name
                    <input
                      required
                      value={form.bankName}
                      onChange={(e) =>
                        setForm({ ...form, bankName: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border p-2.5"
                    />
                  </label>
                  <label className="text-sm font-bold sm:col-span-2">
                    Cheque maturity date
                    <input required type="date" value={form.chequeDate} onChange={(e) => setForm({ ...form, chequeDate: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" />
                  </label>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 sm:col-span-2">The expense is recorded immediately, but the bank balance is reduced only after the cheque is marked cleared.</div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2.5 font-bold"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white">
                Save expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
