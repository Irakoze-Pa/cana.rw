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
};
type TreasuryAccount = { _id: string; name: string; type: "cash" | "bank" | "mobile_money"; balance: number; status: string };
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
  "taxes_fees",
  "other",
];
const knownExpenses = [
  {
    id: "fuel-transport",
    label: "Fuel & transport",
    category: "transport",
    description: "Fuel and transport expense",
  },
  {
    id: "electricity",
    label: "Electricity",
    category: "utilities",
    description: "Electricity bill",
  },
  {
    id: "water",
    label: "Water",
    category: "utilities",
    description: "Water bill",
  },
  {
    id: "factory-rent",
    label: "Factory rent",
    category: "rent",
    description: "Factory rent",
  },
  {
    id: "repairs-maintenance",
    label: "Repairs & maintenance",
    category: "maintenance",
    description: "Repairs and maintenance",
  },
  {
    id: "packaging-supplies",
    label: "Packaging supplies",
    category: "packaging",
    description: "Packaging supplies",
  },
  {
    id: "casual-labour",
    label: "Casual labour",
    category: "labour",
    description: "Casual labour expense",
  },
  {
    id: "office-supplies",
    label: "Office supplies",
    category: "office",
    description: "Office supplies",
  },
  {
    id: "marketing-promotion",
    label: "Marketing & promotion",
    category: "marketing",
    description: "Marketing and promotion",
  },
  {
    id: "government-fees",
    label: "Government taxes & fees",
    category: "taxes_fees",
    description: "Government taxes and fees",
  },
] as const;
const emptyExpenseForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  category: "transport",
  description: "",
  payee: "",
  amount: "",
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
const label = (v: string) => v.replaceAll("_", " ");
export default function ExpensesPage() {
  const { confirm } = useConfirmation();
  const { toast } = useToast();
  const [items, setItems] = useState<Expense[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");
  const [knownExpense, setKnownExpense] = useState("custom");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyExpenseForm);
  const [lines, setLines] = useState([emptyExpenseLine()]);
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
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/expenses/batch", { ...form, lines: lines.map((line) => ({ ...line, amount: Number(line.amount) })) });
      setOpen(false);
      setKnownExpense("custom");
      setForm(emptyExpenseForm());
      setLines([emptyExpenseLine()]);
      await load();
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
            Record operational spending separately from supplier payments and
            payroll.
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
              setKnownExpense("custom");
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
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-bold uppercase text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-bold uppercase text-slate-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-bold uppercase text-slate-500">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((x) => (
              <option key={x} value={x}>
                {label(x)}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto rounded-xl bg-slate-100 px-4 py-2">
          <span className="text-xs font-bold uppercase text-slate-500">
            Total expenses
          </span>
          <p className="text-lg font-extrabold">{money(total)} RWF</p>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[520px] overflow-auto">
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
                    {item.method === "bank_cheque" && !["cleared", "bounced", "cancelled"].includes(item.chequeStatus || "cleared") && <div className="mt-1.5 flex justify-end gap-1">{item.chequeStatus !== "deposited" && <button title="Mark deposited" type="button" onClick={() => void updateCheque(item, "deposited")} className="rounded border border-slate-200 p-1.5 text-slate-600"><Banknote size={12} /></button>}<button title="Mark cleared" type="button" onClick={() => void updateCheque(item, "cleared")} className="rounded bg-emerald-700 p-1.5 text-white"><CheckCircle2 size={12} /></button><button title="Mark bounced" type="button" onClick={() => void updateCheque(item, "bounced")} className="rounded border border-red-200 p-1.5 text-red-700"><XCircle size={12} /></button></div>}
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
              <div className="hidden">
              <label className="text-sm font-bold">
                Known expense
                <select
                  value={knownExpense}
                  onChange={(e) => {
                    const value = e.target.value;
                    setKnownExpense(value);
                    const selected = knownExpenses.find(
                      (expense) => expense.id === value,
                    );
                    if (selected) {
                      setForm({
                        ...form,
                        category: selected.category,
                        description: selected.description,
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-xl border p-2.5"
                >
                  <option value="custom">Custom expense</option>
                  {knownExpenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>
                      {expense.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border p-2.5"
                >
                  {categories.map((x) => (
                    <option key={x} value={x}>
                      {label(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Description
                <input
                  required={false}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              <label className="text-sm font-bold">
                Payee
                <input
                  value={form.payee}
                  onChange={(e) => setForm({ ...form, payee: e.target.value })}
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
              <label className="text-sm font-bold">
                Amount (RWF)
                <input
                  required={false}
                  min="1"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1 w-full rounded-xl border p-2.5"
                />
              </label>
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
