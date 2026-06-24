import { Router } from "express";
import { body } from "express-validator";
import * as replenishmentController from "../controllers/replenishment.controller";
import { validateRequest } from "../middlewares/validateRequest";

const router: ReturnType<typeof Router> = Router();

// Rutas de Proveedores
router.get("/suppliers", replenishmentController.getSuppliers);
router.post(
  "/suppliers",
  [
    body("name").notEmpty().withMessage("El nombre es requerido."),
    body("email").isEmail().withMessage("Debe ser un email válido."),
    body("phone").optional().trim(),
  ],
  validateRequest,
  replenishmentController.createSupplier
);

// Rutas de Órdenes de Reposición
router.get("/replenishment", replenishmentController.getReplenishmentOrders);
router.post(
  "/replenishment",
  [
    body("productId").isUUID().withMessage("El ID de producto debe ser un UUID válido."),
    body("locationId").isUUID().withMessage("El ID de ubicación debe ser un UUID válido."),
    body("supplierId").isUUID().withMessage("El ID de proveedor debe ser un UUID válido."),
    body("quantity").isInt({ min: 1 }).withMessage("La cantidad debe ser mayor a 0."),
  ],
  validateRequest,
  replenishmentController.createReplenishmentOrder
);
router.patch(
  "/replenishment/:id/status",
  [
    body("status")
      .isIn(["PROPOSED", "PENDING", "ORDERED", "RECEIVED", "CANCELLED"])
      .withMessage("Estado de orden inválido."),
  ],
  validateRequest,
  replenishmentController.updateReplenishmentOrderStatus
);

router.get("/suggestions", replenishmentController.getSuggestions);

router.post(
  "/proposals",
  [
    body("productId").isUUID(),
    body("locationId").isUUID(),
    body("supplierId").isUUID(),
    body("quantity").isInt({ min: 1 }),
  ],
  validateRequest,
  replenishmentController.createProposal
);

router.patch(
  "/proposals/:id/approve",
  replenishmentController.approveProposal
);

router.post(
  "/simulate",
  [
    body("sku").trim().notEmpty(),
    body("locationId").isUUID(),
    body("horizonDays").optional().isInt({ min: 1, max: 365 }),
    body("scenario").optional().isIn(["normal", "peak", "low"]),
  ],
  validateRequest,
  replenishmentController.simulateDemand
);

export default router;
