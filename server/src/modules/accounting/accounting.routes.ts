import { Router } from "express";
import { authorizeRoles, protect, type AuthRequest } from "../../middleware/auth.middleware";
import AccountingJournal from "./accounting.model";
import { accountingSummary, accounts, buildLedger, filterLedger, nextJournalNumber, trialBalance, validateJournalLines } from "./accounting.service";
import User from "../../models/users";

const router = Router();
router.use(protect, authorizeRoles("admin", "staff"));
router.use(async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== "staff") return next();
    const user = await User.findById(req.user.id).select("department permissions status").lean();
    const financeAccess = user?.permissions?.includes("finance") || ["finance", "management"].includes(String(user?.department));
    if (!user || user.status !== "active" || !financeAccess) {
      return res.status(403).json({ message: "Finance or management access is required." });
    }
    next();
  } catch (error) { next(error); }
});

router.get("/accounts", (_req, res) => res.json({ data: accounts }));
router.get("/workspace", async (req, res, next) => {
  try {
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    const all = await buildLedger();
    const period = filterLedger(all, from, to);
    const asAt = filterLedger(all, undefined, to);
    const journals = await AccountingJournal.find().populate("createdBy postedBy", "fullName").sort({ date: -1, createdAt: -1 }).lean();
    res.json({ data: { summary: accountingSummary(period, asAt), accounts, ledger: period, trialBalance: trialBalance(asAt), journals } });
  } catch (error) { next(error); }
});
router.get("/ledger", async (req, res, next) => {
  try { res.json({ data: filterLedger(await buildLedger(), String(req.query.from || ""), String(req.query.to || "")) }); } catch (error) { next(error); }
});
router.get("/trial-balance", async (req, res, next) => {
  try {
    const entries = filterLedger(await buildLedger(), undefined, String(req.query.to || ""));
    res.json({ data: trialBalance(entries) });
  } catch (error) { next(error); }
});
router.get("/summary", async (req, res, next) => {
  try {
    const all = await buildLedger();
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    res.json({ data: accountingSummary(filterLedger(all, from, to), filterLedger(all, undefined, to)) });
  } catch (error) { next(error); }
});
router.get("/journals", async (_req, res, next) => {
  try { res.json({ data: await AccountingJournal.find().populate("createdBy postedBy", "fullName").sort({ date: -1, createdAt: -1 }).lean() }); } catch (error) { next(error); }
});
router.post("/journals", async (req: AuthRequest, res, next) => {
  try {
    const description = String(req.body?.description || "").trim();
    if (!description) throw new Error("Journal description is required.");
    const lines = validateJournalLines(req.body?.lines);
    const journal = await AccountingJournal.create({ journalNumber: await nextJournalNumber(), date: req.body?.date || new Date(), description, reference: String(req.body?.reference || "").trim(), lines, createdBy: req.user?.id, status: "draft" });
    res.status(201).json({ data: journal });
  } catch (error) { next(error); }
});
router.post("/journals/:id/post", authorizeRoles("admin"), async (req: AuthRequest, res, next) => {
  try {
    const journal = await AccountingJournal.findById(req.params.id);
    if (!journal) return res.status(404).json({ message: "Journal not found." });
    if (journal.status !== "draft") throw new Error("Only a draft journal can be posted.");
    validateJournalLines(journal.lines);
    journal.status = "posted";
    journal.postedBy = req.user?.id;
    journal.postedAt = new Date();
    await journal.save();
    res.json({ data: journal });
  } catch (error) { next(error); }
});

export default router;
