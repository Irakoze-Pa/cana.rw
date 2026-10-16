import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Landmark,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Smartphone,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { useConfirmation } from "@/context/confirmationContext";
import { useToast } from "@/context/toastContext";
import api from "@/services/api";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type Account = { code: string; name: string; type: AccountType; group: string };
type LedgerLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};
type LedgerEntry = {
  id: string;
  date: string;
  source: string;
  reference: string;
  description: string;
  status: string;
  lines: LedgerLine[];
};
type TrialRow = Account & {
  debitMovement: number;
  creditMovement: number;
  debitBalance: number;
  creditBalance: number;
};
type StatementLine = { code: string; name: string; amount: number };
type BalanceSheetData = {
  assets: StatementLine[];
  liabilities: StatementLine[];
  equity: StatementLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  difference: number;
};
type Summary = {
  revenue: number;
  expenses: number;
  netProfit: number;
  assets: number;
  liabilities: number;
  equity: number;
  cashAndBank: number;
  fixedAssets: number;
  receivables: number;
  payables: number;
  ownerLoans: number;
  taxPayable: number;
  entryCount: number;
};
type FixedAsset = {
  _id: string;
  assetCode: string;
  name: string;
  category: string;
  location: string;
  recognitionDate: string;
  openingValue: number;
  status: "active" | "maintenance" | "disposed";
  valuationStatus: "provisional" | "verified";
  notes?: string;
};
type OwnerLoan = {
  _id: string;
  loanNumber: string;
  lenderName: string;
  lenderType?: string;
  openingDate: string;
  originalAmount: number;
  reference?: string;
  interestRate: number;
  notes?: string;
  status: "active" | "settled" | "void";
  repayments?: { principal: number; interest: number }[];
};
type TaxLiability = {
  _id: string;
  taxNumber: string;
  taxType: string;
  authority: string;
  period: string;
  dueDate: string;
  assessedAmount: number;
  status: "unpaid" | "partial" | "paid" | "void";
  payments?: { amount: number }[];
};
type Journal = {
  _id: string;
  journalNumber: string;
  date: string;
  description: string;
  reference?: string;
  status: "draft" | "posted" | "void";
  lines: LedgerLine[];
  createdBy?: { fullName?: string };
};
type TreasuryAccount = {
  _id: string;
  name: string;
  type: "cash" | "bank" | "mobile_money";
  institution?: string;
  accountNumber?: string;
  openingBalance: number;
  balance: number;
  status: "active" | "inactive";
};
type TreasuryTransaction = {
  _id: string;
  transactionNumber: string;
  date: string;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  description: string;
  reference?: string;
  account?: TreasuryAccount;
  destinationAccount?: TreasuryAccount;
};
type TreasuryWorkspace = {
  accounts: TreasuryAccount[];
  transactions: TreasuryTransaction[];
};
type Workspace = {
  summary: Summary;
  accounts: Account[];
  ledger: LedgerEntry[];
  trialBalance: TrialRow[];
  journals: Journal[];
  configuration?: {
    startDate: string;
    startedBy?: { fullName?: string };
    notes?: string;
  } | null;
  treasury?: TreasuryWorkspace;
  fixedAssets?: FixedAsset[];
  ownerLoans?: OwnerLoan[];
  taxLiabilities?: TaxLiability[];
};
type Tab =
  | "overview"
  | "treasury"
  | "loans"
  | "taxes"
  | "assets"
  | "balance"
  | "ledger"
  | "trial"
  | "journals";
type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  memo: string;
};

const emptySummary: Summary = {
  revenue: 0,
  expenses: 0,
  netProfit: 0,
  assets: 0,
  liabilities: 0,
  equity: 0,
  cashAndBank: 0,
  fixedAssets: 0,
  receivables: 0,
  payables: 0,
  ownerLoans: 0,
  taxPayable: 0,
  entryCount: 0,
};
const today = () => new Date().toISOString().slice(0, 10);
const parseMoneyInput = (value: string) =>
  Number(value.replace(/[^0-9.-]/g, ""));
const monthStart = () => {
  const value = new Date();
  return new Date(value.getFullYear(), value.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
};
const money = (value: number) =>
  `${Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 })} RWF`;
const buildBalanceSheet = (rows: TrialRow[]): BalanceSheetData => {
  const assets = rows
    .filter((item) => item.type === "asset")
    .map((item) => ({
      code: item.code,
      name: item.name,
      amount: item.debitBalance - item.creditBalance,
    }))
    .filter((item) => Math.abs(item.amount) >= 0.01);
  const liabilities = rows
    .filter((item) => item.type === "liability")
    .map((item) => ({
      code: item.code,
      name: item.name,
      amount: item.creditBalance - item.debitBalance,
    }))
    .filter((item) => Math.abs(item.amount) >= 0.01);
  const equity = rows
    .filter((item) => item.type === "equity")
    .map((item) => ({
      code: item.code,
      name: item.name,
      amount: item.creditBalance - item.debitBalance,
    }))
    .filter((item) => Math.abs(item.amount) >= 0.01);
  const accumulatedResult = rows.reduce(
    (sum, item) =>
      sum +
      (item.type === "revenue"
        ? item.creditBalance - item.debitBalance
        : item.type === "expense"
          ? -(item.debitBalance - item.creditBalance)
          : 0),
    0,
  );
  if (Math.abs(accumulatedResult) >= 0.01)
    equity.push({
      code: "RESULT",
      name: "Accumulated profit / (loss)",
      amount: accumulatedResult,
    });
  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    difference: totalAssets - totalLiabilities - totalEquity,
  };
};
const compactMoney = (value: number) =>
  `${new Intl.NumberFormat("en-RW", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0))} RWF`;
const displayDate = (value: string) =>
  new Date(value).toLocaleDateString("en-RW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const title = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const emptyLine = (): DraftLine => ({
  accountCode: "",
  debit: "",
  credit: "",
  memo: "",
});

export default function AccountingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: Tab = [
    "overview",
    "treasury",
    "loans",
    "taxes",
    "assets",
    "balance",
    "ledger",
    "trial",
    "journals",
  ].includes(requestedTab || "")
    ? (requestedTab as Tab)
    : "overview";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [trial, setTrial] = useState<TrialRow[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [configuration, setConfiguration] =
    useState<Workspace["configuration"]>(null);
  const [treasury, setTreasury] = useState<TreasuryWorkspace>({
    accounts: [],
    transactions: [],
  });
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [ownerLoans, setOwnerLoans] = useState<OwnerLoan[]>([]);
  const [taxes, setTaxes] = useState<TaxLiability[]>([]);
  const [expanded, setExpanded] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [journalOpen, setJournalOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [assetEditor, setAssetEditor] = useState<FixedAsset | null | "new">(
    null,
  );
  const [loanOpen, setLoanOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    kind: "loan" | "tax";
    id: string;
    balance: number;
  } | null>(null);
  const canJournal =
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    (user?.role === "staff" && user.department === "finance");
  const canPostJournal = user?.role === "admin" || user?.role === "superadmin";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from, to }).toString();
      const result = await api.get<{ data: Workspace }>(
        `/accounting/workspace?${query}`,
      );
      const workspace = result.data.data;
      setSummary(workspace.summary || emptySummary);
      setAccounts(workspace.accounts || []);
      setLedger(workspace.ledger || []);
      setTrial(workspace.trialBalance || []);
      setJournals(workspace.journals || []);
      setConfiguration(workspace.configuration || null);
      setTreasury(workspace.treasury || { accounts: [], transactions: [] });
      setFixedAssets(workspace.fixedAssets || []);
      setOwnerLoans(workspace.ownerLoans || []);
      setTaxes(workspace.taxLiabilities || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load accounting records.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [from, to]);

  useEffect(() => {
    setTab(initialTab);
  }, [requestedTab]);

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === "overview") setSearchParams({}, { replace: true });
    else setSearchParams({ tab: nextTab }, { replace: true });
  };

  const periodDebit = useMemo(
    () =>
      ledger
        .flatMap((item) => item.lines)
        .reduce((sum, item) => sum + Number(item.debit || 0), 0),
    [ledger],
  );
  const trialDebit = trial.reduce((sum, item) => sum + item.debitBalance, 0);
  const trialCredit = trial.reduce((sum, item) => sum + item.creditBalance, 0);
  const balanceSheet = useMemo(() => buildBalanceSheet(trial), [trial]);
  const groupedAccounts = useMemo(
    () =>
      Object.entries(
        accounts.reduce<Record<string, Account[]>>(
          (groups, item) => ({
            ...groups,
            [item.group]: [...(groups[item.group] || []), item],
          }),
          {},
        ),
      ),
    [accounts],
  );

  const printReport = () => {
    if (tab === "treasury") {
      printCanaDocument({
        title: "Cash, bank & Mobile Money register",
        reference: `TR-${to.replaceAll("-", "")}`,
        status: "Treasury register",
        details: [
          { label: "As at", value: to },
          {
            label: "Active accounts",
            value: treasury.accounts.filter((item) => item.status === "active")
              .length,
          },
          {
            label: "Combined balance",
            value: money(
              treasury.accounts.reduce(
                (sum, item) => sum + Number(item.balance || 0),
                0,
              ),
            ),
          },
        ],
        table: {
          headers: [
            "Account",
            "Type",
            "Institution / number",
            "Status",
            "Balance",
          ],
          rows: treasury.accounts.map((item) => [
            item.name,
            title(item.type),
            [item.institution, item.accountNumber]
              .filter(Boolean)
              .join(" · ") || "—",
            title(item.status),
            money(item.balance),
          ]),
        },
        notes:
          "Balances include the opening balance and all posted deposits, withdrawals and internal account transfers.",
      });
      return;
    }
    if (tab === "assets") {
      printCanaDocument({
        title: "Fixed-asset register",
        reference: `FAR-${to.replaceAll("-", "")}`,
        status: "Accounting asset register",
        details: [
          { label: "As at", value: to },
          {
            label: "Equipment items",
            value: String(
              fixedAssets.filter((item) => item.status !== "disposed").length,
            ),
          },
          {
            label: "Accounting value",
            value: money(
              fixedAssets
                .filter((item) => item.status !== "disposed")
                .reduce((sum, item) => sum + Number(item.openingValue || 0), 0),
            ),
          },
        ],
        table: {
          headers: [
            "Asset code",
            "Equipment",
            "Category",
            "Location",
            "Recognition date",
            "Value",
            "Valuation",
          ],
          rows: fixedAssets.map((item) => [
            item.assetCode,
            item.name,
            item.category,
            item.location,
            displayDate(item.recognitionDate),
            money(item.openingValue),
            title(item.valuationStatus),
          ]),
        },
        notes:
          "Active equipment is included in Plant and equipment (account 1300). Provisional values should be verified against purchase documents or a formal valuation.",
      });
      return;
    }
    if (tab === "loans") {
      printCanaDocument({
        title: "Owner and director loan register",
        reference: `OLR-${to.replaceAll("-", "")}`,
        status: "Opening liabilities register",
        details: [
          { label: "Loans", value: String(ownerLoans.length) },
          {
            label: "Outstanding",
            value: money(
              ownerLoans.reduce(
                (sum, item) => sum + Number(item.originalAmount || 0),
                0,
              ),
            ),
          },
        ],
        table: {
          headers: [
            "Loan",
            "Lender",
            "Opening date",
            "Reference",
            "Interest",
            "Outstanding",
          ],
          rows: ownerLoans.map((item) => [
            item.loanNumber,
            item.lenderName,
            displayDate(item.openingDate),
            item.reference || "—",
            `${item.interestRate || 0}%`,
            money(item.originalAmount),
          ]),
        },
        notes:
          "These opening liabilities do not change current treasury balances.",
      });
      return;
    }
    if (tab === "taxes") {
      printCanaDocument({
        title: "Tax obligations register",
        reference: `TAX-${to.replaceAll("-", "")}`,
        status: "Tax liabilities",
        details: [{ label: "Obligations", value: String(taxes.length) }],
        table: {
          headers: [
            "Reference",
            "Tax",
            "Period",
            "Due date",
            "Assessed",
            "Paid",
            "Balance",
            "Status",
          ],
          rows: taxes.map((item) => {
            const paid = (item.payments || []).reduce(
              (sum, p) => sum + Number(p.amount || 0),
              0,
            );
            return [
              item.taxNumber,
              title(item.taxType),
              item.period,
              displayDate(item.dueDate),
              money(item.assessedAmount),
              money(paid),
              money(item.assessedAmount - paid),
              title(item.status),
            ];
          }),
        },
      });
      return;
    }
    if (tab === "ledger") {
      printCanaDocument({
        title: "General ledger",
        reference: `GL-${from.replaceAll("-", "")}-${to.replaceAll("-", "")}`,
        status: "Accounting register",
        details: [
          { label: "Period", value: `${from} to ${to}` },
          { label: "Posted transactions", value: ledger.length },
          { label: "Total debits", value: money(periodDebit) },
        ],
        table: {
          headers: [
            "Date",
            "Source",
            "Reference",
            "Description",
            "Debit",
            "Credit",
          ],
          rows: ledger.flatMap((item) =>
            item.lines.map((line) => [
              displayDate(item.date),
              item.source,
              item.reference,
              `${line.accountCode} · ${line.accountName}`,
              money(line.debit),
              money(line.credit),
            ]),
          ),
        },
        notes:
          "System-generated and posted manual entries. Debits and credits must remain equal.",
      });
      return;
    }
    if (tab === "trial") {
      printCanaDocument({
        title: "Trial balance",
        reference: `TB-${to.replaceAll("-", "")}`,
        status: "As-at accounting report",
        details: [
          { label: "As at", value: to },
          { label: "Total debit", value: money(trialDebit) },
          { label: "Total credit", value: money(trialCredit) },
        ],
        table: {
          headers: [
            "Code",
            "Account",
            "Type",
            "Debit balance",
            "Credit balance",
          ],
          rows: trial.map((item) => [
            item.code,
            item.name,
            title(item.type),
            money(item.debitBalance),
            money(item.creditBalance),
          ]),
        },
        notes:
          "A balanced trial balance confirms equal debit and credit postings, but does not replace period-end review and reconciliation.",
      });
      return;
    }
    if (tab === "balance") {
      const sectionRows = (
        heading: string,
        rows: StatementLine[],
        totalLabel: string,
        total: number,
      ) => [
        [heading.toUpperCase(), ""],
        ...rows.map((item) => [
          `${item.code} · ${item.name}`,
          money(item.amount),
        ]),
        [totalLabel, money(total)],
      ];
      printCanaDocument({
        title: "Statement of financial position",
        reference: `BS-${to.replaceAll("-", "")}`,
        status: "Official balance sheet",
        details: [
          { label: "As at", value: to },
          { label: "Total assets", value: money(balanceSheet.totalAssets) },
          {
            label: "Liabilities & equity",
            value: money(
              balanceSheet.totalLiabilities + balanceSheet.totalEquity,
            ),
          },
          {
            label: "Status",
            value:
              Math.abs(balanceSheet.difference) < 0.01
                ? "Balanced"
                : `Review difference: ${money(Math.abs(balanceSheet.difference))}`,
          },
        ],
        table: {
          headers: ["Account", "Amount (RWF)"],
          rows: [
            ...sectionRows(
              "Assets",
              balanceSheet.assets,
              "Total assets",
              balanceSheet.totalAssets,
            ),
            ...sectionRows(
              "Liabilities",
              balanceSheet.liabilities,
              "Total liabilities",
              balanceSheet.totalLiabilities,
            ),
            ...sectionRows(
              "Equity",
              balanceSheet.equity,
              "Total equity",
              balanceSheet.totalEquity,
            ),
            [
              "Total liabilities and equity",
              money(balanceSheet.totalLiabilities + balanceSheet.totalEquity),
            ],
          ],
        },
        notes:
          "Generated from posted accounting entries through the selected date. Assets must equal liabilities plus equity.",
      });
      return;
    }
    printCanaDocument({
      title: "Finance & accounting summary",
      reference: `FAS-${from.replaceAll("-", "")}-${to.replaceAll("-", "")}`,
      status: "Management accounts",
      details: [
        { label: "Period", value: `${from} to ${to}` },
        { label: "Revenue", value: money(summary.revenue) },
        { label: "Expenses", value: money(summary.expenses) },
        { label: "Net result", value: money(summary.netProfit) },
      ],
      table: {
        headers: ["Financial position", "Amount"],
        rows: [
          ["Cash and bank", money(summary.cashAndBank)],
          ["Plant and equipment", money(summary.fixedAssets)],
          ["Customer receivables", money(summary.receivables)],
          ["Supplier payables", money(summary.payables)],
          ["Total assets", money(summary.assets)],
          ["Total liabilities", money(summary.liabilities)],
          ["Equity and current result", money(summary.equity)],
        ],
      },
      notes:
        "Generated from posted operational records and posted manual journals in CANA.",
    });
  };

  const postJournal = async (journal: Journal) => {
    const accepted = await confirm({
      title: "Post accounting journal",
      description: `Post ${journal.journalNumber}? Posting makes this adjustment part of the general ledger and financial statements.`,
      confirmLabel: "Post journal",
      tone: "warning",
    });
    if (!accepted) return;
    try {
      await api.post(`/accounting/journals/${journal._id}/post`);
      toast("Journal posted to the general ledger.", "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to post journal.",
      );
    }
  };

  const startFreshAccounting = async () => {
    const accepted = await confirm({
      title: configuration
        ? "Restart accounting from today"
        : "Start accounting today",
      description:
        "The ledger, trial balance and financial statements will begin from today. Older operational records will remain safely stored but will no longer appear in accounting. Current money-account balances will become today's opening balances.",
      confirmLabel: configuration ? "Restart from today" : "Start from today",
      tone: "warning",
    });
    if (!accepted) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/accounting/start-fresh", {
        startDate: today(),
        confirmation: "START",
        notes:
          "Accounting opening position established from verified balances.",
      });
      setFrom(today());
      setTo(today());
      toast(
        "Accounting now starts from today. Earlier operational records were preserved.",
        "success",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to establish the accounting start date.",
      );
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: CircleDollarSign },
    { key: "treasury", label: "Money accounts", icon: Landmark },
    { key: "loans", label: "Loans & borrowings", icon: WalletCards },
    { key: "taxes", label: "Taxes", icon: ClipboardList },
    { key: "assets", label: "Equipment assets", icon: Factory },
    { key: "balance", label: "Balance sheet", icon: Scale },
    { key: "ledger", label: "Ledger", icon: BookOpen },
    { key: "trial", label: "Trial balance", icon: Scale },
    { key: "journals", label: "Adjustments", icon: WalletCards },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-3 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-300 pb-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-red-700">
            Finance control
          </p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">
            Finance & accounting
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPostJournal && (
            <button
              type="button"
              onClick={() => void startFreshAccounting()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:border-slate-950"
            >
              <RefreshCw size={16} />
              {configuration ? "Restart accounting" : "Start accounting"}
            </button>
          )}
          {tab === "treasury" && canJournal && (
            <button
              type="button"
              onClick={() => setTransactionOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
            >
              <ArrowRightLeft size={16} />
              New transaction
            </button>
          )}
          {tab === "treasury" && canPostJournal && (
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              <Plus size={16} />
              Add account
            </button>
          )}
          {tab === "assets" && canPostJournal && (
            <button
              type="button"
              onClick={() => setAssetEditor("new")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} /> Add equipment
            </button>
          )}
          {tab === "loans" && canPostJournal && (
            <button
              type="button"
              onClick={() => setLoanOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} />
              Record opening loan
            </button>
          )}
          {tab === "taxes" && canPostJournal && (
            <button
              type="button"
              onClick={() => setTaxOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} />
              Add tax obligation
            </button>
          )}
          {tab === "journals" && canJournal && (
            <button
              type="button"
              onClick={() => setJournalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-800"
            >
              <Plus size={16} />
              New journal
            </button>
          )}
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-950"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh accounting"
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:border-slate-950"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {configuration?.startDate && (
        <section className="flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p>
            <span className="font-extrabold text-slate-950">
              Accounting opening date:
            </span>{" "}
            {new Date(configuration.startDate).toLocaleDateString("en-RW", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2 border border-slate-200 bg-white p-2 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Accounting sections">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => selectTab(item.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition ${tab === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </label>
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </label>
        </div>
      </section>

      {tab === "overview" && (
        <Overview
          summary={summary}
          loading={loading}
          groupedAccounts={groupedAccounts}
          treasuryAccounts={treasury.accounts}
          canSetup={canPostJournal}
          onAddAccount={() => setAccountOpen(true)}
        />
      )}
      {tab === "treasury" && (
        <TreasuryPanel treasury={treasury} loading={loading} />
      )}
      {tab === "assets" && (
        <FixedAssetsPanel
          assets={fixedAssets}
          loading={loading}
          canEdit={canPostJournal}
          onEdit={setAssetEditor}
        />
      )}
      {tab === "loans" && (
        <OwnerLoansPanel
          loans={ownerLoans}
          loading={loading}
          onPay={(loan, balance) =>
            setPaymentTarget({ kind: "loan", id: loan._id, balance })
          }
        />
      )}
      {tab === "taxes" && (
        <TaxesPanel
          taxes={taxes}
          loading={loading}
          onPay={(tax, balance) =>
            setPaymentTarget({ kind: "tax", id: tax._id, balance })
          }
        />
      )}
      {tab === "ledger" && (
        <LedgerTable
          entries={ledger}
          loading={loading}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
      {tab === "balance" && (
        <BalanceSheet
          data={balanceSheet}
          loading={loading}
          asAt={to}
          onOpenLedger={() => selectTab("ledger")}
        />
      )}
      {tab === "trial" && (
        <TrialBalance
          rows={trial}
          loading={loading}
          debit={trialDebit}
          credit={trialCredit}
        />
      )}
      {tab === "journals" && (
        <JournalRegister
          journals={journals}
          loading={loading}
          canPost={canPostJournal}
          onPost={postJournal}
        />
      )}
      {journalOpen && (
        <JournalModal
          accounts={accounts}
          onClose={() => setJournalOpen(false)}
          onSaved={async () => {
            setJournalOpen(false);
            await load();
          }}
        />
      )}
      {accountOpen && (
        <TreasuryAccountModal
          onClose={() => setAccountOpen(false)}
          onSaved={async () => {
            setAccountOpen(false);
            await load();
          }}
        />
      )}
      {transactionOpen && (
        <TreasuryTransactionModal
          accounts={treasury.accounts.filter(
            (item) => item.status === "active",
          )}
          onClose={() => setTransactionOpen(false)}
          onSaved={async () => {
            setTransactionOpen(false);
            await load();
          }}
        />
      )}
      {assetEditor && (
        <FixedAssetModal
          asset={assetEditor === "new" ? undefined : assetEditor}
          onClose={() => setAssetEditor(null)}
          onSaved={async () => {
            setAssetEditor(null);
            await load();
          }}
        />
      )}
      {loanOpen && (
        <OwnerLoanModal
          onClose={() => setLoanOpen(false)}
          onSaved={async () => {
            setLoanOpen(false);
            await load();
          }}
        />
      )}
      {taxOpen && (
        <TaxModal
          onClose={() => setTaxOpen(false)}
          onSaved={async () => {
            setTaxOpen(false);
            await load();
          }}
        />
      )}
      {paymentTarget && (
        <LiabilityPaymentModal
          target={paymentTarget}
          accounts={treasury.accounts.filter(
            (item) => item.status === "active",
          )}
          onClose={() => setPaymentTarget(null)}
          onSaved={async () => {
            setPaymentTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Overview({
  summary,
  loading,
  groupedAccounts,
  treasuryAccounts,
  canSetup,
  onAddAccount,
}: {
  summary: Summary;
  loading: boolean;
  groupedAccounts: [string, Account[]][];
  treasuryAccounts: TreasuryAccount[];
  canSetup: boolean;
  onAddAccount: () => void;
}) {
  const metrics = [
    { label: "Revenue", value: summary.revenue, icon: ArrowUpRight },
    { label: "Operating costs", value: summary.expenses, icon: ArrowDownLeft },
    { label: "Net result", value: summary.netProfit, icon: CircleDollarSign },
    { label: "Cash & bank", value: summary.cashAndBank, icon: Landmark },
    { label: "Equipment assets", value: summary.fixedAssets, icon: Factory },
    {
      label: "Customer receivables",
      value: summary.receivables,
      icon: WalletCards,
    },
    { label: "Supplier payables", value: summary.payables, icon: BookOpen },
    { label: "Owner loans", value: summary.ownerLoans, icon: WalletCards },
    { label: "Tax payable", value: summary.taxPayable, icon: ClipboardList },
  ];
  return (
    <>
      <section className="grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="min-w-0 bg-white px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 sm:text-[10px]">
                  {metric.label}
                </p>
                <Icon size={14} className="text-slate-400" />
              </div>
              <p
                className={`mt-1 truncate text-base font-black tracking-tight sm:text-lg ${metric.label === "Net result" && metric.value < 0 ? "text-red-700" : "text-slate-950"}`}
                title={money(metric.value)}
              >
                {loading ? "—" : compactMoney(metric.value)}
              </p>
            </article>
          );
        })}
      </section>
      {!loading && treasuryAccounts.length === 0 && (
        <section className="flex flex-col gap-4 border border-slate-950 bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10">
              <Landmark size={18} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Complete finance setup</h2>
            </div>
          </div>
          {canSetup && (
            <button
              type="button"
              onClick={onAddAccount}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
            >
              <Plus size={16} /> Add first account
            </button>
          )}
        </section>
      )}
      <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-5">
        <FinanceLink
          to="/management/billing"
          icon={WalletCards}
          title="Customer accounts"
          detail="Invoices, receipts and balances"
        />
        <FinanceLink
          to="/management/supplier-payments"
          icon={BookOpen}
          title="Supplier accounts"
          detail="Payables, cheques and settlements"
        />
        <FinanceLink
          to="/management/expenses"
          icon={ClipboardList}
          title="Operating expenses"
          detail="Record and review business costs"
        />
        <FinanceLink
          to="/management/accounting?tab=treasury"
          icon={Landmark}
          title="Cash & bank"
          detail={`${treasuryAccounts.filter((item) => item.status === "active").length} active financial accounts`}
        />
        <FinanceLink
          to="/management/accounting?tab=assets"
          icon={Factory}
          title="Equipment assets"
          detail={`${money(summary.fixedAssets)} recognised`}
        />
      </section>
      <section className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-extrabold text-slate-950">
              Management accounts
            </h2>
          </div>
          <div className="grid sm:grid-cols-2">
            <Statement
              title="Income statement"
              rows={[
                ["Sales revenue", summary.revenue],
                ["Operating and direct costs", -summary.expenses],
                ["Net profit / (loss)", summary.netProfit],
              ]}
            />
            <Statement
              title="Financial position"
              rows={[
                ["Total assets", summary.assets],
                ["Total liabilities", -summary.liabilities],
                ["Equity & current result", summary.equity],
              ]}
            />
          </div>
        </div>
        <div className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-extrabold text-slate-950">Chart of accounts</h2>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {groupedAccounts.map(([group, items]) => (
              <div key={group} className="px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                  {group}
                </p>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {items.map((item) => (
                    <p
                      key={item.code}
                      className="truncate text-xs text-slate-600"
                    >
                      <b className="mr-2 text-slate-950">{item.code}</b>
                      {item.name}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FinanceLink({
  to,
  icon: Icon,
  title: heading,
  detail,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2 bg-white px-3 py-2.5 hover:bg-slate-50"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-950 group-hover:text-white">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <b className="block truncate text-sm text-slate-950">{heading}</b>
        <span className="sr-only">{detail}</span>
      </span>
      <ChevronRight size={16} className="ml-auto shrink-0 text-slate-400" />
    </Link>
  );
}

function Statement({
  title: heading,
  rows,
}: {
  title: string;
  rows: [string, number][];
}) {
  return (
    <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {heading}
      </h3>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-3 py-2 text-sm ${index === rows.length - 1 ? "font-extrabold text-slate-950" : "text-slate-600"}`}
          >
            <span>{label}</span>
            <span className={value < 0 ? "text-red-700" : ""}>
              {money(Math.abs(value))}
              {value < 0 ? " DR" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerLoansPanel({
  loans,
  loading,
  onPay,
}: {
  loans: OwnerLoan[];
  loading: boolean;
  onPay: (loan: OwnerLoan, balance: number) => void;
}) {
  const outstanding = (item: OwnerLoan) =>
    item.originalAmount -
    (item.repayments || []).reduce(
      (sum, payment) => sum + Number(payment.principal || 0),
      0,
    );
  const total = loans.reduce((sum, item) => sum + outstanding(item), 0);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-px border-b bg-slate-200 sm:grid-cols-3">
        <div className="bg-white p-3">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Loans & borrowings
          </p>
          <p className="mt-1 text-lg font-black">{loans.length}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Outstanding liability
          </p>
          <p className="mt-1 text-lg font-black">{money(total)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Finance cost
          </p>
          <p className="mt-1 text-sm font-extrabold">Interest only</p>
        </div>
      </div>
      <div className="max-h-[58vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(4)]:hidden [&_td:nth-child(4)]:hidden [&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden md:[&_th:nth-child(3)]:table-cell md:[&_td:nth-child(3)]:table-cell lg:[&_th:nth-child(4)]:table-cell lg:[&_td:nth-child(4)]:table-cell lg:[&_th:nth-child(5)]:table-cell lg:[&_td:nth-child(5)]:table-cell">
          <thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-white">
            <tr>
              <th className="px-2 py-2.5 sm:px-3">Loan</th>
              <th>Lender</th>
              <th>Type</th>
              <th>Date</th>
              <th>Interest</th>
              <th className="text-right">Outstanding</th>
              <th className="px-2 text-right sm:px-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loans.map((item) => {
              const balance = outstanding(item);
              return (
                <tr key={item._id}>
                  <td className="px-2 py-2.5 font-extrabold sm:px-3">
                    {item.loanNumber}
                    <span className="mt-0.5 block font-medium text-slate-500 md:hidden">
                      {title(item.lenderType || "other")}
                    </span>
                  </td>
                  <td>{item.lenderName}</td>
                  <td>{title(item.lenderType || "other")}</td>
                  <td>{displayDate(item.openingDate)}</td>
                  <td>{item.interestRate || 0}%</td>
                  <td className="text-right font-extrabold">
                    {money(balance)}
                  </td>
                  <td className="px-2 text-right sm:px-3">
                    {balance > 0 ? (
                      <button
                        onClick={() => onPay(item, balance)}
                        className="font-bold text-red-700"
                      >
                        Repay
                      </button>
                    ) : (
                      "Settled"
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !loans.length && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  No loans or borrowings recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TaxesPanel({
  taxes,
  loading,
  onPay,
}: {
  taxes: TaxLiability[];
  loading: boolean;
  onPay: (tax: TaxLiability, balance: number) => void;
}) {
  const balance = (item: TaxLiability) =>
    item.assessedAmount -
    (item.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-h-[62vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden [&_th:nth-child(7)]:hidden [&_td:nth-child(7)]:hidden lg:[&_th:nth-child(3)]:table-cell lg:[&_td:nth-child(3)]:table-cell md:[&_th:nth-child(5)]:table-cell md:[&_td:nth-child(5)]:table-cell md:[&_th:nth-child(7)]:table-cell md:[&_td:nth-child(7)]:table-cell">
          <thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-white">
            <tr>
              <th className="px-2 py-2.5 sm:px-3">Tax</th>
              <th>Period</th>
              <th>Authority</th>
              <th>Due date</th>
              <th className="text-right">Assessed</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
              <th className="px-2 text-right sm:px-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {taxes.map((item) => {
              const due = balance(item);
              return (
                <tr key={item._id}>
                  <td className="px-2 py-2.5 sm:px-3">
                    <b>{title(item.taxType)}</b>
                    <p className="text-[10px] text-slate-500">
                      {item.taxNumber}
                    </p>
                  </td>
                  <td>{item.period}</td>
                  <td>{item.authority}</td>
                  <td
                    className={
                      item.dueDate.slice(0, 10) < today() && due > 0
                        ? "font-bold text-red-700"
                        : ""
                    }
                  >
                    {displayDate(item.dueDate)}
                  </td>
                  <td className="text-right">{money(item.assessedAmount)}</td>
                  <td className="text-right font-extrabold">{money(due)}</td>
                  <td>{title(item.status)}</td>
                  <td className="px-2 text-right sm:px-3">
                    {due > 0 ? (
                      <button
                        onClick={() => onPay(item, due)}
                        className="font-bold text-red-700"
                      >
                        Pay
                      </button>
                    ) : (
                      "Paid"
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !taxes.length && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  No tax obligations recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OwnerLoanModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post("/accounting/owner-loans/opening", {
        ...form,
        originalAmount: parseMoneyInput(String(form.originalAmount || "")),
        interestRate: Number(form.interestRate || 0),
      });
      toast(
        "Opening owner loan recorded without changing treasury.",
        "success",
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record owner loan.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-xl bg-white shadow-2xl"
      >
        <header className="flex justify-between border-b p-4">
          <div>
            <h2 className="font-extrabold">Record opening loan</h2>
            <p className="text-xs text-slate-500">
              Liability only — current treasury remains unchanged
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && <p className="text-red-700 sm:col-span-2">{error}</p>}
          <Field label="Lender">
            <input required name="lenderName" />
          </Field>
          <Field label="Lender type">
            <select name="lenderType">
              <option value="owner">Owner</option>
              <option value="director">Director</option>
              <option value="shareholder">Shareholder</option>
              <option value="bank">Bank</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="institution">Institution</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Amount (RWF)">
            <input required name="originalAmount" inputMode="decimal" />
          </Field>
          <Field label="Opening date">
            <input
              required
              name="openingDate"
              type="date"
              defaultValue={today()}
            />
          </Field>
          <Field label="Reference">
            <input name="reference" />
          </Field>
          <Field label="Interest rate %">
            <input
              name="interestRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
            />
          </Field>
          <Field label="Notes">
            <input name="notes" />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
          >
            {saving ? "Recording…" : "Record opening loan"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function TaxModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post("/accounting/taxes", {
        ...form,
        assessedAmount: parseMoneyInput(String(form.assessedAmount || "")),
      });
      toast("Tax obligation recorded.", "success");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record tax.",
      );
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form onSubmit={submit} className="w-full max-w-xl rounded-xl bg-white">
        <header className="flex justify-between border-b p-4">
          <div>
            <h2 className="font-extrabold">Add tax obligation</h2>
            <p className="text-xs text-slate-500">
              Record assessed tax before payment
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && <p className="text-red-700 sm:col-span-2">{error}</p>}
          <Field label="Tax type">
            <select name="taxType">
              <option value="vat">VAT</option>
              <option value="paye">PAYE</option>
              <option value="corporate_income_tax">Corporate income tax</option>
              <option value="withholding_tax">Withholding tax</option>
              <option value="rssb">RSSB</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Tax period">
            <input required name="period" placeholder="Example: October 2026" />
          </Field>
          <Field label="Assessed amount">
            <input required name="assessedAmount" inputMode="decimal" />
          </Field>
          <Field label="Due date">
            <input required name="dueDate" type="date" />
          </Field>
          <Field label="Authority">
            <input name="authority" defaultValue="Rwanda Revenue Authority" />
          </Field>
          <Field label="Reference">
            <input name="reference" />
          </Field>
          <Field label="Notes">
            <input name="notes" />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white">
            Save tax obligation
          </button>
        </footer>
      </form>
    </div>
  );
}

function LiabilityPaymentModal({
  target,
  accounts,
  onClose,
  onSaved,
}: {
  target: { kind: "loan" | "tax"; id: string; balance: number };
  accounts: TreasuryAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (target.kind === "loan")
        await api.post(`/accounting/owner-loans/${target.id}/repayments`, {
          ...form,
          principal: Number(form.principal || 0),
          interest: Number(form.interest || 0),
        });
      else
        await api.post(`/accounting/taxes/${target.id}/payments`, {
          ...form,
          amount: Number(form.amount || 0),
        });
      toast(
        target.kind === "loan"
          ? "Loan repayment posted."
          : "Tax payment posted.",
        "success",
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to post payment.",
      );
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white">
        <header className="flex justify-between border-b p-4">
          <div>
            <h2 className="font-extrabold">
              {target.kind === "loan"
                ? "Record loan repayment"
                : "Record tax payment"}
            </h2>
            <p className="text-xs text-slate-500">
              Outstanding {money(target.balance)}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && <p className="text-red-700 sm:col-span-2">{error}</p>}
          {target.kind === "loan" ? (
            <>
              <Field label="Principal">
                <input
                  required
                  name="principal"
                  type="number"
                  min="0"
                  max={target.balance}
                />
              </Field>
              <Field label="Interest / finance cost">
                <input name="interest" type="number" min="0" defaultValue="0" />
              </Field>
            </>
          ) : (
            <Field label="Payment amount">
              <input
                required
                name="amount"
                type="number"
                min="1"
                max={target.balance}
              />
            </Field>
          )}
          <Field label="Payment date">
            <input
              required
              name="paymentDate"
              type="date"
              defaultValue={today()}
            />
          </Field>
          <Field label="Payment account">
            <select required name="treasuryAccount">
              <option value="">Select account</option>
              {accounts.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} · {money(item.balance)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference">
            <input name="reference" />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white">
            Post payment
          </button>
        </footer>
      </form>
    </div>
  );
}

function FixedAssetsPanel({
  assets,
  loading,
  canEdit,
  onEdit,
}: {
  assets: FixedAsset[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (asset: FixedAsset) => void;
}) {
  const active = assets.filter((item) => item.status !== "disposed");
  const total = active.reduce(
    (sum, item) => sum + Number(item.openingValue || 0),
    0,
  );
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
        <div className="bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Registered equipment
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {active.length}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Accounting value
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {money(total)}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-slate-500">
            Valuation control
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-950">
            {
              active.filter((item) => item.valuationStatus === "verified")
                .length
            }{" "}
            verified ·{" "}
            {
              active.filter((item) => item.valuationStatus === "provisional")
                .length
            }{" "}
            provisional
          </p>
        </div>
      </div>
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-extrabold text-slate-950">Fixed-asset register</h2>
        <p className="text-xs text-slate-500">
          Each active item posts to Plant and equipment (1300) and is included
          in total assets.
        </p>
      </div>
      <div className="max-h-[58vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden md:[&_th:nth-child(2)]:table-cell md:[&_td:nth-child(2)]:table-cell lg:[&_th:nth-child(3)]:table-cell lg:[&_td:nth-child(3)]:table-cell md:[&_th:nth-child(5)]:table-cell md:[&_td:nth-child(5)]:table-cell">
          <thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-white">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Category / location</th>
              <th className="px-4 py-3">Recognition date</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Control</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((item) => (
              <tr
                key={item._id}
                className={
                  item.status === "disposed" ? "bg-slate-50 text-slate-400" : ""
                }
              >
                <td className="px-4 py-3">
                  <p className="font-extrabold text-slate-950">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-500">
                    {item.assetCode} · {title(item.status)}
                  </p>
                  <p className="text-[9px] text-slate-500 md:hidden">
                    {item.category} · {item.location}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{item.category}</p>
                  <p className="text-[10px] text-slate-500">{item.location}</p>
                </td>
                <td className="px-4 py-3">
                  {displayDate(item.recognitionDate)}
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-slate-950">
                  {money(item.openingValue)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${item.valuationStatus === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {item.valuationStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="font-bold text-red-700"
                    >
                      Edit
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!loading && !assets.length && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  No equipment assets registered.
                </td>
              </tr>
            )}
          </tbody>
          {!!assets.length && (
            <tfoot className="sticky bottom-0 bg-slate-100 font-extrabold text-slate-950">
              <tr>
                <td colSpan={3} className="px-4 py-3">
                  Active equipment total
                </td>
                <td className="px-4 py-3 text-right">{money(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function FixedAssetModal({
  asset,
  onClose,
  onSaved,
}: {
  asset?: FixedAsset;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    assetCode: asset?.assetCode || "",
    name: asset?.name || "",
    category: asset?.category || "Production equipment",
    location: asset?.location || "Factory",
    recognitionDate: asset?.recognitionDate?.slice(0, 10) || today(),
    openingValue: asset ? String(asset.openingValue) : "",
    status: asset?.status || "active",
    valuationStatus: asset?.valuationStatus || "provisional",
    notes: asset?.notes || "",
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        openingValue: parseMoneyInput(form.openingValue),
      };
      if (asset)
        await api.patch(`/accounting/fixed-assets/${asset._id}`, payload);
      else await api.post("/accounting/fixed-assets", payload);
      toast(
        asset
          ? "Equipment asset updated."
          : "Equipment asset added to accounting.",
        "success",
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save equipment asset.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-extrabold">
              {asset ? "Edit equipment asset" : "Register equipment asset"}
            </h2>
            <p className="text-xs text-slate-500">
              Accounting value and asset-register details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-2"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && (
            <p className="border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <Field label="Asset code">
            <input
              required
              value={form.assetCode}
              onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
            />
          </Field>
          <Field label="Equipment name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label="Accounting value (RWF)">
            <input
              required
              inputMode="decimal"
              value={form.openingValue}
              onChange={(e) =>
                setForm({ ...form, openingValue: e.target.value })
              }
            />
          </Field>
          <Field label="Recognition date">
            <input
              required
              type="date"
              value={form.recognitionDate}
              onChange={(e) =>
                setForm({ ...form, recognitionDate: e.target.value })
              }
            />
          </Field>
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            Asset status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as FixedAsset["status"],
                })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
            >
              <option value="active">Active</option>
              <option value="maintenance">Under maintenance</option>
              <option value="disposed">Disposed</option>
            </select>
          </label>
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            Valuation
            <select
              value={form.valuationStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  valuationStatus: e.target
                    .value as FixedAsset["valuationStatus"],
                })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
            >
              <option value="provisional">Provisional</option>
              <option value="verified">Verified</option>
            </select>
          </label>
          <Field label="Notes">
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
          >
            {saving ? "Saving…" : "Save asset"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function LedgerTable({
  entries,
  loading,
  expanded,
  setExpanded,
}: {
  entries: LedgerEntry[];
  loading: boolean;
  expanded: string;
  setExpanded: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const sources = useMemo(
    () => [...new Set(entries.map((item) => item.source))].sort(),
    [entries],
  );
  const ledgerAccounts = useMemo(
    () =>
      [
        ...new Map(
          entries
            .flatMap((item) => item.lines)
            .map((item) => [
              item.accountCode,
              `${item.accountCode} · ${item.accountName}`,
            ]),
        ).entries(),
      ].sort(([left], [right]) => left.localeCompare(right)),
    [entries],
  );
  const visibleEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((item) => {
      const matchesSearch =
        !term ||
        `${item.reference} ${item.description} ${item.source} ${item.lines
          .map(
            (line) =>
              `${line.accountCode} ${line.accountName} ${line.memo || ""}`,
          )
          .join(" ")}`
          .toLowerCase()
          .includes(term);
      const matchesSource = !sourceFilter || item.source === sourceFilter;
      const matchesAccount =
        !accountFilter ||
        item.lines.some((line) => line.accountCode === accountFilter);
      return matchesSearch && matchesSource && matchesAccount;
    });
  }, [accountFilter, entries, query, sourceFilter]);
  const totals = useMemo(
    () =>
      visibleEntries
        .flatMap((item) => item.lines)
        .reduce(
          (result, item) => ({
            debit: result.debit + Number(item.debit || 0),
            credit: result.credit + Number(item.credit || 0),
          }),
          { debit: 0, credit: 0 },
        ),
    [visibleEntries],
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.01;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-950">General ledger</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {balanced ? "Balanced" : "Review"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {visibleEntries.length} posted transaction
            {visibleEntries.length === 1 ? "" : "s"} in this view
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[680px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference, description or account"
            aria-label="Search ledger"
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-950"
          />
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            aria-label="Filter ledger source"
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
            aria-label="Filter ledger account"
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All accounts</option>
            {ledgerAccounts.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
        <div className="bg-white px-4 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Debits
          </p>
          <p className="mt-1 font-black text-slate-950">
            {money(totals.debit)}
          </p>
        </div>
        <div className="bg-white px-4 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Credits
          </p>
          <p className="mt-1 font-black text-slate-950">
            {money(totals.credit)}
          </p>
        </div>
        <div className="bg-white px-4 py-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Difference
          </p>
          <p
            className={`mt-1 font-black ${balanced ? "text-emerald-700" : "text-red-700"}`}
          >
            {money(Math.abs(totals.debit - totals.credit))}
          </p>
        </div>
      </div>
      <div className="max-h-[65vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden md:[&_th:nth-child(3)]:table-cell md:[&_td:nth-child(3)]:table-cell lg:[&_th:nth-child(5)]:table-cell lg:[&_td:nth-child(5)]:table-cell">
          <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase tracking-wide text-white">
            <tr>
              <th className="w-9 px-3 py-3" />
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right">Debit</th>
              <th className="px-3 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleEntries.map((item) => {
              const debit = item.lines.reduce(
                (sum, line) => sum + line.debit,
                0,
              );
              const credit = item.lines.reduce(
                (sum, line) => sum + line.credit,
                0,
              );
              const open = expanded === item.id;
              return (
                <LedgerRows
                  key={`${item.source}-${item.id}`}
                  item={item}
                  debit={debit}
                  credit={credit}
                  open={open}
                  onToggle={() => setExpanded(open ? "" : item.id)}
                />
              );
            })}
            {!loading && !visibleEntries.length && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  No posted accounting entries match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LedgerRows({
  item,
  debit,
  credit,
  open,
  onToggle,
}: {
  item: LedgerEntry;
  debit: number;
  credit: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {
        <tr onClick={onToggle} className="cursor-pointer hover:bg-slate-50">
          <td className="px-3 py-3 text-slate-400">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </td>
          <td className="px-2 py-2.5 sm:px-3">{displayDate(item.date)}</td>
          <td className="px-3 py-3 font-semibold">{item.source}</td>
          <td className="px-3 py-3 font-bold text-slate-950">
            {item.reference}
          </td>
          <td className="max-w-xs truncate px-3 py-3 text-slate-600">
            {item.description}
          </td>
          <td className="px-3 py-3 text-right font-semibold">{money(debit)}</td>
          <td className="px-3 py-3 text-right font-semibold">
            {money(credit)}
          </td>
        </tr>
      }
      {open && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-4 py-3">
            <div className="ml-6 overflow-hidden border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Account / memo</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.lines.map((line, index) => (
                    <tr key={`${line.accountCode}-${index}`}>
                      <td className="w-20 px-3 py-2 font-extrabold">
                        {line.accountCode}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {line.accountName}
                        {line.memo ? ` · ${line.memo}` : ""}
                      </td>
                      <td className="w-36 px-3 py-2 text-right font-semibold">
                        {line.debit ? money(line.debit) : "—"}
                      </td>
                      <td className="w-36 px-3 py-2 text-right font-semibold">
                        {line.credit ? money(line.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BalanceSheet({
  data,
  loading,
  asAt,
  onOpenLedger,
}: {
  data: BalanceSheetData;
  loading: boolean;
  asAt: string;
  onOpenLedger: () => void;
}) {
  const balanced = Math.abs(data.difference) < 0.01;
  const sections = [
    {
      title: "Assets",
      subtitle: "What the business owns",
      rows: data.assets,
      total: data.totalAssets,
    },
    {
      title: "Liabilities",
      subtitle: "What the business owes",
      rows: data.liabilities,
      total: data.totalLiabilities,
    },
    {
      title: "Equity",
      subtitle: "Owner funding and accumulated result",
      rows: data.equity,
      total: data.totalEquity,
    },
  ];

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-3 border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-red-700">
            Statement of financial position
          </p>
          <h2 className="mt-0.5 text-lg font-black text-slate-950">
            Balance sheet
          </h2>
          <p className="text-xs text-slate-500">As at {displayDate(asAt)}</p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-md px-3 py-2 text-xs font-extrabold sm:self-auto ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          <CheckCircle2 size={15} />
          {balanced
            ? "Balanced"
            : `Difference ${money(Math.abs(data.difference))}`}
        </div>
      </header>

      <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          ["Total assets", data.totalAssets],
          ["Total liabilities", data.totalLiabilities],
          ["Total equity", data.totalEquity],
        ].map(([label, amount]) => (
          <div key={String(label)} className="bg-white px-3 py-2.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {money(Number(amount))}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="overflow-hidden border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 bg-slate-950 px-3 py-2.5 text-white">
              <h3 className="text-sm font-extrabold">{section.title}</h3>
              <p className="text-[10px] text-slate-300">{section.subtitle}</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {section.rows.map((item) => (
                <button
                  key={`${section.title}-${item.code}`}
                  type="button"
                  onClick={onOpenLedger}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <b className="block truncate text-xs text-slate-900">
                      {item.name}
                    </b>
                    <small className="text-[10px] font-bold text-slate-400">
                      {item.code}
                    </small>
                  </span>
                  <strong
                    className={`text-xs ${item.amount < 0 ? "text-red-700" : "text-slate-950"}`}
                  >
                    {money(item.amount)}
                  </strong>
                </button>
              ))}
              {!loading && !section.rows.length && (
                <p className="px-3 py-8 text-center text-xs text-slate-500">
                  No balances in this section.
                </p>
              )}
            </div>
            <footer className="flex items-center justify-between bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-950">
              <span>Total {section.title.toLowerCase()}</span>
              <span>{money(section.total)}</span>
            </footer>
          </article>
        ))}
      </div>

      <footer className="flex flex-col gap-1 border border-slate-300 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-extrabold uppercase text-slate-600">
          Total liabilities and equity
        </span>
        <strong className="text-base font-black text-slate-950">
          {money(data.totalLiabilities + data.totalEquity)}
        </strong>
      </footer>
    </section>
  );
}

function TrialBalance({
  rows,
  loading,
  debit,
  credit,
}: {
  rows: TrialRow[];
  loading: boolean;
  debit: number;
  credit: number;
}) {
  const balanced = Math.abs(debit - credit) < 0.01;
  const balanceMeaning = (item: TrialRow) =>
    item.type === "asset"
      ? "What the business owns"
      : item.type === "liability"
        ? "What the business owes"
        : item.type === "equity"
          ? "Business funding"
          : item.type === "revenue"
            ? "Income"
            : "Cost";
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="font-extrabold">Trial balance</h2>
          <p className="text-xs text-slate-500">
            Closing debit and credit balances through the selected date.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          <CheckCircle2 size={14} />
          {balanced ? "Balanced" : "Review required"}
        </span>
      </div>
      <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Total debit
          </p>
          <p className="mt-1 text-base font-black text-slate-950">
            {money(debit)} RWF
          </p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Total credit
          </p>
          <p className="mt-1 text-base font-black text-slate-950">
            {money(credit)} RWF
          </p>
        </div>
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Difference
          </p>
          <p
            className={`mt-1 text-base font-black ${balanced ? "text-emerald-700" : "text-red-700"}`}
          >
            {money(Math.abs(debit - credit))} RWF
          </p>
        </div>
      </div>
      <div className="max-h-[62vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden md:[&_th:nth-child(3)]:table-cell md:[&_td:nth-child(3)]:table-cell">
          <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3 text-right">Debit balance</th>
              <th className="px-4 py-3 text-right">Credit balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr key={item.code}>
                <td className="px-4 py-2.5 font-extrabold">{item.code}</td>
                <td className="px-4 py-2.5 font-semibold">{item.name}</td>
                <td className="px-4 py-2.5 text-slate-500">
                  <span className="block font-bold capitalize text-slate-700">
                    {item.type}
                  </span>
                  <span className="text-[10px]">{balanceMeaning(item)}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-extrabold text-slate-950">
                  {item.debitBalance ? money(item.debitBalance) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-extrabold text-slate-950">
                  {item.creditBalance ? money(item.creditBalance) : "—"}
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  No account balances are available.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-950 font-extrabold text-white">
            <tr>
              <td colSpan={3} className="px-4 py-3">
                Closing totals
              </td>
              <td className="px-4 py-3 text-right">{money(debit)}</td>
              <td className="px-4 py-3 text-right">{money(credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function JournalRegister({
  journals,
  loading,
  canPost,
  onPost,
}: {
  journals: Journal[];
  loading: boolean;
  canPost: boolean;
  onPost: (journal: Journal) => void;
}) {
  return (
    <section className="overflow-hidden border border-slate-200 bg-white">
      <div className="max-h-[65vh] overflow-y-auto">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden [&_th:nth-child(4)]:hidden [&_td:nth-child(4)]:hidden [&_th:nth-child(6)]:hidden [&_td:nth-child(6)]:hidden md:[&_th:nth-child(6)]:table-cell md:[&_td:nth-child(6)]:table-cell lg:[&_th:nth-child(3)]:table-cell lg:[&_td:nth-child(3)]:table-cell lg:[&_th:nth-child(4)]:table-cell lg:[&_td:nth-child(4)]:table-cell">
          <thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-white">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Journal</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {journals.map((item) => (
              <tr key={item._id}>
                <td className="px-2 py-2.5 sm:px-3">
                  {displayDate(item.date)}
                </td>
                <td className="px-4 py-3 font-extrabold">
                  {item.journalNumber}
                </td>
                <td className="px-4 py-3 font-semibold">{item.description}</td>
                <td className="px-4 py-3 text-slate-500">
                  {item.reference || "—"}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {money(item.lines.reduce((sum, line) => sum + line.debit, 0))}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${item.status === "posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canPost && item.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void onPost(item)}
                      className="rounded-lg bg-slate-950 px-3 py-1.5 font-bold text-white"
                    >
                      Post
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!loading && !journals.length && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  No manual journals have been created.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function JournalModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
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
  const update = (index: number, patch: Partial<DraftLine>) =>
    setLines((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!balanced)
      return setError(
        "Debit and credit totals must be equal and greater than zero.",
      );
    setSaving(true);
    setError("");
    try {
      await api.post("/accounting/journals", {
        date,
        description,
        reference,
        lines: lines.map((item) => ({
          ...item,
          debit: Number(item.debit || 0),
          credit: Number(item.credit || 0),
        })),
      });
      toast("Draft accounting journal created.", "success");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save journal.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-extrabold text-slate-950">
              New manual journal
            </h2>
            <p className="text-xs text-slate-500">
              Save as draft, review, then post to the ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 p-2"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Journal date">
              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="Reference">
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Optional source reference"
              />
            </Field>
            <Field label="Description">
              <input
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Reason for adjustment"
              />
            </Field>
          </div>
          <div className="overflow-hidden border border-slate-200">
            <table className="w-full table-fixed text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden sm:[&_th:nth-child(2)]:table-cell sm:[&_td:nth-child(2)]:table-cell">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Account</th>
                  <th className="px-3 py-2 text-left">Memo</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2">
                      <select
                        required
                        value={item.accountCode}
                        onChange={(event) =>
                          update(index, { accountCode: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-2"
                      >
                        <option value="">Select account</option>
                        {accounts.map((account) => (
                          <option key={account.code} value={account.code}>
                            {account.code} · {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        value={item.memo}
                        onChange={(event) =>
                          update(index, { memo: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-2"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.debit}
                        onChange={(event) =>
                          update(index, {
                            debit: event.target.value,
                            ...(Number(event.target.value) > 0
                              ? { credit: "" }
                              : {}),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.credit}
                        onChange={(event) =>
                          update(index, {
                            credit: event.target.value,
                            ...(Number(event.target.value) > 0
                              ? { debit: "" }
                              : {}),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-right"
                      />
                    </td>
                    <td className="p-2">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-700"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950 font-extrabold text-white">
                <tr>
                  <td colSpan={2} className="px-3 py-2">
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right">{money(debit)}</td>
                  <td className="px-3 py-2 text-right">{money(credit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, emptyLine()])}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
          >
            <Plus size={14} />
            Add line
          </button>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <span
            className={`text-xs font-bold ${balanced ? "text-emerald-700" : "text-amber-700"}`}
          >
            {balanced
              ? "Journal is balanced"
              : `Difference: ${money(Math.abs(debit - credit))}`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              disabled={saving || !balanced}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function TreasuryPanel({
  treasury,
  loading,
}: {
  treasury: TreasuryWorkspace;
  loading: boolean;
}) {
  const total = treasury.accounts.reduce(
    (sum, item) => sum + Number(item.balance || 0),
    0,
  );
  const iconFor = (type: TreasuryAccount["type"]) =>
    type === "cash" ? Wallet : type === "mobile_money" ? Smartphone : Landmark;
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="border border-slate-950 bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-300">
            Available treasury
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {loading ? "—" : money(total)}
          </p>
        </article>
        {treasury.accounts.slice(0, 3).map((item) => {
          const Icon = iconFor(item.type);
          return (
            <article
              key={item._id}
              className="border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  {item.name}
                </p>
                <Icon size={15} className="text-slate-400" />
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-950">
                {money(item.balance)}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {item.institution || title(item.type)}
                {item.accountNumber ? ` · ${item.accountNumber}` : ""}
              </p>
            </article>
          );
        })}
      </section>
      <section className="grid items-start gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-extrabold text-slate-950">
              Financial accounts
            </h2>
            <span className="text-xs text-slate-500">
              {treasury.accounts.length} accounts
            </span>
          </div>
          <div className="max-h-[470px] divide-y divide-slate-100 overflow-y-auto">
            {treasury.accounts.map((item) => {
              const Icon = iconFor(item.type);
              return (
                <article
                  key={item._id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-950">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.institution || title(item.type)}
                        {item.accountNumber ? ` · ${item.accountNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap text-sm font-extrabold text-slate-950">
                      {money(item.balance)}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase ${item.status === "active" ? "text-emerald-700" : "text-slate-400"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </article>
              );
            })}
            {!loading && !treasury.accounts.length && (
              <p className="p-10 text-center text-sm text-slate-500">
                Add the first cash, bank or Mobile Money account.
              </p>
            )}
          </div>
        </div>
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-extrabold text-slate-950">
              Treasury transactions
            </h2>
            <span className="text-xs text-slate-500">
              {treasury.transactions.length} records
            </span>
          </div>
          <div className="max-h-[470px] overflow-y-auto">
            <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] [&_td]:break-words [&_th]:break-words [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden md:[&_th:nth-child(3)]:table-cell md:[&_td:nth-child(3)]:table-cell">
              <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] uppercase text-white">
                <tr>
                  <th className="px-3 py-3">Date / reference</th>
                  <th className="px-3 py-3">Transaction</th>
                  <th className="px-3 py-3">Account movement</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treasury.transactions.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <b className="block">{displayDate(item.date)}</b>
                      <span className="text-slate-400">
                        {item.transactionNumber}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <b className="capitalize text-slate-800">{item.type}</b>
                      <span className="block max-w-56 truncate text-slate-500">
                        {item.description}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.account?.name || "Account"}
                      {item.destinationAccount
                        ? ` → ${item.destinationAccount.name}`
                        : ""}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-extrabold ${item.type === "deposit" ? "text-emerald-700" : "text-slate-950"}`}
                    >
                      {item.type === "deposit"
                        ? "+"
                        : item.type === "withdrawal"
                          ? "−"
                          : ""}
                      {money(item.amount)}
                    </td>
                  </tr>
                ))}
                {!loading && !treasury.transactions.length && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500">
                      No treasury transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function TreasuryAccountModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "bank",
    institution: "",
    accountNumber: "",
    openingBalance: "",
    openingDate: today(),
    notes: "",
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const openingBalance = parseMoneyInput(form.openingBalance || "0");
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError("Enter a valid opening balance, for example 3478105.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/accounting/treasury-accounts", {
        ...form,
        openingBalance,
      });
      toast("Financial account added.", "success");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add account.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-extrabold">Add financial account</h2>
            <p className="text-xs text-slate-500">
              Cash, bank or Mobile Money control account
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-2"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && (
            <p className="border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:col-span-2">
            Enter the balance that physically existed on the opening date.
            Future customer receipts, supplier payments, expenses and transfers
            will update this account automatically.
          </div>
          <Field label="Account name">
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </Field>
          <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Account type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
            >
              <option value="bank">Bank account</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cash">Cash on hand</option>
            </select>
          </label>
          {form.type !== "cash" && (
            <>
              <Field label={form.type === "bank" ? "Bank" : "Provider"}>
                <input
                  required
                  value={form.institution}
                  onChange={(event) =>
                    setForm({ ...form, institution: event.target.value })
                  }
                />
              </Field>
              <Field label="Account / phone number">
                <input
                  value={form.accountNumber}
                  onChange={(event) =>
                    setForm({ ...form, accountNumber: event.target.value })
                  }
                />
              </Field>
            </>
          )}
          <Field label="Balance on opening date (RWF)">
            <input
              type="text"
              inputMode="decimal"
              value={form.openingBalance}
              onChange={(event) =>
                setForm({ ...form, openingBalance: event.target.value })
              }
              placeholder="Example: 3478105"
            />
          </Field>
          <Field label="Opening date">
            <input
              required
              type="date"
              value={form.openingDate}
              onChange={(event) =>
                setForm({ ...form, openingDate: event.target.value })
              }
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
          >
            {saving ? "Saving…" : "Add account"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function TreasuryTransactionModal({
  accounts: treasuryAccounts,
  onClose,
  onSaved,
}: {
  accounts: TreasuryAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "transfer",
    account: "",
    destinationAccount: "",
    amount: "",
    date: today(),
    description: "",
    reference: "",
  });
  const source = treasuryAccounts.find((item) => item._id === form.account);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const accepted = await confirm({
      title: `Post treasury ${form.type}`,
      description: `${title(form.type)} ${money(Number(form.amount || 0))}${source ? ` from ${source.name}` : ""}? This posts immediately to the general ledger.`,
      confirmLabel: "Post transaction",
      tone: "warning",
    });
    if (!accepted) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/accounting/treasury-transactions", {
        ...form,
        amount: Number(form.amount),
      });
      toast("Treasury transaction posted.", "success");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to post transaction.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-3">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-extrabold">New treasury transaction</h2>
            <p className="text-xs text-slate-500">
              Controlled cash, bank and Mobile Money movement
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-2"
          >
            <X size={16} />
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {error && (
            <p className="border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            Transaction type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({
                  ...form,
                  type: event.target.value,
                  destinationAccount: "",
                })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
            >
              <option value="transfer">Account transfer</option>
              <option value="deposit">Deposit / funds introduced</option>
              <option value="withdrawal">Withdrawal / owner draw</option>
            </select>
          </label>
          <label className="text-[10px] font-extrabold uppercase text-slate-500">
            {form.type === "deposit" ? "Receiving account" : "Source account"}
            <select
              required
              value={form.account}
              onChange={(event) =>
                setForm({ ...form, account: event.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
            >
              <option value="">Select account</option>
              {treasuryAccounts.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} · {money(item.balance)}
                </option>
              ))}
            </select>
          </label>
          {form.type === "transfer" && (
            <label className="text-[10px] font-extrabold uppercase text-slate-500 sm:col-span-2">
              Destination account
              <select
                required
                value={form.destinationAccount}
                onChange={(event) =>
                  setForm({ ...form, destinationAccount: event.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm normal-case"
              >
                <option value="">Select destination</option>
                {treasuryAccounts
                  .filter((item) => item._id !== form.account)
                  .map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <Field label="Amount (RWF)">
            <input
              required
              type="number"
              min="1"
              max={
                form.type !== "deposit" && source ? source.balance : undefined
              }
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
            />
          </Field>
          <Field label="Date">
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
            />
          </Field>
          <Field label="Description">
            <input
              required
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>
          <Field label="Reference">
            <input
              value={form.reference}
              onChange={(event) =>
                setForm({ ...form, reference: event.target.value })
              }
            />
          </Field>
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving || !treasuryAccounts.length}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
          >
            {saving ? "Posting…" : "Post transaction"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
      {label}
      <span className="mt-1 block [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-300 [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-medium [&>input]:normal-case">
        {children}
      </span>
    </label>
  );
}
