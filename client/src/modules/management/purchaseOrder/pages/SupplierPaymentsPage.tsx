import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Plus,
  Printer,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/toastContext";
import { useConfirmation } from "@/context/confirmationContext";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type Supplier = { _id: string; name: string; code?: string; phone?: string };
type PO = {
  _id: string;
  poNumber: string;
  total: number;
  supplier: Supplier | string;
  status: string;
  orderDate?: string;
  createdAt?: string;
};
type Opening = {
  _id: string;
  openingNumber: string;
  supplier?: Supplier;
  amount: number;
  amountPaid: number;
  balance: number;
  status: string;
  openingDate: string;
  description: string;
};
type ChequeStatus =
  "issued" | "due" | "deposited" | "cleared" | "bounced" | "cancelled";
type Payment = {
  _id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  paidAt: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  chequeStatus?: ChequeStatus;
  supplier?: Supplier;
  purchaseOrder?: { _id?: string; poNumber?: string; total?: number };
  openingPayable?: { _id?: string; openingNumber?: string; description?: string };
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
type Account = {
  supplier: Supplier;
  purchaseOrderTotal: number;
  openingTotal: number;
  amountPaid: number;
  pendingCheques: number;
  expectedBalance: number;
  balance: number;
};
const money = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const parseMoneyInput = (value: string) =>
  Number(value.replace(/[^0-9.-]/g, ""));
const statusStyle = (status: string) =>
  ["paid", "cleared"].includes(status)
    ? "bg-emerald-50 text-emerald-700"
    : ["void", "bounced", "cancelled"].includes(status)
      ? "bg-red-50 text-red-700"
      : status === "due"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-700";
const emptyPayment = () => ({
  purchaseOrder: "",
  openingPayable: "",
  supplier: "",
  amount: "",
  method: "bank_cheque",
  treasuryAccount: "",
  chequeNumber: "",
  bankName: "",
  chequeDate: new Date().toISOString().slice(0, 10),
  reference: "",
  paidAt: new Date().toISOString().slice(0, 10),
  notes: "",
});

export default function SupplierPaymentsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("all");
  const [workspaceView, setWorkspaceView] = useState<
    "accounts" | "settlements" | "openings"
  >("accounts");
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [form, setForm] = useState(emptyPayment());
  const [openingForm, setOpeningForm] = useState({
    supplier: "",
    amount: "",
    openingDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "Opening supplier balance",
    notes: "",
  });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pay, po, supplier, opening, account, treasury] = await Promise.all([
        api.get<{ data: Payment[] }>("/supplier-payments"),
        api.get<{ data: PO[] }>("/purchase-orders"),
        api.get<{ data: Supplier[] }>("/suppliers"),
        api.get<{ data: Opening[] }>("/supplier-payments/opening-payables"),
        api.get<{ data: Account[] }>("/supplier-payments/supplier-accounts"),
        api.get<{ data: { accounts: TreasuryAccount[] } }>("/accounting/treasury-accounts").catch(() => ({ data: { data: { accounts: [] } } })),
      ]);
      setPayments(pay.data.data || []);
      setOrders(
        (po.data.data || []).filter((item) =>
          ["received", "partially_received"].includes(item.status),
        ),
      );
      setSuppliers((supplier.data.data || []).filter((item) => item));
      setOpenings(opening.data.data || []);
      setAccounts(account.data.data || []);
      setTreasuryAccounts((treasury.data.data.accounts || []).filter((item) => item.status === "active"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load supplier finance.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const reservesPayable = (item: Payment) =>
    !item.chequeStatus ||
    ["issued", "due", "deposited", "cleared"].includes(item.chequeStatus);
  const purchaseOrderBalance = (order: PO) => {
    const committed = payments
      .filter(
        (item) =>
          reservesPayable(item) &&
          (item.purchaseOrder?._id === order._id ||
            item.purchaseOrder?.poNumber === order.poNumber),
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.max(0, Number(order.total || 0) - committed);
  };
  const openingBalance = (opening: Opening) => {
    const pendingCheques = payments
      .filter(
        (item) =>
          item.method === "bank_cheque" &&
          ["issued", "due", "deposited"].includes(item.chequeStatus || "") &&
          (item.openingPayable?._id === opening._id ||
            item.openingPayable?.openingNumber === opening.openingNumber),
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.max(0, Number(opening.balance || 0) - pendingCheques);
  };
  const unpaidOrders = orders.filter((item) => purchaseOrderBalance(item) > 0.0001);
  const unpaidOpenings = openings.filter(
    (item) => item.status !== "void" && openingBalance(item) > 0.0001,
  );
  const selectableOrders = form.supplier
    ? unpaidOrders.filter(
        (item) =>
          typeof item.supplier !== "string" &&
          item.supplier._id === form.supplier,
      )
    : unpaidOrders;
  const selectableOpenings = form.supplier
    ? unpaidOpenings.filter((item) => item.supplier?._id === form.supplier)
    : unpaidOpenings;
  const selectedOrder = orders.find((item) => item._id === form.purchaseOrder);
  const selectedOpening = openings.find(
    (item) => item._id === form.openingPayable,
  );
  const filteredPayments = useMemo(
    () =>
      payments.filter((item) => {
        const status =
          item.method === "bank_cheque"
            ? item.chequeStatus || "cleared"
            : "cleared";
        const text =
          `${item.paymentNumber} ${item.chequeNumber || ""} ${item.supplier?.name || ""} ${item.purchaseOrder?.poNumber || ""} ${item.openingPayable?.openingNumber || ""}`.toLowerCase();
        return (
          (settlementStatus === "all" || status === settlementStatus) &&
          text.includes(settlementSearch.trim().toLowerCase())
        );
      }),
    [payments, settlementSearch, settlementStatus],
  );
  const concernedAccounts = useMemo(
    () =>
      accounts
        .filter(
          (account) =>
            Number(account.purchaseOrderTotal || 0) > 0 ||
            Number(account.openingTotal || 0) > 0 ||
            Number(account.amountPaid || 0) > 0 ||
            Number(account.pendingCheques || 0) > 0 ||
            Number(account.balance || 0) > 0,
        )
        .sort(
          (left, right) =>
            Number(right.balance || 0) - Number(left.balance || 0) ||
            left.supplier.name.localeCompare(right.supplier.name),
        ),
    [accounts],
  );
  const balance = selectedOrder
    ? purchaseOrderBalance(selectedOrder)
    : selectedOpening
      ? openingBalance(selectedOpening)
      : 0;
  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!form.supplier || (!form.purchaseOrder && !form.openingPayable))
      return setError("Select a purchase order or an opening payable.");
    const settlementAmount = parseMoneyInput(form.amount);
    if (
      !Number.isFinite(settlementAmount) ||
      settlementAmount <= 0 ||
      settlementAmount > balance + 0.0001
    )
      return setError(`Enter an amount between 1 and ${money(balance)} RWF.`);
    const isCheque = form.method === "bank_cheque";
    if (
      !(await confirm({
        title: isCheque ? "Issue supplier cheque" : "Record supplier payment",
        description: isCheque
          ? `Register cheque ${form.chequeNumber || ""} for ${money(settlementAmount)} RWF? The payable will remain outstanding until the cheque clears.`
          : `Record a cleared supplier payment of ${money(settlementAmount)} RWF?`,
        confirmLabel: isCheque ? "Issue cheque" : "Record payment",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post("/supplier-payments", {
        ...form,
        amount: settlementAmount,
      });
      setPaymentOpen(false);
      setForm(emptyPayment());
      await load();
      toast(
        isCheque
          ? "Cheque added to the register. Payable remains open until clearance."
          : "Supplier payment recorded.",
        "success",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not record supplier settlement.",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateCheque = async (
    payment: Payment,
    status: "deposited" | "cleared" | "bounced" | "cancelled",
  ) => {
    if (saving) return;
    const clears = status === "cleared";
    if (
      !(await confirm({
        title: `${status[0].toUpperCase()}${status.slice(1)} cheque`,
        description: clears
          ? `Confirm that cheque ${payment.chequeNumber} cleared the bank? This will reduce the supplier payable by ${money(payment.amount)} RWF.`
          : `Mark cheque ${payment.chequeNumber} as ${status}?`,
        confirmLabel: `Mark ${status}`,
        tone:
          status === "bounced" || status === "cancelled" ? "danger" : "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/supplier-payments/${payment._id}/cheque-status`, {
        status,
      });
      await load();
      toast(`Cheque marked ${status}.`, "success");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update cheque.",
      );
    } finally {
      setSaving(false);
    }
  };
  const submitOpening = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const openingAmount = parseMoneyInput(openingForm.amount);
    if (!Number.isFinite(openingAmount) || openingAmount <= 0) {
      setError("Enter a valid opening debt, for example 2000000.");
      return;
    }
    if (
      !(await confirm({
        title: "Record opening supplier debt",
        description: `Add an opening payable of ${money(openingAmount)} RWF to this supplier account?`,
        confirmLabel: "Record opening payable",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post("/supplier-payments/opening-payables", {
        ...openingForm,
        amount: openingAmount,
      });
      setOpeningOpen(false);
      setOpeningForm({
        supplier: "",
        amount: "",
        openingDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        description: "Opening supplier balance",
        notes: "",
      });
      await load();
      toast("Opening supplier payable recorded.", "success");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not record opening payable.",
      );
    } finally {
      setSaving(false);
    }
  };
  const printSupplierBalances = () =>
    printCanaDocument({
      title: "Supplier balance register",
      reference: `SBR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: "Official payables report",
      details: [
        { label: "Suppliers", value: concernedAccounts.length },
        {
          label: "Outstanding payables",
          value: `${money(concernedAccounts.reduce((sum, item) => sum + item.balance, 0))} RWF`,
        },
        {
          label: "Pending cheques",
          value: `${money(concernedAccounts.reduce((sum, item) => sum + item.pendingCheques, 0))} RWF`,
        },
        {
          label: "Expected after clearance",
          value: `${money(concernedAccounts.reduce((sum, item) => sum + item.expectedBalance, 0))} RWF`,
        },
      ],
      table: {
        headers: [
          "No.",
          "Supplier",
          "Purchase orders",
          "Opening debt",
          "Cleared payments",
          "Pending cheques",
          "Balance due",
        ],
        rows: concernedAccounts.map((account, index) => [
          index + 1,
          `${account.supplier.name}${account.supplier.code ? ` · ${account.supplier.code}` : ""}`,
          money(account.purchaseOrderTotal),
          money(account.openingTotal),
          money(account.amountPaid),
          money(account.pendingCheques),
          money(account.balance),
        ]),
      },
      notes:
        "Pending cheques are disclosed separately and reduce the expected balance only after bank clearance.",
    });
  const printSupplierStatement = (account: Account) => {
    const supplierId = account.supplier._id;
    const entries = [
      ...orders
        .filter(
          (order) =>
            typeof order.supplier !== "string" &&
            order.supplier._id === supplierId,
        )
        .map((order) => ({
          date: order.orderDate || order.createdAt || new Date().toISOString(),
          type: "Purchase order",
          reference: order.poNumber,
          description: "Raw materials received",
          debit: 0,
          credit: Number(order.total || 0),
        })),
      ...openings
        .filter(
          (opening) =>
            opening.status !== "void" && opening.supplier?._id === supplierId,
        )
        .map((opening) => ({
          date: opening.openingDate,
          type: "Opening payable",
          reference: opening.openingNumber,
          description: opening.description || "Opening supplier balance",
          debit: 0,
          credit: Number(opening.amount || 0),
        })),
      ...payments
        .filter(
          (payment) =>
            payment.supplier?._id === supplierId &&
            (!payment.chequeStatus || payment.chequeStatus === "cleared"),
        )
        .map((payment) => ({
          date: payment.paidAt,
          type: "Payment",
          reference: payment.paymentNumber,
          description: `${payment.method.replaceAll("_", " ")}${payment.chequeNumber ? ` · ${payment.chequeNumber}` : ""}`,
          debit: Number(payment.amount || 0),
          credit: 0,
        })),
    ].sort(
      (left, right) =>
        new Date(left.date).getTime() - new Date(right.date).getTime() ||
        left.reference.localeCompare(right.reference),
    );
    const from = statementFrom || "0000-01-01";
    const to = statementTo || new Date().toISOString().slice(0, 10);
    const openingBalance = entries
      .filter((entry) => entry.date.slice(0, 10) < from)
      .reduce(
        (balance, entry) => balance + entry.credit - entry.debit,
        0,
      );
    const periodEntries = entries.filter((entry) => {
      const date = entry.date.slice(0, 10);
      return date >= from && date <= to;
    });
    let runningBalance = openingBalance;
    const rows: Array<Array<string | number>> = [];
    if (statementFrom) {
      rows.push([
        new Date(statementFrom).toLocaleDateString("en-RW"),
        "Balance brought forward",
        "—",
        "Activity before this period",
        "—",
        "—",
        money(openingBalance),
      ]);
    }
    periodEntries.forEach((entry) => {
      runningBalance += entry.credit - entry.debit;
      rows.push([
        new Date(entry.date).toLocaleDateString("en-RW"),
        entry.type,
        entry.reference,
        entry.description,
        entry.debit ? money(entry.debit) : "—",
        entry.credit ? money(entry.credit) : "—",
        money(runningBalance),
      ]);
    });
    const charges = periodEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    const paid = periodEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const pendingCheques = payments
      .filter(
        (payment) =>
          payment.supplier?._id === supplierId &&
          payment.method === "bank_cheque" &&
          ["issued", "due", "deposited"].includes(
            payment.chequeStatus || "",
          ),
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    printCanaDocument({
      title: "Supplier account statement",
      reference: `SUP-${supplierId.slice(-6).toUpperCase()}-${to.replaceAll("-", "")}`,
      status: runningBalance > 0 ? "Balance payable" : "Account settled",
      recipient: {
        label: "Statement for",
        name: account.supplier.name,
        lines: [account.supplier.code || null, account.supplier.phone || null],
      },
      details: [
        {
          label: "Statement period",
          value: `${statementFrom || "Account opening"} to ${to}`,
        },
        { label: "Opening balance", value: `${money(openingBalance)} RWF` },
        { label: "Purchases / charges", value: `${money(charges)} RWF` },
        { label: "Cleared payments", value: `${money(paid)} RWF` },
        { label: "Closing balance payable", value: `${money(runningBalance)} RWF` },
        { label: "Pending cheques", value: `${money(pendingCheques)} RWF` },
      ],
      table: {
        headers: [
          "Date",
          "Transaction",
          "Reference",
          "Description",
          "Payment (RWF)",
          "Charge (RWF)",
          "Balance (RWF)",
        ],
        rows,
      },
      notes:
        "Charges increase the amount payable. Cleared payments reduce it. Issued, due or deposited cheques are shown separately and do not reduce the statement balance until cleared.",
    });
  };
  return (
    <div className="mx-auto max-w-[1450px] space-y-3 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b-2 border-slate-950 pb-3 sm:flex-row sm:items-center">
        <div>
          <p className="cana-section-kicker">Procurement finance</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">
            Supplier finance
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            title="Refresh supplier finance"
            aria-label="Refresh supplier finance"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-700"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setWorkspaceView("openings");
              setOpeningOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
          >
            <Plus size={15} />
            Opening payable
          </button>
          <button
            onClick={() => {
              setWorkspaceView("settlements");
              setPaymentOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
          >
            <CreditCard size={15} />
            New settlement
          </button>
        </div>
      </header>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Outstanding payables"
          value={money(
            concernedAccounts.reduce((sum, item) => sum + item.balance, 0),
          )}
        />
        <Metric
          label="Pending cheques"
          value={money(
            concernedAccounts.reduce(
              (sum, item) => sum + Number(item.pendingCheques || 0),
              0,
            ),
          )}
        />
        <Metric
          label="Expected after clearance"
          value={money(
            concernedAccounts.reduce(
              (sum, item) => sum + Number(item.expectedBalance ?? item.balance),
              0,
            ),
          )}
        />
        <Metric
          label="Cleared payments"
          value={money(
            concernedAccounts.reduce((sum, item) => sum + item.amountPaid, 0),
          )}
        />
      </section>
      <nav
        className="flex overflow-x-auto border border-slate-200 bg-white p-1"
        aria-label="Supplier finance views"
      >
        {(
          [
            ["accounts", "Supplier accounts", concernedAccounts.length],
            ["settlements", "Payments & cheques", payments.length],
            ["openings", "Opening payables", openings.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setWorkspaceView(value)}
            className={`shrink-0 rounded-md px-3 py-2 text-xs font-extrabold transition ${workspaceView === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${workspaceView === value ? "bg-white/15" : "bg-slate-100"}`}>
              {count}
            </span>
          </button>
        ))}
      </nav>
      <section className={workspaceView === "accounts" ? "overflow-hidden border border-slate-200 bg-white" : "hidden"}>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">
              Supplier accounts
            </p>
            <h2 className="mt-0.5 text-sm font-extrabold text-slate-950">
              Payables & statements
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[9px] font-extrabold uppercase text-slate-500">
              Statement from
              <input
                type="date"
                value={statementFrom}
                max={statementTo || undefined}
                onChange={(event) => setStatementFrom(event.target.value)}
                className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800"
              />
            </label>
            <label className="text-[9px] font-extrabold uppercase text-slate-500">
              Statement to
              <input
                type="date"
                value={statementTo}
                min={statementFrom || undefined}
                onChange={(event) => setStatementTo(event.target.value)}
                className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800"
              />
            </label>
            <button
              type="button"
              onClick={printSupplierBalances}
              disabled={!concernedAccounts.length}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-2.5 text-[11px] font-bold text-white disabled:opacity-40"
            >
              <Printer size={13} /> Print supplier list
            </button>
          </div>
        </div>
        <div className="max-h-[340px] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 uppercase tracking-wide text-white">
              <tr>
                <th className="w-[30%] px-3 py-2">Supplier</th>
                <th className="w-[19%] px-3 py-2 text-right">Purchases</th>
                <th className="w-[17%] px-3 py-2 text-right">Paid</th>
                <th className="w-[17%] px-3 py-2 text-right">Balance</th>
                <th className="w-[17%] px-3 py-2 text-center">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {concernedAccounts.map((account) => (
                <tr key={account.supplier._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="truncate font-bold text-slate-950">
                      {account.supplier.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {account.supplier.code || account.supplier.phone || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {money(account.purchaseOrderTotal + account.openingTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700">
                    {money(account.amountPaid)}
                  </td>
                  <td className="px-3 py-2 text-right font-extrabold">
                    {money(account.balance)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => printSupplierStatement(account)}
                      title={`Print statement for ${account.supplier.name}`}
                      aria-label={`Print statement for ${account.supplier.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    >
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !concernedAccounts.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No suppliers with financial activity are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <section className={workspaceView === "settlements" ? "overflow-hidden border border-slate-200 bg-white" : "hidden"}>
          <div className="flex flex-col gap-2 border-b border-slate-200 p-2.5 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">
                Payments & cheques
              </h2>
              <p className="text-[10px] font-semibold text-slate-500">
                {filteredPayments.length} of {payments.length} records
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row lg:ml-auto lg:max-w-2xl">
              <input
                aria-label="Search supplier settlements"
                placeholder="Search supplier, cheque or reference"
                value={settlementSearch}
                onChange={(event) => setSettlementSearch(event.target.value)}
                className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-slate-950"
              />
              <select
                aria-label="Filter settlement status"
                value={settlementStatus}
                onChange={(event) => setSettlementStatus(event.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
              >
                <option value="all">All statuses</option>
                <option value="issued">Issued</option>
                <option value="due">Due</option>
                <option value="deposited">Deposited</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
              <thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white">
                <tr>
                  <th className="w-[25%] px-2 py-2">Reference</th>
                  <th className="w-[29%] px-2 py-2">Supplier</th>
                  <th className="w-[24%] px-2 py-2">Method / status</th>
                  <th className="w-[22%] px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((item) => {
                  const chequeStatus =
                    item.method === "bank_cheque"
                      ? item.chequeStatus || "cleared"
                      : "cleared";
                  const actionable =
                    item.method === "bank_cheque" &&
                    !["cleared", "bounced", "cancelled"].includes(chequeStatus);
                  return (
                    <tr
                      key={item._id}
                      className={
                        chequeStatus === "due"
                          ? "bg-amber-50/60"
                          : "transition hover:bg-slate-50"
                      }
                    >
                      <td className="px-2 py-2 align-top">
                        <p className="truncate font-bold text-slate-950">
                          {item.paymentNumber}
                        </p>
                        <p className="truncate text-[9px] text-slate-500 sm:text-[10px]">
                          {item.chequeDate
                            ? `Matures ${new Date(item.chequeDate).toLocaleDateString("en-RW")}`
                            : new Date(item.paidAt).toLocaleDateString("en-RW")}
                        </p>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <p className="truncate font-semibold text-slate-800">
                          {item.supplier?.name || "Supplier"}
                        </p>
                        <p className="truncate text-[9px] text-slate-500 sm:text-[10px]">
                          {item.purchaseOrder?.poNumber ||
                            item.openingPayable?.openingNumber ||
                            "Opening payable"}
                        </p>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <p className="truncate capitalize text-[9px] text-slate-600 sm:text-[10px]">
                          {item.method.replaceAll("_", " ")}
                          {item.chequeNumber ? ` · ${item.chequeNumber}` : ""}
                        </p>
                        <span
                          className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${statusStyle(chequeStatus)}`}
                        >
                          {chequeStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right align-top">
                        <p className="whitespace-nowrap font-bold text-slate-950">
                          {money(item.amount)} <span className="hidden text-[9px] text-slate-500 sm:inline">RWF</span>
                        </p>
                        {actionable && (
                          <div className="mt-1 flex justify-end gap-1">
                            {chequeStatus !== "deposited" && (
                              <button
                                title="Mark deposited"
                                onClick={() =>
                                  void updateCheque(item, "deposited")
                                }
                                className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                              >
                                <Banknote size={13} />
                              </button>
                            )}
                            <button
                              title="Mark cleared"
                              onClick={() => void updateCheque(item, "cleared")}
                              className="rounded bg-emerald-700 p-1 text-white hover:bg-emerald-800"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              title="Mark bounced"
                              onClick={() => void updateCheque(item, "bounced")}
                              className="rounded border border-red-200 p-1 text-red-700 hover:bg-red-50"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && !filteredPayments.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No settlements match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className={workspaceView === "openings" ? "overflow-hidden border border-slate-200 bg-white" : "hidden"}>
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">
                Opening payables
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {openings.length} records
            </span>
          </div>
          <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
              <thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white">
                <tr>
                  <th className="w-[24%] px-2 py-2 sm:px-3">Reference</th>
                  <th className="w-[30%] px-2 py-2 sm:px-3">Supplier</th>
                  <th className="w-[27%] px-2 py-2 text-right sm:px-3">Balance</th>
                  <th className="w-[19%] px-2 py-2 sm:px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openings.map((item) => (
                  <tr key={item._id} className="transition hover:bg-slate-50">
                    <td className="px-2 py-2 align-top sm:px-3">
                      <p className="truncate font-bold text-slate-950">
                        {item.openingNumber}
                      </p>
                      <p className="text-[9px] text-slate-500 sm:text-[10px]">
                        {new Date(item.openingDate).toLocaleDateString("en-RW")}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top sm:px-3">
                      <p className="truncate font-semibold text-slate-800">
                        {item.supplier?.name || "Supplier"}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-xs">
                        {item.description}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right align-top sm:px-3">
                      <p className="whitespace-nowrap font-bold text-slate-950">
                        {money(item.balance)} <span className="hidden text-[9px] text-slate-500 sm:inline">RWF</span>
                      </p>
                      <p className="text-[9px] text-emerald-700 sm:text-[10px]">
                        Paid {money(item.amountPaid)}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top sm:px-3">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${statusStyle(item.status)}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && !openings.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No opening payables recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      {openingOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <form
            onSubmit={submitOpening}
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="cana-section-kicker text-red-700">
                  Opening payable
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  Record supplier opening debt
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpeningOpen(false)}
                className="rounded-lg p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Supplier">
                <select
                  required
                  value={openingForm.supplier}
                  onChange={(e) =>
                    setOpeningForm({ ...openingForm, supplier: e.target.value })
                  }
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Opening debt (RWF)">
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={openingForm.amount}
                  onChange={(e) =>
                    setOpeningForm({ ...openingForm, amount: e.target.value })
                  }
                  placeholder="Example: 2000000"
                />
              </Field>
              <Field label="Opening date">
                <input
                  required
                  type="date"
                  value={openingForm.openingDate}
                  onChange={(e) =>
                    setOpeningForm({
                      ...openingForm,
                      openingDate: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Due date (optional)">
                <input
                  type="date"
                  value={openingForm.dueDate}
                  onChange={(e) =>
                    setOpeningForm({ ...openingForm, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Reason / description">
                <input
                  required
                  value={openingForm.description}
                  onChange={(e) =>
                    setOpeningForm({
                      ...openingForm,
                      description: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Notes">
                <input
                  value={openingForm.notes}
                  onChange={(e) =>
                    setOpeningForm({ ...openingForm, notes: e.target.value })
                  }
                />
              </Field>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpeningOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
              >
                {saving ? "Saving…" : "Record opening payable"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {paymentOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <form
            onSubmit={submitPayment}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="cana-section-kicker text-red-700">
                  Supplier settlement
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  Payment or post-dated cheque
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="rounded-lg p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Purchase order">
                <select
                  value={form.purchaseOrder}
                  onChange={(e) => {
                    const order = orders.find(
                      (item) => item._id === e.target.value,
                    );
                    setForm({
                      ...form,
                      purchaseOrder: e.target.value,
                      openingPayable: "",
                      supplier:
                        order && typeof order.supplier !== "string"
                          ? order.supplier._id
                          : "",
                      amount: "",
                    });
                  }}
                >
                  <option value="">
                    {selectableOrders.length ? "Select unpaid purchase order" : "No unpaid purchase orders"}
                  </option>
                  {selectableOrders.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.poNumber} ·{" "}
                      {typeof item.supplier === "string"
                        ? "Supplier"
                        : item.supplier.name} · {money(purchaseOrderBalance(item))} RWF due
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Or opening payable">
                <select
                  value={form.openingPayable}
                  onChange={(e) => {
                    const opening = openings.find(
                      (item) => item._id === e.target.value,
                    );
                    setForm({
                      ...form,
                      openingPayable: e.target.value,
                      purchaseOrder: "",
                      supplier: opening?.supplier?._id || "",
                      amount: "",
                    });
                  }}
                >
                  <option value="">
                    {selectableOpenings.length ? "Select unpaid opening payable" : "No unpaid opening payables"}
                  </option>
                  {selectableOpenings.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.openingNumber} · {item.supplier?.name} ·{" "}
                        {money(openingBalance(item))} RWF due
                      </option>
                    ))}
                </select>
              </Field>
              {(selectedOrder || selectedOpening) && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">
                  Available to settle: <strong>{money(balance)} RWF</strong>
                </div>
              )}
              <Field label="Amount (RWF)">
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="Amount to settle"
                  />
                  {balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, amount: String(balance) })}
                      className="shrink-0 rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-700"
                    >
                      Full balance
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Settlement method">
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value, treasuryAccount: "" })}
                >
                  <option value="bank_cheque">Post-dated bank cheque</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              {treasuryAccounts.length > 0 && (
                <Field label="Payment account (optional)">
                  <select value={form.treasuryAccount} onChange={(e) => setForm({ ...form, treasuryAccount: e.target.value })}>
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
                </Field>
              )}
              {form.method === "bank_cheque" && (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 sm:col-span-2">
                    The cheque is registered as pending. Supplier debt and bank
                    balance change only after Finance confirms clearance.
                  </div>
                  <Field label="Cheque number">
                    <input
                      required
                      value={form.chequeNumber}
                      onChange={(e) =>
                        setForm({ ...form, chequeNumber: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Issuing bank">
                    <input
                      required
                      value={form.bankName}
                      onChange={(e) =>
                        setForm({ ...form, bankName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Cheque maturity date">
                    <input
                      required
                      type="date"
                      value={form.chequeDate}
                      onChange={(e) =>
                        setForm({ ...form, chequeDate: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}{" "}
              {form.method !== "bank_cheque" && (
                <Field label="Payment date">
                  <input
                    type="date"
                    value={form.paidAt}
                    onChange={(e) =>
                      setForm({ ...form, paidAt: e.target.value })
                    }
                  />
                </Field>
              )}
              <Field label="Reference">
                <input
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                />
              </Field>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
              >
                {saving
                  ? "Saving…"
                  : form.method === "bank_cheque"
                    ? "Issue cheque"
                    : "Record payment"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white px-3 py-2.5">
      <p className="truncate text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black tabular-nums text-slate-950" title={`${value} RWF`}>
        {value} <span className="text-xs font-bold text-slate-500">RWF</span>
      </p>
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
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2.5 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5">
        {children}
      </span>
    </label>
  );
}
