import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarCheck2,
  ChevronDown,
  Plus,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/context/toastContext";
import { cananLetterheadMarkup, officialApprovalMarkup } from "@/modules/management/utils/printCanaDocument";

type Staff = {
  _id: string;
  fullName: string;
  role?: string;
  jobTitle?: string;
  department?: string;
  baseSalary?: number;
  status?: string;
};
type Advance = {
  _id: string;
  amount: number;
  remainingAmount?: number;
  status: "pending" | "approved" | "paid";
  staff?: { fullName: string };
  reason?: string;
};
type Line = {
  staff: { fullName: string } | null;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
};
type Run = {
  _id: string;
  payrollNumber: string;
  period: string;
  status: "draft" | "reviewed" | "approved" | "paid" | "cancelled";
  lines: Line[];
};
type Attendance = {
  _id: string;
  staff: { _id: string };
  status: "present" | "absent" | "leave" | "half_day";
};
const money = (value: number) =>
  `${Number(value || 0).toLocaleString("en-RW")} RWF`;
const periodLabel = (value: string) =>
  new Date(`${value}-01T12:00:00`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );

export default function PayrollPage() {
  const { toast } = useToast();
  const [runs, setRuns] = useState<Run[]>([]),
    [staff, setStaff] = useState<Staff[]>([]),
    [advances, setAdvances] = useState<Advance[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)),
    [attendanceDate, setAttendanceDate] = useState(
      new Date().toISOString().slice(0, 10),
    );
  const [attendance, setAttendance] = useState<Attendance[]>([]),
    [openRun, setOpenRun] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    try {
      const [r, s, a] = await Promise.all([
        api.get<{ data: Run[] }>("/payroll"),
        api.get<{ data: Staff[] }>("/users"),
        api.get<{ data: Advance[] }>("/staff-payments"),
      ]);
      setRuns(r.data.data || []);
      setStaff(
        (s.data.data || []).filter(
          (person) =>
            person.status !== "inactive" && person.role !== "customer",
        ),
      );
      setAdvances(
        (a.data.data || []).filter(
          (item) =>
            item.status === "pending" ||
            item.status === "approved" ||
            (item.status === "paid" && Number(item.remainingAmount || 0) > 0),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load payroll.",
      );
    }
  };
  const loadAttendance = async () => {
    try {
      const result = await api.get<{ data: Attendance[] }>(
        `/attendance?date=${attendanceDate}`,
      );
      setAttendance(result.data.data || []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load attendance.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    void loadAttendance();
  }, [attendanceDate]);
  const currentRun = runs.find((run) => run.period === period);
  const totals = useMemo(() => {
    const lines = currentRun?.status === "cancelled" ? [] : currentRun?.lines || [];
    return lines.reduce((all, line) => ({ gross: all.gross + line.grossPay, deductions: all.deductions + line.totalDeductions, net: all.net + line.netPay }), { gross: 0, deductions: 0, net: 0 });
  }, [currentRun]);
  const attendanceSummary = useMemo(
    () => ({
      recorded: attendance.length,
      present: attendance.filter((item) => item.status === "present").length,
      absent: attendance.filter((item) => item.status === "absent").length,
    }),
    [attendance],
  );
  const createRun = async () => {
    try {
      setBusy(true);
      await api.post("/payroll", { period });
      toast(`${periodLabel(period)} payroll draft created.`, "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create payroll.",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateRun = async (id: string, status: string) => {
    try {
      setBusy(true);
      await api.patch(`/payroll/${id}/status`, { status });
      toast(
        `Payroll ${status === "paid" ? "marked paid" : status}.`,
        "success",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update payroll.",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateAdvance = async (
    id: string,
    status: "approved" | "rejected" | "paid",
  ) => {
    try {
      setBusy(true);
      await api.patch(`/staff-payments/${id}`, { status });
      toast(`Advance ${status}.`, "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update advance.",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveSalary = async (person: Staff, value: string) => {
    const baseSalary = Number(value);
    if (!Number.isFinite(baseSalary) || baseSalary < 0)
      return setError("Base salary must be zero or more.");
    try {
      await api.patch(`/users/${person._id}`, { baseSalary });
      setStaff((list) =>
        list.map((item) =>
          item._id === person._id ? { ...item, baseSalary } : item,
        ),
      );
      toast(`${person.fullName}'s monthly salary saved.`, "success");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save salary.",
      );
    }
  };
  const saveAttendance = async (
    person: Staff,
    status: Attendance["status"],
  ) => {
    try {
      setBusy(true);
      await api.put("/attendance", {
        staff: person._id,
        date: attendanceDate,
        status,
      });
      toast(`${person.fullName}: ${status.replace("_", " ")}.`, "success");
      await loadAttendance();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save attendance.",
      );
    } finally {
      setBusy(false);
    }
  };
  const printRun = (run: Run) => {
    const total = run.lines.reduce(
      (all, line) => ({
        gross: all.gross + line.grossPay,
        deductions: all.deductions + line.totalDeductions,
        net: all.net + line.netPay,
      }),
      { gross: 0, deductions: 0, net: 0 },
    );
    const rows = run.lines
      .map(
        (line, index) =>
          `<tr><td>${index + 1}</td><td>${escapeHtml(line.staff?.fullName || "Former staff member")}</td><td class="num">${money(line.grossPay)}</td><td class="num amber">${money(line.totalDeductions)}</td><td class="num"><b>${money(line.netPay)}</b></td></tr>`,
      )
      .join("");
    // Opening a plain tab from the click event is compatible with Safari and
    // embedded browsers, which may report a `noopener` window as blocked.
    const popup = window.open("", "_blank");
    if (!popup) return setError("Please allow pop-ups to print this register.");
    popup.opener = null;
    popup.document.write(
      `<!doctype html><html><head><title>${escapeHtml(run.payrollNumber)} — Payroll</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#172033;font-size:12px}.head{display:flex;justify-content:space-between;border-bottom:3px solid #b91c1c;padding-bottom:14px}.brand{font-size:25px;font-weight:800;letter-spacing:3px;color:#991b1b}.muted{color:#64748b}.badge{background:#e2e8f0;border-radius:18px;padding:5px 10px;font-size:10px;font-weight:bold;text-transform:uppercase}h1{font-size:20px;margin:22px 0 4px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.box{border:1px solid #dbe1e8;border-radius:8px;padding:10px}.label{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#0f172a;color:#fff;text-align:left;font-size:10px;padding:10px;text-transform:uppercase}td{padding:10px 8px;border-bottom:1px solid #e5e7eb}.num{text-align:right}.amber{color:#b45309}.totals{width:300px;margin:18px 0 0 auto}.total{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb}.net{font-size:15px;font-weight:bold;border-bottom:2px solid #0f172a}.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:55px}.sign div{border-top:1px solid #64748b;padding-top:7px;color:#64748b;font-size:10px}</style></head><body>${cananLetterheadMarkup()}<header class="head" style="display:none"><div><div class="brand">CANA</div><div class="muted">Operations & Finance</div></div><div style="text-align:right"><span class="badge">${escapeHtml(run.status)}</span><div class="muted" style="margin-top:8px">${escapeHtml(run.payrollNumber)}</div></div></header><h1>Monthly Payroll Register</h1><p class="muted">Gross pay, approved advance recovery and net pay.</p><section class="meta"><div class="box"><div class="label">Payroll period</div><b>${escapeHtml(periodLabel(run.period))}</b></div><div class="box"><div class="label">Employees</div><b>${run.lines.length}</b></div><div class="box"><div class="label">Generated</div><b>${new Date().toLocaleDateString("en-GB")}</b></div></section><table><thead><tr><th>#</th><th>Employee</th><th class="num">Gross pay</th><th class="num">Advance recovery</th><th class="num">Net pay</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div class="total"><span>Gross payroll</span><b>${money(total.gross)}</b></div><div class="total"><span>Advance recovery</span><b>${money(total.deductions)}</b></div><div class="total net"><span>Net payable</span><span>${money(total.net)}</span></div></section><section class="sign"><div>Prepared by</div><div>Reviewed / approved by</div><div>Finance confirmation</div></section>${officialApprovalMarkup("Official payroll register")}<script>window.onload=()=>window.print()</script></body></html>`,
    );
    popup.document.close();
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <section className="flex flex-col justify-between gap-5 rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm md:flex-row md:items-center md:p-8">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">CANA · Finance & people</p><h1 className="mt-2 text-3xl font-extrabold text-gray-900">Payroll</h1><p className="mt-2 text-sm text-gray-500">Manage one payroll month at a time: salaries, advances, review, approval and payment.</p></div>
        <div className="rounded-2xl bg-slate-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected period</p><p className="mt-1 text-lg font-extrabold text-slate-900">{periodLabel(period)}</p><p className="mt-1 text-xs font-semibold capitalize text-red-700">{currentRun ? currentRun.status : "Ready to create"}</p></div>
      </section>
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Gross pay", money(totals.gross), "text-gray-900"],
          ["Advance deductions", money(totals.deductions), "text-amber-700"],
          ["Net payable", money(totals.net), "text-red-700"],
          [
            "Attendance today",
            `${attendanceSummary.recorded}/${staff.length}`,
            "text-gray-700",
          ],
        ].map(([label, value, colour]) => (
          <article
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className={`mt-2 text-2xl font-extrabold ${colour}`}>{value}</p>
            <p className="mt-2 text-xs text-gray-500">
              {label === "Attendance today"
                ? `${attendanceSummary.present} present · ${attendanceSummary.absent} absent`
                : currentRun ? `${periodLabel(period)} payroll` : "Create this month’s payroll to calculate"}
            </p>
          </article>
        ))}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Create monthly payroll</h2>
            <p className="mt-1 text-sm text-gray-500">
              This creates a draft; review it before approval and payment.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Payroll month"
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            />
            <button
              disabled={busy || Boolean(currentRun)}
              onClick={() => void createRun()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:bg-gray-300"
            >
              <Plus size={16} />
              {currentRun ? "Payroll already created" : "Create draft payroll"}
            </button>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div className="flex gap-3">
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <CalendarCheck2 size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Daily attendance</h2>
              <p className="text-sm text-gray-500">
                Mark each active employee once for the selected day.
              </p>
            </div>
          </div>
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="h-10 rounded-xl border border-gray-300 px-3 text-sm"
          />
        </div>
        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {staff.map((person) => {
            const current = attendance.find(
              (item) => item.staff?._id === person._id,
            )?.status;
            return (
              <div
                key={person._id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {person.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {person.jobTitle || person.department || "Staff member"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      "present",
                      "absent",
                      "leave",
                      "half_day",
                    ] as Attendance["status"][]
                  ).map((status) => (
                    <button
                      key={status}
                      disabled={busy}
                      onClick={() => void saveAttendance(person, status)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize disabled:opacity-50 ${current === status ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"}`}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-slate-900">Payroll runs</h2>
            <p className="text-sm text-gray-500">
              Print any run; its document clearly shows its current status.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {runs.length} runs
          </span>
        </div>
        {runs.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            No payroll run yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {runs.map((run) => {
              const total = run.lines.reduce(
                (sum, line) => sum + line.netPay,
                0,
              );
              const next =
                run.status === "draft"
                  ? "reviewed"
                  : run.status === "reviewed"
                    ? "approved"
                    : run.status === "approved"
                      ? "paid"
                      : null;
              return (
                <div key={run._id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() =>
                        setOpenRun(openRun === run._id ? null : run._id)
                      }
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="rounded-xl bg-red-50 p-2 text-red-700">
                        <Banknote size={18} />
                      </span>
                      <span>
                        <b className="block text-slate-900">
                          {periodLabel(run.period)}
                        </b>
                        <small className="text-gray-500">
                          {run.payrollNumber} · {run.lines.length} staff
                        </small>
                      </span>
                      <ChevronDown
                        size={16}
                        className={openRun === run._id ? "rotate-180" : ""}
                      />
                    </button>
                    <div className="flex items-center gap-2">
                      <b className="text-sm text-emerald-700">{money(total)}</b>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">
                        {run.status}
                      </span>
                      <button
                        onClick={() => printRun(run)}
                        title="Print payroll register"
                        className="rounded-xl border border-gray-200 p-2 text-slate-600"
                      >
                        <Printer size={16} />
                      </button>
                      {next && (
                        <button
                          disabled={busy}
                          onClick={() => void updateRun(run._id, next)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                        >
                          {next === "reviewed"
                            ? "Review"
                            : next === "approved"
                              ? "Approve"
                              : "Mark paid"}
                        </button>
                      )}
                    </div>
                  </div>
                  {openRun === run._id && (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                          <tr>
                            <th className="p-3">Employee</th>
                            <th className="p-3 text-right">Gross</th>
                            <th className="p-3 text-right">Advance</th>
                            <th className="p-3 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {run.lines.map((line, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3 font-semibold">
                                {line.staff?.fullName || "Former staff member"}
                              </td>
                              <td className="p-3 text-right">
                                {money(line.grossPay)}
                              </td>
                              <td className="p-3 text-right text-amber-700">
                                {money(line.totalDeductions)}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-700">
                                {money(line.netPay)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.55fr_.85fr]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b p-5">
            <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Users size={19} />
            </span>
            <div>
              <h2 className="font-bold">Compensation profiles</h2>
              <p className="text-sm text-gray-500">
                Monthly base salary used when a new payroll draft is created.
              </p>
            </div>
          </div>
          {staff.map((person) => (
            <div
              key={person._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
            >
              <div>
                <b>{person.fullName}</b>
                <p className="text-xs text-gray-500">
                  {person.jobTitle || person.department || "Staff member"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  defaultValue={person.baseSalary || 0}
                  onBlur={(event) =>
                    Number(event.target.value) !==
                      Number(person.baseSalary || 0) &&
                    void saveSalary(person, event.target.value)
                  }
                  className="h-10 w-36 rounded-lg border px-3 text-right text-sm"
                />
                <small>RWF</small>
              </div>
            </div>
          ))}
        </div>
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2 className="font-bold">Advance queue</h2>
              <p className="text-sm text-gray-500">
                Paid advances are recovered by the next payroll.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {advances.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                No pending or outstanding advances.
              </p>
            ) : (
              advances.map((advance) => (
                <div key={advance._id} className="rounded-xl border p-3">
                  <div className="flex justify-between gap-2">
                    <b className="text-sm">
                      {advance.staff?.fullName || "Staff member"}
                    </b>
                    <span className="text-xs font-bold capitalize text-amber-700">
                      {advance.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold">
                    {money(advance.remainingAmount || advance.amount)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{advance.reason}</p>
                  <div className="mt-3 flex gap-3 text-xs font-bold">
                    {advance.status === "pending" && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void updateAdvance(advance._id, "approved")
                          }
                          className="text-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void updateAdvance(advance._id, "rejected")
                          }
                          className="text-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {advance.status === "approved" && (
                      <button
                        disabled={busy}
                        onClick={() => void updateAdvance(advance._id, "paid")}
                        className="text-blue-700"
                      >
                        Mark paid
                      </button>
                    )}
                    {advance.status === "paid" && (
                      <span className="text-gray-500">Ready for recovery</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
