import { CustomerOpeningBalance, Invoice, Payment } from "../billing/billing.model";
import Expense from "../expenses/expense.model";
import RawMaterialLot from "../raw-materials/rawMaterialLot.model";
import SalesOrder from "../sales/salesOrder.model";
import StaffPayment from "../staffFinance/staffPayment.model";
import SupplierPayment, { SupplierOpeningPayable } from "../supplierPayments/supplierPayment.model";
import PayrollRun from "../payroll/payrollRun.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import AccountingJournal from "./accounting.model";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type Account = { code: string; name: string; type: AccountType; group: string };
export type LedgerLine = { accountCode: string; accountName: string; debit: number; credit: number; memo?: string };
export type LedgerEntry = {
  id: string;
  date: string;
  source: string;
  reference: string;
  description: string;
  status: "posted";
  lines: LedgerLine[];
};

export const accounts: Account[] = [
  { code: "1000", name: "Cash on hand", type: "asset", group: "Cash and bank" },
  { code: "1010", name: "Bank and digital money", type: "asset", group: "Cash and bank" },
  { code: "1100", name: "Customer receivables", type: "asset", group: "Receivables" },
  { code: "1150", name: "Staff advances", type: "asset", group: "Receivables" },
  { code: "1200", name: "Raw-material inventory", type: "asset", group: "Inventory" },
  { code: "1210", name: "Finished-goods inventory", type: "asset", group: "Inventory" },
  { code: "2000", name: "Supplier payables", type: "liability", group: "Payables" },
  { code: "2100", name: "Tax payable", type: "liability", group: "Statutory liabilities" },
  { code: "3000", name: "Opening balance equity", type: "equity", group: "Equity" },
  { code: "4000", name: "Sales revenue", type: "revenue", group: "Operating revenue" },
  { code: "5000", name: "Cost of goods sold", type: "expense", group: "Direct costs" },
  { code: "5100", name: "Salaries and wages", type: "expense", group: "Operating expenses" },
  { code: "5200", name: "Transport expense", type: "expense", group: "Operating expenses" },
  { code: "5210", name: "Utilities expense", type: "expense", group: "Operating expenses" },
  { code: "5220", name: "Rent expense", type: "expense", group: "Operating expenses" },
  { code: "5230", name: "Maintenance expense", type: "expense", group: "Operating expenses" },
  { code: "5240", name: "Packaging expense", type: "expense", group: "Operating expenses" },
  { code: "5250", name: "Labour expense", type: "expense", group: "Operating expenses" },
  { code: "5260", name: "Office expense", type: "expense", group: "Operating expenses" },
  { code: "5270", name: "Marketing expense", type: "expense", group: "Operating expenses" },
  { code: "5280", name: "Taxes and fees", type: "expense", group: "Operating expenses" },
  { code: "5290", name: "Other operating expense", type: "expense", group: "Operating expenses" },
];

const account = (code: string) => {
  const found = accounts.find((item) => item.code === code);
  if (!found) throw new Error(`Accounting account ${code} is not configured.`);
  return found;
};
const line = (code: string, debit = 0, credit = 0, memo = ""): LedgerLine => ({
  accountCode: code,
  accountName: account(code).name,
  debit,
  credit,
  memo,
});
const paymentAccount = (method: unknown) => String(method) === "cash" ? "1000" : "1010";
const expenseAccount: Record<string, string> = {
  transport: "5200", utilities: "5210", rent: "5220", maintenance: "5230",
  packaging: "5240", labour: "5250", office: "5260", marketing: "5270",
  taxes_fees: "5280", other: "5290",
};
const text = (value: unknown, fallback: string) => String(value || fallback);
const amount = (value: unknown) => Math.max(0, Number(value || 0));
const iso = (value: unknown) => new Date(value as string | number | Date).toISOString();
const entry = (id: unknown, date: unknown, source: string, reference: unknown, description: string, lines: LedgerLine[]): LedgerEntry => ({
  id: String(id), date: iso(date), source, reference: text(reference, "—"), description, status: "posted", lines,
});

export async function buildLedger(): Promise<LedgerEntry[]> {
  const [invoices, payments, customerOpenings, lots, supplierPayments, supplierOpenings, expenses, orders, advances, payrolls, batches, journals] = await Promise.all([
    Invoice.find({ status: { $nin: ["draft", "void"] } }).populate("customer", "fullName businessName").lean(),
    Payment.find({ status: { $ne: "void" } }).populate("customer", "fullName businessName").lean(),
    CustomerOpeningBalance.find({ status: { $ne: "void" } }).populate("customer", "fullName businessName").lean(),
    RawMaterialLot.find().populate("rawMaterial", "name code").populate("supplier", "name code").lean(),
    SupplierPayment.find({ $or: [{ chequeStatus: "cleared" }, { chequeStatus: { $exists: false } }] }).populate("supplier", "name code").lean(),
    SupplierOpeningPayable.find({ status: { $ne: "void" } }).populate("supplier", "name code").lean(),
    Expense.find().lean(),
    SalesOrder.find({ status: "delivered" }).lean(),
    StaffPayment.find({ kind: "advance", status: { $in: ["paid", "deducted"] } }).populate("staff", "fullName").lean(),
    PayrollRun.find({ status: "paid" }).lean(),
    ProductionBatch.find({ status: "Completed", totalActualCost: { $gt: 0 } }).lean(),
    AccountingJournal.find({ status: "posted" }).lean(),
  ]);

  const entries: LedgerEntry[] = [];
  for (const invoice of invoices as any[]) {
    const total = amount(invoice.total);
    if (!total) continue;
    const tax = amount(invoice.tax);
    const customer = invoice.customer?.businessName || invoice.customer?.fullName || "Customer";
    entries.push(entry(invoice._id, invoice.issueDate || invoice.createdAt, "Sales invoice", invoice.invoiceNumber, `${customer} invoice`, [
      line("1100", total, 0, customer),
      line("4000", 0, Math.max(0, total - tax), "Revenue recognised"),
      ...(tax ? [line("2100", 0, tax, "Output tax")] : []),
    ]));
  }
  for (const order of orders as any[]) {
    const productCost = (order.items || []).filter((item: any) => item.itemType !== "raw_material").reduce((sum: number, item: any) => sum + amount(item.costTotal), 0);
    const materialCost = (order.items || []).filter((item: any) => item.itemType === "raw_material").reduce((sum: number, item: any) => sum + amount(item.costTotal), 0);
    const lines = [
      ...(productCost ? [line("5000", productCost, 0, "Finished goods sold"), line("1210", 0, productCost, "Finished goods issued")] : []),
      ...(materialCost ? [line("5000", materialCost, 0, "Raw materials sold"), line("1200", 0, materialCost, "Raw materials issued")] : []),
    ];
    if (lines.length) entries.push(entry(`cogs-${order._id}`, order.deliveredAt || order.updatedAt, "Cost of sales", order.orderNumber, "Inventory cost recognised at delivery", lines));
  }
  for (const payment of payments as any[]) {
    const paid = amount(payment.amount);
    if (!paid) continue;
    const customer = payment.customer?.businessName || payment.customer?.fullName || "Customer";
    entries.push(entry(payment._id, payment.receivedAt || payment.createdAt, "Customer receipt", payment.receiptNumber, `${customer} payment`, [
      line(paymentAccount(payment.method), paid, 0, text(payment.method, "Payment")),
      line("1100", 0, paid, customer),
    ]));
  }
  for (const opening of customerOpenings as any[]) {
    const value = amount(opening.amount);
    if (!value) continue;
    const customer = opening.customer?.businessName || opening.customer?.fullName || "Customer";
    entries.push(entry(opening._id, opening.openingDate, "Customer opening balance", opening.openingNumber, `${customer} opening receivable`, [line("1100", value, 0), line("3000", 0, value)]));
  }
  for (const lot of lots as any[]) {
    const value = amount(lot.receivedQuantity) * amount(lot.unitCost);
    if (!value) continue;
    const material = lot.rawMaterial?.name || "Raw material";
    const supplier = lot.supplier?.name || "Supplier";
    entries.push(entry(lot._id, lot.receivedAt || lot.createdAt, "Goods received", lot.grnNumber || lot.lotNumber, `${material} received from ${supplier}`, [line("1200", value, 0, material), line("2000", 0, value, supplier)]));
  }
  for (const payment of supplierPayments as any[]) {
    const paid = amount(payment.amount);
    if (!paid) continue;
    const supplier = payment.supplier?.name || "Supplier";
    entries.push(entry(payment._id, payment.paidAt || payment.createdAt, "Supplier payment", payment.paymentNumber, `${supplier} payment`, [line("2000", paid, 0, supplier), line(paymentAccount(payment.method), 0, paid, text(payment.method, "Payment"))]));
  }
  for (const opening of supplierOpenings as any[]) {
    const value = amount(opening.amount);
    if (!value) continue;
    const supplier = opening.supplier?.name || "Supplier";
    entries.push(entry(opening._id, opening.openingDate, "Supplier opening balance", opening.openingNumber, `${supplier} opening payable`, [line("3000", value, 0), line("2000", 0, value)]));
  }
  for (const expense of expenses as any[]) {
    const value = amount(expense.amount);
    if (!value) continue;
    const code = expenseAccount[String(expense.category)] || "5290";
    entries.push(entry(expense._id, expense.date || expense.createdAt, "Expense", expense.expenseNumber, text(expense.description, "Operating expense"), [line(code, value, 0), line(paymentAccount(expense.method), 0, value)]));
  }
  for (const advance of advances as any[]) {
    const value = amount(advance.amount);
    if (!value) continue;
    entries.push(entry(advance._id, advance.paymentDate || advance.createdAt, "Staff advance", `ADV-${String(advance._id).slice(-6).toUpperCase()}`, `${advance.staff?.fullName || "Staff"} advance`, [line("1150", value, 0), line("1010", 0, value)]));
  }
  for (const payroll of payrolls as any[]) {
    const gross = (payroll.lines || []).reduce((sum: number, item: any) => sum + amount(item.grossPay), 0);
    const deductions = (payroll.lines || []).reduce((sum: number, item: any) => sum + amount(item.totalDeductions), 0);
    const net = (payroll.lines || []).reduce((sum: number, item: any) => sum + amount(item.netPay), 0);
    if (!gross) continue;
    entries.push(entry(payroll._id, payroll.paidAt || payroll.updatedAt, "Payroll", payroll.payrollNumber, `Payroll for ${payroll.period}`, [line("5100", gross, 0), ...(deductions ? [line("1150", 0, deductions)] : []), ...(net ? [line("1010", 0, net)] : [])]));
  }
  for (const batch of batches as any[]) {
    const material = amount(batch.actualMaterialCost);
    const labor = amount(batch.allocatedLaborCost);
    const energy = amount(batch.allocatedEnergyCost);
    const other = amount(batch.allocatedOtherCost);
    const total = material + labor + energy + other;
    if (!total) continue;
    entries.push(entry(`production-${batch._id}`, batch.costedAt || batch.endDate || batch.updatedAt, "Production capitalization", batch.batchNo, `${batch.productName} completed batch`, [
      line("1210", total, 0, "Finished goods produced"),
      ...(material ? [line("1200", 0, material, "Raw materials consumed")] : []),
      ...(labor ? [line("5100", 0, labor, "Labour absorbed into inventory")] : []),
      ...(energy ? [line("5210", 0, energy, "Energy absorbed into inventory")] : []),
      ...(other ? [line("5290", 0, other, "Other production costs absorbed")] : []),
    ]));
  }
  for (const journal of journals as any[]) {
    entries.push(entry(journal._id, journal.date, "Manual journal", journal.journalNumber, journal.description, (journal.lines || []).map((item: any) => ({ accountCode: item.accountCode, accountName: item.accountName, debit: amount(item.debit), credit: amount(item.credit), memo: item.memo || "" }))));
  }
  return entries.sort((left, right) => right.date.localeCompare(left.date));
}

export const filterLedger = (entries: LedgerEntry[], from?: string, to?: string) => entries.filter((item) => {
  const date = item.date.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
});

export function trialBalance(entries: LedgerEntry[]) {
  return accounts.map((item) => {
    const lines = entries.flatMap((ledger) => ledger.lines).filter((ledgerLine) => ledgerLine.accountCode === item.code);
    const debitMovement = lines.reduce((sum, current) => sum + current.debit, 0);
    const creditMovement = lines.reduce((sum, current) => sum + current.credit, 0);
    const net = debitMovement - creditMovement;
    return { ...item, debitMovement, creditMovement, debitBalance: Math.max(0, net), creditBalance: Math.max(0, -net) };
  }).filter((item) => item.debitMovement || item.creditMovement);
}

export function accountingSummary(periodEntries: LedgerEntry[], asAtEntries: LedgerEntry[]) {
  const period = trialBalance(periodEntries);
  const asAt = trialBalance(asAtEntries);
  const total = (items: ReturnType<typeof trialBalance>, type: AccountType, side: "debit" | "credit") => items.filter((item) => item.type === type).reduce((sum, item) => sum + (side === "debit" ? item.debitBalance - item.creditBalance : item.creditBalance - item.debitBalance), 0);
  const revenue = total(period, "revenue", "credit");
  const expenses = total(period, "expense", "debit");
  const assets = total(asAt, "asset", "debit");
  const liabilities = total(asAt, "liability", "credit");
  const cumulativeRevenue = total(asAt, "revenue", "credit");
  const cumulativeExpenses = total(asAt, "expense", "debit");
  const equity = total(asAt, "equity", "credit") + cumulativeRevenue - cumulativeExpenses;
  const byCode = Object.fromEntries(asAt.map((item) => [item.code, item.debitBalance - item.creditBalance]));
  return {
    revenue, expenses, netProfit: revenue - expenses, assets, liabilities, equity,
    cashAndBank: amount(byCode["1000"]) + amount(byCode["1010"]),
    receivables: amount(byCode["1100"]), payables: amount(-(byCode["2000"] || 0)),
    entryCount: periodEntries.length,
  };
}

export async function nextJournalNumber() {
  const year = new Date().getFullYear();
  const suffix = `${Date.now()}`.slice(-8);
  return `JRN-${year}-${suffix}`;
}

export function validateJournalLines(lines: unknown): LedgerLine[] {
  if (!Array.isArray(lines) || lines.length < 2) throw new Error("Add at least two journal lines.");
  const normalized = lines.map((item: any) => {
    const configured = account(String(item.accountCode || ""));
    const debit = amount(item.debit);
    const credit = amount(item.credit);
    if ((!debit && !credit) || (debit && credit)) throw new Error("Each journal line must contain either a debit or a credit amount.");
    return { accountCode: configured.code, accountName: configured.name, debit, credit, memo: String(item.memo || "").trim() };
  });
  const debit = normalized.reduce((sum, item) => sum + item.debit, 0);
  const credit = normalized.reduce((sum, item) => sum + item.credit, 0);
  if (!debit || Math.abs(debit - credit) > 0.01) throw new Error("Journal debits and credits must be equal.");
  return normalized;
}
