import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/context/toastContext";
import { useConfirmation } from "@/context/confirmationContext";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type Line = {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};
type Invoice = {
  issueDate: string;
  dueDate?: string;
  notes?: string;
  lines: Line[];
  subtotal: number;
  tax: number;
  _id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  customer?: { _id?: string; fullName?: string };
  salesOrder?: { _id?: string; orderNumber?: string };
};
type Payment = {
  receivedAt: string;
  reference?: string;
  notes?: string;
  _id: string;
  receiptNumber: string;
  amount: number;
  method: string;
  status?: "pending" | "received" | "void";
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  chequeStatus?:
    "received" | "due" | "deposited" | "cleared" | "bounced" | "cancelled";
  voidReason?: string;
  customer?: { _id?: string; fullName?: string };
  invoice?: { invoiceNumber?: string };
  openingBalance?: { openingNumber?: string; description?: string };
};
type TreasuryAccount = {
  _id: string;
  name: string;
  type: "cash" | "bank" | "mobile_money";
  balance: number;
  status: string;
};
const requiredTreasuryType = (method: string): TreasuryAccount["type"] =>
  method === "cash"
    ? "cash"
    : method === "mobile_money"
      ? "mobile_money"
      : "bank";
const treasuryTypeLabel = (type: TreasuryAccount["type"]) =>
  type === "mobile_money" ? "Mobile Money" : type === "cash" ? "Cash" : "Bank";
type Customer = {
  _id: string;
  fullName: string;
  phone?: string;
  businessName?: string;
};
type OpeningBalance = {
  _id: string;
  openingNumber: string;
  customer?: Customer;
  amount: number;
  amountPaid: number;
  balance: number;
  status: string;
  openingDate: string;
  dueDate?: string;
  description: string;
  notes?: string;
};
type CustomerAccount = {
  customer: Customer;
  invoiceTotal: number;
  openingTotal: number;
  amountPaid: number;
  balance: number;
};
const money = (amount: number) =>
  Number(amount || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });
const parseMoneyInput = (value: string) =>
  Number(value.replace(/[^0-9.-]/g, ""));
const statusStyle = (status: string) =>
  status === "paid"
    ? "bg-emerald-50 text-emerald-700"
    : status === "void"
      ? "bg-slate-100 text-slate-600"
      : status === "partially_paid"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-700";
const isCompletedPayment = (payment: Payment) =>
  payment.status !== "void" && payment.status !== "pending";

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const linkedInvoiceId = searchParams.get("invoice");
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<
    "all" | "outstanding" | "settled"
  >("outstanding");
  const [workspaceView, setWorkspaceView] = useState<
    "accounts" | "invoices" | "openings"
  >("accounts");
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "unpaid" | "paid" | "void"
  >("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>(
    [],
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(
    [],
  );
  const [receiptFrom, setReceiptFrom] = useState("");
  const [receiptTo, setReceiptTo] = useState("");
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingOpen, setOpeningOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState<Payment | null>(
    null,
  );
  const [reversalReason, setReversalReason] = useState("");
  const canReversePayments = user?.role === "superadmin";
  const [invoiceDetails, setInvoiceDetails] = useState<Invoice | null>(null);
  const [selectedCustomerAccount, setSelectedCustomerAccount] =
    useState<CustomerAccount | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    invoice: "",
    openingBalance: "",
    amount: "",
    method: "mobile_money",
    treasuryAccount: "",
    reference: "",
    notes: "",
    chequeNumber: "",
    bankName: "",
    chequeDate: new Date().toISOString().slice(0, 10),
  });
  const [openingForm, setOpeningForm] = useState({
    customer: "",
    amount: "",
    openingDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "Opening customer balance",
    notes: "",
  });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        customerData,
        invoiceData,
        openingData,
        accountData,
        paymentData,
        treasuryData,
      ] = await Promise.all([
        api.get<{ data: Customer[] }>("/users/customers"),
        api.get<{ data: Invoice[] }>("/billing/invoices"),
        api.get<{ data: OpeningBalance[] }>("/billing/opening-balances"),
        api.get<{ data: CustomerAccount[] }>("/billing/customer-accounts"),
        api.get<{ data: Payment[] }>("/billing/payments"),
        api
          .get<{ data: { accounts: TreasuryAccount[] } }>(
            "/accounting/treasury-accounts",
          )
          .catch(() => ({ data: { data: { accounts: [] } } })),
      ]);
      setCustomers(customerData.data.data || []);
      setInvoices(invoiceData.data.data || []);
      setOpeningBalances(openingData.data.data || []);
      setCustomerAccounts(accountData.data.data || []);
      setPayments(paymentData.data.data || []);
      setTreasuryAccounts(
        (treasuryData.data.data.accounts || []).filter(
          (item) => item.status === "active",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load billing data.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!linkedInvoiceId || loading) return;
    const linkedInvoice = invoices.find(
      (invoice) => invoice._id === linkedInvoiceId,
    );
    if (!linkedInvoice) return;
    setWorkspaceView("invoices");
    setInvoiceFilter("all");
    setInvoiceDetails(linkedInvoice);
    window.setTimeout(() => {
      document
        .getElementById(`invoice-${linkedInvoiceId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }, [linkedInvoiceId, invoices, loading]);
  const receivePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const selectedInvoice = invoices.find(
      (invoice) => invoice._id === paymentForm.invoice,
    );
    const selectedOpening = openingBalances.find(
      (opening) => opening._id === paymentForm.openingBalance,
    );
    const target = selectedInvoice || selectedOpening;
    const targetReference =
      selectedInvoice?.invoiceNumber ||
      selectedOpening?.openingNumber ||
      "the selected balance";
    const remaining = target
      ? Math.max(0, Number(target.balance) - Number(paymentForm.amount || 0))
      : 0;
    const outcome =
      remaining === 0
        ? "It will be marked paid."
        : `Its remaining balance will be ${money(remaining)} RWF.`;
    if (
      !(await confirm({
        title: "Confirm payment allocation",
        description:
          paymentForm.method === "bank_cheque"
            ? `Register cheque ${paymentForm.chequeNumber || ""} for ${money(Number(paymentForm.amount || 0))} RWF against ${targetReference}? The balance changes only after clearance.`
            : `Apply ${money(Number(paymentForm.amount || 0))} RWF to ${targetReference}? ${outcome} A receipt will be created.`,
        confirmLabel:
          paymentForm.method === "bank_cheque"
            ? "Register cheque"
            : "Record payment",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post("/billing/payments", {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      setPaymentOpen(false);
      setPaymentForm({
        invoice: "",
        openingBalance: "",
        amount: "",
        method: "mobile_money",
        treasuryAccount: "",
        reference: "",
        notes: "",
        chequeNumber: "",
        bankName: "",
        chequeDate: new Date().toISOString().slice(0, 10),
      });
      await load();
      toast(
        paymentForm.method === "bank_cheque"
          ? "Customer cheque registered pending clearance."
          : "Payment received and receipt recorded.",
        "success",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record payment.",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateCustomerCheque = async (
    payment: Payment,
    status: "deposited" | "cleared" | "bounced" | "cancelled",
  ) => {
    if (
      !(await confirm({
        title: `${status[0].toUpperCase()}${status.slice(1)} customer cheque`,
        description:
          status === "cleared"
            ? `Confirm cheque ${payment.chequeNumber} cleared? The linked balance will reduce by ${money(payment.amount)} RWF.`
            : `Mark cheque ${payment.chequeNumber} as ${status}?`,
        confirmLabel: `Mark ${status}`,
        tone:
          status === "bounced" || status === "cancelled" ? "danger" : "warning",
      }))
    )
      return;
    try {
      await api.patch(`/billing/payments/${payment._id}/cheque-status`, {
        status,
      });
      await load();
      toast(`Customer cheque marked ${status}.`, "success");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update customer cheque.",
      );
    }
  };
  const reverseRecordedPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentToReverse || saving) return;
    if (
      !(await confirm({
        title: "Reverse payment receipt",
        description: `Reverse ${paymentToReverse.receiptNumber} for ${money(paymentToReverse.amount)} RWF? Its invoice or opening balance will be reopened. The original receipt remains in the audit trail.`,
        confirmLabel: "Reverse receipt",
        tone: "danger",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/billing/payments/${paymentToReverse._id}/reverse`, {
        reason: reversalReason,
      });
      setPaymentToReverse(null);
      setReversalReason("");
      await load();
      toast(
        "Receipt reversed. You can now record the corrected payment.",
        "success",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to reverse payment.",
      );
    } finally {
      setSaving(false);
    }
  };
  const createOpeningBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const openingAmount = parseMoneyInput(openingForm.amount);
    if (!Number.isFinite(openingAmount) || openingAmount <= 0) {
      setError("Enter a valid opening debt, for example 2000000.");
      return;
    }
    if (
      !(await confirm({
        title: "Record opening customer debt",
        description: `Add an opening balance of ${money(openingAmount)} RWF to this customer account?`,
        confirmLabel: "Record opening debt",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post("/billing/opening-balances", {
        ...openingForm,
        amount: openingAmount,
      });
      setOpeningOpen(false);
      setOpeningForm({
        customer: "",
        amount: "",
        openingDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        description: "Opening customer balance",
        notes: "",
      });
      await load();
      toast("Opening customer balance recorded.", "success");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to record opening balance.",
      );
    } finally {
      setSaving(false);
    }
  };
  const printInvoice = (invoice: Invoice) =>
    printCanaDocument({
      title: "Invoice",
      reference: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      status: invoice.status.replaceAll("_", " "),
      recipient: {
        label: "Bill to",
        name: invoice.customer?.fullName || "Customer",
      },
      details: [
        { label: "Sales order", value: invoice.salesOrder?.orderNumber },
        {
          label: "Due date",
          value: invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("en-RW")
            : "On receipt",
        },
        { label: "Subtotal", value: `${money(invoice.subtotal)} RWF` },
        { label: "Additional tax", value: `${money(invoice.tax)} RWF` },
        { label: "Invoice total", value: `${money(invoice.total)} RWF` },
        { label: "Amount paid", value: `${money(invoice.amountPaid)} RWF` },
        { label: "Balance due", value: `${money(invoice.balance)} RWF` },
      ],
      table: {
        headers: [
          "Description",
          "Quantity",
          "Unit price (RWF)",
          "Amount (RWF)",
        ],
        rows: (invoice.lines || []).map((line) => [
          line.productName,
          `${line.quantity} ${line.unit}`,
          money(line.unitPrice),
          money(line.total),
        ]),
      },
      notes: `${invoice.notes || ""} Please quote ${invoice.invoiceNumber} with your payment.`,
    });
  const printReceipt = (payment: Payment) =>
    printCanaDocument({
      title: "Payment receipt",
      reference: payment.receiptNumber,
      issueDate: payment.receivedAt,
      status:
        payment.status === "void" ? "Receipt reversed" : "Payment received",
      recipient: {
        label: "Received from",
        name: payment.customer?.fullName || "Customer",
      },
      details: [
        {
          label: "Applied to",
          value:
            payment.invoice?.invoiceNumber ||
            payment.openingBalance?.openingNumber ||
            "Customer opening balance",
        },
        { label: "Amount received", value: `${money(payment.amount)} RWF` },
        { label: "Payment method", value: payment.method.replaceAll("_", " ") },
        { label: "Transaction reference", value: payment.reference || "—" },
      ],
      notes:
        payment.status === "void"
          ? `Reversed: ${payment.voidReason || "Correction"}. This receipt is retained for audit purposes.`
          : payment.notes ||
            "Acknowledgement of the payment shown above. This receipt does not imply that the invoice is fully settled.",
    });
  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const paymentDate = payment.receivedAt.slice(0, 10);
        return (
          (!receiptFrom || paymentDate >= receiptFrom) &&
          (!receiptTo || paymentDate <= receiptTo)
        );
      }),
    [payments, receiptFrom, receiptTo],
  );
  const activePayments = filteredPayments.filter(isCompletedPayment);
  const printPaymentRegister = () =>
    printCanaDocument({
      title: "Payment receipt register",
      reference: "PAY-" + (receiptFrom || "ALL") + "-" + (receiptTo || "TODAY"),
      status: "Official payment register",
      details: [
        { label: "Period from", value: receiptFrom || "Beginning" },
        { label: "Period to", value: receiptTo || "Today" },
        { label: "Active receipts", value: String(activePayments.length) },
        {
          label: "Total received",
          value:
            money(
              activePayments.reduce((sum, payment) => sum + payment.amount, 0),
            ) + " RWF",
        },
      ],
      table: {
        headers: [
          "Receipt no.",
          "Date",
          "Customer",
          "Applied to",
          "Method",
          "Reference",
          "Status",
          "Amount (RWF)",
        ],
        rows: filteredPayments.map((payment) => [
          payment.receiptNumber,
          new Date(payment.receivedAt).toLocaleDateString("en-RW"),
          payment.customer?.fullName || "Customer",
          payment.invoice?.invoiceNumber ||
            payment.openingBalance?.openingNumber ||
            "Opening balance",
          payment.method.replaceAll("_", " "),
          payment.reference || "—",
          payment.status === "void"
            ? "Reversed"
            : payment.status === "pending"
              ? "Pending clearance"
              : "Received",
          money(payment.amount),
        ]),
      },
      notes:
        "Reversed receipts and uncleared cheques remain listed for audit purposes but are excluded from the total received.",
    });
  const paidInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.status !== "void" &&
          (invoice.status === "paid" || Number(invoice.balance) <= 0),
      ),
    [invoices],
  );
  const unpaidInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) => invoice.status !== "void" && Number(invoice.balance) > 0,
      ),
    [invoices],
  );
  const liveFigures = useMemo(() => {
    const activeInvoices = invoices.filter(
      (invoice) => invoice.status !== "void",
    );
    const activeOpenings = openingBalances.filter(
      (opening) => opening.status !== "void",
    );
    return {
      invoiceValue: activeInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total || 0),
        0,
      ),
      invoiceOutstanding: activeInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.balance || 0),
        0,
      ),
      openingOutstanding: activeOpenings.reduce(
        (sum, opening) => sum + Number(opening.balance || 0),
        0,
      ),
      totalReceivable: customerAccounts.reduce(
        (sum, account) => sum + Number(account.balance || 0),
        0,
      ),
      receipts: payments
        .filter(isCompletedPayment)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };
  }, [invoices, openingBalances, customerAccounts, payments]);
  const receivableAccounts = useMemo(
    () =>
      [...customerAccounts].sort(
        (left, right) =>
          Number(right.balance || 0) - Number(left.balance || 0) ||
          Number(right.amountPaid || 0) - Number(left.amountPaid || 0),
      ),
    [customerAccounts],
  );
  const customersWithDebt = useMemo(
    () => receivableAccounts.filter((account) => Number(account.balance) > 0),
    [receivableAccounts],
  );
  const printCustomerDebtList = () => {
    const debtCustomerIds = new Set(
      customersWithDebt.map((account) => account.customer._id),
    );
    const invoiceDebt = invoices.reduce(
      (sum, invoice) =>
        sum +
        (invoice.status !== "void" &&
        invoice.customer?._id &&
        debtCustomerIds.has(invoice.customer._id)
          ? Number(invoice.balance || 0)
          : 0),
      0,
    );
    const openingDebt = openingBalances.reduce(
      (sum, opening) =>
        sum +
        (opening.status !== "void" &&
        opening.customer?._id &&
        debtCustomerIds.has(opening.customer._id)
          ? Number(opening.balance || 0)
          : 0),
      0,
    );
    const totalDue = customersWithDebt.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0,
    );

    printCanaDocument({
      title: "Customer debt register",
      reference: `CDR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: "Official receivables report",
      details: [
        {
          label: "Report date",
          value: new Date().toLocaleDateString("en-RW"),
        },
        {
          label: "Customers owing",
          value: String(customersWithDebt.length),
        },
        { label: "Invoice debt", value: `${money(invoiceDebt)} RWF` },
        { label: "Opening debt", value: `${money(openingDebt)} RWF` },
        { label: "Total outstanding", value: `${money(totalDue)} RWF` },
      ],
      table: {
        headers: [
          "No.",
          "Customer / company",
          "Contact",
          "Sales invoices",
          "Opening debt",
          "Payments",
          "Balance due (RWF)",
          "Status",
        ],
        rows: customersWithDebt.map((account, index) => [
          String(index + 1),
          account.customer.businessName
            ? `${account.customer.businessName}\n${account.customer.fullName}`
            : account.customer.fullName || "Customer",
          account.customer.phone || "—",
          money(account.invoiceTotal),
          money(account.openingTotal),
          money(account.amountPaid),
          money(account.balance),
          Number(account.amountPaid) > 0 ? "Part paid" : "Unpaid",
        ]),
      },
      notes:
        "This register includes customers with an outstanding invoice or opening balance. Reversed receipts and uncleared customer cheques are excluded from payments received.",
    });
  };
  const printCustomerStatement = (account: CustomerAccount) => {
    const customerId = account.customer._id;
    const entries = [
      ...openingBalances
        .filter(
          (opening) =>
            opening.status !== "void" && opening.customer?._id === customerId,
        )
        .map((opening) => ({
          date: opening.openingDate,
          type: "Opening debt",
          reference: opening.openingNumber,
          description: opening.description || "Opening customer balance",
          debit: Number(opening.amount || 0),
          credit: 0,
        })),
      ...invoices
        .filter(
          (invoice) =>
            invoice.status !== "void" && invoice.customer?._id === customerId,
        )
        .map((invoice) => ({
          date: invoice.issueDate,
          type: "Invoice",
          reference: invoice.invoiceNumber,
          description: invoice.salesOrder?.orderNumber
            ? `Sales order ${invoice.salesOrder.orderNumber}`
            : "Sales invoice",
          debit: Number(invoice.total || 0),
          credit: 0,
        })),
      ...payments
        .filter(
          (payment) =>
            isCompletedPayment(payment) && payment.customer?._id === customerId,
        )
        .map((payment) => ({
          date: payment.receivedAt,
          type: "Payment",
          reference: payment.receiptNumber,
          description: `Payment by ${payment.method.replaceAll("_", " ")}`,
          debit: 0,
          credit: Number(payment.amount || 0),
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
        (balance, entry) => balance + entry.debit - entry.credit,
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
      runningBalance += entry.debit - entry.credit;
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
      (sum, entry) => sum + entry.debit,
      0,
    );
    const receipts = periodEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    const customerName =
      account.customer.businessName || account.customer.fullName || "Customer";

    printCanaDocument({
      title: "Customer account statement",
      reference: `STAT-${customerId.slice(-6).toUpperCase()}-${to.replaceAll("-", "")}`,
      status: runningBalance > 0 ? "Balance outstanding" : "Account settled",
      recipient: {
        label: "Statement for",
        name: customerName,
        lines: [
          account.customer.businessName ? account.customer.fullName : null,
          account.customer.phone || null,
        ],
      },
      details: [
        {
          label: "Statement period",
          value: `${statementFrom || "Account opening"} to ${to}`,
        },
        {
          label: "Opening balance",
          value: `${money(openingBalance)} RWF`,
        },
        { label: "Charges", value: `${money(charges)} RWF` },
        { label: "Payments received", value: `${money(receipts)} RWF` },
        { label: "Closing balance due", value: `${money(runningBalance)} RWF` },
      ],
      table: {
        headers: [
          "Date",
          "Transaction",
          "Reference",
          "Description",
          "Debit (RWF)",
          "Credit (RWF)",
          "Balance (RWF)",
        ],
        rows,
      },
      notes:
        "Debit entries increase the customer balance. Credit entries are cleared payments that reduce the balance. Reversed receipts and uncleared cheques are excluded.",
    });
  };
  const visibleCustomerAccounts = useMemo(() => {
    const term = accountSearch.trim().toLowerCase();
    return receivableAccounts.filter((account) => {
      const matchesSearch =
        !term ||
        `${account.customer.fullName || ""} ${account.customer.businessName || ""} ${account.customer.phone || ""}`
          .toLowerCase()
          .includes(term);
      const balance = Number(account.balance || 0);
      const matchesStatus =
        accountFilter === "all" ||
        (accountFilter === "outstanding" && balance > 0) ||
        (accountFilter === "settled" && balance <= 0);
      return matchesSearch && matchesStatus;
    });
  }, [accountFilter, accountSearch, receivableAccounts]);
  const matchingInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      `${invoice.invoiceNumber} ${invoice.customer?.fullName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesFilter =
      invoiceFilter === "all" ||
      (invoiceFilter === "paid" &&
        invoice.status !== "void" &&
        (invoice.status === "paid" || Number(invoice.balance) <= 0)) ||
      (invoiceFilter === "unpaid" &&
        invoice.status !== "void" &&
        Number(invoice.balance) > 0) ||
      (invoiceFilter === "void" && invoice.status === "void");
    return matchesSearch && matchesFilter;
  });
  const selectedPaymentInvoice = invoices.find(
    (invoice) => invoice._id === paymentForm.invoice,
  );
  const selectedPaymentOpening = openingBalances.find(
    (opening) => opening._id === paymentForm.openingBalance,
  );
  const selectedPaymentTarget =
    selectedPaymentInvoice || selectedPaymentOpening;
  const paymentAmount = Number(paymentForm.amount || 0);
  const paymentBalanceAfter = selectedPaymentTarget
    ? Math.max(0, Number(selectedPaymentTarget.balance) - paymentAmount)
    : 0;
  const paymentTargetLabel =
    selectedPaymentInvoice?.invoiceNumber ||
    selectedPaymentOpening?.openingNumber ||
    "";
  const openPaymentForInvoice = (invoice: Invoice) => {
    setWorkspaceView("invoices");
    setPaymentForm((current) => ({
      ...current,
      invoice: invoice._id,
      openingBalance: "",
      amount: String(invoice.balance),
    }));
    setPaymentOpen(true);
  };
  return (
    <div className="mx-auto max-w-[1440px] space-y-3 pb-5">
      <header className="flex flex-col justify-between gap-3 border-b-2 border-slate-950 pb-3 sm:flex-row sm:items-center">
        <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Sales & finance
            </p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">
              Invoices & payments
            </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setWorkspaceView("invoices");
              setPaymentOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800"
          >
            <CreditCard size={16} />
            Record payment
          </button>
          <button
            onClick={() => {
              setWorkspaceView("openings");
              setOpeningOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <Plus size={16} />
            Opening balance
          </button>
          <button
            onClick={() => void load()}
            aria-label="Refresh billing data"
            title="Refresh billing data"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Customer debt due",
            value: liveFigures.totalReceivable,
            helper: "All invoice and opening balances",
            currency: true,
          },
          {
            label: "Customer payments received",
            value: liveFigures.receipts,
            helper: "Active receipts recorded",
            currency: true,
          },
          {
            label: "Customers with debt",
            value: customersWithDebt.length,
            helper: "Accounts needing follow-up",
            currency: false,
          },
          {
            label: "Invoices awaiting payment",
            value: unpaidInvoices.length,
            helper: "Issued invoices with a balance",
            currency: false,
          },
        ].map(({ label, value, helper, currency }) => (
          <div key={label} className="min-w-0 bg-white px-3 py-2.5">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-950" title={currency ? `${money(Number(value))} RWF` : String(value)}>
              {currency ? `${money(Number(value))} RWF` : value}
            </p>
            <span className="sr-only">{helper}</span>
          </div>
        ))}
      </section>
      <nav
        className="flex overflow-x-auto border border-slate-200 bg-white p-1"
        aria-label="Billing workspace views"
      >
        {(
          [
            ["accounts", "Customer accounts", receivableAccounts.length],
            ["invoices", "Invoices & receipts", invoices.length],
            ["openings", "Opening debts", openingBalances.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setWorkspaceView(value)}
            aria-pressed={workspaceView === value}
            className={`shrink-0 rounded-md px-3 py-2 text-xs font-extrabold transition ${workspaceView === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}{" "}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] ${workspaceView === value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {count}
            </span>
          </button>
        ))}
      </nav>
      <section
        className={
          workspaceView === "accounts"
            ? "overflow-hidden border border-slate-200 bg-white"
            : "hidden"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              Customer receivables
            </p>
            <h2 className="mt-0.5 text-sm font-extrabold text-slate-950">
              Customer debt & payment list
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {customersWithDebt.length} outstanding ·{" "}
              {receivableAccounts.length} total
            </span>
            <button
              type="button"
              onClick={printCustomerDebtList}
              disabled={!customersWithDebt.length}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer size={13} />
              Print debt list
            </button>
          </div>
        </div>
        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 p-2.5 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-end">
          <input
            value={accountSearch}
            onChange={(event) => setAccountSearch(event.target.value)}
            placeholder="Search customer, company or phone"
            aria-label="Search customer accounts"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-950"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
              Statement from
              <input
                type="date"
                value={statementFrom}
                max={statementTo || undefined}
                onChange={(event) => setStatementFrom(event.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
              />
            </label>
            <label className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
              Statement to
              <input
                type="date"
                value={statementTo}
                min={statementFrom || undefined}
                onChange={(event) => setStatementTo(event.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
              />
            </label>
          </div>
          <div className="flex gap-1">
            {(
              [
                ["outstanding", `Outstanding · ${customersWithDebt.length}`],
                [
                  "settled",
                  `Settled · ${receivableAccounts.length - customersWithDebt.length}`,
                ],
                ["all", `All · ${receivableAccounts.length}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountFilter(value)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${accountFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto overflow-x-hidden overscroll-contain">
          <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 uppercase tracking-wide text-white">
              <tr>
                <th className="w-[24%] px-2 py-2">Customer</th>
                <th className="w-[15%] px-2 py-2 text-right">Invoiced</th>
                <th className="hidden w-[14%] px-2 py-2 text-right md:table-cell">Opening</th>
                <th className="w-[15%] px-2 py-2 text-right">Paid</th>
                <th className="w-[16%] px-2 py-2 text-right">Balance</th>
                <th className="w-[10%] px-2 py-2">Status</th>
                <th className="w-[10%] px-2 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCustomerAccounts.map((account) => (
                <tr
                  key={`summary-${account.customer._id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCustomerAccount(account)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedCustomerAccount(account);
                    }
                  }}
                  className="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <td className="px-2 py-2">
                    <p className="font-bold text-slate-950">
                      {account.customer.businessName ||
                        account.customer.fullName}
                    </p>
                    <p className="truncate text-[9px] text-slate-500 sm:text-[10px]">
                      {account.customer.businessName
                        ? account.customer.fullName
                        : account.customer.phone || "—"}
                    </p>
                  </td>
                  <td className="truncate px-2 py-2 text-right text-slate-700">
                    {money(account.invoiceTotal)} RWF
                  </td>
                  <td className="hidden truncate px-2 py-2 text-right text-slate-700 md:table-cell">
                    {money(account.openingTotal)} RWF
                  </td>
                  <td className="truncate px-2 py-2 text-right font-semibold text-emerald-700">
                    {money(account.amountPaid)} RWF
                  </td>
                  <td className="truncate px-2 py-2 text-right font-extrabold text-slate-950">
                    {money(account.balance)} RWF
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${Number(account.balance) <= 0 ? "bg-emerald-50 text-emerald-700" : Number(account.amountPaid) > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}
                    >
                      {Number(account.balance) <= 0
                        ? "Settled"
                        : Number(account.amountPaid) > 0
                          ? "Part paid"
                          : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCustomerAccount(account);
                        }}
                        title="View account details"
                        aria-label={`View account details for ${account.customer.businessName || account.customer.fullName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          printCustomerStatement(account);
                        }}
                        title={`Print statement for ${account.customer.businessName || account.customer.fullName}`}
                        aria-label={`Print statement for ${account.customer.businessName || account.customer.fullName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !visibleCustomerAccounts.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No customer accounts match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {openingOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={createOpeningBalance}
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="cana-section-kicker text-red-700">
                  Opening receivable
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Record customer opening balance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use this only for debt that existed before CANAN started using
                  this system.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpeningOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                Customer
                <select
                  required
                  value={openingForm.customer}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      customer: event.target.value,
                    })
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.businessName || customer.fullName} ·{" "}
                      {customer.phone || "No phone"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Opening debt (RWF)
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={openingForm.amount}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      amount: event.target.value,
                    })
                  }
                  placeholder="Example: 2000000"
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Opening date
                <input
                  required
                  type="date"
                  value={openingForm.openingDate}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      openingDate: event.target.value,
                    })
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                Reason / description
                <input
                  required
                  value={openingForm.description}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Example: Outstanding balance brought forward"
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Optional due date
                <input
                  type="date"
                  value={openingForm.dueDate}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      dueDate: event.target.value,
                    })
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Notes
                <input
                  value={openingForm.notes}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      notes: event.target.value,
                    })
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpeningOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Record opening balance"}
              </button>
            </footer>
          </form>
        </div>
      )}
      <div
        className={`${workspaceView === "invoices" ? "flex" : "hidden"} flex-col gap-1.5 border border-slate-200 bg-white p-2 lg:flex-row lg:items-center`}
      >
        <input
          aria-label="Search invoices"
          placeholder="Search invoice or customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 text-xs outline-none focus:border-slate-950"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All · ${invoices.length}`],
              ["unpaid", `Unpaid · ${unpaidInvoices.length}`],
              ["paid", `Paid · ${paidInvoices.length}`],
              [
                "void",
                `Void · ${invoices.filter((invoice) => invoice.status === "void").length}`,
              ],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setInvoiceFilter(value)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-bold transition ${invoiceFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`${workspaceView === "invoices" ? "grid" : "hidden"} items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]`}
      >
        <section className="max-h-[430px] space-y-1.5 overflow-y-auto overscroll-contain pr-1 md:hidden">
          {loading ? (
            <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading invoices…
            </p>
          ) : (
            matchingInvoices.map((invoice) => (
              <article
                key={invoice._id}
                id={`invoice-${invoice._id}`}
                onClick={() => setInvoiceDetails(invoice)}
                className={`cursor-pointer border bg-white p-3 transition hover:border-slate-950 ${linkedInvoiceId === invoice._id ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-950">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {invoice.customer?.fullName || "Customer"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(invoice.status)}`}
                  >
                    {invoice.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500">
                    Total
                    <strong className="mt-1 block text-sm text-slate-950">
                      {money(invoice.total)}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Paid
                    <strong className="mt-1 block text-sm text-emerald-700">
                      {money(invoice.amountPaid)}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    Balance
                    <strong className="mt-1 block text-sm text-slate-950">
                      {money(invoice.balance)}
                    </strong>
                  </span>
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setInvoiceDetails(invoice)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <Eye size={13} />
                    Details
                  </button>
                  {invoice.balance > 0 && invoice.status !== "void" && (
                    <button
                      type="button"
                      onClick={() => openPaymentForInvoice(invoice)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-800"
                    >
                      <CreditCard size={13} />
                      Pay balance
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => printInvoice(invoice)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                </div>
              </article>
            ))
          )}
          {!loading && !matchingInvoices.length && (
            <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No invoices match this search.
            </p>
          )}
        </section>
        <section className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-extrabold text-slate-950">Invoices</h2>
            <button
              onClick={() => setPaymentOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
            >
              <CreditCard size={16} />
              Record payment
            </button>
          </div>
          <div className="max-h-[430px] overflow-y-auto overscroll-contain">
            <table className="w-full table-fixed text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase text-white">
                <tr>
                  <th className="w-[18%] px-2.5 py-2.5">Invoice</th>
                  <th className="w-[20%] px-2.5 py-2.5">Client</th>
                  <th className="w-[18%] px-2.5 py-2.5">Value (RWF)</th>
                  <th className="w-[17%] px-2.5 py-2.5">Balance</th>
                  <th className="w-[14%] px-2.5 py-2.5">Status</th>
                  <th className="w-[13%] px-2.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Loading billing data…
                    </td>
                  </tr>
                ) : (
                  matchingInvoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      id={`invoice-${invoice._id}`}
                      onClick={() => setInvoiceDetails(invoice)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${linkedInvoiceId === invoice._id ? "bg-red-50" : ""}`}
                    >
                      <td
                        className="truncate px-2.5 py-2 font-semibold"
                        title={invoice.invoiceNumber}
                      >
                        <span className="block truncate">
                          {invoice.invoiceNumber}
                        </span>
                        <span className="block truncate text-[10px] font-normal text-gray-400">
                          {invoice.salesOrder?.orderNumber}
                        </span>
                      </td>
                      <td
                        className="truncate px-2.5 py-2"
                        title={invoice.customer?.fullName}
                      >
                        {invoice.customer?.fullName}
                      </td>
                      <td className="truncate px-2.5 py-2 font-semibold text-slate-900">
                        {money(invoice.total)}
                        <span className="mt-0.5 block text-[10px] font-medium text-emerald-700">
                          Paid {money(invoice.amountPaid)}
                        </span>
                      </td>
                      <td
                        className="truncate px-2.5 py-2 font-semibold"
                        title={`${money(invoice.balance)} RWF`}
                      >
                        {money(invoice.balance)}
                      </td>
                      <td className="px-2.5 py-2">
                        <span
                          className={`block truncate rounded-full px-1.5 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wide ${statusStyle(invoice.status)}`}
                        >
                          {invoice.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td
                        className="px-2 py-2 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`View ${invoice.invoiceNumber}`}
                          title="View invoice"
                          onClick={() => setInvoiceDetails(invoice)}
                          className="mr-0.5 inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          <Eye size={12} />
                        </button>
                        {invoice.balance > 0 && invoice.status !== "void" && (
                          <button
                            type="button"
                            aria-label={`Record payment for ${invoice.invoiceNumber}`}
                            title="Record payment"
                            onClick={() => openPaymentForInvoice(invoice)}
                            className="mr-0.5 inline-flex h-6 w-6 items-center justify-center rounded bg-slate-950 text-white transition hover:bg-slate-800"
                          >
                            <CreditCard size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Print ${invoice.invoiceNumber}`}
                          title="Print invoice"
                          onClick={() => printInvoice(invoice)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-slate-600 transition hover:border-red-200 hover:text-red-700"
                        >
                          <Printer size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Delivered orders will appear here as invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {invoiceDetails && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-label={`Invoice ${invoiceDetails.invoiceNumber} details`}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
                <div>
                  <p className="cana-section-kicker text-red-700">
                    Client invoice
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                    {invoiceDetails.invoiceNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Issued{" "}
                    {new Date(invoiceDetails.issueDate).toLocaleDateString(
                      "en-RW",
                      { dateStyle: "medium" },
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(invoiceDetails.status)}`}
                  >
                    {invoiceDetails.status.replaceAll("_", " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvoiceDetails(null)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>
              <div className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Bill to
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {invoiceDetails.customer?.fullName || "Customer"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Order {invoiceDetails.salesOrder?.orderNumber || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Due date
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {invoiceDetails.dueDate
                        ? new Date(invoiceDetails.dueDate).toLocaleDateString(
                            "en-RW",
                            { dateStyle: "medium" },
                          )
                        : "On receipt"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3 text-white">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                      Balance due
                    </p>
                    <p className="mt-1 text-lg font-extrabold">
                      {money(invoiceDetails.balance)} RWF
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Paid {money(invoiceDetails.amountPaid)} RWF
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit price</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceDetails.lines.map((line, index) => (
                        <tr key={`${line.productName}-${index}`}>
                          <td className="px-4 py-3 font-bold text-slate-950">
                            {line.productName}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {line.quantity} {line.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {money(line.unitPrice)} RWF
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-950">
                            {money(line.total)} RWF
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-sm font-bold text-slate-700"
                        >
                          Invoice total
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-extrabold text-slate-950">
                          {money(invoiceDetails.total)} RWF
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {invoiceDetails.notes && (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {invoiceDetails.notes}
                    </p>
                  </div>
                )}
                <footer className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => printInvoice(invoiceDetails)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    <Printer size={15} />
                    Print invoice
                  </button>
                  {invoiceDetails.balance > 0 &&
                    invoiceDetails.status !== "void" && (
                      <button
                        type="button"
                        onClick={() => {
                          openPaymentForInvoice(invoiceDetails);
                          setInvoiceDetails(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                      >
                        <CreditCard size={15} />
                        Record payment
                      </button>
                    )}
                </footer>
              </div>
            </section>
          </div>
        )}
        {paymentOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <form
              onSubmit={receivePayment}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="cana-section-kicker text-red-700">
                    Customer finance
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                    Record payment
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose the exact invoice or opening balance this payment
                    settles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <select
                  value={paymentForm.invoice}
                  onChange={(event) => {
                    const invoice = invoices.find(
                      (item) => item._id === event.target.value,
                    );
                    setPaymentForm({
                      ...paymentForm,
                      invoice: event.target.value,
                      openingBalance: "",
                      amount: invoice ? String(invoice.balance) : "",
                    });
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Select outstanding invoice</option>
                  {invoices
                    .filter(
                      (invoice) =>
                        invoice.balance > 0 && invoice.status !== "void",
                    )
                    .map((invoice) => (
                      <option key={invoice._id} value={invoice._id}>
                        {invoice.invoiceNumber} · {invoice.customer?.fullName} ·{" "}
                        {money(invoice.balance)} RWF
                      </option>
                    ))}
                </select>
                <select
                  value={paymentForm.openingBalance}
                  onChange={(event) => {
                    const opening = openingBalances.find(
                      (item) => item._id === event.target.value,
                    );
                    setPaymentForm({
                      ...paymentForm,
                      openingBalance: event.target.value,
                      invoice: "",
                      amount: opening ? String(opening.balance) : "",
                    });
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Or select opening balance</option>
                  {openingBalances
                    .filter(
                      (opening) =>
                        opening.balance > 0 && opening.status !== "void",
                    )
                    .map((opening) => (
                      <option key={opening._id} value={opening._id}>
                        {opening.openingNumber} ·{" "}
                        {opening.customer?.businessName ||
                          opening.customer?.fullName ||
                          "Customer"}{" "}
                        · {money(opening.balance)} RWF
                      </option>
                    ))}
                </select>
                {selectedPaymentTarget && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-950">
                        Payment allocation · {paymentTargetLabel}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentAmount > 0 && paymentBalanceAfter === 0 ? "bg-emerald-100 text-emerald-700" : paymentAmount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"}`}
                      >
                        {paymentAmount > 0 && paymentBalanceAfter === 0
                          ? "Will be paid"
                          : paymentAmount > 0
                            ? "Will be partially paid"
                            : "Enter amount"}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Outstanding balance:{" "}
                      <strong className="text-slate-950">
                        {money(selectedPaymentTarget.balance)} RWF
                      </strong>
                    </p>
                    {paymentAmount > 0 && (
                      <p className="mt-1 font-semibold text-slate-800">
                        After this payment: {money(paymentBalanceAfter)} RWF
                        remaining.
                      </p>
                    )}
                  </div>
                )}
                <input
                  required
                  aria-label="Amount received in RWF"
                  min="0.01"
                  step="0.01"
                  max={
                    selectedPaymentInvoice?.balance ??
                    selectedPaymentOpening?.balance
                  }
                  type="number"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                  placeholder="Amount received"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: event.target.value,
                      treasuryAccount: "",
                    })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="bank_cheque">Bank cheque</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
                {treasuryAccounts.length > 0 && (
                  <select
                    disabled={!treasuryAccounts.length}
                    value={paymentForm.treasuryAccount}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        treasuryAccount: event.target.value,
                      })
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">
                      {treasuryAccounts.length
                        ? "Receiving account (optional)"
                        : "Accounting not configured"}
                    </option>
                    {treasuryAccounts.map((item) => {
                      const compatible =
                        item.type === requiredTreasuryType(paymentForm.method);
                      return (
                        <option
                          key={item._id}
                          value={item._id}
                          disabled={!compatible}
                        >
                          {item.name} · {treasuryTypeLabel(item.type)} ·{" "}
                          {money(item.balance)} RWF
                          {compatible ? "" : " — change payment method"}
                        </option>
                      );
                    })}
                  </select>
                )}
                {paymentForm.method === "bank_cheque" && (
                  <>
                    <input
                      required
                      value={paymentForm.chequeNumber}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          chequeNumber: event.target.value,
                        })
                      }
                      placeholder="Cheque number"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                    />
                    <input
                      required
                      value={paymentForm.bankName}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          bankName: event.target.value,
                        })
                      }
                      placeholder="Bank name"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                    />
                    <label className="text-xs font-bold text-slate-600">
                      Maturity date
                      <input
                        required
                        type="date"
                        value={paymentForm.chequeDate}
                        onChange={(event) =>
                          setPaymentForm({
                            ...paymentForm,
                            chequeDate: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                      The invoice remains outstanding until Finance confirms
                      that the cheque cleared.
                    </p>
                  </>
                )}
                <input
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: event.target.value,
                    })
                  }
                  placeholder="Reference"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
                <input
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Payment note (optional)"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm md:col-span-2"
                />
                <button
                  disabled={saving}
                  className="disabled:opacity-50 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
                >
                  Record payment
                </button>
              </div>
            </form>
          </div>
        )}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Receipts
              </p>
              <h2 className="mt-0.5 text-sm font-extrabold text-slate-950">
                Payments received{" "}
                <span className="ml-1 font-semibold text-emerald-700">
                  {activePayments.length} active ·{" "}
                  {money(
                    activePayments.reduce(
                      (sum, payment) => sum + payment.amount,
                      0,
                    ),
                  )}{" "}
                  RWF
                </span>
              </h2>
            </div>
            <button
              type="button"
              aria-label="Print payment register"
              title="Print payment register"
              onClick={printPaymentRegister}
              disabled={!filteredPayments.length}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <input
              aria-label="Receipts from date"
              type="date"
              value={receiptFrom}
              onChange={(event) => setReceiptFrom(event.target.value)}
              className="min-w-0 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
            />
            <input
              aria-label="Receipts to date"
              type="date"
              value={receiptTo}
              onChange={(event) => setReceiptTo(event.target.value)}
              className="min-w-0 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
            />
          </div>
          <div className="mt-2 max-h-[356px] space-y-1 overflow-y-auto pr-1">
            {filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">
                    {payment.customer?.fullName || "Customer"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    {payment.receiptNumber} ·{" "}
                    {payment.invoice?.invoiceNumber ||
                      payment.openingBalance?.openingNumber ||
                      "Opening balance"}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(payment.receivedAt).toLocaleDateString("en-RW")} ·{" "}
                  {payment.method.replaceAll("_", " ")}
                </span>
                <span
                  className={`whitespace-nowrap font-extrabold ${payment.status === "void" ? "text-slate-400 line-through" : payment.status === "pending" ? "text-amber-700" : "text-emerald-700"}`}
                >
                  {money(payment.amount)} RWF
                </span>
                {payment.status === "pending" ? (
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">
                      {payment.chequeStatus}
                    </span>
                    {payment.chequeStatus !== "deposited" && (
                      <button
                        type="button"
                        title="Mark deposited"
                        onClick={() =>
                          void updateCustomerCheque(payment, "deposited")
                        }
                        className="rounded border p-1.5"
                      >
                        <CreditCard size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Mark cleared"
                      onClick={() =>
                        void updateCustomerCheque(payment, "cleared")
                      }
                      className="rounded bg-emerald-700 p-1.5 text-white"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                    <button
                      type="button"
                      title="Mark bounced"
                      onClick={() =>
                        void updateCustomerCheque(payment, "bounced")
                      }
                      className="rounded border border-red-200 p-1.5 text-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : payment.status === "void" ? (
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                    Reversed
                  </span>
                ) : canReversePayments ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentToReverse(payment);
                      setReversalReason("");
                    }}
                    aria-label={`Reverse receipt ${payment.receiptNumber}`}
                    title="Reverse receipt"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-200 bg-white px-2 text-[10px] font-bold text-amber-800"
                  >
                    <RotateCcw size={12} />
                    Reverse
                  </button>
                ) : null}
                {payment.status === "received" && (
                  <button
                    onClick={() => printReceipt(payment)}
                    aria-label={`Print receipt ${payment.receiptNumber}`}
                    title="Print receipt"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700"
                  >
                    <Printer size={13} />
                  </button>
                )}
              </div>
            ))}
            {filteredPayments.length === 0 && (
              <p className="text-sm text-gray-500">
                No receipts match the selected period.
              </p>
            )}
          </div>
        </section>
      </div>
      {paymentToReverse && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={reverseRecordedPayment}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="cana-section-kicker text-red-700">
                  Payment correction
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                  Reverse {paymentToReverse.receiptNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPaymentToReverse(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600">
                {money(paymentToReverse.amount)} RWF will be returned to the
                outstanding balance. Record a new receipt with the correct
                details afterward.
              </p>
              <label className="block text-sm font-bold text-slate-700">
                Reason for correction
                <textarea
                  required
                  value={reversalReason}
                  onChange={(event) => setReversalReason(event.target.value)}
                  placeholder="For example: incorrect amount or payment method"
                  className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPaymentToReverse(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Reverse receipt
              </button>
            </footer>
          </form>
        </div>
      )}
      <section
        className={
          workspaceView === "openings"
            ? "overflow-hidden border border-slate-200 bg-white"
            : "hidden"
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
          <div>
            <h2 className="text-sm font-extrabold text-slate-950">
              Opening debts
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {openingBalances.length} record
            {openingBalances.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="max-h-[360px] overflow-y-auto overflow-x-hidden overscroll-contain">
          <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 text-[9px] uppercase tracking-wide text-white">
              <tr>
                <th className="w-[15%] px-2 py-2">Reference</th>
                <th className="w-[20%] px-2 py-2">Customer</th>
                <th className="hidden w-[18%] px-2 py-2 md:table-cell">Description</th>
                <th className="w-[13%] px-2 py-2 text-right">Original</th>
                <th className="w-[12%] px-2 py-2 text-right">Paid</th>
                <th className="w-[13%] px-2 py-2 text-right">Balance</th>
                <th className="w-[9%] px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openingBalances.map((opening) => (
                <tr key={opening._id}>
                  <td className="px-2 py-2">
                    <p className="font-bold text-slate-950">
                      {opening.openingNumber}
                    </p>
                    <p className="text-[9px] text-slate-500 sm:text-[10px]">
                      {new Date(opening.openingDate).toLocaleDateString(
                        "en-RW",
                      )}
                    </p>
                  </td>
                  <td className="truncate px-2 py-2 font-semibold text-slate-800">
                    {opening.customer?.businessName ||
                      opening.customer?.fullName ||
                      "Customer"}
                  </td>
                  <td className="hidden truncate px-2 py-2 text-slate-600 md:table-cell">
                    {opening.description}
                  </td>
                  <td className="truncate px-2 py-2 text-right text-slate-700">
                    {money(opening.amount)} RWF
                  </td>
                  <td className="truncate px-2 py-2 text-right text-emerald-700">
                    {money(opening.amountPaid)} RWF
                  </td>
                  <td className="truncate px-2 py-2 text-right font-bold text-slate-950">
                    {money(opening.balance)} RWF
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${statusStyle(opening.status)}`}
                    >
                      {opening.status.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !openingBalances.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No opening customer debts recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedCustomerAccount && (
        <CustomerAccountDetails
          account={selectedCustomerAccount}
          invoices={invoices}
          payments={payments}
          openings={openingBalances}
          onClose={() => setSelectedCustomerAccount(null)}
          onPrint={() => printCustomerStatement(selectedCustomerAccount)}
          onOpenInvoice={(invoice) => {
            setSelectedCustomerAccount(null);
            setInvoiceDetails(invoice);
          }}
        />
      )}
    </div>
  );
}

function CustomerAccountDetails({
  account,
  invoices,
  payments,
  openings,
  onClose,
  onPrint,
  onOpenInvoice,
}: {
  account: CustomerAccount;
  invoices: Invoice[];
  payments: Payment[];
  openings: OpeningBalance[];
  onClose: () => void;
  onPrint: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
}) {
  const customerId = account.customer._id;
  const accountInvoices = invoices.filter(
    (item) => item.customer?._id === customerId && item.status !== "void",
  );
  const accountPayments = payments.filter(
    (item) => item.customer?._id === customerId && item.status !== "void",
  );
  const accountOpenings = openings.filter(
    (item) => item.customer?._id === customerId && item.status !== "void",
  );
  const customerName =
    account.customer.businessName || account.customer.fullName;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${customerName} account details`}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-red-700">Customer account</p>
            <h2 className="truncate text-lg font-black text-slate-950">{customerName}</h2>
            <p className="truncate text-xs text-slate-500">
              {[account.customer.businessName ? account.customer.fullName : "", account.customer.phone]
                .filter(Boolean)
                .join(" · ") || "Account activity"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={onPrint} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white">
              <Printer size={14} /> <span className="hidden sm:inline">Statement</span>
            </button>
            <button type="button" onClick={onClose} aria-label="Close account details" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 bg-slate-50 sm:grid-cols-4 sm:divide-y-0">
          {[
            ["Total charged", account.invoiceTotal + account.openingTotal],
            ["Payments received", account.amountPaid],
            ["Outstanding balance", account.balance],
            ["Invoices", accountInvoices.length],
          ].map(([label, value], index) => (
            <div key={String(label)} className="px-3 py-2.5">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-950">
                {index === 3 ? value : `${money(Number(value))} RWF`}
              </p>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <AccountActivity title="Invoices" count={accountInvoices.length} empty="No invoices for this customer.">
              {accountInvoices.map((invoice) => (
                <button key={invoice._id} type="button" onClick={() => onOpenInvoice(invoice)} className="grid w-full grid-cols-[1fr_auto] gap-3 border-t border-slate-100 px-3 py-2 text-left transition first:border-t-0 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-slate-950">{invoice.invoiceNumber}</span>
                    <span className="block text-[10px] text-slate-500">{new Date(invoice.issueDate).toLocaleDateString("en-RW")} · {invoice.status.replaceAll("_", " ")}</span>
                  </span>
                  <span className="text-right text-xs font-black text-slate-950">{money(invoice.balance)} RWF<span className="block text-[9px] font-medium text-slate-500">of {money(invoice.total)}</span></span>
                </button>
              ))}
            </AccountActivity>
            <AccountActivity title="Receipts & payments" count={accountPayments.length} empty="No payments recorded for this customer.">
              {accountPayments.map((payment) => (
                <div key={payment._id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 px-3 py-2 first:border-t-0">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-slate-950">{payment.receiptNumber}</span>
                    <span className="block truncate text-[10px] text-slate-500">{new Date(payment.receivedAt).toLocaleDateString("en-RW")} · {payment.method.replaceAll("_", " ")}{payment.invoice?.invoiceNumber ? ` · ${payment.invoice.invoiceNumber}` : ""}</span>
                  </span>
                  <span className={`text-right text-xs font-black ${isCompletedPayment(payment) ? "text-emerald-700" : "text-amber-700"}`}>{money(payment.amount)} RWF<span className="block text-[9px] font-medium uppercase">{payment.status || "received"}</span></span>
                </div>
              ))}
            </AccountActivity>
            {accountOpenings.length > 0 && (
              <div className="lg:col-span-2">
                <AccountActivity title="Opening debts" count={accountOpenings.length} empty="">
                  {accountOpenings.map((opening) => (
                    <div key={opening._id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 px-3 py-2 first:border-t-0">
                      <span className="min-w-0"><span className="block text-xs font-extrabold text-slate-950">{opening.openingNumber}</span><span className="block truncate text-[10px] text-slate-500">{opening.description} · {new Date(opening.openingDate).toLocaleDateString("en-RW")}</span></span>
                      <span className="text-right text-xs font-black text-slate-950">{money(opening.balance)} RWF<span className="block text-[9px] font-medium text-slate-500">of {money(opening.amount)}</span></span>
                    </div>
                  ))}
                </AccountActivity>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AccountActivity({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between bg-slate-50 px-3 py-2"><h3 className="text-xs font-extrabold text-slate-950">{title}</h3><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-600">{count}</span></header>
      {count ? children : <p className="px-3 py-6 text-center text-xs text-slate-500">{empty}</p>}
    </section>
  );
}
