import { Router } from "express";
import { authorizeArea, protect } from "../../middleware/auth.middleware";
import Proforma from "./proforma.model";

const router = Router();
router.use(protect, authorizeArea("sales"));

router.get("/", async (_req, res, next) => {
  try {
    res.json({ data: await Proforma.find().sort({ updatedAt: -1 }).lean() });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = req.body || {};
    if (!data.proformaNumber || !data.client?.name || !data.lines?.length) {
      throw new Error("Proforma number, client, and at least one line are required.");
    }
    const total = data.lines.reduce(
      (sum: number, line: { quantity?: number; unitPrice?: number }) =>
        sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
      0,
    );
    res.status(201).json({ data: await Proforma.create({ ...data, total }) });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const data = req.body || {};
    const total = (data.lines || []).reduce(
      (sum: number, line: { quantity?: number; unitPrice?: number }) =>
        sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
      0,
    );
    const proforma = await Proforma.findByIdAndUpdate(
      req.params.id,
      { ...data, total },
      { new: true, runValidators: true },
    );
    if (!proforma) {
      return res.status(404).json({ error: { message: "Proforma not found." } });
    }
    res.json({ data: proforma });
  } catch (error) {
    next(error);
  }
});

export default router;
