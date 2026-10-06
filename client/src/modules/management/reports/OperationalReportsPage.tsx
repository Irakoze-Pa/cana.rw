import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarRange, Printer, RefreshCw } from "lucide-react";
import api from "@/services/api";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type OrderItem = {
  product: string | { _id?: string };
  productName: string;
  quantity: number;
  stockQuantity?: number;
  stockUnit?: string;
  costTotal?: number;
};
type StatusEntry = { status: string; at?: string };
type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  deliveredAt?: string;
  status: string;
  total?: number;
  customer?: { fullName?: string };
  items: OrderItem[];
  statusHistory?: StatusEntry[];
};
type Invoice = {
  _id: string;
  invoiceNumber?: string;
  createdAt: string;
  status?: string;
  total?: number;
  balance?: number;
  customer?: { fullName?: string };
};
type Payment = {
  _id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: number;
  method: string;
  customer?: { fullName?: string };
};
type SupplierPayment = {
  _id: string;
  paymentNumber: string;
  paidAt: string;
  amount: number;
  method: string;
  supplier?: { name?: string };
};
type Expense = {
  _id: string;
  expenseNumber: string;
  date: string;
  amount: number;
  category: string;
  description: string;
};
type Batch = {
  _id: string;
  product: string | { _id?: string };
  status: string;
  costPerKg?: number;
  costPerPack?: number;
  costedAt?: string;
  updatedAt: string;
};
type FinishedBalance = {
  _id: string;
  store: "production" | "sales";
  quantity: number;
  product?: {
    _id: string;
    name: string;
    code?: string;
    baseUnit?: string;
    packSizeKg?: number;
  };
};
type Transaction = {
  date: string;
  type: string;
  reference: string;
  party: string;
  status: string;
  amount: number;
};

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const today = (value = new Date()) => value.toISOString().slice(0, 10);
const human = (value: string) => value.replaceAll("_", " ");
const id = (value: string | { _id?: string }) =>
  typeof value === "string" ? value : String(value?._id || "");

function Metric({
  label,
  value,
  tone = "text-slate-950",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <article className="cana-panel px-3 py-2.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-extrabold tracking-tight ${tone}`}>
        {value}
      </p>
    </article>
  );
}

function PnlRow({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  strong?: boolean;
}) {
  const labelStyle = strong
    ? "font-extrabold text-slate-950"
    : muted
      ? "text-slate-500"
      : "font-bold text-slate-800";
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${strong ? "bg-slate-50" : ""}`}
    >
      <span className={labelStyle}>{label}</span>
      <span
        className={`${strong ? "text-base" : "text-sm"} ${value < 0 ? "text-red-700" : "text-slate-950"} font-extrabold`}
      >
        {value < 0 ? `(${money(Math.abs(value))})` : money(value)} RWF
      </span>
    </div>
  );
}

export default function OperationalReportsPage() {
  const now = new Date();
  const [from, setFrom] = useState(
    today(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [to, setTo] = useState(today(now));
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(
    [],
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [balances, setBalances] = useState<FinishedBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        ordersData,
        invoicesData,
        paymentsData,
        supplierData,
        expensesData,
        batchesData,
        balancesData,
      ] = await Promise.all([
        api.get<{ data: Order[] }>("/sales-orders"),
        api.get<{ data: Invoice[] }>("/billing/invoices"),
        api.get<{ data: Payment[] }>("/billing/payments"),
        api.get<{ data: SupplierPayment[] }>("/supplier-payments"),
        api.get<{ data: Expense[] }>("/expenses"),
        api.get<{ data: Batch[] }>("/production-batches"),
        api.get<{ data: FinishedBalance[] }>("/finished-goods/balances"),
      ]);
      setOrders(ordersData.data.data || []);
      setInvoices(invoicesData.data.data || []);
      setPayments(paymentsData.data.data || []);
      setSupplierPayments(supplierData.data.data || []);
      setExpenses(expensesData.data.data || []);
      setBatches(batchesData.data.data || []);
      setBalances(balancesData.data.data || []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load report data.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const inside = (date?: string) => {
    const value = String(date || "").slice(0, 10);
    return Boolean(value) && (!from || value >= from) && (!to || value <= to);
  };
  const report = useMemo(() => {
    const deliveryDate = (order: Order) =>
      order.deliveredAt ||
      [...(order.statusHistory || [])]
        .reverse()
        .find((entry) => entry.status === "delivered")?.at ||
      order.createdAt;
    const delivered = orders.filter(
      (order) => order.status === "delivered" && inside(deliveryDate(order)),
    );
    const issued = invoices.filter(
      (invoice) => inside(invoice.createdAt) && invoice.status !== "void",
    );
    const received = payments.filter((payment) => inside(payment.receivedAt));
    const supplier = supplierPayments.filter((payment) =>
      inside(payment.paidAt),
    );
    const operating = expenses.filter((expense) => inside(expense.date));
    const costedBatches = batches.filter(
      (batch) =>
        batch.status === "Completed" && Number(batch.costPerKg || 0) > 0,
    );
    let actualLines = 0;
    let estimatedLines = 0;
    let unpricedLines = 0;
    const cogs = delivered.reduce(
      (orderTotal, order) =>
        orderTotal +
        order.items.reduce((lineTotal, item) => {
          const saved = Number(item.costTotal || 0);
          if (saved > 0) {
            actualLines += 1;
            return lineTotal + saved;
          }
          const candidate = costedBatches
            .filter((batch) => id(batch.product) === id(item.product))
            .sort((a, b) =>
              String(b.costedAt || b.updatedAt).localeCompare(
                String(a.costedAt || a.updatedAt),
              ),
            )[0];
          if (!candidate) {
            unpricedLines += 1;
            return lineTotal;
          }
          const estimate =
            item.stockUnit === "kg"
              ? Number(item.stockQuantity || 0) *
                Number(candidate.costPerKg || 0)
              : Number(item.quantity || 0) * Number(candidate.costPerPack || 0);
          if (estimate > 0) estimatedLines += 1;
          else unpricedLines += 1;
          return lineTotal + estimate;
        }, 0),
      0,
    );
    const inventoryLines = balances
      .filter((balance) => balance.product && Number(balance.quantity || 0) > 0)
      .map((balance) => {
        const product = balance.product!;
        const candidate = costedBatches
          .filter((batch) => id(batch.product) === product._id)
          .sort((a, b) =>
            String(b.costedAt || b.updatedAt).localeCompare(
              String(a.costedAt || a.updatedAt),
            ),
          )[0];
        const unitCost =
          product.baseUnit === "kg"
            ? Number(candidate?.costPerKg || 0)
            : Number(candidate?.costPerPack || 0);
        return {
          ...balance,
          unitCost,
          value: Number(balance.quantity || 0) * unitCost,
          hasCost: unitCost > 0,
        };
      });
    const productionInventoryValue = inventoryLines
      .filter((line) => line.store === "production")
      .reduce((sum, line) => sum + line.value, 0);
    const salesInventoryValue = inventoryLines
      .filter((line) => line.store === "sales")
      .reduce((sum, line) => sum + line.value, 0);
    const revenue = delivered.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );
    const operatingExpenses = operating.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const expenseByCategory = Array.from(
      operating.reduce((groups, expense) => {
        const category = human(expense.category || "other");
        groups.set(
          category,
          (groups.get(category) || 0) + Number(expense.amount || 0),
        );
        return groups;
      }, new Map<string, number>()),
    ).sort((a, b) => b[1] - a[1]);
    const transactions: Transaction[] = [
      ...delivered.map((order) => ({
        date: deliveryDate(order),
        type: "Delivered sale",
        reference: order.orderNumber,
        party: order.customer?.fullName || "Customer",
        status: "Revenue recognised",
        amount: Number(order.total || 0),
      })),
      ...issued.map((invoice) => ({
        date: invoice.createdAt,
        type: "Invoice",
        reference: invoice.invoiceNumber || "—",
        party: invoice.customer?.fullName || "Customer",
        status: human(invoice.status || "issued"),
        amount: Number(invoice.total || 0),
      })),
      ...received.map((payment) => ({
        date: payment.receivedAt,
        type: "Customer receipt",
        reference: payment.receiptNumber,
        party: payment.customer?.fullName || "Customer",
        status: human(payment.method),
        amount: Number(payment.amount),
      })),
      ...supplier.map((payment) => ({
        date: payment.paidAt,
        type: "Supplier payment",
        reference: payment.paymentNumber,
        party: payment.supplier?.name || "Supplier",
        status: human(payment.method),
        amount: -Number(payment.amount),
      })),
      ...operating.map((expense) => ({
        date: expense.date,
        type: "Operating expense",
        reference: expense.expenseNumber,
        party: expense.description,
        status: human(expense.category),
        amount: -Number(expense.amount),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return {
      delivered,
      issued,
      received,
      transactions,
      revenue,
      cogs,
      operatingExpenses,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      expenseByCategory,
      outstanding: issued.reduce(
        (sum, invoice) => sum + Number(invoice.balance || 0),
        0,
      ),
      actualLines,
      estimatedLines,
      unpricedLines,
      inventoryLines,
      productionInventoryValue,
      salesInventoryValue,
    };
  }, [
    orders,
    invoices,
    payments,
    supplierPayments,
    expenses,
    batches,
    balances,
    from,
    to,
  ]);
  const printPnl = () =>
    printCanaDocument({
      title: "Profit & loss report",
      reference: `PNL-${from.replaceAll("-", "")}-${to.replaceAll("-", "")}`,
      status: "Management report",
      details: [
        { label: "Period", value: `${from} to ${to}` },
        { label: "Delivered sales", value: String(report.delivered.length) },
        {
          label: "Costed sale lines",
          value: `${report.actualLines} actual · ${report.estimatedLines} estimated`,
        },
        {
          label: "Finished goods — Production Store",
          value: `${money(report.productionInventoryValue)} RWF`,
        },
        {
          label: "Finished goods — Sales Store",
          value: `${money(report.salesInventoryValue)} RWF`,
        },
      ],
      table: {
        headers: ["Profit & loss item", "Amount (RWF)"],
        rows: [
          ["Revenue — delivered sales", money(report.revenue)],
          ["Less: cost of goods sold", `(${money(report.cogs)})`],
          ["Gross profit", money(report.grossProfit)],
          ["Less: operating expenses", `(${money(report.operatingExpenses)})`],
          ["Net profit / (loss)", money(report.netProfit)],
        ],
      },
      notes: `Profit is recognised when an order is delivered. Customer and supplier payments are cash movements, not profit. ${report.estimatedLines ? `${report.estimatedLines} historical sale line(s) use the latest recorded production cost as an estimate.` : "All costed sale lines use their delivery cost snapshot."}`,
    });
  const applyMonth = (offset: number) => {
    const date = new Date();
    const start = new Date(date.getFullYear(), date.getMonth() + offset, 1);
    const end = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0);
    setFrom(today(start));
    setTo(today(end));
  };
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <BarChart3 size={19} />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-500">
              Finance & reporting
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Profit & loss
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Delivered sales less production cost and operating expenses.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            disabled={loading}
            onClick={printPnl}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white"
          >
            <Printer size={15} />
            Print P&L
          </button>
        </div>
      </header>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="cana-panel flex flex-wrap items-end gap-3 p-3">
        <CalendarRange size={17} className="mb-2 text-slate-500" />
        <label className="text-xs font-bold text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs font-bold text-slate-500">
          To
          <input
            type="date"
            min={from}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <div className="flex gap-1.5 pb-0.5 sm:ml-auto">
          <button
            type="button"
            onClick={() => applyMonth(0)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => applyMonth(-1)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Last month
          </button>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Sales revenue"
          value={loading ? "—" : `${money(report.revenue)} RWF`}
        />
        <Metric
          label="Production cost"
          value={loading ? "—" : `${money(report.cogs)} RWF`}
        />
        <Metric
          label="Operating expenses"
          value={loading ? "—" : `${money(report.operatingExpenses)} RWF`}
          tone="text-slate-950"
        />
        <Metric
          label="Net result"
          value={
            loading
              ? "—"
              : `${money(report.netProfit)} RWF · ${report.netMargin.toFixed(1)}%`
          }
          tone={report.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}
        />
      </section>
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <section className="cana-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">
                Selected period
              </p>
              <h2 className="mt-0.5 font-extrabold text-slate-950">
                Profit statement
              </h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${report.unpricedLines > 0 ? "bg-amber-50 text-amber-800" : report.netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {report.unpricedLines > 0
                ? "Provisional"
                : report.netProfit >= 0
                  ? "Profit"
                  : "Loss"}
            </span>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <PnlRow label="Delivered sales revenue" value={report.revenue} />
            <PnlRow
              label="Less: cost of goods sold"
              value={-report.cogs}
              muted
            />
            <PnlRow label="Gross profit" value={report.grossProfit} strong />
            <PnlRow
              label="Less: operating expenses"
              value={-report.operatingExpenses}
              muted
            />
            <PnlRow label="Net result" value={report.netProfit} strong />
          </div>
        </section>
        <aside className="cana-panel p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">
            Cost quality
          </p>
          <h2 className="mt-1 font-extrabold text-slate-950">
            Sales cost coverage
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-emerald-50 px-2 py-3 text-emerald-800">
              <strong className="block text-base">{report.actualLines}</strong>
              Actual
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-3 text-amber-800">
              <strong className="block text-base">
                {report.estimatedLines}
              </strong>
              Estimated
            </div>
            <div className="rounded-lg bg-red-50 px-2 py-3 text-red-700">
              <strong className="block text-base">
                {report.unpricedLines}
              </strong>
              Missing cost
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
            Actual costs are locked at delivery. Estimated costs are used only
            for older deliveries without a saved cost.
          </div>
          {report.expenseByCategory.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">
                Operating expenses
              </p>
              <div className="mt-2 space-y-1.5">
                {report.expenseByCategory
                  .slice(0, 4)
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="capitalize text-slate-600">
                        {category}
                      </span>
                      <span className="font-bold text-slate-900">
                        {money(amount)} RWF
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-950">
            Cash & receivables
          </h2>
          <span className="text-xs text-slate-500">Not included in profit</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Cash collected"
            value={
              loading
                ? "—"
                : `${money(report.received.reduce((sum, payment) => sum + payment.amount, 0))} RWF`
            }
          />
          <Metric
            label="Invoice balance due"
            value={loading ? "—" : `${money(report.outstanding)} RWF`}
          />
          <Metric
            label="Gross margin"
            value={loading ? "—" : `${report.grossMargin.toFixed(1)}%`}
            tone={report.grossMargin >= 0 ? "text-emerald-700" : "text-red-700"}
          />
        </div>
      </section>
      <section className="cana-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">
              Balance-sheet view
            </p>
            <h2 className="mt-0.5 font-extrabold text-slate-950">
              Finished-goods inventory value
            </h2>
          </div>
          <span className="text-sm font-extrabold text-slate-950">
            {money(
              report.productionInventoryValue + report.salesInventoryValue,
            )}{" "}
            RWF
          </span>
        </div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Production store
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-950">
              {money(report.productionInventoryValue)} RWF
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sales store
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-950">
              {money(report.salesInventoryValue)} RWF
            </p>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">Store</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                <th className="px-4 py-2.5 text-right">Cost / unit</th>
                <th className="px-4 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.inventoryLines.map((line) => (
                <tr key={line._id}>
                  <td className="px-4 py-2.5 font-bold text-slate-950">
                    {line.product?.name}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-slate-600">
                    {line.store}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {Number(line.quantity).toLocaleString()}{" "}
                    {line.product?.baseUnit || "kg"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {line.hasCost
                      ? `${money(line.unitCost)} RWF`
                      : "No batch cost"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-slate-950">
                    {money(line.value)} RWF
                  </td>
                </tr>
              ))}
              {!report.inventoryLines.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No finished-goods stock is available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Valued at production cost from the latest completed batch for each
          product. Inventory is an asset, not revenue or profit.
        </p>
      </section>
      <section className="cana-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-extrabold text-slate-950">Activity register</h2>
          <span className="text-sm text-slate-500">
            {report.transactions.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer / description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.transactions.map((item) => (
                <tr key={`${item.type}-${item.reference}`}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(item.date).toLocaleDateString("en-RW")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {item.type}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-950">
                    {item.reference}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.party}</td>
                  <td className="px-4 py-3 text-slate-500">{item.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">
                    {money(item.amount)} RWF
                  </td>
                </tr>
              ))}
              {!loading && !report.transactions.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No activity for the selected period.
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
