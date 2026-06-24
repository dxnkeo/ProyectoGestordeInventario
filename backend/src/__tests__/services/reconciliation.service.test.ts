import prismaMock from "../__mocks__/prismaClient";
import * as reconciliationService from "../../services/reconciliation.service";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { createMovement } from "../../services/movement.service";

jest.mock("../../services/movement.service", () => ({
  createMovement: jest.fn(),
}));

const mockCreateMovement = createMovement as jest.MockedFunction<typeof createMovement>;

describe("reconciliationService.getReconciliationReport", () => {
  it("lanza ValidationError si el periodo es inválido", async () => {
    await expect(reconciliationService.getReconciliationReport("2026-13")).rejects.toThrow(ValidationError);
  });

  it("retorna filas con estado SIN_CONTEO si no hay conteo físico", async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([
      {
        productId: "p1",
        locationId: "l1",
        quantity: 10,
        product: { id: "p1", name: "Prod", sku: "SKU-1" },
        location: { id: "l1", name: "Bodega" },
      },
    ] as any);
    prismaMock.physicalCount.findMany.mockResolvedValueOnce([]);
    (prismaMock.reservation.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const rows = await reconciliationService.getReconciliationReport("2026-06");
    expect(rows).toHaveLength(1);
    expect(rows[0].estado).toBe("SIN_CONTEO");
    expect(rows[0].stockLogico).toBe(10);
  });

  it("calcula FALTANTE cuando físico < lógico", async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([
      {
        productId: "p1",
        locationId: "l1",
        quantity: 10,
        product: { id: "p1", name: "Prod", sku: "SKU-1" },
        location: { id: "l1", name: "Bodega" },
      },
    ] as any);
    prismaMock.physicalCount.findMany.mockResolvedValueOnce([
      { id: "c1", productId: "p1", locationId: "l1", countedQty: 7, period: "2026-06" },
    ] as any);
    (prismaMock.reservation.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const rows = await reconciliationService.getReconciliationReport("2026-06");
    expect(rows[0].estado).toBe("FALTANTE");
    expect(rows[0].diferencia).toBe(-3);
  });

  it("calcula OK cuando físico = lógico", async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([
      {
        productId: "p1",
        locationId: "l1",
        quantity: 10,
        product: { id: "p1", name: "Prod", sku: "SKU-1" },
        location: { id: "l1", name: "Bodega" },
      },
    ] as any);
    prismaMock.physicalCount.findMany.mockResolvedValueOnce([
      { id: "c1", productId: "p1", locationId: "l1", countedQty: 10, period: "2026-06" },
    ] as any);
    (prismaMock.reservation.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const rows = await reconciliationService.getReconciliationReport("2026-06");
    expect(rows[0].estado).toBe("OK");
    expect(rows[0].diferencia).toBe(0);
  });

  it("calcula SOBRANTE cuando físico > lógico", async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([
      {
        productId: "p1",
        locationId: "l1",
        quantity: 10,
        product: { id: "p1", name: "Prod", sku: "SKU-1" },
        location: { id: "l1", name: "Bodega" },
      },
    ] as any);
    prismaMock.physicalCount.findMany.mockResolvedValueOnce([
      { id: "c1", productId: "p1", locationId: "l1", countedQty: 12, period: "2026-06" },
    ] as any);
    (prismaMock.reservation.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const rows = await reconciliationService.getReconciliationReport("2026-06");
    expect(rows[0].estado).toBe("SOBRANTE");
    expect(rows[0].diferencia).toBe(2);
  });
});

describe("reconciliationService.exportReconciliationCsv", () => {
  it("genera CSV con encabezado", async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([] as any);
    prismaMock.physicalCount.findMany.mockResolvedValueOnce([]);
    (prismaMock.reservation.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const csv = await reconciliationService.exportReconciliationCsv("2026-06");
    expect(csv.startsWith("periodo,sku,producto")).toBe(true);
  });
});

describe("reconciliationService.upsertPhysicalCount", () => {
  it("lanza ValidationError si countedQty es negativo", async () => {
    await expect(
      reconciliationService.upsertPhysicalCount({
        sku: "SKU-1",
        locationId: "l1",
        countedQty: -1,
        period: "2026-06",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError si el SKU no existe", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    await expect(
      reconciliationService.upsertPhysicalCount({
        sku: "NOPE",
        locationId: "l1",
        countedQty: 5,
        period: "2026-06",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("registra conteo físico exitosamente", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: "p1", sku: "SKU-1" } as any);
    prismaMock.location.findUnique.mockResolvedValueOnce({ id: "l1", name: "Bodega" } as any);
    prismaMock.physicalCount.upsert.mockResolvedValueOnce({
      id: "c1",
      countedQty: 8,
      product: { sku: "SKU-1", name: "Prod" },
      location: { name: "Bodega" },
    } as any);

    const result = await reconciliationService.upsertPhysicalCount({
      sku: "sku-1",
      locationId: "l1",
      countedQty: 8,
      period: "2026-06",
      countedBy: "auditor",
    });

    expect(result.countedQty).toBe(8);
    expect(prismaMock.physicalCount.upsert).toHaveBeenCalled();
  });
});

describe("reconciliationService.regularizeDifference", () => {
  it("retorna sin ajuste si no hay diferencia", async () => {
    prismaMock.physicalCount.findUnique.mockResolvedValueOnce({
      countedQty: 10,
      product: { name: "Prod" },
      location: { name: "Bodega" },
    } as any);
    prismaMock.stock.findUnique.mockResolvedValueOnce({ quantity: 10 } as any);

    const result = await reconciliationService.regularizeDifference("p1", "l1", "2026-06");
    expect(result.adjusted).toBe(false);
    expect(mockCreateMovement).not.toHaveBeenCalled();
  });

  it("crea movimiento IN cuando hay sobrante", async () => {
    prismaMock.physicalCount.findUnique.mockResolvedValueOnce({
      countedQty: 12,
      product: { name: "Prod" },
      location: { name: "Bodega" },
    } as any);
    prismaMock.stock.findUnique.mockResolvedValueOnce({ quantity: 10 } as any);
    mockCreateMovement.mockResolvedValueOnce({ id: "mov-1", type: "IN" } as any);

    const result = await reconciliationService.regularizeDifference("p1", "l1", "2026-06");
    expect(result.adjusted).toBe(true);
    expect(mockCreateMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "IN", quantity: 2 })
    );
  });

  it("crea movimiento OUT cuando hay faltante", async () => {
    prismaMock.physicalCount.findUnique.mockResolvedValueOnce({
      countedQty: 7,
      product: { name: "Prod" },
      location: { name: "Bodega" },
    } as any);
    prismaMock.stock.findUnique.mockResolvedValueOnce({ quantity: 10 } as any);
    mockCreateMovement.mockResolvedValueOnce({ id: "mov-2", type: "OUT" } as any);

    const result = await reconciliationService.regularizeDifference("p1", "l1", "2026-06");
    expect(result.adjusted).toBe(true);
    expect(mockCreateMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "OUT", quantity: 3 })
    );
  });

  it("lanza NotFoundError si no hay conteo físico", async () => {
    prismaMock.physicalCount.findUnique.mockResolvedValueOnce(null);
    await expect(
      reconciliationService.regularizeDifference("p1", "l1", "2026-06")
    ).rejects.toThrow(NotFoundError);
  });
});
