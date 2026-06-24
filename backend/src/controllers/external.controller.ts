// ============================================================
// Controlador: External (integraciones Grupo 3 — Pedidos)
// ============================================================

import { Request, Response, NextFunction } from "express";
import { ReservationStatus } from "@prisma/client";
import * as stockService from "../services/stock.service";
import * as reservationService from "../services/reservation.service";
import { sendSuccess } from "../utils/response";
import {
  CreateReservationDto,
  ReleaseReservationDto,
} from "../utils/types";

/**
 * GET /external/stock/:sku — Disponibilidad por SKU en todas las ubicaciones
 */
export const getStockBySku = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sku = req.params.sku as string;
    const items = await stockService.getStockBySku(sku);
    sendSuccess(
      res,
      items,
      `Stock para SKU "${sku.trim().toUpperCase()}": ${items.length} ubicación(es).`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /external/stock/:sku/locations/:locationId — Disponibilidad en una ubicación
 */
export const getStockBySkuAndLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sku = req.params.sku as string;
    const locationId = req.params.locationId as string;
    const item = await stockService.getStockBySkuAndLocation(sku, locationId);
    sendSuccess(res, item, "Stock consultado exitosamente.");
  } catch (error) {
    next(error);
  }
};

/**
 * POST /external/reservations — Crear reserva (ubicación automática si no se envía)
 */
export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto: CreateReservationDto = {
      orderId: req.body.orderId,
      sku: req.body.sku,
      locationId: req.body.locationId,
      quantity: req.body.quantity,
      expiresAt: req.body.expiresAt,
    };

    const result = await reservationService.createReservation(dto);

    sendSuccess(res, result, "Reserva creada exitosamente.", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /external/release-reservation — Liberar reserva (pago fallido / cancelación)
 */
export const releaseReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto: ReleaseReservationDto = {
      reservationId: req.body.reservationId,
    };

    const result = await reservationService.cancelAndReleaseReservation(dto);

    sendSuccess(
      res,
      result,
      result.alreadyReleased
        ? "La reserva ya estaba liberada."
        : "Reserva cancelada y liberada. Stock disponible actualizado."
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /external/reservations — Listar reservas (filtro ?status=ACTIVE)
 */
export const getReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const statusParam = req.query.status as string | undefined;
    const status = statusParam
      ? (statusParam.toUpperCase() as ReservationStatus)
      : undefined;

    const reservations = await reservationService.getAllReservations(status);

    sendSuccess(
      res,
      reservations,
      `Se encontraron ${reservations.length} reservas.`
    );
  } catch (error) {
    next(error);
  }
};
