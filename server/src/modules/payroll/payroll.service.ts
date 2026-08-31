import PayrollRun from "./payrollRun.model";
import User, { UserRole, UserStatus } from "../../models/users";
import StaffPayment from "../staffFinance/staffPayment.model";

export async function createPayrollRun(period: string, createdBy: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Payroll period must use YYYY-MM.");
  if (await PayrollRun.exists({ period })) throw new Error("A payroll run already exists for this period.");
  const staff = await User.find({ role: { $in: [UserRole.STAFF, UserRole.ADMIN] }, status: UserStatus.ACTIVE }).select("baseSalary");
  const lines = await Promise.all(staff.map(async (member) => {
    const baseSalary = Number(member.baseSalary || 0);
    const advances = await StaffPayment.find({ staff: member._id, kind: "advance", status: "paid", remainingAmount: { $gt: 0 } }).sort({ createdAt: 1 });
    let availableForRecovery = baseSalary;
    const advanceAllocations = advances.flatMap((advance) => {
      const amount = Math.min(availableForRecovery, Number(advance.remainingAmount || 0));
      availableForRecovery -= amount;
      return amount ? [{ advance: advance._id, amount }] : [];
    });
    const advanceDeduction = advanceAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    return { staff: member._id, baseSalary, earnings: [{ label: "Base salary", amount: baseSalary }], deductions: advanceDeduction ? [{ label: "Salary advance recovery", amount: advanceDeduction }] : [], advanceAllocations, grossPay: baseSalary, totalDeductions: advanceDeduction, netPay: baseSalary - advanceDeduction };
  }));
  return PayrollRun.create({ payrollNumber: `PAY-${period.replace("-", "")}`, period, lines, createdBy });
}

export async function markPayrollPaid(id: string) {
  const run = await PayrollRun.findById(id);
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "approved") throw new Error("Only an approved payroll run can be marked as paid.");

  for (const line of run.lines as any[]) {
    for (const allocation of line.advanceAllocations || []) {
      const advance = await StaffPayment.findById(allocation.advance);
      if (!advance || advance.kind !== "advance" || advance.status !== "paid") throw new Error("An advance in this payroll is no longer available for recovery. Create a new payroll run after reviewing advances.");
      const balance = Number(advance.remainingAmount || 0);
      if (balance < Number(allocation.amount)) throw new Error("An advance balance changed after this payroll was prepared. Create a new payroll run after reviewing advances.");
    }
  }
  for (const line of run.lines as any[]) {
    for (const allocation of line.advanceAllocations || []) {
      const advance = await StaffPayment.findById(allocation.advance);
      if (!advance) continue;
      advance.remainingAmount = Math.max(0, Number(advance.remainingAmount || 0) - Number(allocation.amount));
      advance.status = advance.remainingAmount === 0 ? "deducted" : "paid";
      await advance.save();
    }
    line.paymentStatus = "paid";
  }
  run.status = "paid";
  run.paidAt = new Date();
  await run.save();
  return run;
}
