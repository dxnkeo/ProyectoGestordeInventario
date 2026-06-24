const mockConfig = {
  analyticsEventsUrl: "",
  analyticsApiKey: "",
  eventMaxAttempts: 5,
  eventRequestTimeoutMs: 10000,
};

jest.mock("../../config/config", () => ({ config: mockConfig }));

import { Prisma, EventStatus } from "@prisma/client";
import prismaMock from "../__mocks__/prismaClient";
import * as eventService from "../../services/event.service";
import { NotFoundError } from "../../utils/errors";

describe("eventService.enqueueEvent", () => {
  beforeEach(() => {
    mockConfig.analyticsEventsUrl = "";
  });

  it("crea un evento en outbox", async () => {
    prismaMock.outboundEvent.create.mockResolvedValueOnce({ id: "ev-1" } as any);
    await eventService.enqueueEvent("stock_received", { sku_id: "SKU-1", quantity: 5 });
    expect(prismaMock.outboundEvent.create).toHaveBeenCalled();
  });

  it("ignora duplicados por idempotencyKey (P2002)", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    prismaMock.outboundEvent.create.mockRejectedValueOnce(p2002);
    await expect(
      eventService.enqueueEvent("stock_received", { sku_id: "SKU-1" }, "key-1")
    ).resolves.toBeUndefined();
  });

  it("traga errores genéricos sin lanzar", async () => {
    prismaMock.outboundEvent.create.mockRejectedValueOnce(new Error("DB down"));
    await expect(
      eventService.enqueueEvent("stock_received", { sku_id: "SKU-1" })
    ).resolves.toBeUndefined();
  });
});

describe("eventService.emit helpers", () => {
  beforeEach(() => {
    prismaMock.outboundEvent.create.mockResolvedValue({ id: "ev-1" } as any);
  });

  it("emitStockMovement encola con idempotencyKey si hay movementId", async () => {
    await eventService.emitStockMovement({
      eventType: "stock_received",
      sku: "SKU-1",
      locationId: "loc-1",
      quantity: 10,
      movementId: "mov-1",
    });
    expect(prismaMock.outboundEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: "stock_received:mov-1" }),
      })
    );
  });

  it("emitStockReserved encola evento stock_reserved", async () => {
    await eventService.emitStockReserved({
      reservationId: 42,
      sku: "SKU-1",
      locationId: "loc-1",
      quantity: 3,
      orderId: "order-uuid",
    });
    expect(prismaMock.outboundEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "stock_reserved" }) })
    );
  });

  it("emitStockReleased encola evento stock_released", async () => {
    await eventService.emitStockReleased({
      reservationId: 7,
      sku: "SKU-1",
      locationId: "loc-1",
      quantity: 2,
      reason: "EXPIRED",
    });
    expect(prismaMock.outboundEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "stock_released" }) })
    );
  });

  it("emitCriticalThreshold encola evento critical_threshold_reached", async () => {
    await eventService.emitCriticalThreshold({
      alertId: "alert-1",
      sku: "SKU-1",
      locationId: "loc-1",
      currentStock: 2,
      minStock: 10,
    });
    expect(prismaMock.outboundEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "critical_threshold_reached" }),
      })
    );
  });
});

describe("eventService.listOutboundEvents", () => {
  it("lista todos los eventos sin filtro", async () => {
    prismaMock.outboundEvent.findMany.mockResolvedValueOnce([{ id: "ev-1" }] as any);
    const result = await eventService.listOutboundEvents();
    expect(result).toHaveLength(1);
    expect(prismaMock.outboundEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });

  it("filtra por status", async () => {
    prismaMock.outboundEvent.findMany.mockResolvedValueOnce([] as any);
    await eventService.listOutboundEvents(EventStatus.FAILED);
    expect(prismaMock.outboundEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: EventStatus.FAILED } })
    );
  });
});

describe("eventService.processPendingEvents", () => {
  beforeEach(() => {
    mockConfig.analyticsEventsUrl = "";
    mockConfig.analyticsApiKey = "test-key";
  });

  it("retorna 0 si no hay URL de analítica configurada", async () => {
    const count = await eventService.processPendingEvents();
    expect(count).toBe(0);
  });

  it("envía eventos pendientes y marca como SENT", async () => {
    mockConfig.analyticsEventsUrl = "http://analytics.test/events";
    const pendingEvent = {
      id: "ev-1",
      eventType: "stock_received",
      payload: { sku_id: "SKU-1" },
      attempts: 0,
      maxAttempts: 5,
    };
    prismaMock.outboundEvent.findMany.mockResolvedValueOnce([pendingEvent] as any);
    prismaMock.outboundEvent.update.mockResolvedValueOnce({} as any);

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const count = await eventService.processPendingEvents();
    expect(count).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://analytics.test/events",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Api-Key": "test-key" }),
      })
    );
    expect(prismaMock.outboundEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: EventStatus.SENT }),
      })
    );
  });

  it("marca FAILED con backoff si el POST falla", async () => {
    mockConfig.analyticsEventsUrl = "http://analytics.test/events";
    const pendingEvent = {
      id: "ev-2",
      eventType: "stock_dispatched",
      payload: {},
      attempts: 1,
      maxAttempts: 5,
    };
    prismaMock.outboundEvent.findMany.mockResolvedValueOnce([pendingEvent] as any);
    prismaMock.outboundEvent.update.mockResolvedValueOnce({} as any);

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "error" });

    const count = await eventService.processPendingEvents();
    expect(count).toBe(0);
    expect(prismaMock.outboundEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EventStatus.FAILED,
          attempts: 2,
        }),
      })
    );
  });

  it("marca DEAD cuando se agotan los reintentos", async () => {
    mockConfig.analyticsEventsUrl = "http://analytics.test/events";
    const pendingEvent = {
      id: "ev-3",
      eventType: "stock_adjusted",
      payload: {},
      attempts: 4,
      maxAttempts: 5,
    };
    prismaMock.outboundEvent.findMany.mockResolvedValueOnce([pendingEvent] as any);
    prismaMock.outboundEvent.update.mockResolvedValueOnce({} as any);

    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await eventService.processPendingEvents();
    expect(prismaMock.outboundEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: EventStatus.DEAD, attempts: 5 }),
      })
    );
  });
});

describe("eventService.retryEvent", () => {
  it("reencola evento existente", async () => {
    prismaMock.outboundEvent.findUnique.mockResolvedValueOnce({ id: "ev-1" } as any);
    prismaMock.outboundEvent.update.mockResolvedValueOnce({ id: "ev-1", status: "PENDING" } as any);
    const result = await eventService.retryEvent("ev-1");
    expect(result.status).toBe("PENDING");
  });

  it("lanza NotFoundError si el evento no existe", async () => {
    prismaMock.outboundEvent.findUnique.mockResolvedValueOnce(null);
    await expect(eventService.retryEvent("no-existe")).rejects.toThrow(NotFoundError);
  });
});
