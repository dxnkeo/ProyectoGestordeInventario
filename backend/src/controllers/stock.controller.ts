// ============================================================
// Controlador: Stock
// Delega toda la lógica al servicio; solo maneja HTTP
// ============================================================

import { Request, Response, NextFunction } from "express";
import * as stockService from "../services/stock.service";
import { sendSuccess } from "../utils/response";

/**
 * GET /stock
 * Lista todo el stock del sistema (todos los productos en todas las ubicaciones)
 */
export const getAllStock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stocks = await stockService.getAllStock();

    sendSuccess(res, stocks, `Se encontraron ${stocks.length} registros de stock.`);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /stock/:locationId
 * Lista el stock de una ubicación específica
 */
/**
 * GET /stock/suggest-source/:productId?quantity=N
 * SCRUM-69: Sugiere ubicaciones fuente ordenadas por prioridad
 */
export const suggestSource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params;
    const quantity = req.query.quantity ? parseInt(req.query.quantity as string, 10) : 1;
    const suggestions = await stockService.suggestSourceLocation(productId, quantity);
    sendSuccess(res, suggestions, `${suggestions.length} ubicación(es) disponible(s) ordenadas por prioridad.`);
  } catch (error) {
    next(error);
  }
};

export const getStockByLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const locationId = req.params.locationId as string;
    const result = await stockService.getStockByLocation(locationId);

    sendSuccess(
      res,
      result,
      `Stock de "${result.location.name}": ${result.stocks.length} productos.`
    );
  } catch (error) {
    next(error);
  }
};
