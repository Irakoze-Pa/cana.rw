import { Router } from "express";
import * as controller from "./supplierMaterial.controller";
import { authorizeArea, protect } from "../../middleware/auth.middleware";

const router = Router();
router.use(protect, authorizeArea("procurement"));

router.get("/", controller.list);
router.post("/", controller.create);
router.post("/bulk", controller.saveMany);
router.patch("/:id", controller.update);

export default router;
