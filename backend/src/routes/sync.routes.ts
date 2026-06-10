// ============================================================
// Rutas: Sync (Sincronización entre almacenes)
// GET  /sync/balance   → análisis de desequilibrio
// POST /sync/transfer  → ejecutar transferencia de balanceo
// SCRUM-68
// ============================================================

import { Router } from "express";
import { body } from "express-validator";
import * as syncController from "../controllers/sync.controller";
import { validateRequest } from "../middlewares/validateRequest";

const router: Router = Router();

const transferRules = [
  body("productId").notEmpty().isUUID().withMessage("productId debe ser un UUID válido."),
  body("sourceLocationId").notEmpty().isUUID().withMessage("sourceLocationId debe ser un UUID válido."),
  body("destinationLocationId").notEmpty().isUUID().withMessage("destinationLocationId debe ser un UUID válido."),
  body("quantity").isInt({ min: 1 }).withMessage("quantity debe ser un entero mayor a cero."),
];

router.get("/balance", syncController.getBalance);
router.post("/transfer", transferRules, validateRequest, syncController.executeTransfer);

export default router;
