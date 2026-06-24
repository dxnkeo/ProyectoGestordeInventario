import { Request, Response, NextFunction } from "express";
import * as reconciliationService from "../services/reconciliation.service";
import { sendSuccess } from "../utils/response";

export const getReconciliation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period = String(req.query.period ?? "");
    const report = await reconciliationService.getReconciliationReport(period);
    sendSuccess(res, report, `Reporte de conciliación ${period}: ${report.length} filas.`);
  } catch (error) {
    next(error);
  }
};

export const exportReconciliation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period = String(req.query.period ?? "");
    const csv = await reconciliationService.exportReconciliationCsv(period);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="conciliacion-${period}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const createPhysicalCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await reconciliationService.upsertPhysicalCount(req.body);
    sendSuccess(res, count, "Conteo físico registrado.", 201);
  } catch (error) {
    next(error);
  }
};

export const regularize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, locationId, period } = req.body as {
      productId: string;
      locationId: string;
      period: string;
    };
    const result = await reconciliationService.regularizeDifference(
      productId,
      locationId,
      period
    );
    sendSuccess(res, result, result.adjusted ? "Diferencia regularizada." : result.message);
  } catch (error) {
    next(error);
  }
};
