import prismaMock from "../__mocks__/prismaClient";
import * as pickingService from "../../services/picking.service";
import { AppError } from "../../utils/AppError";

const product = { id: "prod-1", name: "Producto A", sku: "SKU-001" };
const location = { id: "loc-1", name: "Bodega Central", type: "bodega", priority: 1 };

const makeOrder = (id: string, status: string, items: Array<{
  productId: string; locationId: string; quantity: number;
}>) => ({
  id,
  customerName: "Cliente Test",
  status,
  createdAt: new Date(),
  items: items.map((item) => ({
    id: `item-${id}-${item.productId}`,
    orderId: id,
    productId: item.productId,
    locationId: item.locationId,
    quantity: item.quantity,
    product: { ...product, id: item.productId },
    location,
  })),
});

// ── getBatchPickList ──────────────────────────────────────────

describe("pickingService.getBatchPickList", () => {
  it("lanza AppError 400 si orderIds está vacío", async () => {
    await expect(pickingService.getBatchPickList([])).rejects.toThrow(AppError);
  });

  it("retorna lista consolidada agrupada por ubicación", async () => {
    const order1 = makeOrder("order-1", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 10 },
    ]);
    const order2 = makeOrder("order-2", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 5 },
    ]);
    prismaMock.order.findMany.mockResolvedValueOnce([order1, order2] as any);

    const result = await pickingService.getBatchPickList(["order-1", "order-2"]);

    expect(result.validOrders).toBe(2);
    expect(result.skippedOrders).toEqual([]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items[0].totalQuantity).toBe(15);
    expect(result.totalUnits).toBe(15);
  });

  it("omite órdenes que no están en READY_FOR_DISPATCH", async () => {
    const order1 = makeOrder("order-1", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 10 },
    ]);
    const order2 = makeOrder("order-2", "PENDING", [
      { productId: "prod-1", locationId: "loc-1", quantity: 5 },
    ]);
    prismaMock.order.findMany.mockResolvedValueOnce([order1, order2] as any);

    const result = await pickingService.getBatchPickList(["order-1", "order-2"]);

    expect(result.validOrders).toBe(1);
    expect(result.skippedOrders).toContain("order-2");
    expect(result.totalUnits).toBe(10);
  });

  it("marca orderIds no encontrados como skipped", async () => {
    const order1 = makeOrder("order-1", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 10 },
    ]);
    prismaMock.order.findMany.mockResolvedValueOnce([order1] as any);

    const result = await pickingService.getBatchPickList(["order-1", "order-no-existe"]);

    expect(result.skippedOrders).toContain("order-no-existe");
  });

  it("agrupa múltiples productos dentro de la misma ubicación", async () => {
    const order = makeOrder("order-1", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 10 },
      { productId: "prod-2", locationId: "loc-1", quantity: 7 },
    ]);
    (order.items[1].product as any) = { id: "prod-2", name: "Producto B", sku: "SKU-002" };
    prismaMock.order.findMany.mockResolvedValueOnce([order] as any);

    const result = await pickingService.getBatchPickList(["order-1"]);
    expect(result.groups[0].items).toHaveLength(2);
    expect(result.totalUnits).toBe(17);
  });

  it("ordena ubicaciones por priority ASC", async () => {
    const loc2 = { id: "loc-2", name: "Tienda Sur", type: "tienda", priority: 2 };
    const order1 = makeOrder("order-1", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-2", quantity: 5 },
    ]);
    const order2 = makeOrder("order-2", "READY_FOR_DISPATCH", [
      { productId: "prod-1", locationId: "loc-1", quantity: 10 },
    ]);
    // Override location on order1 item
    (order1.items[0] as any).location = loc2;

    prismaMock.order.findMany.mockResolvedValueOnce([order1, order2] as any);

    const result = await pickingService.getBatchPickList(["order-1", "order-2"]);
    // loc-1 priority=1 should come first
    expect(result.groups[0].location.priority).toBeLessThanOrEqual(result.groups[1]?.location.priority ?? Infinity);
  });
});
