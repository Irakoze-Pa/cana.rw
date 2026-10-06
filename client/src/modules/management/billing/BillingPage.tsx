import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Eye,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/context/toastContext";
import { useConfirmation } from "@/context/confirmationContext";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  customer?: { fullName?: string };
};
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
  customer?: { fullName?: string };
  salesOrder?: { orderNumber?: string };
};
type Payment = {
  receivedAt: string;
  reference?: string;
  notes?: string;
  _id: string;
  receiptNumber: string;
  amount: number;
  method: string;
  status?: "received" | "void";
  voidReason?: string;
  customer?: { fullName?: string };
  invoice?: { invoiceNumber?: string };
  openingBalance?: { openingNumber?: string; description?: string };
};
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
const statusStyle = (status: string) =>
  status === "paid"
    ? "bg-emerald-50 text-emerald-700"
    : status === "void"
      ? "bg-slate-100 text-slate-600"
      : status === "partially_paid"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-700";

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "unpaid" | "paid" | "void"
  >("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>(
    [],
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receiptFrom, setReceiptFrom] = useState("");
  const [receiptTo, setReceiptTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState<Payment | null>(
    null,
  );
  const [reversalReason, setReversalReason] = useState("");
  const canReversePayments = user?.role === "superadmin";
  const [invoiceDetails, setInvoiceDetails] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    salesOrder: "",
    dueDate: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    invoice: "",
    openingBalance: "",
    amount: "",
    method: "mobile_money",
    reference: "",
    notes: "",
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
        sales,
        customerData,
        invoiceData,
        openingData,
        accountData,
        paymentData,
      ] = await Promise.all([
        api.get<{ data: Order[] }>("/sales-orders"),
        api.get<{ data: Customer[] }>("/users/customers"),
        api.get<{ data: Invoice[] }>("/billing/invoices"),
        api.get<{ data: OpeningBalance[] }>("/billing/opening-balances"),
        api.get<{ data: CustomerAccount[] }>("/billing/customer-accounts"),
        api.get<{ data: Payment[] }>("/billing/payments"),
      ]);
      setOrders(sales.data.data || []);
      setCustomers(customerData.data.data || []);
      setInvoices(invoiceData.data.data || []);
      setOpeningBalances(openingData.data.data || []);
      setCustomerAccounts(accountData.data.data || []);
      setPayments(paymentData.data.data || []);
      setLastUpdated(new Date());
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
  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (
      !(await confirm({
        title: "Issue invoice",
        description:
          "Issue an invoice for this confirmed sales order? The invoice will become part of the customer account.",
        confirmLabel: "Issue invoice",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post("/billing/invoices", invoiceForm);
      setInvoiceOpen(false);
      setInvoiceForm({ salesOrder: "", dueDate: "", notes: "" });
      await load();
      toast("Invoice issued successfully.", "success");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create invoice.",
      );
    } finally {
      setSaving(false);
    }
  };
  const createMissingInvoices = async () => {
    if (saving) return;
    if (
      !(await confirm({
        title: "Create missing invoices",
        description:
          "Create an issued invoice for every delivered sales order that does not already have one. Existing invoices will not be changed.",
        confirmLabel: "Create invoices",
        tone: "warning",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      const response = await api.post<{
        data: {
          created: number;
          alreadyInvoiced: number;
          deliveredOrders: number;
        };
      }>("/billing/invoices/create-missing");
      await load();
      toast(
        response.data.data.created
          ? `${response.data.data.created} missing invoice${response.data.data.created === 1 ? "" : "s"} created.`
          : "All delivered sales orders already have invoices.",
        "success",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create missing invoices.",
      );
    } finally {
      setSaving(false);
    }
  };
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
        description: `Apply ${money(Number(paymentForm.amount || 0))} RWF to ${targetReference}? ${outcome} A receipt will be created.`,
        confirmLabel: "Record payment",
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
        reference: "",
        notes: "",
      });
      await load();
      toast("Payment received and receipt recorded.", "success");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record payment.",
      );
    } finally {
      setSaving(false);
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
    if (
      !(await confirm({
        title: "Record opening customer debt",
        description: `Add an opening balance of ${money(Number(openingForm.amount || 0))} RWF to this customer account?`,
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
        amount: Number(openingForm.amount),
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
  const activePayments = filteredPayments.filter(
    (payment) => payment.status !== "void",
  );
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
          payment.status === "void" ? "Reversed" : "Received",
          money(payment.amount),
        ]),
      },
      notes:
        "Reversed receipts remain listed for audit purposes but are excluded from the total received.",
    });
  const invoicedOrders = new Set(
    invoices.map((invoice) => invoice.salesOrder?.orderNumber),
  );
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
        .filter((payment) => payment.status !== "void")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };
  }, [invoices, openingBalances, customerAccounts, payments]);
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
    setPaymentForm((current) => ({
      ...current,
      invoice: invoice._id,
      openingBalance: "",
      amount: String(invoice.balance),
    }));
    setPaymentOpen(true);
  };
  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <ReceiptText size={21} />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Sales & finance
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-950">
              Invoices & payments
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Live records from issued invoices, customer debts, and receipts
              {lastUpdated
                ? ` · updated ${lastUpdated.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void createMissingInvoices()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ReceiptText size={16} />
            Create missing invoices
          </button>
          <button
            onClick={() => setOpeningOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <Plus size={16} />
            Opening balance
          </button>
          <button
            onClick={() => setPaymentOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <CreditCard size={16} />
            Record payment
          </button>
          <button
            onClick={() => setInvoiceOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New invoice
          </button>
          <button
            onClick={() => void load()}
            aria-label="Refresh billing data"
            title="Refresh billing data"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Customer receivables", liveFigures.totalReceivable],
          ["Invoice balance due", liveFigures.invoiceOutstanding],
          ["Opening debt due", liveFigures.openingOutstanding],
          ["Receipts recorded", liveFigures.receipts],
        ].map(([label, amount]) => (
          <div key={String(label)} className="cana-panel px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
              {typeof amount === "string"
                ? amount
                : `${money(Number(amount))} RWF`}
            </p>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          Issued invoice value:{" "}
          <strong className="text-slate-800">
            {money(liveFigures.invoiceValue)} RWF
          </strong>
        </span>
        <span>
          Paid invoices:{" "}
          <strong className="text-emerald-700">{paidInvoices.length}</strong>
        </span>
        <span>
          Invoices with balance:{" "}
          <strong className="text-slate-800">{unpaidInvoices.length}</strong>
        </span>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {invoiceOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={createInvoice}
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="cana-section-kicker text-red-700">
                  Customer finance
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Create client invoice
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Issue an invoice from a confirmed sales order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <select
                required
                value={invoiceForm.salesOrder}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    salesOrder: event.target.value,
                  })
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Select confirmed sales order</option>
                {orders
                  .filter(
                    (order) =>
                      !["draft", "cancelled"].includes(order.status) &&
                      !invoicedOrders.has(order.orderNumber),
                  )
                  .map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.orderNumber} ·{" "}
                      {order.customer?.fullName || "Customer"} ·{" "}
                      {money(order.total)} RWF
                    </option>
                  ))}
              </select>
              <input
                aria-label="Invoice due date"
                type="date"
                value={invoiceForm.dueDate}
                onChange={(event) =>
                  setInvoiceForm({
                    ...invoiceForm,
                    dueDate: event.target.value,
                  })
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
              />
              <input
                value={invoiceForm.notes}
                onChange={(event) =>
                  setInvoiceForm({ ...invoiceForm, notes: event.target.value })
                }
                placeholder="Invoice notes (optional)"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm md:col-span-2"
              />
              <button
                disabled={saving}
                className="disabled:opacity-50 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2"
              >
                Issue invoice
              </button>
            </div>
          </form>
        </div>
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
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={openingForm.amount}
                  onChange={(event) =>
                    setOpeningForm({
                      ...openingForm,
                      amount: event.target.value,
                    })
                  }
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
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 lg:flex-row lg:items-center">
        <input
          aria-label="Search invoices"
          placeholder="Search invoice or customer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm"
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
              className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${invoiceFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <section className="space-y-2 md:hidden">
          {loading ? (
            <p className="cana-panel p-8 text-center text-sm text-slate-500">
              Loading invoices…
            </p>
          ) : (
            matchingInvoices.map((invoice) => (
              <article
                key={invoice._id}
                onClick={() => setInvoiceDetails(invoice)}
                className="cana-panel cursor-pointer p-4 transition hover:border-slate-300"
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
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white"
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
            <p className="cana-panel p-8 text-center text-sm text-slate-500">
              No invoices match this search.
            </p>
          )}
        </section>
        <section className="hidden overflow-x-auto md:block cana-panel">
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
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Paid</th>
                <th className="px-3 py-2.5">Balance</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Loading billing data…
                  </td>
                </tr>
              ) : (
                matchingInvoices.map((invoice) => (
                  <tr
                    key={invoice._id}
                    onClick={() => setInvoiceDetails(invoice)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-3 py-2.5 font-semibold">
                      {invoice.invoiceNumber}
                      <span className="block text-xs font-normal text-gray-400">
                        {invoice.salesOrder?.orderNumber}
                      </span>
                    </td>
                    <td className="max-w-36 truncate px-3 py-2.5">
                      {invoice.customer?.fullName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {money(invoice.total)} RWF
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-emerald-700">
                      {money(invoice.amountPaid)} RWF
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {money(invoice.balance)} RWF
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusStyle(invoice.status)}`}
                      >
                        {invoice.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2.5 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label={`View ${invoice.invoiceNumber}`}
                        title="View invoice"
                        onClick={() => setInvoiceDetails(invoice)}
                        className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Eye size={14} />
                      </button>
                      {invoice.balance > 0 && invoice.status !== "void" && (
                        <button
                          type="button"
                          aria-label={`Record payment for ${invoice.invoiceNumber}`}
                          title="Record payment"
                          onClick={() => openPaymentForInvoice(invoice)}
                          className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800"
                        >
                          <CreditCard size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Print ${invoice.invoiceNumber}`}
                        title="Print invoice"
                        onClick={() => printInvoice(invoice)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-slate-600 transition hover:border-red-200 hover:text-red-700"
                      >
                        <Printer size={14} />
                        Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Issue an invoice from a sales order to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              <div className="grid gap-4 p-5 sm:grid-cols-2">
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
                    })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
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
        <section className="cana-panel p-3">
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
          <div className="mt-2 max-h-[390px] space-y-1.5 overflow-y-auto pr-1">
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
                  className={`whitespace-nowrap font-extrabold ${payment.status === "void" ? "text-slate-400 line-through" : "text-emerald-700"}`}
                >
                  {money(payment.amount)} RWF
                </span>
                {payment.status === "void" ? (
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
                <button
                  onClick={() => printReceipt(payment)}
                  aria-label={`Print receipt ${payment.receiptNumber}`}
                  title="Print receipt"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700"
                >
                  <Printer size={13} />
                </button>
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
      <section className="cana-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Customer receivables
            </p>
            <h2 className="mt-1 font-extrabold text-slate-950">
              Customer debt & payment list
            </h2>
          </div>
          <span className="text-sm text-slate-500">
            <strong className="text-slate-950">
              {customerAccounts.filter((account) => account.balance > 0).length}
            </strong>{" "}
            accounts outstanding
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Sales invoices</th>
                <th className="px-4 py-3 text-right">Opening debt</th>
                <th className="px-4 py-3 text-right">Payments</th>
                <th className="px-4 py-3 text-right">Balance due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerAccounts.map((account) => (
                <tr key={account.customer._id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">
                      {account.customer.businessName ||
                        account.customer.fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {account.customer.businessName
                        ? account.customer.fullName
                        : account.customer.phone || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {money(account.invoiceTotal)} RWF
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {money(account.openingTotal)} RWF
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {money(account.amountPaid)} RWF
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-950">
                    {money(account.balance)} RWF
                  </td>
                </tr>
              ))}
              {!loading && !customerAccounts.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No customer accounts are available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="cana-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Brought forward
            </p>
            <h2 className="mt-1 font-extrabold text-slate-950">
              Opening customer debts
            </h2>
          </div>
          <span className="text-sm text-slate-500">
            {openingBalances.length} record
            {openingBalances.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Original</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openingBalances.map((opening) => (
                <tr key={opening._id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">
                      {opening.openingNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(opening.openingDate).toLocaleDateString(
                        "en-RW",
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {opening.customer?.businessName ||
                      opening.customer?.fullName ||
                      "Customer"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {opening.description}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {money(opening.amount)} RWF
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {money(opening.amountPaid)} RWF
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-950">
                    {money(opening.balance)} RWF
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(opening.status)}`}
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
    </div>
  );
}
