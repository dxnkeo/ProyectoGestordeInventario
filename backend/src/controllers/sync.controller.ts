// ============================================================
// Controlador: Sync (Sincronización entre almacenes)
// SCRUM-68
// ============================================================

import { Request, Response, NextFunction } from "express";
import * as syncService from "../services/sync.service";
import { sendSuccess } from "../utils/response";

/**
 * GET /sync/balance
 * Devuelve análisis de desequilibrio de stock por producto entre ubicaciones.
 */
export const getBalance = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const balance = await syncService.getStockBalance();
    sendSuccess(res, balance, `${balance.length} producto(s) con desequilibrio de stock detectado(s).`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /sync/transfer
 * Ejecuta la transferencia de balanceo sugerida entre dos ubicaciones.
 */
export const executeTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, sourceLocationId, destinationLocationId, quantity } = req.body as {
      productId: string;
      sourceLocationId: string;
      destinationLocationId: string;
      quantity: number;
    };
    const result = await syncService.executeSuggestedTransfer({
      productId,
      sourceLocationId,
      destinationLocationId,
      quantity,
    });
    sendSuccess(res, result, "Transferencia de sincronización ejecutada exitosamente.", 201);
  } catch (error) {
    next(error);
  }
};
