import {
  Router,
} from "express";

import {
  createRawMaterialController,
  getRawMaterialsController,
  getRawMaterialByIdController,
  updateRawMaterialController,
  deleteRawMaterialController,
} from "./rawMaterial.controller";

const router = Router();

router.post(
  "/",
  createRawMaterialController
);

router.get(
  "/",
  getRawMaterialsController
);

router.get(
  "/:id",
  getRawMaterialByIdController
);

router.put(
  "/:id",
  updateRawMaterialController
);

router.delete(
  "/:id",
  deleteRawMaterialController
);

export default router;