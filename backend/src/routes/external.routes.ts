// ============================================================
// Rutas: External (integraciones con otros proyectos)
// GET    /external/stock/:sku                              → Grupo 3 consulta stock
// GET    /external/stock/:sku/locations/:locationId        → Grupo 3 stock por ubicación
// POST   /external/reservations                            → Grupo 3 crear reserva
// POST   /external/release-reservation                     → Grupo 3 liberar reserva
// GET    /external/reservations                            → Grupo 3 listar reservas
// PATCH  /external/reservations/:id/confirm-delivery       → SCRUM-33 (Proyecto 2)
// POST   /external/payment-confirmed                       → SCRUM-31
// ============================================================

import { Router } from "express";
import { body, param, query } from "express-validator";
import * as externalController from "../controllers/external.controller";
import * as reservationController from "../controllers/reservation.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { validateApiKey } from "../middlewares/validateApiKey";

const router: ReturnType<typeof Router> = Router();

router.use(validateApiKey);

const skuParamRule = param("sku")
  .trim()
  .notEmpty()
  .withMessage("El SKU es requerido.");

const locationIdParamRule = param("locationId")
  .isUUID()
  .withMessage("locationId debe ser un UUID válido.");

const createReservationRules = [
  body("orderId")
    .isString()
    .notEmpty()
    .isUUID(4)
    .withMessage("orderId debe ser un UUID v4 válido."),
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("El SKU es requerido."),
  body("locationId")
    .optional()
    .trim()
    .isUUID()
    .withMessage("locationId debe ser un UUID válido."),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("quantity debe ser un entero mayor a cero."),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("expiresAt debe ser una fecha ISO 8601 válida."),
];

const releaseReservationRules = [
  body("reservationId")
    .isInt({ min: 1 })
    .withMessage("reservationId debe ser un entero positivo."),
];

const listReservationRules = [
  query("status")
    .optional()
    .isIn(["ACTIVE", "RELEASED", "SOLD", "EXPIRED"])
    .withMessage("status debe ser ACTIVE, RELEASED, SOLD o EXPIRED."),
];

router.get(
  "/stock/:sku/locations/:locationId",
  skuParamRule,
  locationIdParamRule,
  validateRequest,
  externalController.getStockBySkuAndLocation
);

router.get(
  "/stock/:sku",
  skuParamRule,
  validateRequest,
  externalController.getStockBySku
);

router.post(
  "/reservations",
  createReservationRules,
  validateRequest,
  externalController.createReservation
);

router.get(
  "/reservations",
  listReservationRules,
  validateRequest,
  externalController.getReservations
);

router.post(
  "/release-reservation",
  releaseReservationRules,
  validateRequest,
  externalController.releaseReservation
);

const confirmDeliveryRules = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("El ID de reserva debe ser un entero positivo."),
  body("deliveredAt")
    .optional()
    .isISO8601()
    .withMessage("deliveredAt debe ser una fecha ISO 8601 válida."),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("La nota no puede superar 255 caracteres."),
];

router.patch(
  "/reservations/:id/confirm-delivery",
  confirmDeliveryRules,
  validateRequest,
  reservationController.confirmDelivery
);

const paymentConfirmedRules = [
  body("reservationId")
    .isInt({ min: 1 })
    .withMessage("reservationId debe ser un entero positivo."),
  body("orderId")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("orderId debe ser una cadena no vacía."),
];

router.post(
  "/payment-confirmed",
  paymentConfirmedRules,
  validateRequest,
  reservationController.paymentConfirmed
);

export default router;
