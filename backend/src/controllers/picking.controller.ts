// ============================================================
// Controlador: Picking
// SCRUM-70: Lista de picking consolidada por lotes
// ============================================================

import { Request, Response, NextFunction } from "express";
import * as pickingService from "../services/picking.service";
import { sendSuccess } from "../utils/response";

/**
 * GET /picking?orderIds=id1,id2,id3
 * Genera lista de picking consolidada para las órdenes indicadas.
 */
export const getBatchPickList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = req.query.orderIds as string | undefined;
    const orderIds = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const result = await pickingService.getBatchPickList(orderIds);
    sendSuccess(
      res,
      result,
      `Lista de picking generada: ${result.validOrders} orden(es), ${result.totalUnits} unidades, ${result.groups.length} ubicación(es).`
    );
  } catch (error) {
    next(error);
  }
};
