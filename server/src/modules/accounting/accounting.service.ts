import {
  CustomerOpeningBalance,
  Invoice,
  Payment,
} from "../billing/billing.model";
import Expense from "../expenses/expense.model";
import RawMaterialLot from "../raw-materials/rawMaterialLot.model";
import SalesOrder from "../sales/salesOrder.model";
import StaffPayment from "../staffFinance/staffPayment.model";
import SupplierPayment, {
  SupplierOpeningPayable,
} from "../supplierPayments/supplierPayment.model";
import PayrollRun from "../payroll/payrollRun.model";
import ProductionBatch from "../production/productionBatch/productionBatch.model";
import AccountingJournal, {
  AccountingConfiguration,
  FixedAsset,
  OwnerLoan,
  TaxLiability,
  TreasuryAccount,
  TreasuryTransaction,
} from "./accounting.model";

export type AccountType =
  "asset" | "liability" | "equity" | "revenue" | "expense";
export type Account = {
  code: string;
  name: string;
  type: AccountType;
  group: string;
};
export type LedgerLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
};
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
  {
    code: "1010",
    name: "Bank and digital money",
    type: "asset",
    group: "Cash and bank",
  },
  {
    code: "1100",
    name: "Customer receivables",
    type: "asset",
    group: "Receivables",
  },
  { code: "1150", name: "Staff advances", type: "asset", group: "Receivables" },
  {
    code: "1200",
    name: "Raw-material inventory",
    type: "asset",
    group: "Inventory",
  },
  {
    code: "1210",
    name: "Finished-goods inventory",
    type: "asset",
    group: "Inventory",
  },
  {
    code: "1300",
    name: "Plant and equipment",
    type: "asset",
    group: "Fixed assets",
  },
  {
    code: "2000",
    name: "Supplier payables",
    type: "liability",
    group: "Payables",
  },
  {
    code: "2050",
    name: "Accrued expenses payable",
    type: "liability",
    group: "Payables",
  },
  {
    code: "2100",
    name: "Tax payable",
    type: "liability",
    group: "Statutory liabilities",
  },
  {
    code: "2150",
    name: "Payroll deductions payable",
    type: "liability",
    group: "Statutory liabilities",
  },
  { code: "2200", name: "Owner and director loans payable", type: "liability", group: "Loans payable" },
  {
    code: "3000",
    name: "Opening funds",
    type: "equity",
    group: "Equity",
  },
  { code: "3010", name: "Opening balance adjustment", type: "equity", group: "Equity" },
  {
    code: "4000",
    name: "Sales revenue",
    type: "revenue",
    group: "Operating revenue",
  },
  {
    code: "5000",
    name: "Cost of goods sold",
    type: "expense",
    group: "Direct costs",
  },
  {
    code: "5100",
    name: "Salaries and wages",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5200",
    name: "Transport expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5210",
    name: "Utilities expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5220",
    name: "Rent expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5230",
    name: "Maintenance expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5240",
    name: "Packaging expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5250",
    name: "Labour expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5260",
    name: "Office expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5270",
    name: "Marketing expense",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5280",
    name: "Taxes and fees",
    type: "expense",
    group: "Operating expenses",
  },
  {
    code: "5290",
    name: "Other operating expense",
    type: "expense",
    group: "Operating expenses",
  },
  { code: "5300", name: "Finance and interest expense", type: "expense", group: "Finance costs" },
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
const paymentAccount = (method: unknown) =>
  String(method) === "cash" ? "1000" : "1010";
const expenseAccount: Record<string, string> = {
  transport: "5200",
  utilities: "5210",
  rent: "5220",
  maintenance: "5230",
  packaging: "5240",
  labour: "5250",
  office: "5260",
  marketing: "5270",
  taxes_fees: "5280",
  other: "5290",
};
const text = (value: unknown, fallback: string) => String(value || fallback);
const amount = (value: unknown) => Math.max(0, Number(value || 0));
const iso = (value: unknown) =>
  new Date(value as string | number | Date).toISOString();
const entry = (
  id: unknown,
  date: unknown,
  source: string,
  reference: unknown,
  description: string,
  lines: LedgerLine[],
): LedgerEntry => ({
  id: String(id),
  date: iso(date),
  source,
  reference: text(reference, "—"),
  description,
  status: "posted",
  lines,
});

const treasuryCode = (type: unknown) =>
  String(type) === "cash" ? "1000" : "1010";
const postingTreasuryCode = (record: any) =>
  record?.treasuryAccount?.type
    ? treasuryCode(record.treasuryAccount.type)
    : paymentAccount(record?.method);

export async function treasuryWorkspace() {
  const [treasuryAccounts, transactions, customerReceipts, supplierSettlements, operatingExpenses, paidPayrolls, paidAdvances, loans, taxes] = await Promise.all([
    TreasuryAccount.find().sort({ status: 1, name: 1 }).lean(),
    TreasuryTransaction.find()
      .populate(
        "account destinationAccount",
        "name type institution accountNumber",
      )
      .populate("createdBy", "fullName")
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    Payment.find({
      treasuryAccount: { $exists: true },
      $or: [
        { status: "received" },
        { status: { $exists: false } },
        { status: null },
      ],
    })
      .select("treasuryAccount amount receivedAt clearedAt receiptNumber method")
      .lean(),
    SupplierPayment.find({ treasuryAccount: { $exists: true }, includedInOpeningBalance: { $ne: true }, $or: [{ chequeStatus: "cleared" }, { chequeStatus: { $exists: false } }] })
      .select("treasuryAccount amount paidAt paymentNumber method")
      .lean(),
    Expense.find({ treasuryAccount: { $exists: true }, $or: [{ method: { $ne: "bank_cheque" } }, { chequeStatus: "cleared" }, { chequeStatus: { $exists: false } }] })
      .select("treasuryAccount amount date clearedAt expenseNumber method")
      .lean(),
    PayrollRun.find({ status: "paid", treasuryAccount: { $exists: true } })
      .select("treasuryAccount lines paidAt payrollNumber period")
      .lean(),
    StaffPayment.find({ kind: "advance", status: { $in: ["paid", "deducted"] }, treasuryAccount: { $exists: true } })
      .select("treasuryAccount amount paymentDate reason")
      .populate("staff", "fullName")
      .lean(),
    OwnerLoan.find({ status: { $ne: "void" }, "repayments.0": { $exists: true } }).select("repayments lenderName loanNumber").lean(),
    TaxLiability.find({ status: { $ne: "void" }, "payments.0": { $exists: true } }).select("payments taxType taxNumber").lean(),
  ]);
  const balances = treasuryAccounts.map((accountItem: any) => {
    const accountId = String(accountItem._id);
    const openingDate = new Date(accountItem.openingDate || accountItem.createdAt || 0).getTime();
    const onOrAfterOpening = (value: unknown) =>
      new Date(value as string | number | Date).getTime() >= openingDate;
    const movement = (transactions as any[])
      .filter((item) => item.status !== "void" && onOrAfterOpening(item.date))
      .reduce((sum, item) => {
        if (String(item.account?._id || item.account) === accountId)
          sum +=
            item.type === "deposit"
              ? Number(item.amount)
              : -Number(item.amount);
        if (
          item.type === "transfer" &&
          String(item.destinationAccount?._id || item.destinationAccount) ===
            accountId
        )
          sum += Number(item.amount);
        return sum;
      }, 0);
    const receipts = (customerReceipts as any[])
      .filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.method === "bank_cheque" ? item.clearedAt || item.receivedAt : item.receivedAt))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const settlements = (supplierSettlements as any[])
      .filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.paidAt))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expensesPaid = (operatingExpenses as any[])
      .filter((item) => {
        const bankMovementDate = item.method === "bank_cheque" ? item.clearedAt || item.date : item.date;
        return String(item.treasuryAccount) === accountId && onOrAfterOpening(bankMovementDate);
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const payrollPaid = (paidPayrolls as any[])
      .filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.paidAt))
      .reduce((sum, item) => sum + (item.lines || []).reduce((lineSum: number, lineItem: any) => lineSum + Number(lineItem.netPay || 0), 0), 0);
    const advancesPaid = (paidAdvances as any[])
      .filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.paymentDate))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const loanPaid = (loans as any[]).flatMap((item) => item.repayments || []).filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.paymentDate)).reduce((sum, item) => sum + Number(item.principal || 0) + Number(item.interest || 0), 0);
    const taxPaid = (taxes as any[]).flatMap((item) => item.payments || []).filter((item) => String(item.treasuryAccount) === accountId && onOrAfterOpening(item.paymentDate)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      ...accountItem,
      balance: Number(accountItem.openingBalance || 0) + movement + receipts - settlements - expensesPaid - payrollPaid - advancesPaid - loanPaid - taxPaid,
    };
  });
  const accountById = new Map(balances.map((item: any) => [String(item._id), item]));
  const operationalTransactions = [
    ...(customerReceipts as any[]).map((item) => ({
      _id: `receipt-${item._id}`,
      transactionNumber: item.receiptNumber,
      date: item.method === "bank_cheque" ? item.clearedAt || item.receivedAt : item.receivedAt,
      type: "deposit",
      amount: item.amount,
      description: "Customer receipt",
      reference: item.method,
      account: accountById.get(String(item.treasuryAccount)),
      source: "customer_receipt",
    })),
    ...(supplierSettlements as any[]).map((item) => ({
      _id: `supplier-${item._id}`,
      transactionNumber: item.paymentNumber,
      date: item.paidAt,
      type: "withdrawal",
      amount: item.amount,
      description: "Supplier payment",
      reference: item.method,
      account: accountById.get(String(item.treasuryAccount)),
      source: "supplier_payment",
    })),
    ...(operatingExpenses as any[]).map((item) => ({
      _id: `expense-${item._id}`,
      transactionNumber: item.expenseNumber,
      date: item.method === "bank_cheque" ? item.clearedAt || item.date : item.date,
      type: "withdrawal",
      amount: item.amount,
      description: "Operating expense",
      reference: item.method,
      account: accountById.get(String(item.treasuryAccount)),
      source: "expense",
    })),
    ...(paidPayrolls as any[]).map((item) => ({
      _id: `payroll-${item._id}`,
      transactionNumber: item.payrollNumber,
      date: item.paidAt,
      type: "withdrawal",
      amount: (item.lines || []).reduce((sum: number, lineItem: any) => sum + Number(lineItem.netPay || 0), 0),
      description: `Payroll ${item.period}`,
      reference: "payroll",
      account: accountById.get(String(item.treasuryAccount)),
      source: "payroll",
    })),
    ...(paidAdvances as any[]).map((item) => ({
      _id: `advance-${item._id}`,
      transactionNumber: `ADV-${String(item._id).slice(-6).toUpperCase()}`,
      date: item.paymentDate,
      type: "withdrawal",
      amount: item.amount,
      description: `${item.staff?.fullName || "Staff"} advance`,
      reference: item.reason || "staff advance",
      account: accountById.get(String(item.treasuryAccount)),
      source: "staff_advance",
    })),
    ...(loans as any[]).flatMap((loan) =>
      (loan.repayments || []).map((repayment: any) => ({
        _id: `loan-${repayment._id}`,
        transactionNumber: repayment.paymentNumber,
        date: repayment.paymentDate,
        type: "withdrawal",
        amount: Number(repayment.principal || 0) + Number(repayment.interest || 0),
        description: `${loan.lenderName} loan repayment`,
        reference: loan.loanNumber,
        account: accountById.get(String(repayment.treasuryAccount)),
        source: "loan_repayment",
      })),
    ),
    ...(taxes as any[]).flatMap((tax) =>
      (tax.payments || []).map((payment: any) => ({
        _id: `tax-${payment._id}`,
        transactionNumber: payment.paymentNumber,
        date: payment.paymentDate,
        type: "withdrawal",
        amount: payment.amount,
        description: `${String(tax.taxType).replace(/_/g, " ")} payment`,
        reference: tax.taxNumber,
        account: accountById.get(String(payment.treasuryAccount)),
        source: "tax_payment",
      })),
    ),
  ];
  return {
    accounts: balances,
    transactions: [...(transactions as any[]), ...operationalTransactions].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    ),
  };
}

export async function buildLedger(): Promise<LedgerEntry[]> {
  const [
    invoices,
    payments,
    customerOpenings,
    lots,
    supplierPayments,
    supplierOpenings,
    expenses,
    orders,
    advances,
    payrolls,
    batches,
    journals,
    treasuryAccounts,
    treasuryTransactions,
    fixedAssets,
    ownerLoans,
    taxLiabilities,
  ] = await Promise.all([
    Invoice.find({ status: { $nin: ["draft", "void"] } })
      .populate("customer", "fullName businessName")
      .lean(),
    Payment.find({
      $or: [
        { status: "received" },
        { status: { $exists: false } },
        { status: null },
      ],
    })
      .populate("customer", "fullName businessName")
      .populate("treasuryAccount", "name type")
      .lean(),
    CustomerOpeningBalance.find({ status: { $ne: "void" } })
      .populate("customer", "fullName businessName")
      .lean(),
    RawMaterialLot.find()
      .populate("rawMaterial", "name code")
      .populate("supplier", "name code")
      .lean(),
    SupplierPayment.find({
      $or: [{ chequeStatus: "cleared" }, { chequeStatus: { $exists: false } }],
    })
      .populate("supplier", "name code")
      .populate("treasuryAccount", "name type")
      .lean(),
    SupplierOpeningPayable.find({ status: { $ne: "void" } })
      .populate("supplier", "name code")
      .lean(),
    Expense.find().populate("treasuryAccount", "name type").lean(),
    SalesOrder.find({ status: "delivered" }).lean(),
    StaffPayment.find({
      kind: "advance",
      status: { $in: ["paid", "deducted"] },
    })
      .populate("staff", "fullName")
      .populate("treasuryAccount", "name type")
      .lean(),
    PayrollRun.find({ status: "paid" }).populate("treasuryAccount", "name type").lean(),
    ProductionBatch.find({
      status: "Completed",
      totalActualCost: { $gt: 0 },
    }).lean(),
    AccountingJournal.find({ status: "posted" }).lean(),
    TreasuryAccount.find().lean(),
    TreasuryTransaction.find({ status: "posted" })
      .populate("account destinationAccount", "name type")
      .lean(),
    FixedAsset.find({ status: { $ne: "disposed" }, openingValue: { $gt: 0 } }).lean(),
    OwnerLoan.find({ status: { $ne: "void" }, originalAmount: { $gt: 0 } }).populate("repayments.treasuryAccount", "type name").lean(),
    TaxLiability.find({ status: { $ne: "void" }, assessedAmount: { $gt: 0 } }).populate("payments.treasuryAccount", "type name").lean(),
  ]);

  const entries: LedgerEntry[] = [];
  for (const loan of ownerLoans as any[]) {
    const value = amount(loan.originalAmount);
    if (!value) continue;
    entries.push(entry(`owner-loan-${loan._id}`, loan.openingDate || loan.createdAt, "Owner loan opening", loan.loanNumber, `${loan.lenderName} opening loan`, [line("3010", value, 0, "Pre-existing owner funding not added to current treasury"), line("2200", 0, value, loan.lenderName)]));
    for (const payment of loan.repayments || []) { const principal = amount(payment.principal); const interest = amount(payment.interest); const paid = principal + interest; if (paid) entries.push(entry(`loan-payment-${payment._id}`, payment.paymentDate, "Loan repayment", payment.paymentNumber, `${loan.lenderName} loan repayment`, [line("2200", principal, 0, "Principal repaid"), ...(interest ? [line("5300", interest, 0, "Loan interest")] : []), line(treasuryCode(payment.treasuryAccount?.type), 0, paid, payment.reference || "Loan payment")])); }
  }
  for (const tax of taxLiabilities as any[]) { const assessed = amount(tax.assessedAmount); if (!assessed) continue; entries.push(entry(`tax-${tax._id}`, tax.createdAt, "Tax assessment", tax.taxNumber, `${String(tax.taxType).replace(/_/g, " ")} · ${tax.period}`, [line(tax.basis === "opening" ? "3010" : "5280", assessed, 0, tax.basis === "opening" ? "Opening tax obligation" : "Current-period tax expense"), line("2100", 0, assessed, tax.authority)])); for (const payment of tax.payments || []) { const paid = amount(payment.amount); if (paid) entries.push(entry(`tax-payment-${payment._id}`, payment.paymentDate, "Tax payment", payment.paymentNumber, `${tax.taxNumber} tax payment`, [line("2100", paid, 0, tax.authority), line(treasuryCode(payment.treasuryAccount?.type), 0, paid, payment.reference || "Tax payment")])); } }
  for (const asset of fixedAssets as any[]) {
    const value = amount(asset.openingValue);
    if (!value) continue;
    entries.push(
      entry(
        `fixed-asset-${asset._id}`,
        asset.recognitionDate || asset.createdAt,
        "Fixed asset opening",
        asset.assetCode,
        `${asset.name} recognised as company equipment`,
        [
          line("1300", value, 0, `${asset.name} · ${asset.location || "Factory"}`),
          line("3000", 0, value, "Opening capital invested in equipment"),
        ],
      ),
    );
  }
  for (const treasuryAccountItem of treasuryAccounts as any[]) {
    const opening = amount(treasuryAccountItem.openingBalance);
    if (!opening) continue;
    entries.push(
      entry(
        `treasury-opening-${treasuryAccountItem._id}`,
        treasuryAccountItem.openingDate || treasuryAccountItem.createdAt,
        "Treasury opening",
        `OPEN-${String(treasuryAccountItem._id).slice(-6).toUpperCase()}`,
        `${treasuryAccountItem.name} opening balance`,
        [
          line(
            treasuryCode(treasuryAccountItem.type),
            opening,
            0,
            treasuryAccountItem.name,
          ),
          line("3000", 0, opening, "Funds available when accounting started"),
        ],
      ),
    );
  }
  for (const transaction of treasuryTransactions as any[]) {
    const value = amount(transaction.amount);
    if (!value) continue;
    const sourceName = transaction.account?.name || "Treasury account";
    const sourceCode = treasuryCode(transaction.account?.type);
    if (transaction.type === "deposit")
      entries.push(
        entry(
          transaction._id,
          transaction.date,
          "Treasury deposit",
          transaction.transactionNumber,
          transaction.description,
          [
            line(sourceCode, value, 0, sourceName),
            line("3000", 0, value, transaction.reference || "Funds introduced"),
          ],
        ),
      );
    if (transaction.type === "withdrawal")
      entries.push(
        entry(
          transaction._id,
          transaction.date,
          "Treasury withdrawal",
          transaction.transactionNumber,
          transaction.description,
          [
            line("3000", value, 0, transaction.reference || "Funds withdrawn"),
            line(sourceCode, 0, value, sourceName),
          ],
        ),
      );
    if (transaction.type === "transfer") {
      const destinationName =
        transaction.destinationAccount?.name || "Destination account";
      entries.push(
        entry(
          transaction._id,
          transaction.date,
          "Treasury transfer",
          transaction.transactionNumber,
          transaction.description,
          [
            line(
              treasuryCode(transaction.destinationAccount?.type),
              value,
              0,
              destinationName,
            ),
            line(sourceCode, 0, value, sourceName),
          ],
        ),
      );
    }
  }
  for (const invoice of invoices as any[]) {
    const total = amount(invoice.total);
    if (!total) continue;
    const tax = amount(invoice.tax);
    const customer =
      invoice.customer?.businessName ||
      invoice.customer?.fullName ||
      "Customer";
    entries.push(
      entry(
        invoice._id,
        invoice.issueDate || invoice.createdAt,
        "Sales invoice",
        invoice.invoiceNumber,
        `${customer} invoice`,
        [
          line("1100", total, 0, customer),
          line("4000", 0, Math.max(0, total - tax), "Revenue recognised"),
          ...(tax ? [line("2100", 0, tax, "Output tax")] : []),
        ],
      ),
    );
  }
  for (const order of orders as any[]) {
    const productCost = (order.items || [])
      .filter((item: any) => item.itemType !== "raw_material")
      .reduce((sum: number, item: any) => sum + amount(item.costTotal), 0);
    const materialCost = (order.items || [])
      .filter((item: any) => item.itemType === "raw_material")
      .reduce((sum: number, item: any) => sum + amount(item.costTotal), 0);
    const lines = [
      ...(productCost
        ? [
            line("5000", productCost, 0, "Finished goods sold"),
            line("1210", 0, productCost, "Finished goods issued"),
          ]
        : []),
      ...(materialCost
        ? [
            line("5000", materialCost, 0, "Raw materials sold"),
            line("1200", 0, materialCost, "Raw materials issued"),
          ]
        : []),
    ];
    if (lines.length)
      entries.push(
        entry(
          `cogs-${order._id}`,
          order.deliveredAt || order.updatedAt,
          "Cost of sales",
          order.orderNumber,
          "Inventory cost recognised at delivery",
          lines,
        ),
      );
  }
  for (const payment of payments as any[]) {
    const paid = amount(payment.amount);
    if (!paid) continue;
    const customer =
      payment.customer?.businessName ||
      payment.customer?.fullName ||
      "Customer";
    entries.push(
      entry(
        payment._id,
        payment.method === "bank_cheque"
          ? payment.clearedAt || payment.receivedAt || payment.createdAt
          : payment.receivedAt || payment.createdAt,
        "Customer receipt",
        payment.receiptNumber,
        `${customer} payment`,
        [
          line(
            postingTreasuryCode(payment),
            paid,
            0,
            text(payment.method, "Payment"),
          ),
          line("1100", 0, paid, customer),
        ],
      ),
    );
  }
  for (const opening of customerOpenings as any[]) {
    const value = amount(opening.amount);
    if (!value) continue;
    const customer =
      opening.customer?.businessName ||
      opening.customer?.fullName ||
      "Customer";
    entries.push(
      entry(
        opening._id,
        opening.openingDate,
        "Customer opening balance",
        opening.openingNumber,
        `${customer} opening receivable`,
        [line("1100", value, 0), line("3000", 0, value)],
      ),
    );
  }
  for (const lot of lots as any[]) {
    const value = amount(lot.receivedQuantity) * amount(lot.unitCost);
    if (!value) continue;
    const material = lot.rawMaterial?.name || "Raw material";
    const supplier = lot.supplier?.name || "Supplier";
    entries.push(
      entry(
        lot._id,
        lot.receivedAt || lot.createdAt,
        "Goods received",
        lot.grnNumber || lot.lotNumber,
        `${material} received from ${supplier}`,
        [line("1200", value, 0, material), line("2000", 0, value, supplier)],
      ),
    );
  }
  for (const payment of supplierPayments as any[]) {
    const paid = amount(payment.amount);
    if (!paid) continue;
    const supplier = payment.supplier?.name || "Supplier";
    entries.push(
      entry(
        payment._id,
        payment.paidAt || payment.createdAt,
        "Supplier payment",
        payment.paymentNumber,
        `${supplier} payment`,
        [
          line("2000", paid, 0, supplier),
          line(
            postingTreasuryCode(payment),
            0,
            paid,
            text(payment.method, "Payment"),
          ),
        ],
      ),
    );
  }
  for (const opening of supplierOpenings as any[]) {
    const value = amount(opening.amount);
    if (!value) continue;
    const supplier = opening.supplier?.name || "Supplier";
    entries.push(
      entry(
        opening._id,
        opening.openingDate,
        "Supplier opening balance",
        opening.openingNumber,
        `${supplier} opening payable`,
        [line("3000", value, 0), line("2000", 0, value)],
      ),
    );
  }
  for (const expense of expenses as any[]) {
    const value = amount(expense.amount);
    if (!value) continue;
    const code = expenseAccount[String(expense.category)] || "5290";
    const isCheque = expense.method === "bank_cheque";
    entries.push(
      entry(
        expense._id,
        expense.date || expense.createdAt,
        "Expense",
        expense.expenseNumber,
        text(expense.description, "Operating expense"),
        [
          line(code, value, 0),
          line(isCheque ? "2050" : postingTreasuryCode(expense), 0, value),
        ],
      ),
    );
    if (isCheque && expense.chequeStatus === "cleared") {
      entries.push(
        entry(
          `expense-clear-${expense._id}`,
          expense.clearedAt || expense.date || expense.updatedAt,
          "Expense cheque cleared",
          expense.chequeNumber || expense.expenseNumber,
          `${text(expense.description, "Operating expense")} cheque cleared`,
          [
            line("2050", value, 0, "Expense payable settled"),
            line(postingTreasuryCode(expense), 0, value),
          ],
        ),
      );
    }
  }
  for (const advance of advances as any[]) {
    const value = amount(advance.amount);
    if (!value) continue;
    entries.push(
      entry(
        advance._id,
        advance.paymentDate || advance.createdAt,
        "Staff advance",
        `ADV-${String(advance._id).slice(-6).toUpperCase()}`,
        `${advance.staff?.fullName || "Staff"} advance`,
        [line("1150", value, 0), line(postingTreasuryCode(advance), 0, value)],
      ),
    );
  }
  for (const payroll of payrolls as any[]) {
    const gross = (payroll.lines || []).reduce(
      (sum: number, item: any) => sum + amount(item.grossPay),
      0,
    );
    const deductions = (payroll.lines || []).reduce(
      (sum: number, item: any) => sum + amount(item.totalDeductions),
      0,
    );
    const net = (payroll.lines || []).reduce(
      (sum: number, item: any) => sum + amount(item.netPay),
      0,
    );
    const advanceRecovery = (payroll.lines || []).reduce(
      (sum: number, item: any) =>
        sum +
        (item.advanceAllocations || []).reduce(
          (allocationSum: number, allocation: any) =>
            allocationSum + amount(allocation.amount),
          0,
        ),
      0,
    );
    const otherDeductions = Math.max(0, deductions - advanceRecovery);
    if (!gross) continue;
    entries.push(
      entry(
        payroll._id,
        payroll.paidAt || payroll.updatedAt,
        "Payroll",
        payroll.payrollNumber,
        `Payroll for ${payroll.period}`,
        [
          line("5100", gross, 0),
          ...(advanceRecovery ? [line("1150", 0, advanceRecovery, "Staff advances recovered")] : []),
          ...(otherDeductions ? [line("2150", 0, otherDeductions, "Payroll deductions withheld")] : []),
          ...(net ? [line(postingTreasuryCode(payroll), 0, net)] : []),
        ],
      ),
    );
  }
  for (const batch of batches as any[]) {
    const material = amount(batch.actualMaterialCost);
    const labor = amount(batch.allocatedLaborCost);
    const energy = amount(batch.allocatedEnergyCost);
    const other = amount(batch.allocatedOtherCost);
    const total = material + labor + energy + other;
    if (!total) continue;
    entries.push(
      entry(
        `production-${batch._id}`,
        batch.costedAt || batch.endDate || batch.updatedAt,
        "Production capitalization",
        batch.batchNo,
        `${batch.productName} completed batch`,
        [
          line("1210", total, 0, "Finished goods produced"),
          ...(material
            ? [line("1200", 0, material, "Raw materials consumed")]
            : []),
          ...(labor
            ? [line("5100", 0, labor, "Labour absorbed into inventory")]
            : []),
          ...(energy
            ? [line("5210", 0, energy, "Energy absorbed into inventory")]
            : []),
          ...(other
            ? [line("5290", 0, other, "Other production costs absorbed")]
            : []),
        ],
      ),
    );
  }
  for (const journal of journals as any[]) {
    entries.push(
      entry(
        journal._id,
        journal.date,
        "Manual journal",
        journal.journalNumber,
        journal.description,
        (journal.lines || []).map((item: any) => ({
          accountCode: item.accountCode,
          accountName: item.accountName,
          debit: amount(item.debit),
          credit: amount(item.credit),
          memo: item.memo || "",
        })),
      ),
    );
  }
  const configuration = await AccountingConfiguration.findOne({ key: "primary" })
    .select("startDate")
    .lean();
  const startDate = configuration?.startDate
    ? new Date(configuration.startDate).toISOString().slice(0, 10)
    : "";
  if (!startDate)
    return entries.sort((left, right) => right.date.localeCompare(left.date));

  const currentEntries = entries.filter(
    (item) => item.date.slice(0, 10) >= startDate,
  );
  const priorEntries = entries.filter(
    (item) => item.date.slice(0, 10) < startDate,
  );
  const carriedCodes = new Set(
    accounts
      .filter(
        (item) =>
          ["asset", "liability"].includes(item.type) &&
          !["1000", "1010"].includes(item.code),
      )
      .map((item) => item.code),
  );
  const openingLines = trialBalance(priorEntries).flatMap((item) => {
    if (!carriedCodes.has(item.code)) return [];
    if (item.debitBalance > 0.005)
      return [
        line(
          item.code,
          Number(item.debitBalance.toFixed(2)),
          0,
          `${item.name} carried forward at accounting start`,
        ),
      ];
    if (item.creditBalance > 0.005)
      return [
        line(
          item.code,
          0,
          Number(item.creditBalance.toFixed(2)),
          `${item.name} carried forward at accounting start`,
        ),
      ];
    return [];
  });
  const openingDebit = openingLines.reduce((sum, item) => sum + item.debit, 0);
  const openingCredit = openingLines.reduce((sum, item) => sum + item.credit, 0);
  const difference = Number((openingDebit - openingCredit).toFixed(2));
  if (difference > 0)
    openingLines.push(
      line("3010", 0, difference, "Opening position balancing equity"),
    );
  else if (difference < 0)
    openingLines.push(
      line("3010", Math.abs(difference), 0, "Opening position balancing equity"),
    );
  if (openingLines.length)
    currentEntries.push(
      entry(
        "accounting-opening-position",
        configuration!.startDate,
        "Accounting opening position",
        `OPEN-${startDate.replace(/-/g, "")}`,
        "Operational balances carried into accounting on the opening date",
        openingLines,
      ),
    );
  return currentEntries.sort((left, right) =>
    right.date.localeCompare(left.date),
  );
}

export async function accountingConfiguration() {
  const configuration = await AccountingConfiguration.findOne({ key: "primary" })
    .populate("startedBy", "fullName")
    .lean();
  return configuration || null;
}

export const filterLedger = (
  entries: LedgerEntry[],
  from?: string,
  to?: string,
) =>
  entries.filter((item) => {
    const date = item.date.slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  });

export function trialBalance(entries: LedgerEntry[]) {
  return accounts
    .map((item) => {
      const lines = entries
        .flatMap((ledger) => ledger.lines)
        .filter((ledgerLine) => ledgerLine.accountCode === item.code);
      const debitMovement = lines.reduce(
        (sum, current) => sum + current.debit,
        0,
      );
      const creditMovement = lines.reduce(
        (sum, current) => sum + current.credit,
        0,
      );
      const net = debitMovement - creditMovement;
      return {
        ...item,
        debitMovement,
        creditMovement,
        debitBalance: Math.max(0, net),
        creditBalance: Math.max(0, -net),
      };
    })
    .filter((item) => item.debitMovement || item.creditMovement);
}

export function accountingSummary(
  periodEntries: LedgerEntry[],
  asAtEntries: LedgerEntry[],
) {
  const period = trialBalance(periodEntries);
  const asAt = trialBalance(asAtEntries);
  const total = (
    items: ReturnType<typeof trialBalance>,
    type: AccountType,
    side: "debit" | "credit",
  ) =>
    items
      .filter((item) => item.type === type)
      .reduce(
        (sum, item) =>
          sum +
          (side === "debit"
            ? item.debitBalance - item.creditBalance
            : item.creditBalance - item.debitBalance),
        0,
      );
  const revenue = total(period, "revenue", "credit");
  const expenses = total(period, "expense", "debit");
  const assets = total(asAt, "asset", "debit");
  const liabilities = total(asAt, "liability", "credit");
  const cumulativeRevenue = total(asAt, "revenue", "credit");
  const cumulativeExpenses = total(asAt, "expense", "debit");
  const equity =
    total(asAt, "equity", "credit") + cumulativeRevenue - cumulativeExpenses;
  const byCode = Object.fromEntries(
    asAt.map((item) => [item.code, item.debitBalance - item.creditBalance]),
  );
  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    assets,
    liabilities,
    equity,
    cashAndBank: amount(byCode["1000"]) + amount(byCode["1010"]),
    fixedAssets: amount(byCode["1300"]),
    receivables: amount(byCode["1100"]),
    payables: amount(-(byCode["2000"] || 0)),
    ownerLoans: amount(-(byCode["2200"] || 0)),
    taxPayable: amount(-(byCode["2100"] || 0)),
    entryCount: periodEntries.length,
  };
}

export async function nextJournalNumber() {
  const year = new Date().getFullYear();
  const suffix = `${Date.now()}`.slice(-8);
  return `JRN-${year}-${suffix}`;
}

export function validateJournalLines(lines: unknown): LedgerLine[] {
  if (!Array.isArray(lines) || lines.length < 2)
    throw new Error("Add at least two journal lines.");
  const normalized = lines.map((item: any) => {
    const configured = account(String(item.accountCode || ""));
    const debit = amount(item.debit);
    const credit = amount(item.credit);
    if ((!debit && !credit) || (debit && credit))
      throw new Error(
        "Each journal line must contain either a debit or a credit amount.",
      );
    return {
      accountCode: configured.code,
      accountName: configured.name,
      debit,
      credit,
      memo: String(item.memo || "").trim(),
    };
  });
  const debit = normalized.reduce((sum, item) => sum + item.debit, 0);
  const credit = normalized.reduce((sum, item) => sum + item.credit, 0);
  if (!debit || Math.abs(debit - credit) > 0.01)
    throw new Error("Journal debits and credits must be equal.");
  return normalized;
}
