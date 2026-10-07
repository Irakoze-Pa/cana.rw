import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useConfirmation } from "@/context/confirmationContext";
import { useToast } from "@/context/toastContext";
import api from "@/services/api";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type Account = { code: string; name: string; type: AccountType; group: string };
type LedgerLine = { accountCode: string; accountName: string; debit: number; credit: number; memo?: string };
type LedgerEntry = { id: string; date: string; source: string; reference: string; description: string; status: string; lines: LedgerLine[] };
type TrialRow = Account & { debitMovement: number; creditMovement: number; debitBalance: number; creditBalance: number };
type Summary = { revenue: number; expenses: number; netProfit: number; assets: number; liabilities: number; equity: number; cashAndBank: number; receivables: number; payables: number; entryCount: number };
type Journal = { _id: string; journalNumber: string; date: string; description: string; reference?: string; status: "draft" | "posted" | "void"; lines: LedgerLine[]; createdBy?: { fullName?: string } };
type Workspace = { summary: Summary; accounts: Account[]; ledger: LedgerEntry[]; trialBalance: TrialRow[]; journals: Journal[] };
type Tab = "overview" | "ledger" | "trial" | "journals";
type DraftLine = { accountCode: string; debit: string; credit: string; memo: string };

const emptySummary: Summary = { revenue: 0, expenses: 0, netProfit: 0, assets: 0, liabilities: 0, equity: 0, cashAndBank: 0, receivables: 0, payables: 0, entryCount: 0 };
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth(), 1).toISOString().slice(0, 10); };
const money = (value: number) => `${Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })} RWF`;
const compactMoney = (value: number) => `${new Intl.NumberFormat("en-RW", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0))} RWF`;
const displayDate = (value: string) => new Date(value).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" });
const title = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const emptyLine = (): DraftLine => ({ accountCode: "", debit: "", credit: "", memo: "" });

export default function AccountingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [tab, setTab] = useState<Tab>("overview");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [trial, setTrial] = useState<TrialRow[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [expanded, setExpanded] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [journalOpen, setJournalOpen] = useState(false);
  const canJournal = user?.role === "admin" || user?.role === "superadmin" || (user?.role === "staff" && user.department === "finance");
  const canPostJournal = user?.role === "admin" || user?.role === "superadmin";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from, to }).toString();
      const result = await api.get<{ data: Workspace }>(`/accounting/workspace?${query}`);
      const workspace = result.data.data;
      setSummary(workspace.summary || emptySummary);
      setAccounts(workspace.accounts || []);
      setLedger(workspace.ledger || []);
      setTrial(workspace.trialBalance || []);
      setJournals(workspace.journals || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load accounting records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [from, to]);

  const periodDebit = useMemo(() => ledger.flatMap((item) => item.lines).reduce((sum, item) => sum + Number(item.debit || 0), 0), [ledger]);
  const trialDebit = trial.reduce((sum, item) => sum + item.debitBalance, 0);
  const trialCredit = trial.reduce((sum, item) => sum + item.creditBalance, 0);
  const groupedAccounts = useMemo(() => Object.entries(accounts.reduce<Record<string, Account[]>>((groups, item) => ({ ...groups, [item.group]: [...(groups[item.group] || []), item] }), {})), [accounts]);

  const printReport = () => {
    if (tab === "ledger") {
      printCanaDocument({ title: "General ledger", reference: `GL-${from.replaceAll("-", "")}-${to.replaceAll("-", "")}`, status: "Accounting register", details: [{ label: "Period", value: `${from} to ${to}` }, { label: "Posted transactions", value: ledger.length }, { label: "Total debits", value: money(periodDebit) }], table: { headers: ["Date", "Source", "Reference", "Description", "Debit", "Credit"], rows: ledger.flatMap((item) => item.lines.map((line) => [displayDate(item.date), item.source, item.reference, `${line.accountCode} · ${line.accountName}`, money(line.debit), money(line.credit)])) }, notes: "System-generated and posted manual entries. Debits and credits must remain equal." });
      return;
    }
    if (tab === "trial") {
      printCanaDocument({ title: "Trial balance", reference: `TB-${to.replaceAll("-", "")}`, status: "As-at accounting report", details: [{ label: "As at", value: to }, { label: "Total debit", value: money(trialDebit) }, { label: "Total credit", value: money(trialCredit) }], table: { headers: ["Code", "Account", "Type", "Debit balance", "Credit balance"], rows: trial.map((item) => [item.code, item.name, title(item.type), money(item.debitBalance), money(item.creditBalance)]) }, notes: "A balanced trial balance confirms equal debit and credit postings, but does not replace period-end review and reconciliation." });
      return;
    }
    printCanaDocument({ title: "Finance & accounting summary", reference: `FAS-${from.replaceAll("-", "")}-${to.replaceAll("-", "")}`, status: "Management accounts", details: [{ label: "Period", value: `${from} to ${to}` }, { label: "Revenue", value: money(summary.revenue) }, { label: "Expenses", value: money(summary.expenses) }, { label: "Net result", value: money(summary.netProfit) }], table: { headers: ["Financial position", "Amount"], rows: [["Cash and bank", money(summary.cashAndBank)], ["Customer receivables", money(summary.receivables)], ["Supplier payables", money(summary.payables)], ["Total assets", money(summary.assets)], ["Total liabilities", money(summary.liabilities)], ["Equity and current result", money(summary.equity)]] }, notes: "Generated from posted operational records and posted manual journals in CANA." });
  };

  const postJournal = async (journal: Journal) => {
    const accepted = await confirm({ title: "Post accounting journal", description: `Post ${journal.journalNumber}? Posting makes this adjustment part of the general ledger and financial statements.`, confirmLabel: "Post journal", tone: "warning" });
    if (!accepted) return;
    try {
      await api.post(`/accounting/journals/${journal._id}/post`);
      toast("Journal posted to the general ledger.", "success");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to post journal."); }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Financial overview", icon: CircleDollarSign },
    { key: "ledger", label: "General ledger", icon: BookOpen },
    { key: "trial", label: "Trial balance", icon: Scale },
    { key: "journals", label: "Manual journals", icon: WalletCards },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b-2 border-slate-950 pb-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-red-700">Finance control</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Finance & accounting</h1>
          <p className="mt-1 text-sm text-slate-500">Ledger, financial position and controlled adjustments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canJournal && <button type="button" onClick={() => setJournalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-800"><Plus size={16} />New journal</button>}
          <button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:border-slate-950"><Printer size={16} />Print</button>
          <button type="button" onClick={() => void load()} aria-label="Refresh accounting" className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:border-slate-950"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </header>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="flex flex-col gap-3 border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Accounting sections">
          {tabs.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${tab === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon size={15} />{item.label}</button>; })}
        </nav>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-extrabold uppercase text-slate-500">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800" /></label>
          <label className="text-[10px] font-extrabold uppercase text-slate-500">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800" /></label>
        </div>
      </section>

      {tab === "overview" && <Overview summary={summary} loading={loading} groupedAccounts={groupedAccounts} />}
      {tab === "ledger" && <LedgerTable entries={ledger} loading={loading} expanded={expanded} setExpanded={setExpanded} />}
      {tab === "trial" && <TrialBalance rows={trial} loading={loading} debit={trialDebit} credit={trialCredit} />}
      {tab === "journals" && <JournalRegister journals={journals} loading={loading} canPost={canPostJournal} onPost={postJournal} />}
      {journalOpen && <JournalModal accounts={accounts} onClose={() => setJournalOpen(false)} onSaved={async () => { setJournalOpen(false); await load(); }} />}
    </div>
  );
}

function Overview({ summary, loading, groupedAccounts }: { summary: Summary; loading: boolean; groupedAccounts: [string, Account[]][] }) {
  const metrics = [
    { label: "Revenue", value: summary.revenue, icon: ArrowUpRight },
    { label: "Operating costs", value: summary.expenses, icon: ArrowDownLeft },
    { label: "Net result", value: summary.netProfit, icon: CircleDollarSign },
    { label: "Cash & bank", value: summary.cashAndBank, icon: Landmark },
    { label: "Customer receivables", value: summary.receivables, icon: WalletCards },
    { label: "Supplier payables", value: summary.payables, icon: BookOpen },
  ];
  return <>
    <section className="grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="min-w-0 bg-white p-3 sm:p-4"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 sm:text-[10px]">{metric.label}</p><Icon size={15} className="hidden text-slate-400 sm:block" /></div><p className={`mt-2 truncate text-lg font-extrabold tracking-tight sm:text-xl ${metric.label === "Net result" && metric.value < 0 ? "text-red-700" : "text-slate-950"}`} title={money(metric.value)}>{loading ? "—" : compactMoney(metric.value)}</p></article>; })}
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <div className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-extrabold text-slate-950">Management accounts</h2><p className="text-xs text-slate-500">Income statement for the period and position as at the end date.</p></div>
        <div className="grid sm:grid-cols-2">
          <Statement title="Income statement" rows={[["Sales revenue", summary.revenue], ["Operating and direct costs", -summary.expenses], ["Net profit / (loss)", summary.netProfit]]} />
          <Statement title="Financial position" rows={[["Total assets", summary.assets], ["Total liabilities", -summary.liabilities], ["Equity & current result", summary.equity]]} />
        </div>
      </div>
      <div className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-extrabold text-slate-950">Chart of accounts</h2><p className="text-xs text-slate-500">Controlled accounts used by automatic and manual postings.</p></div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {groupedAccounts.map(([group, items]) => <div key={group} className="px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{group}</p><div className="mt-1.5 grid gap-1 sm:grid-cols-2">{items.map((item) => <p key={item.code} className="truncate text-xs text-slate-600"><b className="mr-2 text-slate-950">{item.code}</b>{item.name}</p>)}</div></div>)}
        </div>
      </div>
    </section>
  </>;
}

function Statement({ title: heading, rows }: { title: string; rows: [string, number][] }) {
  return <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r"><h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{heading}</h3><div className="mt-3 divide-y divide-slate-100">{rows.map(([label, value], index) => <div key={label} className={`flex items-center justify-between gap-3 py-2 text-sm ${index === rows.length - 1 ? "font-extrabold text-slate-950" : "text-slate-600"}`}><span>{label}</span><span className={value < 0 ? "text-red-700" : ""}>{money(Math.abs(value))}{value < 0 ? " DR" : ""}</span></div>)}</div></div>;
}

function LedgerTable({ entries, loading, expanded, setExpanded }: { entries: LedgerEntry[]; loading: boolean; expanded: string; setExpanded: (value: string) => void }) {
  return <section className="overflow-hidden border border-slate-200 bg-white"><div className="max-h-[65vh] overflow-auto"><table className="min-w-[850px] w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase tracking-wide text-white"><tr><th className="w-9 px-3 py-3" /><th className="px-3 py-3">Date</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Debit</th><th className="px-3 py-3 text-right">Credit</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((item) => { const debit = item.lines.reduce((sum, line) => sum + line.debit, 0); const open = expanded === item.id; return <LedgerRows key={`${item.source}-${item.id}`} item={item} debit={debit} open={open} onToggle={() => setExpanded(open ? "" : item.id)} />; })}{!loading && !entries.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">No posted accounting entries in this period.</td></tr>}</tbody></table></div></section>;
}

function LedgerRows({ item, debit, open, onToggle }: { item: LedgerEntry; debit: number; open: boolean; onToggle: () => void }) {
  return <>{<tr onClick={onToggle} className="cursor-pointer hover:bg-slate-50"><td className="px-3 py-3 text-slate-400">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td><td className="whitespace-nowrap px-3 py-3">{displayDate(item.date)}</td><td className="px-3 py-3 font-semibold">{item.source}</td><td className="px-3 py-3 font-bold text-slate-950">{item.reference}</td><td className="max-w-xs truncate px-3 py-3 text-slate-600">{item.description}</td><td className="px-3 py-3 text-right font-semibold">{money(debit)}</td><td className="px-3 py-3 text-right font-semibold">{money(debit)}</td></tr>}{open && <tr><td colSpan={7} className="bg-slate-50 px-4 py-3"><div className="ml-6 overflow-hidden border border-slate-200 bg-white"><table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{item.lines.map((line, index) => <tr key={`${line.accountCode}-${index}`}><td className="w-20 px-3 py-2 font-extrabold">{line.accountCode}</td><td className="px-3 py-2 text-slate-600">{line.accountName}{line.memo ? ` · ${line.memo}` : ""}</td><td className="w-36 px-3 py-2 text-right font-semibold">{line.debit ? money(line.debit) : "—"}</td><td className="w-36 px-3 py-2 text-right font-semibold">{line.credit ? money(line.credit) : "—"}</td></tr>)}</tbody></table></div></td></tr>}</>;
}

function TrialBalance({ rows, loading, debit, credit }: { rows: TrialRow[]; loading: boolean; debit: number; credit: number }) {
  const balanced = Math.abs(debit - credit) < 0.01;
  return <section className="overflow-hidden border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="font-extrabold">Trial balance</h2><p className="text-xs text-slate-500">Closing balances through the selected end date.</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}><CheckCircle2 size={14} />{balanced ? "Balanced" : "Review required"}</span></div><div className="max-h-[62vh] overflow-auto"><table className="min-w-[720px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Debit balance</th><th className="px-4 py-3 text-right">Credit balance</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.code}><td className="px-4 py-2.5 font-extrabold">{item.code}</td><td className="px-4 py-2.5 font-semibold">{item.name}</td><td className="px-4 py-2.5 capitalize text-slate-500">{item.type}</td><td className="px-4 py-2.5 text-right">{item.debitBalance ? money(item.debitBalance) : "—"}</td><td className="px-4 py-2.5 text-right">{item.creditBalance ? money(item.creditBalance) : "—"}</td></tr>)}{!loading && !rows.length && <tr><td colSpan={5} className="p-12 text-center text-slate-500">No account balances are available.</td></tr>}</tbody><tfoot className="sticky bottom-0 bg-slate-950 font-extrabold text-white"><tr><td colSpan={3} className="px-4 py-3">Total</td><td className="px-4 py-3 text-right">{money(debit)}</td><td className="px-4 py-3 text-right">{money(credit)}</td></tr></tfoot></table></div></section>;
}

function JournalRegister({ journals, loading, canPost, onPost }: { journals: Journal[]; loading: boolean; canPost: boolean; onPost: (journal: Journal) => void }) {
  return <section className="overflow-hidden border border-slate-200 bg-white"><div className="max-h-[65vh] overflow-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-white"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Journal</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{journals.map((item) => <tr key={item._id}><td className="whitespace-nowrap px-4 py-3">{displayDate(item.date)}</td><td className="px-4 py-3 font-extrabold">{item.journalNumber}</td><td className="px-4 py-3 font-semibold">{item.description}</td><td className="px-4 py-3 text-slate-500">{item.reference || "—"}</td><td className="px-4 py-3 text-right font-bold">{money(item.lines.reduce((sum, line) => sum + line.debit, 0))}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${item.status === "posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span></td><td className="px-4 py-3 text-right">{canPost && item.status === "draft" ? <button type="button" onClick={() => void onPost(item)} className="rounded-lg bg-slate-950 px-3 py-1.5 font-bold text-white">Post</button> : "—"}</td></tr>)}{!loading && !journals.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">No manual journals have been created.</td></tr>}</tbody></table></div></section>;
}

function JournalModal({ accounts, onClose, onSaved }: { accounts: Account[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debit = lines.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  const credit = lines.reduce((sum, item) => sum + Number(item.credit || 0), 0);
  const balanced = debit > 0 && Math.abs(debit - credit) < 0.01;
  const update = (index: number, patch: Partial<DraftLine>) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!balanced) return setError("Debit and credit totals must be equal and greater than zero.");
    setSaving(true); setError("");
    try {
      await api.post("/accounting/journals", { date, description, reference, lines: lines.map((item) => ({ ...item, debit: Number(item.debit || 0), credit: Number(item.credit || 0) })) });
      toast("Draft accounting journal created.", "success");
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save journal."); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={submit} className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-extrabold text-slate-950">New manual journal</h2><p className="text-xs text-slate-500">Save as draft, review, then post to the ledger.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 p-2"><X size={16} /></button></header><div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">{error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="grid gap-3 sm:grid-cols-3"><Field label="Journal date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Reference"><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Optional source reference" /></Field><Field label="Description"><input required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Reason for adjustment" /></Field></div><div className="overflow-x-auto border border-slate-200"><table className="min-w-[700px] w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Memo</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="w-10" /></tr></thead><tbody className="divide-y divide-slate-100">{lines.map((item, index) => <tr key={index}><td className="p-2"><select required value={item.accountCode} onChange={(event) => update(index, { accountCode: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-2"><option value="">Select account</option>{accounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select></td><td className="p-2"><input value={item.memo} onChange={(event) => update(index, { memo: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-2" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={item.debit} onChange={(event) => update(index, { debit: event.target.value, ...(Number(event.target.value) > 0 ? { credit: "" } : {}) })} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={item.credit} onChange={(event) => update(index, { credit: event.target.value, ...(Number(event.target.value) > 0 ? { debit: "" } : {}) })} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right" /></td><td className="p-2">{lines.length > 2 && <button type="button" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-1 text-slate-400 hover:text-red-700"><X size={15} /></button>}</td></tr>)}</tbody><tfoot className="bg-slate-950 font-extrabold text-white"><tr><td colSpan={2} className="px-3 py-2">Totals</td><td className="px-3 py-2 text-right">{money(debit)}</td><td className="px-3 py-2 text-right">{money(credit)}</td><td /></tr></tfoot></table></div><button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><Plus size={14} />Add line</button></div><footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4"><span className={`text-xs font-bold ${balanced ? "text-emerald-700" : "text-amber-700"}`}>{balanced ? "Journal is balanced" : `Difference: ${money(Math.abs(debit - credit))}`}</span><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving || !balanced} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button></div></footer></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}<span className="mt-1 block [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-medium [&>input]:normal-case">{children}</span></label>;
}
