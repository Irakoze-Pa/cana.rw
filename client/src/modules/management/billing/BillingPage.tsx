import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  X,
} from "lucide-react";
import api from "@/services/api";
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
  customer?: { fullName?: string };
  invoice?: { invoiceNumber?: string };
};
const money = (amount: number) =>
  Number(amount || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });

export default function BillingPage() {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receiptFrom, setReceiptFrom] = useState("");
  const [receiptTo, setReceiptTo] = useState("");
  const [issuer, setIssuer] = useState<"CANA Paints" | "CANA Services">(
    "CANA Paints",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    salesOrder: "",
    dueDate: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    invoice: "",
    amount: "",
    method: "mobile_money",
    reference: "",
    notes: "",
  });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [sales, invoiceData, paymentData] = await Promise.all([
        api.get<{ data: Order[] }>("/sales-orders"),
        api.get<{ data: Invoice[] }>("/billing/invoices"),
        api.get<{ data: Payment[] }>("/billing/payments"),
      ]);
      setOrders(sales.data.data || []);
      setInvoices(invoiceData.data.data || []);
      setPayments(paymentData.data.data || []);
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
    setSaving(true);
    setError("");
    try {
      await api.post("/billing/invoices", invoiceForm);
      setInvoiceOpen(false);
      setInvoiceForm({ salesOrder: "", dueDate: "", notes: "" });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create invoice.",
      );
    } finally {
      setSaving(false);
    }
  };
  const receivePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
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
        amount: "",
        method: "mobile_money",
        reference: "",
        notes: "",
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to record payment.",
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
      company: issuer,
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
      company: issuer,
      status: "Payment received",
      recipient: {
        label: "Received from",
        name: payment.customer?.fullName || "Customer",
      },
      details: [
        { label: "Invoice", value: payment.invoice?.invoiceNumber },
        { label: "Amount received", value: `${money(payment.amount)} RWF` },
        { label: "Payment method", value: payment.method.replaceAll("_", " ") },
        { label: "Transaction reference", value: payment.reference || "—" },
      ],
      notes:
        payment.notes ||
        "Acknowledgement of the payment shown above. This receipt does not imply that the invoice is fully settled.",
    });
  const filteredPayments = useMemo(() => payments.filter((payment) => { const paymentDate = payment.receivedAt.slice(0, 10); return (!receiptFrom || paymentDate >= receiptFrom) && (!receiptTo || paymentDate <= receiptTo); }), [payments, receiptFrom, receiptTo]);
  const printPaymentRegister = () => printCanaDocument({ title: "Payment receipt register", reference: "PAY-" + (receiptFrom || "ALL") + "-" + (receiptTo || "TODAY"), company: issuer, status: "Official payment register", details: [{ label: "Period from", value: receiptFrom || "Beginning" }, { label: "Period to", value: receiptTo || "Today" }, { label: "Receipts", value: String(filteredPayments.length) }, { label: "Total received", value: money(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)) + " RWF" }], table: { headers: ["Receipt no.", "Date", "Customer", "Invoice", "Method", "Reference", "Amount (RWF)"], rows: filteredPayments.map((payment) => [payment.receiptNumber, new Date(payment.receivedAt).toLocaleDateString("en-RW"), payment.customer?.fullName || "Customer", payment.invoice?.invoiceNumber || "—", payment.method.replaceAll("_", " "), payment.reference || "—", money(payment.amount)]) }, notes: "This register lists all payments recorded in the selected period. Each payment has its own printable receipt." });
  const invoicedOrders = new Set(
    invoices.map((invoice) => invoice.salesOrder?.orderNumber),
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ReceiptText size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoices & payments
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Issue, print, and reconcile client invoices.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setInvoiceOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            New invoice
          </button>
          <button
            onClick={() => void load()}
            className="rounded-xl border border-gray-200 bg-white p-2.5"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [
            "Total invoiced",
            invoices
              .filter((i) => i.status !== "void")
              .reduce((sum, i) => sum + i.total, 0),
          ],
          ["Payments received", payments.reduce((sum, p) => sum + p.amount, 0)],
          [
            "Outstanding balance",
            invoices
              .filter((i) => i.status !== "void")
              .reduce((sum, i) => sum + i.balance, 0),
          ],
        ].map(([label, amount]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold">
              {money(Number(amount))} RWF
            </p>
          </div>
        ))}
      </section>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="text-sm font-semibold text-gray-700">
          Company shown on invoices and receipts
          <select
            value={issuer}
            onChange={(event) =>
              setIssuer(event.target.value as "CANA Paints" | "CANA Services")
            }
            className="mt-2 block rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option>CANA Paints</option>
            <option>CANA Services</option>
          </select>
        </label>
      </section>
      {invoiceOpen && (
        <form
          onSubmit={createInvoice}
          className="grid gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-5 md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <h2 className="font-bold">Create client invoice</h2>
            <button type="button" onClick={() => setInvoiceOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <select
            required
            value={invoiceForm.salesOrder}
            onChange={(event) =>
              setInvoiceForm({ ...invoiceForm, salesOrder: event.target.value })
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
                  {order.orderNumber} · {order.customer?.fullName || "Customer"}{" "}
                  · {money(order.total)} RWF
                </option>
              ))}
          </select>
          <input
            aria-label="Invoice due date"
            type="date"
            value={invoiceForm.dueDate}
            onChange={(event) =>
              setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })
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
            className="disabled:opacity-50 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2"
          >
            Issue invoice
          </button>
        </form>
      )}
      <input
        aria-label="Search invoices"
        placeholder="Search invoice or customer"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
      />
      <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold">Invoices</h2>
          <button
            onClick={() => setPaymentOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
          >
            <CreditCard size={16} />
            Record payment
          </button>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Paid</th>
              <th className="px-5 py-3">Balance</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Document</th>
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
              invoices
                .filter((invoice) =>
                  `${invoice.invoiceNumber} ${invoice.customer?.fullName || ""}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-5 py-4 font-semibold">
                      {invoice.invoiceNumber}
                      <span className="block text-xs font-normal text-gray-400">
                        {invoice.salesOrder?.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4">{invoice.customer?.fullName}</td>
                    <td className="px-5 py-4">{money(invoice.total)} RWF</td>
                    <td className="px-5 py-4 text-emerald-700">
                      {money(invoice.amountPaid)} RWF
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {money(invoice.balance)} RWF
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize">
                        {invoice.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => printInvoice(invoice)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold hover:border-red-200 hover:text-red-600"
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
      {paymentOpen && (
        <form
          onSubmit={receivePayment}
          className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <h2 className="font-bold">Record payment</h2>
            <button type="button" onClick={() => setPaymentOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <select
            required
            value={paymentForm.invoice}
            onChange={(event) =>
              setPaymentForm({ ...paymentForm, invoice: event.target.value })
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select outstanding invoice</option>
            {invoices
              .filter(
                (invoice) => invoice.balance > 0 && invoice.status !== "void",
              )
              .map((invoice) => (
                <option key={invoice._id} value={invoice._id}>
                  {invoice.invoiceNumber} · {invoice.customer?.fullName} ·{" "}
                  {money(invoice.balance)} RWF
                </option>
              ))}
          </select>
          <input
            required
            aria-label="Amount received in RWF"
            min="0.01"
            step="0.01"
            max={
              invoices.find((invoice) => invoice._id === paymentForm.invoice)
                ?.balance
            }
            type="number"
            value={paymentForm.amount}
            onChange={(event) =>
              setPaymentForm({ ...paymentForm, amount: event.target.value })
            }
            placeholder="Amount received"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <select
            value={paymentForm.method}
            onChange={(event) =>
              setPaymentForm({ ...paymentForm, method: event.target.value })
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
              setPaymentForm({ ...paymentForm, reference: event.target.value })
            }
            placeholder="Reference"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <button
            disabled={saving}
            className="disabled:opacity-50 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white md:col-span-2"
          >
            Record payment
          </button>
        </form>
      )}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Payment receipts</h2><p className="mt-1 text-sm text-gray-500">Every recorded payment has a unique receipt number.</p></div><div className="flex flex-wrap items-center gap-2"><input aria-label="Receipts from date" type="date" value={receiptFrom} onChange={(event) => setReceiptFrom(event.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"/><input aria-label="Receipts to date" type="date" value={receiptTo} onChange={(event) => setReceiptTo(event.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"/><button type="button" onClick={printPaymentRegister} disabled={!filteredPayments.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"><Printer size={15}/>Print register</button></div></div><p className="mt-3 text-sm font-semibold text-emerald-700">{filteredPayments.length} receipt{filteredPayments.length === 1 ? "" : "s"} · {money(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0))} RWF received</p>
        <div className="mt-4 space-y-3">
          {filteredPayments.map((payment) => (
            <div
              key={payment._id}
              className="flex flex-wrap gap-3 items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm"
            >
              <span className="font-semibold">
                {payment.customer?.fullName} · {payment.receiptNumber}
              </span>
              <span className="text-xs text-gray-500">
                {payment.invoice?.invoiceNumber} ·{" "}
                {new Date(payment.receivedAt).toLocaleDateString("en-RW")} ·{" "}
                {payment.method.replaceAll("_", " ")}
              </span>
              <span className="font-bold text-emerald-700">
                {money(payment.amount)} RWF
              </span>
              <button
                onClick={() => printReceipt(payment)}
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
              >
                <Printer size={14} />
                Print receipt
              </button>
            </div>
          ))}
          {filteredPayments.length === 0 && (
            <p className="text-sm text-gray-500">No receipts match the selected period.</p>
          )}
        </div>
      </section>
    </div>
  );
}
