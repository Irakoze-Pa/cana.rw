import { Router } from "express";
import mongoose from "mongoose";
import { authorizeArea, protect } from "../../middleware/auth.middleware";
import { ScaffoldHire, ScaffoldItem, ScaffoldSale, ScaffoldStockMovement, ServiceCustomer, ServiceFinanceTransaction, ServiceWorker, ServiceWorkerTransaction, TransportTrip } from "./scaffolding.model";

const router = Router();
router.use(protect, authorizeArea("sales", "sites", "inventory"));
const n = (value: unknown) => Number(Number(value || 0).toFixed(2));
const standardScaffoldAccessories = [
  { code: "SCA-SCAFFOLD", name: "Scaffold set (pair of legs)", category: "frame" },
  { code: "SCA-IMISHAMI", name: "Imishami", category: "frame" },
  { code: "SCA-JONCTION", name: "Jonction", category: "coupler" },
  { code: "SCA-IMBAHO", name: "Imbaho", category: "platform" },
  { code: "SCA-IBIRENGE", name: "Ibirenge", category: "base_jack" },
  { code: "SCA-UDUTANDA", name: "Udutanda", category: "brace" },
  { code: "SCA-AMATIYO", name: "Amatiyo", category: "standard" },
  { code: "SCA-IBIJIGO", name: "Ibijigo", category: "coupler" },
  { code: "SCA-IMIKANDARA", name: "Imikandara", category: "guard_rail" },
  { code: "SCA-AMAPINE", name: "Amapine", category: "other" },
];
const sequence = async (prefix: string, model: mongoose.Model<any>, field: string) => {
  const year = new Date().getFullYear(); const start = `${prefix}-${year}-`;
  const latest: any = await model.findOne({ [field]: new RegExp(`^${start}\\d+$`) }).sort({ [field]: -1 }).select(field).lean();
  const previous = Number(String(latest?.[field] || "").slice(start.length));
  return `${start}${String((Number.isFinite(previous) ? previous : 0) + 1).padStart(5, "0")}`;
};

router.get("/workspace", async (_req, res, next) => {
  try {
    await ScaffoldItem.bulkWrite(standardScaffoldAccessories.map((item) => ({
      updateOne: {
        filter: { code: item.code },
        update: { $setOnInsert: { ...item, totalQuantity: 0, availableQuantity: 0, status: "active", notes: "Standard rental accessory" } },
        upsert: true,
      },
    })), { ordered: false });
    const [items, hires, sales] = await Promise.all([
      ScaffoldItem.find().sort({ status: 1, name: 1 }).lean(),
      ScaffoldHire.find().populate("customer", "fullName businessName phone address").sort({ createdAt: -1 }).lean(),
      ScaffoldSale.find().populate("customer", "fullName businessName phone address").sort({ saleDate: -1, createdAt: -1 }).lean(),
    ]);
    const activeHires = hires.filter((x: any) => ["active", "partially_returned"].includes(x.status));
    const financePayments: any[] = await ServiceFinanceTransaction.find({ transactionType: "payment", status: "confirmed", referenceType: "scaffold_hire" }).select("referenceId amount transactionDate transactionNumber").lean();
    const paidByHire = new Map<string, number>();
    for (const payment of financePayments) paidByHire.set(String(payment.referenceId), (paidByHire.get(String(payment.referenceId)) || 0) + Number(payment.amount || 0));
    const paymentCountByHire = new Map<string, number>();
    for (const payment of financePayments) paymentCountByHire.set(String(payment.referenceId), (paymentCountByHire.get(String(payment.referenceId)) || 0) + 1);
    const enrichedHires = hires.map((hire: any) => {
      const paid = Number(hire.deposit || 0) + (paidByHire.get(String(hire._id)) || 0);
      const onSiteScaffolds = Number(hire.scaffoldQuantity || 0) - Number(hire.scaffoldReturnedGood || 0) - Number(hire.scaffoldReturnedDamaged || 0) - Number(hire.scaffoldReturnedMissing || 0);
      const onSiteAccessories = (hire.items || []).map((line: any) => ({ ...line, onSite: Number(line.quantity || 0) - Number(line.returnedGood || 0) - Number(line.returnedDamaged || 0) - Number(line.returnedMissing || 0) }));
      const returnEvents = (hire.history || []).filter((entry: any) => String(entry.action).includes("return"));
      const paymentHistory = financePayments.filter((payment: any) => String(payment.referenceId) === String(hire._id)).sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      return { ...hire, paid, balance: Math.max(0, Number(hire.hireSubtotal || 0) - paid), paymentCount: paymentCountByHire.get(String(hire._id)) || 0, paymentHistory, onSiteScaffolds: Math.max(0, onSiteScaffolds), onSiteAccessories, returnEvents };
    });
    res.json({ data: { items, hires: enrichedHires, sales, summary: {
      accessoryTypes: items.filter((x: any) => x.status === "active").length,
      totalPieces: items.reduce((s: number, x: any) => s + Number(x.totalQuantity || 0), 0),
      availablePieces: items.reduce((s: number, x: any) => s + Number(x.availableQuantity || 0), 0),
      hiredPieces: items.reduce((s: number, x: any) => s + Number(x.hiredQuantity || 0), 0),
      activeHires: activeHires.length,
      overdueHires: activeHires.filter((x: any) => new Date(x.expectedReturnDate).getTime() < Date.now()).length,
      onSiteScaffolds: enrichedHires.filter((hire: any) => ["active", "partially_returned"].includes(hire.status)).reduce((sum: number, hire: any) => sum + hire.onSiteScaffolds, 0),
      hirePayments: financePayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) + hires.reduce((sum: number, hire: any) => sum + Number(hire.deposit || 0), 0),
      salesValue: sales.filter((x: any) => x.status === "confirmed").reduce((s: number, x: any) => s + Number(x.total || 0), 0),
    } } });
  } catch (error) { next(error); }
});

router.get("/customers", async (_req, res, next) => {
  try { res.json({ data: await ServiceCustomer.find().sort({ status: 1, businessName: 1, fullName: 1 }).lean() }); }
  catch (error) { next(error); }
});

router.post("/customers", async (req: any, res, next) => {
  try {
    const fullName = String(req.body?.fullName || "").trim(); const phone = String(req.body?.phone || "").trim();
    if (!fullName || !phone) throw new Error("Client name and phone number are required.");
    const existing = await ServiceCustomer.exists({ phone, status: "active" });
    if (existing) throw new Error("An active CANA Services client already uses this phone number.");
    const customer = await ServiceCustomer.create({ ...req.body, fullName, phone, customerNumber: await sequence("SC", ServiceCustomer, "customerNumber"), createdBy: req.user?.id });
    res.status(201).json({ data: customer });
  } catch (error) { next(error); }
});

router.patch("/customers/:id", async (req, res, next) => {
  try {
    const customer: any = await ServiceCustomer.findById(req.params.id); if (!customer) throw new Error("CANA Services client not found.");
    ["customerType", "fullName", "businessName", "phone", "alternatePhone", "nationalId", "email", "tin", "address", "contactPerson", "status", "notes"].forEach((field) => { if (req.body?.[field] !== undefined) customer[field] = req.body[field]; });
    await customer.save(); res.json({ data: customer });
  } catch (error) { next(error); }
});

router.post("/items", async (req: any, res, next) => {
  try {
    const quantity = n(req.body?.totalQuantity);
    if (!String(req.body?.name || "").trim() || !String(req.body?.code || "").trim()) throw new Error("Accessory name and code are required.");
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Enter a valid opening quantity.");
    const item = await ScaffoldItem.create({ ...req.body, name: String(req.body.name).trim(), code: String(req.body.code).trim().toUpperCase(), totalQuantity: quantity, availableQuantity: quantity });
    if (quantity > 0) await ScaffoldStockMovement.create({ item: item._id, movementType: "opening", quantity, balanceAfter: quantity, reason: "Opening stock", createdBy: req.user?.id });
    res.status(201).json({ data: item });
  } catch (error) { next(error); }
});

router.patch("/items/:id", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const item: any = await ScaffoldItem.findById(req.params.id).session(session); if (!item) throw new Error("Scaffold accessory not found.");
      if (req.body?.code !== undefined) {
        const code = String(req.body.code || "").trim().toUpperCase();
        if (!code) throw new Error("Stock code is required.");
        if (await ScaffoldItem.exists({ _id: { $ne: item._id }, code }).session(session)) throw new Error("Another stock item already uses this code.");
        item.code = code;
      }
      const fields = ["name", "category", "salePrice", "replacementCost", "status", "notes"];
      fields.forEach((field) => { if (req.body?.[field] !== undefined) item[field] = req.body[field]; });
      if (req.body?.totalQuantity !== undefined) {
        const total = n(req.body.totalQuantity); const unavailable = Number(item.hiredQuantity || 0) + Number(item.soldQuantity || 0) + Number(item.damagedQuantity || 0) + Number(item.missingQuantity || 0);
        if (!Number.isFinite(total) || total < unavailable) throw new Error(`Total quantity cannot be below ${unavailable} pieces already hired, sold, damaged or missing.`);
        const adjustment = total - Number(item.totalQuantity || 0);
        if (adjustment !== 0) {
          const reason = String(req.body?.reason || "").trim();
          if (!reason) throw new Error("Enter a reason when changing total stock quantity.");
          item.totalQuantity = total; item.availableQuantity = Number(item.availableQuantity || 0) + adjustment;
          await ScaffoldStockMovement.create([{ item: item._id, movementType: "adjustment", quantity: adjustment, balanceAfter: item.availableQuantity, reference: String(req.body?.reference || ""), reason, createdBy: (req as any).user?.id }], { session });
        }
      }
      await item.save({ session }); result = item;
    });
    res.json({ data: result });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.post("/items/:id/adjust", async (req: any, res, next) => {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const item: any = await ScaffoldItem.findById(req.params.id).session(session); if (!item) throw new Error("Scaffold stock item not found.");
      const adjustment = Math.trunc(Number(req.body?.adjustment));
      if (!Number.isFinite(adjustment) || adjustment === 0) throw new Error("Enter a positive or negative stock adjustment.");
      if (Number(item.availableQuantity) + adjustment < 0 || Number(item.totalQuantity) + adjustment < 0) throw new Error("Adjustment cannot make stock negative.");
      item.totalQuantity += adjustment; item.availableQuantity += adjustment; await item.save({ session });
      await ScaffoldStockMovement.create([{ item: item._id, movementType: Number(item.totalQuantity) === adjustment ? "opening" : "adjustment", quantity: adjustment, balanceAfter: item.availableQuantity, reference: String(req.body?.reference || ""), reason: String(req.body?.reason || "Stock adjustment"), createdBy: req.user?.id }], { session });
      result = item;
    });
    res.json({ data: result });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.get("/stock-movements", async (_req, res, next) => {
  try { res.json({ data: await ScaffoldStockMovement.find().populate("item", "code name").sort({ createdAt: -1 }).limit(500).lean() }); }
  catch (error) { next(error); }
});

router.post("/hires", async (req: any, res, next) => {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      if (!mongoose.Types.ObjectId.isValid(req.body?.customer) || !(await ServiceCustomer.exists({ _id: req.body.customer, status: "active" }).session(session))) throw new Error("Select a valid CANA Services client.");
      const start = new Date(req.body.startDate); const due = new Date(req.body.expectedReturnDate);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(due.getTime()) || due < start) throw new Error("Enter a valid hire and expected return date.");
      const scaffoldQuantity = Math.floor(Number(req.body.scaffoldQuantity));
      const numberOfDays = Math.floor(Number(req.body.numberOfDays ?? 1));
      const unitPrice = n(req.body.unitPrice);
      if (!Number.isFinite(scaffoldQuantity) || scaffoldQuantity < 1 || !Number.isFinite(numberOfDays) || numberOfDays < 1 || unitPrice < 0) throw new Error("Enter valid scaffold quantity, chargeable hire days and price per scaffold per day.");
      const scaffoldStock: any = await ScaffoldItem.findOne({ code: "SCA-SCAFFOLD", status: "active" }).session(session);
      if (!scaffoldStock || scaffoldQuantity > Number(scaffoldStock.availableQuantity)) throw new Error(`Only ${scaffoldStock?.availableQuantity || 0} scaffold pair(s) are available.`);
      scaffoldStock.availableQuantity -= scaffoldQuantity; scaffoldStock.hiredQuantity += scaffoldQuantity; await scaffoldStock.save({ session });
      const requestedAccessories = Array.isArray(req.body?.items) ? req.body.items : [];
      const quantities = new Map<string, number>();
      for (const line of requestedAccessories) {
        if (!mongoose.Types.ObjectId.isValid(line?.item)) throw new Error("Choose a valid accessory for each supplied item.");
        const quantity = Math.floor(Number(line?.quantity));
        if (!Number.isFinite(quantity) || quantity < 1) throw new Error("Accessory quantities must be whole numbers greater than zero.");
        quantities.set(String(line.item), (quantities.get(String(line.item)) || 0) + quantity);
      }
      const items: any[] = [];
      const accessoryMovements: any[] = [];
      for (const [itemId, quantity] of quantities) {
        const accessory: any = await ScaffoldItem.findById(itemId).session(session);
        if (!accessory || accessory.status !== "active" || accessory.code === "SCA-SCAFFOLD") throw new Error("Select an active scaffold accessory, not the scaffold-pair stock item.");
        if (quantity > Number(accessory.availableQuantity || 0)) throw new Error(`Only ${Number(accessory.availableQuantity || 0)} ${accessory.name} piece(s) are available.`);
        accessory.availableQuantity -= quantity;
        accessory.hiredQuantity += quantity;
        await accessory.save({ session });
        items.push({ item: accessory._id, itemCode: accessory.code, itemName: accessory.name, quantity, dailyRate: 0 });
        accessoryMovements.push({ item: accessory._id, movementType: "hire_out", quantity: -quantity, balanceAfter: accessory.availableQuantity, reason: "Accessory supplied with scaffold hire", createdBy: req.user?.id });
      }
      const [hire] = await ScaffoldHire.create([{ hireNumber: await sequence("SH", ScaffoldHire, "hireNumber"), customer: req.body.customer, siteName: req.body.siteName, siteAddress: req.body.siteAddress, contactName: req.body.contactName, contactPhone: req.body.contactPhone, startDate: start, expectedReturnDate: due, scaffoldQuantity, numberOfDays, unitPrice, hireSubtotal: n(scaffoldQuantity * numberOfDays * unitPrice), deposit: n(req.body.deposit), transportCharge: 0, items, notes: req.body.notes, createdBy: req.user?.id, history: [{ action: "dispatched", note: "Scaffolding issued to customer", by: req.user?.id }] }], { session });
      await ScaffoldStockMovement.create([{ item: scaffoldStock._id, movementType: "hire_out", quantity: -scaffoldQuantity, balanceAfter: scaffoldStock.availableQuantity, reference: hire.hireNumber, reason: "Scaffold pairs dispatched", createdBy: req.user?.id }], { session });
      if (accessoryMovements.length) await ScaffoldStockMovement.create(accessoryMovements.map((movement) => ({ ...movement, reference: hire.hireNumber })), { session });
      result = hire;
    });
    res.status(201).json({ data: result });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.patch("/hires/:id/billing", async (req: any, res, next) => {
  try {
    const numberOfDays = Math.floor(Number(req.body?.numberOfDays));
    if (!Number.isFinite(numberOfDays) || numberOfDays < 1) throw new Error("Chargeable hire days must be at least one.");
    const hire: any = await ScaffoldHire.findById(req.params.id);
    if (!hire || hire.status === "cancelled") throw new Error("Scaffold hire contract not found.");
    const revisedTotal = n(Number(hire.scaffoldQuantity || 0) * numberOfDays * Number(hire.unitPrice || 0));
    const paidRows = await ServiceFinanceTransaction.aggregate([
      { $match: { transactionType: "payment", status: "confirmed", referenceType: "scaffold_hire", referenceId: hire._id } },
      { $group: { _id: null, paid: { $sum: "$amount" } } },
    ]);
    const paid = Number(hire.deposit || 0) + Number(paidRows[0]?.paid || 0);
    if (revisedTotal < paid) throw new Error(`Revised hire value cannot be lower than ${paid.toLocaleString("en-RW")} RWF already received.`);
    const previousDays = Number(hire.numberOfDays || 1);
    const previousTotal = Number(hire.hireSubtotal || 0);
    const reason = String(req.body?.reason || "").trim();
    if (!reason) throw new Error("Enter a reason for changing chargeable hire days.");
    hire.numberOfDays = numberOfDays;
    hire.hireSubtotal = revisedTotal;
    hire.billingDaysAdjusted = true;
    hire.history.push({ action: "billing_adjustment", at: new Date(), note: `Chargeable days adjusted from ${previousDays} to ${numberOfDays}; hire value changed from ${previousTotal} to ${revisedTotal} RWF. Reason: ${reason}`, by: req.user?.id });
    await hire.save();
    res.json({ data: hire });
  } catch (error) { next(error); }
});

router.post("/hires/:id/returns", async (req: any, res, next) => {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const hire: any = await ScaffoldHire.findById(req.params.id).session(session); if (!hire || !["active", "partially_returned"].includes(hire.status)) throw new Error("Active hire contract not found.");
      const returns = Array.isArray(req.body?.items) ? req.body.items : [];
      const scaffoldGood = Math.floor(Number(req.body?.scaffoldGood || 0)); const scaffoldDamaged = Math.floor(Number(req.body?.scaffoldDamaged || 0)); const scaffoldMissing = Math.floor(Number(req.body?.scaffoldMissing || 0));
      if (!returns.length && scaffoldGood + scaffoldDamaged + scaffoldMissing < 1) throw new Error("Enter returned scaffolds or accessories.");
      const scaffoldOutstanding = Number(hire.scaffoldQuantity) - Number(hire.scaffoldReturnedGood) - Number(hire.scaffoldReturnedDamaged) - Number(hire.scaffoldReturnedMissing);
      if ([scaffoldGood, scaffoldDamaged, scaffoldMissing].some((x) => !Number.isFinite(x) || x < 0) || scaffoldGood + scaffoldDamaged + scaffoldMissing > scaffoldOutstanding) throw new Error(`Scaffold return exceeds ${scaffoldOutstanding} outstanding pair(s).`);
      if (scaffoldGood + scaffoldDamaged + scaffoldMissing > 0) {
        const scaffoldStock: any = await ScaffoldItem.findOne({ code: "SCA-SCAFFOLD" }).session(session); if (!scaffoldStock) throw new Error("Scaffold-pair stock record is missing.");
        scaffoldStock.hiredQuantity -= scaffoldGood + scaffoldDamaged + scaffoldMissing; scaffoldStock.availableQuantity += scaffoldGood; scaffoldStock.damagedQuantity += scaffoldDamaged; scaffoldStock.missingQuantity += scaffoldMissing; await scaffoldStock.save({ session });
        hire.scaffoldReturnedGood += scaffoldGood; hire.scaffoldReturnedDamaged += scaffoldDamaged; hire.scaffoldReturnedMissing += scaffoldMissing;
        await ScaffoldStockMovement.create([{ item: scaffoldStock._id, movementType: "hire_return", quantity: scaffoldGood, balanceAfter: scaffoldStock.availableQuantity, reference: hire.hireNumber, reason: `${scaffoldGood} good, ${scaffoldDamaged} damaged, ${scaffoldMissing} missing`, createdBy: req.user?.id }], { session });
      }
      for (const returned of returns) {
        const line: any = hire.items.id(returned.lineId); if (!line) throw new Error("Hire accessory line not found.");
        const good = Math.floor(Number(returned.good || 0)); const damaged = Math.floor(Number(returned.damaged || 0)); const missing = Math.floor(Number(returned.missing || 0));
        if ([good, damaged, missing].some((x) => x < 0 || !Number.isFinite(x))) throw new Error("Return quantities must be valid positive numbers.");
        const outstanding = line.quantity - line.returnedGood - line.returnedDamaged - line.returnedMissing;
        if (good + damaged + missing > outstanding) throw new Error(`Return for ${line.itemName} exceeds ${outstanding} outstanding pieces.`);
        const item: any = await ScaffoldItem.findById(line.item).session(session); if (!item) throw new Error(`${line.itemName} no longer exists.`);
        line.returnedGood += good; line.returnedDamaged += damaged; line.returnedMissing += missing;
        item.hiredQuantity -= good + damaged + missing; item.availableQuantity += good; item.damagedQuantity += damaged; item.missingQuantity += missing; await item.save({ session });
        if (good + damaged + missing > 0) await ScaffoldStockMovement.create([{ item: item._id, movementType: "hire_return", quantity: good, balanceAfter: item.availableQuantity, reference: hire.hireNumber, reason: `Accessory return: ${good} good, ${damaged} damaged, ${missing} missing`, createdBy: req.user?.id }], { session });
      }
      const complete = hire.scaffoldReturnedGood + hire.scaffoldReturnedDamaged + hire.scaffoldReturnedMissing >= hire.scaffoldQuantity && hire.items.every((line: any) => line.returnedGood + line.returnedDamaged + line.returnedMissing >= line.quantity);
      hire.status = complete ? "returned" : "partially_returned";
      let billingBasis = hire.billingDaysAdjusted ? "manually adjusted" : "calculated to return date";
      if (complete) {
        const returnedAt = new Date();
        hire.actualReturnDate = returnedAt;
        if (!hire.billingDaysAdjusted) {
          const elapsedDays = Math.max(1, Math.ceil((returnedAt.getTime() - new Date(hire.startDate).getTime()) / 86400000));
          const calculatedTotal = n(Number(hire.scaffoldQuantity || 0) * elapsedDays * Number(hire.unitPrice || 0));
          const receivedRows = await ServiceFinanceTransaction.aggregate([
            { $match: { transactionType: "payment", status: "confirmed", referenceType: "scaffold_hire", referenceId: hire._id } },
            { $group: { _id: null, received: { $sum: "$amount" } } },
          ]).session(session);
          const received = Number(hire.deposit || 0) + Number(receivedRows[0]?.received || 0);
          if (calculatedTotal >= received) {
            hire.numberOfDays = elapsedDays;
            hire.hireSubtotal = calculatedTotal;
          } else {
            billingBasis = "existing charge retained because it is below payments already received";
          }
        }
      }
      const returnedScaffoldCount = scaffoldGood + scaffoldDamaged + scaffoldMissing;
      const returnSummary = `${returnedScaffoldCount} scaffold pair(s) returned/accounted; good ${scaffoldGood}, damaged ${scaffoldDamaged}, missing ${scaffoldMissing}. Accessories are handled separately in stock control.`;
      const billingSummary = complete ? ` Final hire charge: ${hire.numberOfDays} billable day(s), ${Number(hire.hireSubtotal || 0)} RWF (${billingBasis}).` : "";
      hire.history.push({ action: complete ? "returned" : "partial_return", at: new Date(), note: `${String(req.body?.notes || returnSummary)}${billingSummary}`, by: req.user?.id });
      await hire.save({ session }); result = hire;
    });
    res.json({ data: result });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.post("/sales", async (req: any, res, next) => {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const lines = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!mongoose.Types.ObjectId.isValid(req.body?.customer) || !(await ServiceCustomer.exists({ _id: req.body.customer, status: "active" }).session(session))) throw new Error("Select a valid CANA Services client.");
      if (!lines.length) throw new Error("Add at least one scaffold accessory.");
      const items: any[] = []; const stockMovements: any[] = []; let subtotal = 0;
      for (const line of lines) {
        const item: any = await ScaffoldItem.findById(line.item).session(session); const quantity = Math.floor(Number(line.quantity)); const unitPrice = n(line.unitPrice ?? item?.salePrice);
        if (!item || item.status !== "active" || quantity < 1 || unitPrice < 0) throw new Error("Each sale line needs an active accessory, quantity and price.");
        if (quantity > Number(item.availableQuantity)) throw new Error(`${item.name} has only ${item.availableQuantity} pieces available.`);
        const total = n(quantity * unitPrice); subtotal += total; item.availableQuantity -= quantity; item.soldQuantity += quantity; await item.save({ session });
        items.push({ item: item._id, itemCode: item.code, itemName: item.name, quantity, unitPrice, total });
        stockMovements.push({ item: item._id, movementType: "sale", quantity: -quantity, balanceAfter: item.availableQuantity });
      }
      const transportCharge = n(req.body.transportCharge); const [sale] = await ScaffoldSale.create([{ saleNumber: await sequence("SS", ScaffoldSale, "saleNumber"), customer: req.body.customer, saleDate: req.body.saleDate || new Date(), items, subtotal: n(subtotal), transportCharge, total: n(subtotal + transportCharge), notes: req.body.notes, createdBy: req.user?.id }], { session }); result = sale;
      await ScaffoldStockMovement.create(stockMovements.map((movement) => ({ ...movement, reference: sale.saleNumber, reason: "Scaffold sale", createdBy: req.user?.id })), { session });
    });
    res.status(201).json({ data: result });
  } catch (error) { next(error); } finally { await session.endSession(); }
});

router.get("/staff", async (_req, res, next) => {
  try {
    const [workers, transactions] = await Promise.all([
      ServiceWorker.find().sort({ businessUnit: 1, status: 1, fullName: 1 }).lean(),
      ServiceWorkerTransaction.find().populate("worker", "workerNumber fullName businessUnit vehicleRegistration").sort({ transactionDate: -1, createdAt: -1 }).lean(),
    ]);
    res.json({ data: { workers, transactions } });
  } catch (error) { next(error); }
});

router.post("/staff", async (req: any, res, next) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const businessUnit = String(req.body?.businessUnit || "");
    const vehicleRegistration = String(req.body?.vehicleRegistration || "").trim().toUpperCase();
    if (!fullName || !["transport", "scaffolding"].includes(businessUnit)) throw new Error("Enter a staff name and select Scaffolding or Rifan Transport.");
    if (businessUnit === "transport" && !vehicleRegistration) throw new Error("Assign a Rifan number plate to this driver.");
    if (vehicleRegistration && await ServiceWorker.exists({ vehicleRegistration, status: "active" })) throw new Error("This plate is already assigned to an active staff member.");
    const worker = await ServiceWorker.create({ ...req.body, fullName, businessUnit, vehicleRegistration, workerNumber: await sequence("SW", ServiceWorker, "workerNumber"), createdBy: req.user?.id });
    res.status(201).json({ data: worker });
  } catch (error) { next(error); }
});

router.patch("/staff/:id", async (req, res, next) => {
  try {
    const worker: any = await ServiceWorker.findById(req.params.id);
    if (!worker) throw new Error("CANA Services staff record not found.");
    const vehicleRegistration = req.body?.vehicleRegistration === undefined ? worker.vehicleRegistration : String(req.body.vehicleRegistration).trim().toUpperCase();
    if (worker.businessUnit === "transport" && !vehicleRegistration) throw new Error("Rifan drivers must have an assigned plate.");
    if (vehicleRegistration && await ServiceWorker.exists({ _id: { $ne: worker._id }, vehicleRegistration, status: "active" })) throw new Error("This plate is already assigned to another active staff member.");
    for (const field of ["fullName", "phone", "jobTitle", "status", "notes"]) if (req.body?.[field] !== undefined) worker[field] = req.body[field];
    worker.vehicleRegistration = vehicleRegistration;
    await worker.save(); res.json({ data: worker });
  } catch (error) { next(error); }
});

router.post("/staff/:id/transactions", async (req: any, res, next) => {
  try {
    const worker: any = await ServiceWorker.findById(req.params.id);
    if (!worker || worker.status !== "active") throw new Error("Select an active staff member.");
    const kind = String(req.body?.kind || ""); const amount = n(req.body?.amount);
    if (!["advance", "payment"].includes(kind) || amount <= 0) throw new Error("Select an advance or payment and enter an amount greater than zero.");
    const transactionDate = req.body?.transactionDate ? new Date(req.body.transactionDate) : new Date();
    if (!Number.isFinite(transactionDate.getTime())) throw new Error("Enter a valid payment date.");
    const transaction = await ServiceWorkerTransaction.create({ transactionNumber: await sequence("SWP", ServiceWorkerTransaction, "transactionNumber"), worker: worker._id, businessUnit: worker.businessUnit, kind, amount, transactionDate, method: req.body?.method || "cash", reference: String(req.body?.reference || "").trim(), description: String(req.body?.description || (kind === "advance" ? "Staff advance" : "Staff payment")).trim(), createdBy: req.user?.id });
    await ServiceFinanceTransaction.create({ transactionNumber: await sequence("SE", ServiceFinanceTransaction, "transactionNumber"), transactionType: "expense", businessUnit: worker.businessUnit, category: kind === "advance" ? "Staff advance" : "Staff payment", referenceType: "other", referenceNumber: transaction.transactionNumber, description: `${worker.fullName} · ${transaction.description}`, amount, paymentMethod: transaction.method, transactionDate, notes: transaction.reference, createdBy: req.user?.id });
    res.status(201).json({ data: transaction });
  } catch (error) { next(error); }
});

router.get("/transport", async (_req, res, next) => {
  try {
    const [trips, drivers, customers] = await Promise.all([
      TransportTrip.find().populate("driver", "fullName phone jobTitle vehicleRegistration").populate("customer", "fullName businessName phone").sort({ departureAt: -1 }).lean(),
      ServiceWorker.find({ businessUnit: "transport", status: "active" }).select("fullName phone jobTitle vehicleRegistration").sort({ fullName: 1 }).lean(),
      ServiceCustomer.find({ status: "active" }).select("customerNumber fullName businessName phone").sort({ businessName: 1, fullName: 1 }).lean(),
    ]);
    res.json({ data: { trips, drivers, customers } });
  } catch (error) { next(error); }
});

router.post("/transport", async (req: any, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body?.driver)) throw new Error("Select a registered Rifan driver.");
    const selectedDriver: any = await ServiceWorker.findOne({ _id: req.body.driver, businessUnit: "transport", status: "active" }).lean();
    if (!selectedDriver) throw new Error("Select an active registered Rifan driver.");
    const stops = Array.isArray(req.body?.stops)
      ? req.body.stops.map((stop: any) => ({ destination: String(stop?.destination || "").trim(), amountCharged: n(stop?.amountCharged) })).filter((stop: any) => stop.destination)
      : [];
    const legacyDestinations = Array.isArray(req.body?.destinations)
      ? req.body.destinations.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : String(req.body?.destination || "").split("·").map((value: string) => value.trim()).filter(Boolean);
    if (!stops.length && legacyDestinations.length) stops.push({ destination: legacyDestinations.join(" · "), amountCharged: n(req.body.amountCharged) });
    if (!stops.length) throw new Error("Add at least one destination and its charge.");
    if (stops.some((stop: any) => !Number.isFinite(stop.amountCharged) || stop.amountCharged < 0)) throw new Error("Enter a valid non-negative charge for every destination.");
    const amountCharged = n(stops.reduce((sum: number, stop: any) => sum + stop.amountCharged, 0));
    const fuelCost = n(req.body?.fuelCost);
    const repairCost = n(req.body?.repairCost);
    if (!Number.isFinite(fuelCost) || fuelCost < 0 || !Number.isFinite(repairCost) || repairCost < 0)
      throw new Error("Fuel and repair expenses must be valid non-negative amounts.");
    const departureAt = req.body.departureAt ? new Date(req.body.departureAt) : new Date();
    if (!Number.isFinite(departureAt.getTime())) throw new Error("Enter a valid trip date.");
    const serviceDate = departureAt.toISOString().slice(0, 10);
    if (await TransportTrip.exists({ driver: selectedDriver._id, serviceDate }))
      throw new Error("A daily trip log already exists for this driver. Add all destinations to the existing daily record.");
    const destinations = stops.map((stop: any) => stop.destination);
    const trip = await TransportTrip.create({
      ...req.body,
      tripNumber: await sequence("TR", TransportTrip, "tripNumber"),
      driver: selectedDriver._id,
      serviceDate,
      driverName: selectedDriver.fullName,
      vehicleRegistration: selectedDriver.vehicleRegistration,
      destinations,
      stops,
      destination: destinations.join(" · "),
      origin: String(req.body.origin || "Kigali").trim(),
      purpose: String(req.body.purpose || "Transport service").trim(),
      departureAt,
      status: req.body.status || "completed",
      distanceKm: n(req.body.distanceKm), amountCharged, fuelCost: 0, repairCost: 0, otherCost: 0,
      createdBy: req.user?.id,
    });
    res.status(201).json({ data: trip });
  } catch (error) {
    if ((error as any)?.code === 11000 && (error as any)?.keyPattern?.serviceDate)
      return res.status(409).json({ error: { message: "A daily log already exists for this driver and date." } });
    next(error);
  }
});

router.patch("/transport/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["planned", "dispatched", "completed", "cancelled"].includes(status)) throw new Error("Select a valid trip status.");
    const trip = await TransportTrip.findById(req.params.id);
    if (!trip) throw new Error("Transport trip not found.");
    trip.status = status;
    if (status === "completed") trip.returnedAt = req.body?.returnedAt ? new Date(req.body.returnedAt) : new Date();
    await trip.save();
    res.json({ data: trip });
  } catch (error) { next(error); }
});

router.get("/finance", async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(`${String(req.query.to)}T23:59:59.999`) : new Date();
    const transactions: any[] = await ServiceFinanceTransaction.find({ transactionDate: { $gte: from, $lte: to } }).populate("customer", "customerNumber fullName businessName phone").populate("worker", "fullName vehicleRegistration").sort({ transactionDate: -1, createdAt: -1 }).lean();
    const confirmed = transactions.filter((x) => x.status === "confirmed");
    const recordedPayments = confirmed.filter((x) => x.transactionType === "payment").reduce((s, x) => s + Number(x.amount), 0);
    const expenses = confirmed.filter((x) => x.transactionType === "expense").reduce((s, x) => s + Number(x.amount), 0);
    const hires: any[] = await ScaffoldHire.find({ status: { $ne: "cancelled" } }).populate("customer", "customerNumber fullName businessName phone").sort({ startDate: -1 }).lean();
    const hireIds = hires.map((hire) => hire._id);
    const paidByHire = await ServiceFinanceTransaction.aggregate([
      { $match: { transactionType: "payment", status: "confirmed", referenceType: "scaffold_hire", referenceId: { $in: hireIds } } },
      { $group: { _id: "$referenceId", paid: { $sum: "$amount" } } },
    ]);
    const paidMap = new Map(paidByHire.map((entry: any) => [String(entry._id), Number(entry.paid || 0)]));
    const hireAccounts = hires.map((hire) => {
      const total = Number(hire.hireSubtotal || 0); const deposit = Math.min(total, Number(hire.deposit || 0)); const paid = deposit + (paidMap.get(String(hire._id)) || 0);
      return { _id: hire._id, hireNumber: hire.hireNumber, customer: hire.customer, startDate: hire.startDate, createdAt: hire.createdAt, siteName: hire.siteName, siteAddress: hire.siteAddress, status: hire.status, total, deposit, paid, balance: Math.max(0, total - paid) };
    });
    const trips: any[] = await TransportTrip.find({ status: { $ne: "cancelled" }, amountCharged: { $gt: 0 } }).populate("driver", "fullName phone").populate("customer", "customerNumber fullName businessName phone").sort({ departureAt: -1 }).lean();
    const tripIds = trips.map((trip) => trip._id);
    const paidByTrip = await ServiceFinanceTransaction.aggregate([{ $match: { transactionType: "payment", status: "confirmed", referenceType: "transport", referenceId: { $in: tripIds } } }, { $group: { _id: "$referenceId", paid: { $sum: "$amount" } } }]);
    const tripPaidMap = new Map(paidByTrip.map((entry: any) => [String(entry._id), Number(entry.paid || 0)]));
    const transportAccounts = trips.map((trip) => { const total = Number(trip.amountCharged || 0); const paid = tripPaidMap.get(String(trip._id)) || 0; return { _id: trip._id, tripNumber: trip.tripNumber, customer: trip.customer, contactName: trip.contactName, contactPhone: trip.contactPhone, departureAt: trip.departureAt, origin: trip.origin, destination: trip.destination, status: trip.status, total, paid, balance: Math.max(0, total - paid) }; });
    // Deposits are represented in the initial hire record; attribute them to
    // the hire creation date so they are counted as received in that period.
    const hiresCreatedInPeriod = hires.filter((hire) => new Date(hire.createdAt || hire.startDate) >= from && new Date(hire.createdAt || hire.startDate) <= to);
    const deposits = hiresCreatedInPeriod.reduce((sum, account) => sum + Number(account.deposit || 0), 0);
    const payments = recordedPayments + deposits;
    const scaffoldReceivables = hireAccounts.reduce((sum, account) => sum + account.balance, 0); const transportReceivables = transportAccounts.reduce((sum, account) => sum + account.balance, 0);
    const scaffoldPayments = deposits + confirmed.filter((x) => x.transactionType === "payment" && (x.businessUnit === "scaffolding" || x.referenceType === "scaffold_hire")).reduce((sum, x) => sum + Number(x.amount), 0);
    const transportPayments = confirmed.filter((x) => x.transactionType === "payment" && (x.businessUnit === "transport" || x.referenceType === "transport")).reduce((sum, x) => sum + Number(x.amount), 0);
    const scaffoldExpenses = confirmed.filter((x) => x.transactionType === "expense" && x.businessUnit === "scaffolding").reduce((sum, x) => sum + Number(x.amount), 0);
    const transportExpenses = confirmed.filter((x) => x.transactionType === "expense" && x.businessUnit === "transport").reduce((sum, x) => sum + Number(x.amount), 0);
    const drivers: any[] = await ServiceWorker.find({ businessUnit: "transport" }).select("fullName vehicleRegistration").lean();
    const driverMap = new Map(drivers.map((driver) => [String(driver._id), driver]));
    const receivables = scaffoldReceivables + transportReceivables;
    const driverCollected = new Map<string, { driverId: string; driverName: string; vehicleRegistration: string; trips: number; charged: number; received: number; expenses: number; net: number }>();
    const reportTrips: any[] = await TransportTrip.find({ status: { $ne: "cancelled" }, departureAt: { $gte: from, $lte: to } }).populate("driver", "fullName phone").sort({ departureAt: -1 }).lean();
    const reportTripIds = reportTrips.map((trip) => trip._id);
    const receiptsByTrip = await ServiceFinanceTransaction.aggregate([
      { $match: { transactionType: "payment", status: "confirmed", referenceType: "transport", referenceId: { $in: reportTripIds }, transactionDate: { $gte: from, $lte: to } } },
      { $group: { _id: "$referenceId", received: { $sum: "$amount" } } },
    ]);
    const receiptsMap = new Map(receiptsByTrip.map((entry: any) => [String(entry._id), Number(entry.received || 0)]));
    const transportCostEntries: any[] = await ServiceFinanceTransaction.find({ transactionType: "expense", status: "confirmed", businessUnit: "transport", transactionDate: { $gte: from, $lte: to } }).lean();
    for (const expense of transportCostEntries) {
      if (!expense.worker && expense.referenceType === "transport") continue;
      const id = String(expense.worker || "unassigned");
      const worker: any = driverMap.get(id);
      const row = driverCollected.get(id) || { driverId: id, driverName: worker?.fullName || "Unassigned Rifan expense", vehicleRegistration: expense.vehicleRegistration || worker?.vehicleRegistration || "—", trips: 0, charged: 0, received: 0, expenses: 0, net: 0 };
      row.expenses += Number(expense.amount || 0);
      driverCollected.set(id, row);
    }
    for (const trip of reportTrips) {
      const id = String((trip.driver as any)?._id || trip.driver || trip.driverName || "unknown");
      const driverName = String(trip.driverName || (trip.driver as any)?.fullName || "Unknown driver");
      const row = driverCollected.get(id) || { driverId: id, driverName, vehicleRegistration: trip.vehicleRegistration, trips: 0, charged: 0, received: 0, expenses: 0, net: 0 };
      row.trips += 1; row.charged += Number(trip.amountCharged || 0); row.received += receiptsMap.get(String(trip._id)) || 0;
      driverCollected.set(id, row);
    }
    for (const row of driverCollected.values()) row.net = row.charged - row.expenses;
    const scaffoldCollectedInPeriod = confirmed.filter((x) => x.transactionType === "payment" && (x.businessUnit === "scaffolding" || x.referenceType === "scaffold_hire")).reduce((sum, x) => sum + Number(x.amount), 0);
    const transportCollectedInPeriod = confirmed.filter((x) => x.transactionType === "payment" && (x.businessUnit === "transport" || x.referenceType === "transport")).reduce((sum, x) => sum + Number(x.amount), 0);
    res.json({ data: { transactions, hireAccounts, transportAccounts, reportTrips, driverSummary: [...driverCollected.values()], summary: { payments, recordedPayments, deposits, expenses, receivables, netCashFlow: payments - expenses, units: { scaffolding: { payments: scaffoldPayments, expenses: scaffoldExpenses, receivables: scaffoldReceivables, netCashFlow: scaffoldPayments - scaffoldExpenses }, transport: { payments: transportPayments, expenses: transportExpenses, receivables: transportReceivables, netCashFlow: transportPayments - transportExpenses } }, collectedInPeriod: { scaffolding: scaffoldCollectedInPeriod + deposits, transport: transportCollectedInPeriod } } } });
  } catch (error) { next(error); }
});

router.post("/finance/payments", async (req: any, res, next) => {
  try {
    const amount = n(req.body?.amount); if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const referenceType = String(req.body?.referenceType || "");
    if (!['scaffold_hire', 'transport'].includes(referenceType) || !mongoose.Types.ObjectId.isValid(req.body?.referenceId)) throw new Error("Select the hire or transport trip being paid.");
    const source: any = referenceType === "scaffold_hire" ? await ScaffoldHire.findById(req.body.referenceId) : await TransportTrip.findById(req.body.referenceId);
    if (!source || source.status === "cancelled") throw new Error("Selected service record is not available for payment.");
    const total = referenceType === "scaffold_hire" ? Number(source.hireSubtotal || 0) : Number(source.amountCharged || 0);
    const deposit = referenceType === "scaffold_hire" ? Math.min(total, Number(source.deposit || 0)) : 0;
    const paidResult = await ServiceFinanceTransaction.aggregate([{ $match: { transactionType: "payment", status: "confirmed", referenceType, referenceId: source._id } }, { $group: { _id: null, paid: { $sum: "$amount" } } }]);
    const paid = deposit + Number(paidResult[0]?.paid || 0); const balance = Math.max(0, total - paid);
    if (amount > balance) throw new Error(`Payment exceeds the remaining balance of ${balance.toLocaleString("en-RW")} RWF.`);
    const sourceNumber = referenceType === "scaffold_hire" ? source.hireNumber : source.tripNumber;
    const transaction = await ServiceFinanceTransaction.create({ ...req.body, transactionNumber: await sequence("SP", ServiceFinanceTransaction, "transactionNumber"), transactionType: "payment", customer: source.customer || null, businessUnit: referenceType === "scaffold_hire" ? "scaffolding" : "transport", referenceType, referenceId: source._id, referenceNumber: sourceNumber, amount, description: String(req.body?.description || `Payment for ${sourceNumber}`), createdBy: req.user?.id });
    res.status(201).json({ data: transaction });
  } catch (error) { next(error); }
});

router.post("/finance/expenses", async (req: any, res, next) => {
  try {
    const amount = n(req.body?.amount); if (amount <= 0) throw new Error("Expense amount must be greater than zero.");
    if (!String(req.body?.category || "").trim()) throw new Error("Select an expense category.");
    const businessUnit = String(req.body?.businessUnit || "general");
    let worker: any = null;
    let vehicleRegistration = String(req.body?.vehicleRegistration || "").trim().toUpperCase();
    if (businessUnit === "transport" && req.body?.worker) {
      if (!mongoose.Types.ObjectId.isValid(req.body.worker)) throw new Error("Select a registered Rifan driver.");
      worker = await ServiceWorker.findOne({ _id: req.body.worker, businessUnit: "transport" }).lean();
      if (!worker) throw new Error("Select a valid Rifan driver.");
      vehicleRegistration = worker.vehicleRegistration;
    }
    const transactionDate = req.body?.transactionDate ? new Date(req.body.transactionDate) : new Date();
    if (!Number.isFinite(transactionDate.getTime())) throw new Error("Enter a valid expense date.");
    const transaction = await ServiceFinanceTransaction.create({ ...req.body, transactionNumber: await sequence("SE", ServiceFinanceTransaction, "transactionNumber"), transactionType: "expense", businessUnit, worker: worker?._id || null, vehicleRegistration, transactionDate, amount, description: String(req.body?.description || req.body.category), customer: null, createdBy: req.user?.id });
    res.status(201).json({ data: transaction });
  } catch (error) { next(error); }
});

router.patch("/finance/:id/reverse", async (req: any, res, next) => {
  try {
    if (req.user?.role !== "superadmin") return res.status(403).json({ message: "Only a SuperAdmin can reverse a finance transaction." });
    const transaction = await ServiceFinanceTransaction.findByIdAndUpdate(req.params.id, { status: "reversed", notes: String(req.body?.reason || "Reversed by SuperAdmin") }, { new: true });
    if (!transaction) throw new Error("Finance transaction not found."); res.json({ data: transaction });
  } catch (error) { next(error); }
});

export default router;
