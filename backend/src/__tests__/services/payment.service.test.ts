import prismaMock from "../__mocks__/prismaClient";
import * as reservationService from "../../services/reservation.service";
import * as orderService from "../../services/order.service";
import { AppError } from "../../utils/AppError";

jest.mock("../../services/order.service");

const mockedTransitionOrder = orderService.transitionOrder as jest.MockedFunction<typeof orderService.transitionOrder>;

const makeReservation = (status = "ACTIVE") => ({
  reservationId: 1,
  sku: "SKU-001",
  locationId: "loc-1",
  quantity: 5,
  orderId: "550e8400-e29b-41d4-a716-446655440000",
  status,
  expiresAt: null,
  createdAt: new Date(),
  soldAt: null,
  location: { id: "loc-1", name: "Bodega A" },
});

const makeProduct = () => ({
  id: "prod-1",
  name: "Producto Test",
  sku: "SKU-001",
  minStock: 2,
  createdAt: new Date(),
});

const makeStock = (qty: number) => ({
  id: "stock-1",
  productId: "prod-1",
  locationId: "loc-1",
  quantity: qty,
});

// ── processPaymentConfirmed ───────────────────────────────────

describe("reservationService.processPaymentConfirmed", () => {
  it("happy path: confirma entrega y transiciona la orden", async () => {
    const reservation = makeReservation("ACTIVE");
    const product = makeProduct();
    const stock = makeStock(20);

    prismaMock.reservation.findUnique.mockResolvedValue(reservation as any);
    prismaMock.product.findUnique.mockResolvedValue(product as any);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
      const tx = prismaMock;
      prismaMock.stock.findUnique.mockResolvedValueOnce(stock as any);
      prismaMock.stock.upsert.mockResolvedValueOnce({ ...stock, quantity: 15 } as any);
      prismaMock.movement.create.mockResolvedValueOnce({ id: "mov-1" } as any);
      prismaMock.reservation.update.mockResolvedValueOnce({ ...reservation, status: "SOLD", soldAt: new Date() } as any);
      return fn(tx);
    });
    // For getStockDisponible
    prismaMock.reservation.aggregate.mockResolvedValue({ _sum: { quantity: 0 } } as any);

    mockedTransitionOrder.mockResolvedValueOnce({ id: "order-1", status: "READY_FOR_DISPATCH" } as any);

    const result = await reservationService.processPaymentConfirmed(1, "order-1");

    expect(mockedTransitionOrder).toHaveBeenCalledWith("order-1", "READY_FOR_DISPATCH");
    expect(result.orderTransition?.status).toBe("READY_FOR_DISPATCH");
  });

  it("sin orderId: no llama a transitionOrder", async () => {
    const reservation = makeReservation("ACTIVE");
    const product = makeProduct();
    const stock = makeStock(20);

    prismaMock.reservation.findUnique.mockResolvedValue(reservation as any);
    prismaMock.product.findUnique.mockResolvedValue(product as any);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
      const tx = prismaMock;
      prismaMock.stock.findUnique.mockResolvedValueOnce(stock as any);
      prismaMock.stock.upsert.mockResolvedValueOnce({ ...stock, quantity: 15 } as any);
      prismaMock.movement.create.mockResolvedValueOnce({ id: "mov-1" } as any);
      prismaMock.reservation.update.mockResolvedValueOnce({ ...reservation, status: "SOLD", soldAt: new Date() } as any);
      return fn(tx);
    });
    prismaMock.reservation.aggregate.mockResolvedValue({ _sum: { quantity: 0 } } as any);

    const result = await reservationService.processPaymentConfirmed(1);

    expect(mockedTransitionOrder).not.toHaveBeenCalled();
    expect(result.orderTransition).toBeUndefined();
  });

  it("propaga AppError si la reserva no existe", async () => {
    prismaMock.reservation.findUnique.mockResolvedValue(null);

    await expect(reservationService.processPaymentConfirmed(9999)).rejects.toThrow(AppError);
  });

  it("propaga AppError si la transición de orden falla", async () => {
    const reservation = makeReservation("ACTIVE");
    const product = makeProduct();
    const stock = makeStock(20);

    prismaMock.reservation.findUnique.mockResolvedValue(reservation as any);
    prismaMock.product.findUnique.mockResolvedValue(product as any);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => {
      prismaMock.stock.findUnique.mockResolvedValueOnce(stock as any);
      prismaMock.stock.upsert.mockResolvedValueOnce({ ...stock, quantity: 15 } as any);
      prismaMock.movement.create.mockResolvedValueOnce({ id: "mov-1" } as any);
      prismaMock.reservation.update.mockResolvedValueOnce({ ...reservation, status: "SOLD", soldAt: new Date() } as any);
      return fn(prismaMock);
    });
    prismaMock.reservation.aggregate.mockResolvedValue({ _sum: { quantity: 0 } } as any);

    mockedTransitionOrder.mockRejectedValueOnce(new AppError("Transición inválida.", 409));

    await expect(reservationService.processPaymentConfirmed(1, "order-1")).rejects.toThrow(AppError);
  });
});
