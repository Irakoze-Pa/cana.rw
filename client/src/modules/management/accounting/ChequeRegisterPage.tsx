import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Pencil,
  Printer,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import api from "@/services/api";
import { useConfirmation } from "@/context/confirmationContext";
import { useToast } from "@/context/toastContext";
import { printCanaDocument } from "@/modules/management/utils/printCanaDocument";

type Cheque = {
  key: string;
  source: "customer" | "supplier" | "expense";
  id: string;
  ids?: string[];
  number: string;
  party: string;
  reference: string;
  bank: string;
  amount: number;
  maturity: string;
  status: string;
  notes?: string;
};
type BankAccount = {_id:string;name:string;institution?:string;accountNumber?:string;balance?:number;type:string;status:string};
const money = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const tone = (status: string) =>
  status === "cleared"
    ? "bg-emerald-50 text-emerald-700"
    : ["bounced", "cancelled"].includes(status)
      ? "bg-red-50 text-red-700"
      : status === "due"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-700";

export default function ChequeRegisterPage() {
  const { confirm } = useConfirmation();
  const { toast } = useToast();
  const [rows, setRows] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cheque | null>(null);
  const [clearing, setClearing] = useState<Cheque | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clearingAccount, setClearingAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    chequeNumber: "",
    bankName: "",
    chequeDate: "",
    notes: "",
  });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [customers, suppliers, expenses, accounts] = await Promise.all([
        api.get<{ data: any[] }>("/billing/payments"),
        api.get<{ data: any[] }>("/supplier-payments"),
        api.get<{ data: any[] }>("/expenses"),
        api.get<{ data: {accounts:BankAccount[]} }>("/accounting/treasury-accounts"),
      ]);
      const banks=(accounts.data.data?.accounts||[]).filter((account)=>account.type==="bank"&&account.status==="active");
      setBankAccounts(banks);
      setClearingAccount((current)=>current||banks[0]?._id||"");
      const incomingGroups = new Map<string, Cheque>();
      (customers.data.data || [])
        .filter((x) => x.method === "bank_cheque")
        .forEach((x) => {
          const number = x.chequeNumber || x.reference || x.receiptNumber;
          const party = x.customer?.fullName || "Customer";
          const maturity = x.chequeDate || x.receivedAt;
          const key = `customer-${x.customer?._id || party}-${number}-${String(maturity).slice(0, 10)}`;
          const reference =
            x.invoice?.invoiceNumber ||
            x.openingBalance?.openingNumber ||
            x.receiptNumber;
          const old = incomingGroups.get(key);
          if (old) {
            old.amount += Number(x.amount || 0);
            old.ids = [...(old.ids || [old.id]), x._id];
            if (!old.reference.split(", ").includes(reference))
              old.reference = `${old.reference}, ${reference}`;
          } else
            incomingGroups.set(key, {
              key,
              source: "customer",
              id: x._id,
              ids: [x._id],
              number,
              party,
              reference,
              bank: x.bankName || "—",
              amount: Number(x.amount || 0),
              maturity,
              status:
                x.chequeStatus ||
                (x.status === "void" ? "cancelled" : "cleared"),
              notes: x.notes || "",
            });
        });
      const incoming = [...incomingGroups.values()];
      const outgoing = (suppliers.data.data || [])
        .filter((x) => x.method === "bank_cheque")
        .map((x) => ({
          key: `supplier-${x._id}`,
          source: "supplier" as const,
          id: x._id,
          number: x.chequeNumber || x.paymentNumber,
          party: x.supplier?.name || "Supplier",
          reference:
            x.purchaseOrder?.poNumber ||
            x.openingPayable?.openingNumber ||
            x.paymentNumber,
          bank: x.bankName || "—",
          amount: Number(x.amount || 0),
          maturity: x.chequeDate || x.paidAt,
          status: x.chequeStatus || "cleared",
        }));
      const grouped = new Map<string, Cheque>();
      (expenses.data.data || [])
        .filter((x) => x.method === "bank_cheque")
        .forEach((x) => {
          const key = `expense-${x.chequeNumber || x._id}`;
          const old = grouped.get(key);
          if (old) old.amount += Number(x.amount || 0);
          else
            grouped.set(key, {
              key,
              source: "expense",
              id: x.chequeNumber || x._id,
              number: x.chequeNumber || x.expenseNumber,
              party: x.payee || "Expense payee",
              reference: x.expenseNumber,
              bank: x.bankName || "—",
              amount: Number(x.amount || 0),
              maturity: x.chequeDate || x.date,
              status: x.chequeStatus || "cleared",
            });
        });
      setRows(
        [...incoming, ...outgoing, ...grouped.values()].sort((a, b) =>
          String(a.maturity).localeCompare(String(b.maturity)),
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load cheque register.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter(
        (x) =>
          (direction === "all" ||
            (direction === "incoming"
              ? x.source === "customer"
              : x.source !== "customer")) &&
          (status === "all" ||
            (status === "active"
              ? ["received", "issued", "due", "deposited"].includes(x.status)
              : x.status === status)) &&
          `${x.number} ${x.party} ${x.reference} ${x.bank}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [rows, direction, status, search],
  );
  const update = async (row: Cheque, next: string, treasuryAccount = "") => {
    if (
      !(await confirm({
        title: `Mark cheque ${next}`,
        description: `Mark cheque ${row.number} from ${row.party} as ${next}?`,
        confirmLabel: `Mark ${next}`,
        tone: ["bounced", "cancelled"].includes(next) ? "danger" : "warning",
      }))
    )
      return;
    try {
      if (row.source === "customer")
        await api.patch(`/billing/payments/${row.id}/cheque-status`, {
          status: next,
          ...(treasuryAccount?{treasuryAccount}:{}),
        });
      else if (row.source === "supplier")
        await api.patch(`/supplier-payments/${row.id}/cheque-status`, {
          status: next,
          ...(treasuryAccount?{treasuryAccount}:{}),
        });
      else
        await api.patch(
          `/expenses/cheques/${encodeURIComponent(row.id)}/status`,
          { status: next, ...(treasuryAccount?{treasuryAccount}:{}) },
        );
      await load();
      toast(`Cheque marked ${next}.`, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update cheque.");
      await load();
    }
  };
  const openClear=(row:Cheque)=>{setClearing(row);setClearingAccount(bankAccounts[0]?._id||"");};
  const confirmClear=async()=>{if(!clearing||!clearingAccount){setError("Select the CANAN bank account used for this cheque.");return;}setSaving(true);try{await update(clearing,"cleared",clearingAccount);setClearing(null);}finally{setSaving(false);}};
  const openEdit = (row: Cheque) => {
    setEditing(row);
    setEditForm({
      chequeNumber: row.number,
      bankName: row.bank === "—" ? "" : row.bank,
      chequeDate: String(row.maturity).slice(0, 10),
      notes: row.notes || "",
    });
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (
      !editForm.chequeNumber.trim() ||
      !editForm.bankName.trim() ||
      !editForm.chequeDate
    ) {
      setError("Cheque number, bank, and maturity date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const id of editing.ids || [editing.id])
        await api.patch(`/billing/payments/${id}/cheque`, editForm);
      setEditing(null);
      await load();
      toast("Cheque details updated.", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to edit cheque.");
    } finally {
      setSaving(false);
    }
  };
  const print = () =>
    printCanaDocument({
      title: "Cheque register",
      reference: `CHQ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      status: "Finance control",
      details: [
        { label: "Records", value: filtered.length },
        {
          label: "Incoming",
          value: `${money(filtered.filter((x) => x.source === "customer").reduce((s, x) => s + x.amount, 0))} RWF`,
        },
        {
          label: "Outgoing",
          value: `${money(filtered.filter((x) => x.source !== "customer").reduce((s, x) => s + x.amount, 0))} RWF`,
        },
      ],
      table: {
        headers: [
          "Direction",
          "Cheque",
          "Party",
          "Reference",
          "Bank",
          "Maturity",
          "Status",
          "Amount",
        ],
        rows: filtered.map((x) => [
          x.source === "customer" ? "Incoming" : "Outgoing",
          x.number,
          x.party,
          x.reference,
          x.bank,
          new Date(x.maturity).toLocaleDateString("en-RW"),
          x.status,
          `${money(x.amount)} RWF`,
        ]),
      },
      notes:
        "Incoming cheques reduce customer debt only after clearance. Outgoing cheques reduce bank balances only after clearance.",
    });
  return (
    <div className="mx-auto max-w-[1450px] space-y-4">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="cana-section-kicker text-red-700">Finance control</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
            Cheque register
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Incoming customer cheques and outgoing supplier or expense cheques.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={print}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </header>
      {error && (
        <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          [
            "Incoming",
            filtered
              .filter((x) => x.source === "customer")
              .reduce((s, x) => s + x.amount, 0),
          ],
          [
            "Outgoing",
            filtered
              .filter((x) => x.source !== "customer")
              .reduce((s, x) => s + x.amount, 0),
          ],
          [
            "Due now",
            filtered
              .filter((x) => x.status === "due")
              .reduce((s, x) => s + x.amount, 0),
          ],
        ].map(([l, v]) => (
          <div key={String(l)} className="bg-white p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {l}
            </p>
            <p className="mt-1 text-lg font-extrabold">
              {money(Number(v))} RWF
            </p>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2 border border-slate-200 bg-white p-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cheque, party or reference"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All directions</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active cheques only</option>
          <option value="due">Due</option>
          <option value="cleared">Cleared</option>
          <option value="bounced">Bounced</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </section>
      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-[1000px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950 uppercase text-white">
              <tr>
                {[
                  "Direction",
                  "Cheque / maturity",
                  "Party",
                  "Reference",
                  "Bank",
                  "Status",
                  "Amount / action",
                ].map((x) => (
                  <th key={x} className="px-3 py-2.5">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((x) => (
                <tr
                  key={x.key}
                  className={
                    x.status === "due" ? "bg-amber-50" : "hover:bg-slate-50"
                  }
                >
                  <td className="px-3 py-2.5 font-bold">
                    {x.source === "customer" ? "Incoming" : "Outgoing"}
                    <small className="block font-normal capitalize text-slate-500">
                      {x.source}
                    </small>
                  </td>
                  <td className="px-3 py-2.5 font-bold">
                    {x.number}
                    <small className="block font-normal text-slate-500">
                      {new Date(x.maturity).toLocaleDateString("en-RW")}
                    </small>
                  </td>
                  <td className="px-3 py-2.5">{x.party}</td>
                  <td className="px-3 py-2.5">{x.reference}</td>
                  <td className="px-3 py-2.5">{x.bank}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tone(x.status)}`}
                    >
                      {x.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <p className="font-extrabold">{money(x.amount)} RWF</p>
                    {["received", "issued", "due", "deposited"].includes(
                      x.status,
                    ) && (
                      <div className="mt-1 flex justify-end gap-1">
                        {x.source === "customer" && (
                          <button
                            title="Edit cheque"
                            onClick={() => openEdit(x)}
                            className="rounded border p-1.5 text-slate-700"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {x.status !== "deposited" && (
                          <button
                            title="Mark deposited"
                            onClick={() => void update(x, "deposited")}
                            className="rounded border p-1.5"
                          >
                            <Banknote size={12} />
                          </button>
                        )}
                        <button
                          title="Mark cleared"
                          onClick={() => openClear(x)}
                          className="rounded bg-emerald-700 p-1.5 text-white"
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        <button
                          title="Mark bounced"
                          onClick={() => void update(x, "bounced")}
                          className="rounded border border-red-200 p-1.5 text-red-700"
                        >
                          <XCircle size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    No cheques match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Incoming cheque</p>
                <h2 className="text-lg font-extrabold text-slate-950">Edit uncleared cheque</h2>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-lg border p-2 text-slate-500"><X size={16}/></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Cheque number<input value={editForm.chequeNumber} onChange={(e)=>setEditForm((v)=>({...v,chequeNumber:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm font-normal"/></label>
              <label className="text-xs font-bold text-slate-700">Bank name<input value={editForm.bankName} onChange={(e)=>setEditForm((v)=>({...v,bankName:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm font-normal"/></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Maturity date<input type="date" value={editForm.chequeDate} onChange={(e)=>setEditForm((v)=>({...v,chequeDate:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm font-normal"/></label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Notes<textarea rows={3} value={editForm.notes} onChange={(e)=>setEditForm((v)=>({...v,notes:e.target.value}))} className="mt-1 w-full resize-none rounded-lg border px-3 py-2.5 text-sm font-normal" placeholder="Optional correction note"/></label>
              <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong>{editing.party}</strong> · {money(editing.amount)} RWF<br/>Amount and invoice allocation remain locked until clearance.</div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={()=>setEditing(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} onClick={()=>void saveEdit()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving…":"Save changes"}</button></div>
          </div>
        </div>
      )}
      {clearing&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cheque clearance</p><h2 className="text-lg font-extrabold text-slate-950">Select bank account</h2></div><button onClick={()=>setClearing(null)} className="rounded-lg border p-2 text-slate-500"><X size={16}/></button></div><div className="space-y-4 p-5"><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong className="block text-slate-950">{clearing.number} · {clearing.party}</strong><span>{clearing.source==="customer"?"Incoming":"Outgoing"} cheque · {money(clearing.amount)} RWF</span></div><label className="block text-xs font-bold text-slate-700">{clearing.source==="customer"?"Received into":"Paid from"}<select value={clearingAccount} onChange={(event)=>setClearingAccount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select CANAN bank account</option>{bankAccounts.map((account)=><option key={account._id} value={account._id}>{account.name}{account.accountNumber?` · ${account.accountNumber}`:""}</option>)}</select></label>{!bankAccounts.length&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Create an active bank account in Finance & Accounting before clearing this cheque.</p>}<p className="text-[11px] leading-5 text-slate-500">Clearing an incoming cheque increases the selected bank balance and settles its invoice allocations. Clearing an outgoing cheque reduces the selected bank balance.</p></div><div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={()=>setClearing(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving||!clearingAccount} onClick={()=>void confirmClear()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"Clearing…":"Confirm clearance"}</button></div></div></div>}
    </div>
  );
}
