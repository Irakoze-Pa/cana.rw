import { Router } from "express";
import {
  authorizeRoles,
  protect,
  type AuthRequest,
} from "../../middleware/auth.middleware";
import AccountingJournal, {
  AccountingConfiguration,
  FixedAsset,
  OwnerLoan,
  TaxLiability,
  TreasuryAccount,
  TreasuryTransaction,
} from "./accounting.model";
import {
  accountingConfiguration,
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
    const configuration = await accountingConfiguration();
    const journalFilter = configuration?.startDate
      ? { date: { $gte: configuration.startDate } }
      : {};
    const journals = await AccountingJournal.find(journalFilter)
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
        configuration,
        treasury: await treasuryWorkspace(),
        fixedAssets: await FixedAsset.find().populate("createdBy updatedBy", "fullName").sort({ assetCode: 1 }).lean(),
        ownerLoans: await OwnerLoan.find({ status: { $ne: "void" } }).populate("createdBy repayments.treasuryAccount", "fullName name type").sort({ openingDate: -1 }).lean(),
        taxLiabilities: await TaxLiability.find({ status: { $ne: "void" } }).populate("createdBy payments.treasuryAccount", "fullName name type").sort({ dueDate: 1 }).lean(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/owner-loans/opening", authorizeRoles("admin"), async (req: AuthRequest, res, next) => {
  try {
    const lenderName = String(req.body?.lenderName || "").trim();
    const lenderType = String(req.body?.lenderType || "other");
    const originalAmount = Number(req.body?.originalAmount);
    const openingDate = new Date(req.body?.openingDate || new Date());
    const interestRate = Number(req.body?.interestRate || 0);
    if (!lenderName) throw new Error("Owner or lender name is required.");
    if (!Number.isFinite(originalAmount) || originalAmount <= 0) throw new Error("Loan amount must be greater than zero.");
    if (!Number.isFinite(openingDate.getTime())) throw new Error("Enter a valid opening date.");
    if (!Number.isFinite(interestRate) || interestRate < 0) throw new Error("Interest rate cannot be negative.");
    if (!["owner", "director", "shareholder", "bank", "individual", "company", "institution", "other"].includes(lenderType)) throw new Error("Select a valid lender type.");
    const data = await OwnerLoan.create({ loanNumber: `LN-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`, lenderName, lenderType, originalAmount, openingDate, interestRate, reference: String(req.body?.reference || "").trim(), notes: String(req.body?.notes || "").trim(), createdBy: req.user?.id });
    res.status(201).json({ data, message: "Opening owner loan recorded without changing treasury." });
  } catch (error) { next(error); }
});

router.post("/owner-loans/:id/repayments", authorizeRoles("admin"), async (req: AuthRequest, res, next) => { try {
  const loan = await OwnerLoan.findById(req.params.id); if (!loan || loan.status === "void") return res.status(404).json({ message: "Loan was not found." });
  const principal = Number(req.body?.principal || 0); const interest = Number(req.body?.interest || 0); if ((!principal && !interest) || principal < 0 || interest < 0) throw new Error("Enter a principal or interest payment.");
  const paidPrincipal = loan.repayments.reduce((sum: number, item: any) => sum + Number(item.principal || 0), 0); if (principal > loan.originalAmount - paidPrincipal + 0.001) throw new Error("Principal payment exceeds the outstanding loan balance.");
  const account = await TreasuryAccount.findById(req.body?.treasuryAccount); if (!account || account.status !== "active") throw new Error("Select an active payment account.");
  const workspace = await treasuryWorkspace(); const balance = Number((workspace.accounts as any[]).find((item) => String(item._id) === String(account._id))?.balance || 0); if (principal + interest > balance) throw new Error(`Insufficient funds. Available: ${balance.toLocaleString("en-RW")} RWF.`);
  loan.repayments.push({ paymentNumber: `LR-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`, paymentDate: req.body?.paymentDate || new Date(), principal, interest, treasuryAccount: account._id, reference: String(req.body?.reference || "").trim(), createdBy: req.user?.id } as any);
  if (paidPrincipal + principal >= loan.originalAmount - 0.001) loan.status = "settled"; await loan.save(); res.status(201).json({ data: loan });
} catch (error) { next(error); } });

router.post("/taxes", authorizeRoles("admin"), async (req: AuthRequest, res, next) => { try {
  const assessedAmount = Number(req.body?.assessedAmount); if (!Number.isFinite(assessedAmount) || assessedAmount <= 0) throw new Error("Tax amount must be greater than zero.");
  const taxType = String(req.body?.taxType || ""); if (!["vat", "paye", "corporate_income_tax", "withholding_tax", "rssb", "other"].includes(taxType)) throw new Error("Select a valid tax type.");
  if (!String(req.body?.period || "").trim()) throw new Error("Tax period is required.");
  const basis = String(req.body?.basis || "current"); if (!["opening", "current"].includes(basis)) throw new Error("Select opening or current tax.");
  const data = await TaxLiability.create({ taxNumber: `TAX-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`, taxType, basis, authority: String(req.body?.authority || "Rwanda Revenue Authority").trim(), period: String(req.body.period).trim(), dueDate: req.body?.dueDate, assessedAmount, reference: String(req.body?.reference || "").trim(), notes: String(req.body?.notes || "").trim(), createdBy: req.user?.id }); res.status(201).json({ data });
} catch (error) { next(error); } });

router.post("/taxes/:id/payments", authorizeRoles("admin"), async (req: AuthRequest, res, next) => { try {
  const tax = await TaxLiability.findById(req.params.id); if (!tax || tax.status === "void") return res.status(404).json({ message: "Tax obligation was not found." });
  const amount = Number(req.body?.amount); const paid = tax.payments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0); if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment must be greater than zero."); if (amount > tax.assessedAmount - paid + 0.001) throw new Error("Payment exceeds the outstanding tax balance.");
  const account = await TreasuryAccount.findById(req.body?.treasuryAccount); if (!account || account.status !== "active") throw new Error("Select an active payment account."); const workspace = await treasuryWorkspace(); const balance = Number((workspace.accounts as any[]).find((item) => String(item._id) === String(account._id))?.balance || 0); if (amount > balance) throw new Error(`Insufficient funds. Available: ${balance.toLocaleString("en-RW")} RWF.`);
  tax.payments.push({ paymentNumber: `TP-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`, paymentDate: req.body?.paymentDate || new Date(), amount, treasuryAccount: account._id, reference: String(req.body?.reference || "").trim(), createdBy: req.user?.id } as any); const total = paid + amount; tax.status = total >= tax.assessedAmount - 0.001 ? "paid" : "partial"; await tax.save(); res.status(201).json({ data: tax });
} catch (error) { next(error); } });

router.get("/fixed-assets", async (_req, res, next) => {
  try {
    res.json({ data: await FixedAsset.find().populate("createdBy updatedBy", "fullName").sort({ assetCode: 1 }).lean() });
  } catch (error) {
    next(error);
  }
});

router.post("/fixed-assets", authorizeRoles("admin"), async (req: AuthRequest, res, next) => {
  try {
    const assetCode = String(req.body?.assetCode || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim();
    const openingValue = Number(req.body?.openingValue);
    const recognitionDate = new Date(req.body?.recognitionDate || new Date());
    if (!assetCode || !name) throw new Error("Asset code and equipment name are required.");
    if (!Number.isFinite(openingValue) || openingValue < 0) throw new Error("Equipment value must be zero or greater.");
    if (!Number.isFinite(recognitionDate.getTime())) throw new Error("Enter a valid recognition date.");
    const data = await FixedAsset.create({
      assetCode,
      name,
      category: String(req.body?.category || "Production equipment").trim(),
      location: String(req.body?.location || "Factory").trim(),
      recognitionDate,
      openingValue,
      status: req.body?.status || "active",
      valuationStatus: req.body?.valuationStatus || "provisional",
      notes: String(req.body?.notes || "").trim(),
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });
    res.status(201).json({ data });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return res.status(409).json({ message: "This asset code already exists." });
    next(error);
  }
});

router.patch("/fixed-assets/:id", authorizeRoles("admin"), async (req: AuthRequest, res, next) => {
  try {
    const asset = await FixedAsset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Equipment asset was not found." });
    if (req.body?.assetCode !== undefined) asset.assetCode = String(req.body.assetCode).trim().toUpperCase();
    if (req.body?.name !== undefined) asset.name = String(req.body.name).trim();
    if (req.body?.category !== undefined) asset.category = String(req.body.category).trim();
    if (req.body?.location !== undefined) asset.location = String(req.body.location).trim();
    if (req.body?.openingValue !== undefined) {
      const value = Number(req.body.openingValue);
      if (!Number.isFinite(value) || value < 0) throw new Error("Equipment value must be zero or greater.");
      asset.openingValue = value;
    }
    if (req.body?.recognitionDate !== undefined) {
      const date = new Date(req.body.recognitionDate);
      if (!Number.isFinite(date.getTime())) throw new Error("Enter a valid recognition date.");
      asset.recognitionDate = date;
    }
    if (["active", "maintenance", "disposed"].includes(req.body?.status)) asset.status = req.body.status;
    if (["provisional", "verified"].includes(req.body?.valuationStatus)) asset.valuationStatus = req.body.valuationStatus;
    if (req.body?.notes !== undefined) asset.notes = String(req.body.notes).trim();
    asset.updatedBy = req.user?.id;
    await asset.save();
    res.json({ data: asset });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return res.status(409).json({ message: "This asset code already exists." });
    next(error);
  }
});

router.post(
  "/start-fresh",
  authorizeRoles("admin"),
  async (req: AuthRequest, res, next) => {
    try {
      if (String(req.body?.confirmation || "") !== "START")
        return res.status(400).json({ message: "Accounting reset confirmation is required." });
      const startDate = new Date(req.body?.startDate || new Date());
      if (!Number.isFinite(startDate.getTime()))
        return res.status(400).json({ message: "Enter a valid accounting start date." });

      const currentTreasury = await treasuryWorkspace();
      await Promise.all(
        currentTreasury.accounts.map((item: any) =>
          TreasuryAccount.findByIdAndUpdate(item._id, {
            openingBalance: Math.max(0, Number(item.balance || 0)),
            openingDate: startDate,
          }),
        ),
      );
      const configuration = await AccountingConfiguration.findOneAndUpdate(
        { key: "primary" },
        {
          $set: {
            startDate,
            startedBy: req.user?.id,
            notes: String(req.body?.notes || "Accounting started from a verified opening position.").trim(),
          },
          $setOnInsert: { key: "primary" },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).populate("startedBy", "fullName");
      res.json({
        data: configuration,
        message: "Accounting opening date established. Earlier operational records remain preserved.",
      });
    } catch (error) {
      next(error);
    }
  },
);
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
      if (req.body?.openingBalance !== undefined) {
        const openingBalance = Number(req.body.openingBalance);
        if (!Number.isFinite(openingBalance) || openingBalance < 0)
          throw new Error("Opening balance cannot be negative.");
        accountRecord.openingBalance = openingBalance;
      }
      if (req.body?.openingDate !== undefined) {
        const openingDate = new Date(req.body.openingDate);
        if (!Number.isFinite(openingDate.getTime())) throw new Error("Enter a valid opening date.");
        accountRecord.openingDate = openingDate;
      }
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
