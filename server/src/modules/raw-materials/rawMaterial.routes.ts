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
import * as lotController from "./rawMaterialLot.controller";

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
  "/:id/lots",
  lotController.list
);

router.post(
  "/:id/lots",
  lotController.create
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
