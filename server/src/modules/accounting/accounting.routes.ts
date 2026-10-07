import { Router } from "express";
import {
  authorizeRoles,
  protect,
  type AuthRequest,
} from "../../middleware/auth.middleware";
import AccountingJournal, {
  TreasuryAccount,
  TreasuryTransaction,
} from "./accounting.model";
import {
  accountingSummary,
  accounts,
  buildLedger,
  filterLedger,
  nextJournalNumber,
  treasuryWorkspace,
  trialBalance,
  validateJournalLines,
} from "./accounting.service";
import User from "../../models/users";

const router = Router();
router.use(protect, authorizeRoles("admin", "staff"));
router.use(async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== "staff") return next();
    if (req.method === "GET" && req.path === "/treasury-accounts") return next();
    const user = await User.findById(req.user.id)
      .select("department permissions status")
      .lean();
    const financeAccess =
      user?.permissions?.includes("finance") ||
      ["finance", "management"].includes(String(user?.department));
    if (!user || user.status !== "active" || !financeAccess) {
      return res
        .status(403)
        .json({ message: "Finance or management access is required." });
    }
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/accounts", (_req, res) => res.json({ data: accounts }));
router.get("/workspace", async (req, res, next) => {
  try {
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    const all = await buildLedger();
    const period = filterLedger(all, from, to);
    const asAt = filterLedger(all, undefined, to);
    const journals = await AccountingJournal.find()
      .populate("createdBy postedBy", "fullName")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json({
      data: {
        summary: accountingSummary(period, asAt),
        accounts,
        ledger: period,
        trialBalance: trialBalance(asAt),
        journals,
        treasury: await treasuryWorkspace(),
      },
    });
  } catch (error) {
    next(error);
  }
});
router.get("/ledger", async (req, res, next) => {
  try {
    res.json({
      data: filterLedger(
        await buildLedger(),
        String(req.query.from || ""),
        String(req.query.to || ""),
      ),
    });
  } catch (error) {
    next(error);
  }
});
router.get("/trial-balance", async (req, res, next) => {
  try {
    const entries = filterLedger(
      await buildLedger(),
      undefined,
      String(req.query.to || ""),
    );
    res.json({ data: trialBalance(entries) });
  } catch (error) {
    next(error);
  }
});
router.get("/summary", async (req, res, next) => {
  try {
    const all = await buildLedger();
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    res.json({
      data: accountingSummary(
        filterLedger(all, from, to),
        filterLedger(all, undefined, to),
      ),
    });
  } catch (error) {
    next(error);
  }
});
router.get("/journals", async (_req, res, next) => {
  try {
    res.json({
      data: await AccountingJournal.find()
        .populate("createdBy postedBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .lean(),
    });
  } catch (error) {
    next(error);
  }
});
router.post("/journals", async (req: AuthRequest, res, next) => {
  try {
    const description = String(req.body?.description || "").trim();
    if (!description) throw new Error("Journal description is required.");
    const lines = validateJournalLines(req.body?.lines);
    const journal = await AccountingJournal.create({
      journalNumber: await nextJournalNumber(),
      date: req.body?.date || new Date(),
      description,
      reference: String(req.body?.reference || "").trim(),
      lines,
      createdBy: req.user?.id,
      status: "draft",
    });
    res.status(201).json({ data: journal });
  } catch (error) {
    next(error);
  }
});
router.post(
  "/journals/:id/post",
  authorizeRoles("admin"),
  async (req: AuthRequest, res, next) => {
    try {
      const journal = await AccountingJournal.findById(req.params.id);
      if (!journal)
        return res.status(404).json({ message: "Journal not found." });
      if (journal.status !== "draft")
        throw new Error("Only a draft journal can be posted.");
      validateJournalLines(journal.lines);
      journal.status = "posted";
      journal.postedBy = req.user?.id;
      journal.postedAt = new Date();
      await journal.save();
      res.json({ data: journal });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/treasury-accounts", async (_req, res, next) => {
  try {
    const workspace = await treasuryWorkspace();
    res.json({ data: { accounts: workspace.accounts } });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/treasury-accounts",
  authorizeRoles("admin"),
  async (req: AuthRequest, res, next) => {
    try {
      const name = String(req.body?.name || "").trim();
      const type = String(req.body?.type || "");
      const openingBalance = Number(req.body?.openingBalance || 0);
      if (!name) throw new Error("Account name is required.");
      if (!["cash", "bank", "mobile_money"].includes(type))
        throw new Error("Select cash, bank or mobile money.");
      if (!Number.isFinite(openingBalance) || openingBalance < 0)
        throw new Error("Opening balance cannot be negative.");
      if (type !== "cash" && !String(req.body?.institution || "").trim())
        throw new Error("Bank or mobile-money provider is required.");
      const accountRecord = await TreasuryAccount.create({
        name,
        type,
        institution: String(req.body?.institution || "").trim(),
        accountNumber: String(req.body?.accountNumber || "").trim(),
        openingBalance,
        openingDate: req.body?.openingDate || new Date(),
        notes: String(req.body?.notes || "").trim(),
      });
      res.status(201).json({ data: accountRecord });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/treasury-accounts/:id",
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      const accountRecord = await TreasuryAccount.findById(req.params.id);
      if (!accountRecord)
        return res.status(404).json({ message: "Treasury account not found." });
      if (req.body?.name !== undefined)
        accountRecord.name = String(req.body.name).trim();
      if (req.body?.institution !== undefined)
        accountRecord.institution = String(req.body.institution).trim();
      if (req.body?.accountNumber !== undefined)
        accountRecord.accountNumber = String(req.body.accountNumber).trim();
      if (["active", "inactive"].includes(req.body?.status))
        accountRecord.status = req.body.status;
      if (req.body?.notes !== undefined)
        accountRecord.notes = String(req.body.notes).trim();
      await accountRecord.save();
      res.json({ data: accountRecord });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/treasury-transactions", async (req: AuthRequest, res, next) => {
  try {
    const type = String(req.body?.type || "");
    const amount = Number(req.body?.amount);
    if (!["deposit", "withdrawal", "transfer"].includes(type))
      throw new Error("Select a valid transaction type.");
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Amount must be greater than zero.");
    const source = await TreasuryAccount.findById(req.body?.account);
    if (!source || source.status !== "active")
      throw new Error("Select an active source account.");
    let destination = null;
    if (type === "transfer") {
      destination = await TreasuryAccount.findById(
        req.body?.destinationAccount,
      );
      if (
        !destination ||
        destination.status !== "active" ||
        String(destination._id) === String(source._id)
      )
        throw new Error("Select a different active destination account.");
    }
    if (type !== "deposit") {
      const workspace = await treasuryWorkspace();
      const sourceBalance = Number(
        (workspace.accounts as any[]).find(
          (item) => String(item._id) === String(source._id),
        )?.balance || 0,
      );
      if (amount > sourceBalance + 0.0001)
        throw new Error(
          `Insufficient funds in ${source.name}. Available: ${sourceBalance.toLocaleString("en-RW")} RWF.`,
        );
    }
    const transactionNumber = `TRX-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
    const transaction = await TreasuryTransaction.create({
      transactionNumber,
      date: req.body?.date || new Date(),
      type,
      account: source._id,
      ...(destination ? { destinationAccount: destination._id } : {}),
      amount,
      description:
        String(req.body?.description || "").trim() ||
        `${type} for ${source.name}`,
      reference: String(req.body?.reference || "").trim(),
      createdBy: req.user?.id,
    });
    res
      .status(201)
      .json({
        data: await TreasuryTransaction.findById(transaction._id)
          .populate(
            "account destinationAccount",
            "name type institution accountNumber",
          )
          .lean(),
      });
  } catch (error) {
    next(error);
  }
});

export default router;
