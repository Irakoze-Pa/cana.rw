import { Router } from "express";
import * as controller from "./supplierMaterial.controller";

const router = Router();

router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.saveMany);
router.patch("/:id", controller.update);

export default router;
