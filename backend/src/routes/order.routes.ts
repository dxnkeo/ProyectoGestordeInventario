// ============================================================
// Rutas: Orders (Pedidos de Salida)
// POST  /orders            → crear pedido
// GET   /orders            → listar pedidos
// GET   /orders/:id        → detalle de pedido
// PATCH /orders/:id/status → transicionar estado
// ============================================================

import { Router } from "express";
import { body, param } from "express-validator";
import * as orderController from "../controllers/order.controller";
import { validateRequest } from "../middlewares/validateRequest";

const router = Router();

const ORDER_STATUSES = [
  "PENDING",
  "RESERVED",
  "READY_FOR_DISPATCH",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

// ── Reglas de validación ───────────────────────────────────────────

const createOrderRules = [
  body("customerName")
    .trim()
    .notEmpty().withMessage("El nombre del cliente es requerido.")
    .isLength({ max: 100 }).withMessage("El nombre no puede superar 100 caracteres."),

  body("items")
    .isArray({ min: 1 }).withMessage("El pedido debe tener al menos un ítem."),

  body("items.*.productId")
    .trim()
    .notEmpty().withMessage("El productId de cada ítem es requerido.")
    .isUUID().withMessage("El productId debe ser un UUID válido."),

  body("items.*.locationId")
    .trim()
    .notEmpty().withMessage("El locationId de cada ítem es requerido.")
    .isUUID().withMessage("El locationId debe ser un UUID válido."),

  body("items.*.quantity")
    .notEmpty().withMessage("La cantidad de cada ítem es requerida.")
    .isInt({ min: 1 }).withMessage("La cantidad debe ser un entero mayor a cero."),
];

const updateStatusRules = [
  param("id")
    .isUUID().withMessage("El ID del pedido debe ser un UUID válido."),

  body("status")
    .notEmpty().withMessage("El campo status es requerido.")
    .isIn(ORDER_STATUSES).withMessage(
      `El estado debe ser uno de: ${ORDER_STATUSES.join(", ")}.`
    ),
];

const orderIdRule = [
  param("id")
    .isUUID().withMessage("El ID del pedido debe ser un UUID válido."),
];

// ── Rutas ─────────────────────────────────────────────────────────

router.post("/", createOrderRules, validateRequest, orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderIdRule, validateRequest, orderController.getOrder);
router.patch("/:id/status", updateStatusRules, validateRequest, orderController.updateOrderStatus);

export default router;
