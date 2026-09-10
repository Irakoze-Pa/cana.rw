import { Router } from "express";
import Expense from "./expense.model";
const router = Router();
router.get("/", async (_req, res, next) => { try { res.json({ data: await Expense.find().sort({ date: -1, createdAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post("/", async (req, res, next) => { try { const data = req.body || {}; if (!data.category || !String(data.description || "").trim()) throw new Error("Category and description are required."); if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) throw new Error("Expense amount must be greater than zero."); if (data.method === "bank_cheque" && (!String(data.chequeNumber || "").trim() || !String(data.bankName || "").trim())) throw new Error("Cheque number and bank name are required for a bank cheque."); const expenseNumber = `EXP-${new Date().getFullYear()}-${String((await Expense.countDocuments()) + 1).padStart(5, "0")}`; const expense = await Expense.create({ ...data, expenseNumber, amount: Number(data.amount) }); res.status(201).json({ data: expense }); } catch (error) { next(error); } });
export default router;
