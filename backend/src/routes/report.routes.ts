import { Router } from "express";
import { body, query } from "express-validator";
import * as reconciliationController from "../controllers/reconciliation.controller";
import { validateRequest } from "../middlewares/validateRequest";

const router: ReturnType<typeof Router> = Router();

const periodQuery = query("period")
  .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  .withMessage('period debe ser "YYYY-MM".');

router.get(
  "/reconciliation",
  periodQuery,
  validateRequest,
  reconciliationController.getReconciliation
);

router.get(
  "/reconciliation/export",
  periodQuery,
  validateRequest,
  reconciliationController.exportReconciliation
);

router.post(
  "/physical-counts",
  [
    body("sku").trim().notEmpty(),
    body("locationId").isUUID(),
    body("countedQty").isInt({ min: 0 }),
    body("period").matches(/^\d{4}-(0[1-9]|1[0-2])$/),
    body("countedBy").optional().trim(),
    body("note").optional().trim(),
  ],
  validateRequest,
  reconciliationController.createPhysicalCount
);

router.post(
  "/reconciliation/regularize",
  [
    body("productId").isUUID(),
    body("locationId").isUUID(),
    body("period").matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  ],
  validateRequest,
  reconciliationController.regularize
);

export default router;
