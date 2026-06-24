import { Request, Response, NextFunction } from "express";
import {
  getReconciliation,
  exportReconciliation,
  createPhysicalCount,
  regularize,
} from "../../controllers/reconciliation.controller";
import * as reconciliationService from "../../services/reconciliation.service";
import { ValidationError, NotFoundError } from "../../utils/errors";

jest.mock("../../services/reconciliation.service");
const mockSvc = reconciliationService as jest.Mocked<typeof reconciliationService>;

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};
const next: NextFunction = jest.fn();

describe("reconciliationController.getReconciliation", () => {
  it("retorna reporte de conciliación", async () => {
    mockSvc.getReconciliationReport.mockResolvedValueOnce([]);
    const res = mockRes();
    await getReconciliation({ query: { period: "2026-06" } } as unknown as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSvc.getReconciliationReport).toHaveBeenCalledWith("2026-06");
  });

  it("propaga error al next", async () => {
    mockSvc.getReconciliationReport.mockRejectedValueOnce(new ValidationError("period inválido"));
    await getReconciliation({ query: { period: "bad" } } as unknown as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});

describe("reconciliationController.exportReconciliation", () => {
  it("envía CSV como attachment", async () => {
    mockSvc.exportReconciliationCsv.mockResolvedValueOnce("periodo,sku\n");
    const res = mockRes();
    await exportReconciliation({ query: { period: "2026-06" } } as unknown as Request, res, next);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.send).toHaveBeenCalledWith("periodo,sku\n");
  });

  it("propaga error al next", async () => {
    mockSvc.exportReconciliationCsv.mockRejectedValueOnce(new Error("fail"));
    await exportReconciliation({ query: {} } as unknown as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("reconciliationController.createPhysicalCount", () => {
  it("registra conteo y responde 201", async () => {
    mockSvc.upsertPhysicalCount.mockResolvedValueOnce({ id: "c1", countedQty: 10 } as any);
    const res = mockRes();
    await createPhysicalCount({
      body: { sku: "SKU-1", locationId: "l1", countedQty: 10, period: "2026-06" },
    } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("propaga NotFoundError al next", async () => {
    mockSvc.upsertPhysicalCount.mockRejectedValueOnce(new NotFoundError("SKU"));
    await createPhysicalCount({ body: {} } as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe("reconciliationController.regularize", () => {
  it("regulariza diferencia y responde 200", async () => {
    mockSvc.regularizeDifference.mockResolvedValueOnce({
      adjusted: true,
      message: "",
    } as any);
    const res = mockRes();
    await regularize({
      body: { productId: "p1", locationId: "l1", period: "2026-06" },
    } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("usa mensaje cuando no hay ajuste", async () => {
    mockSvc.regularizeDifference.mockResolvedValueOnce({
      adjusted: false,
      message: "No hay diferencia que regularizar.",
    });
    const res = mockRes();
    await regularize({
      body: { productId: "p1", locationId: "l1", period: "2026-06" },
    } as Request, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No hay diferencia que regularizar." })
    );
  });

  it("propaga error al next", async () => {
    mockSvc.regularizeDifference.mockRejectedValueOnce(new NotFoundError("Conteo"));
    await regularize({ body: {} } as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});
