import { Request, Response, NextFunction } from "express";
import { listEvents, retryFailedEvent } from "../../controllers/event.controller";
import * as eventService from "../../services/event.service";
import { NotFoundError } from "../../utils/errors";

jest.mock("../../services/event.service");
const mockSvc = eventService as jest.Mocked<typeof eventService>;

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const next: NextFunction = jest.fn();

describe("eventController.listEvents", () => {
  it("lista eventos sin filtro", async () => {
    mockSvc.listOutboundEvents.mockResolvedValueOnce([]);
    const res = mockRes();
    await listEvents({ query: {} } as Request, res, next);
    expect(mockSvc.listOutboundEvents).toHaveBeenCalledWith(undefined);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("filtra por status", async () => {
    mockSvc.listOutboundEvents.mockResolvedValueOnce([]);
    await listEvents({ query: { status: "failed" } } as unknown as Request, mockRes(), next);
    expect(mockSvc.listOutboundEvents).toHaveBeenCalledWith("FAILED");
  });

  it("propaga error al next", async () => {
    mockSvc.listOutboundEvents.mockRejectedValueOnce(new Error("DB"));
    await listEvents({ query: {} } as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("eventController.retryFailedEvent", () => {
  it("reencola evento y responde 200", async () => {
    mockSvc.retryEvent.mockResolvedValueOnce({ id: "ev-1", status: "PENDING" } as any);
    const res = mockRes();
    await retryFailedEvent({ params: { id: "ev-1" } } as unknown as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("propaga NotFoundError al next", async () => {
    mockSvc.retryEvent.mockRejectedValueOnce(new NotFoundError("Evento"));
    await retryFailedEvent({ params: { id: "no-existe" } } as unknown as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});
