import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBatchPickList, getReadyForDispatchOrders } from "../services/pickingService";

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockPickList = {
  orderIds: ["order-1"],
  validOrders: 1,
  skippedOrders: [],
  groups: [
    {
      location: { id: "loc-1", name: "Bodega Central", type: "bodega", priority: 1 },
      items: [{ productId: "prod-1", productName: "Producto A", sku: "SKU-001", totalQuantity: 10, orders: [{ orderId: "order-1", quantity: 10 }] }],
      totalUnits: 10,
    },
  ],
  totalUnits: 10,
};

// ── getBatchPickList ──────────────────────────────────────────

describe("getBatchPickList", () => {
  it("retorna la lista de picking del servidor", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPickList }),
    } as Response);

    const result = await getBatchPickList(["order-1"]);
    expect(result).toEqual(mockPickList);
  });

  it("lanza error si la respuesta no es ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Órdenes no encontradas" }),
    } as Response);

    await expect(getBatchPickList(["order-1"])).rejects.toThrow("Órdenes no encontradas");
  });

  it("lanza mensaje genérico si no viene message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(getBatchPickList(["x"])).rejects.toThrow("Error al generar lista de picking");
  });

  it("construye la URL con orderIds correctamente", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPickList }),
    } as Response);

    await getBatchPickList(["order-1", "order-2"]);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("orderIds=");
    expect(url).toContain("order-1");
  });
});

// ── getReadyForDispatchOrders ─────────────────────────────────

describe("getReadyForDispatchOrders", () => {
  const mockOrders = [
    { id: "order-1", customerName: "Cliente A", status: "READY_FOR_DISPATCH", createdAt: "2024-01-01", items: [] },
  ];

  it("retorna lista de órdenes listas para despacho", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders }),
    } as Response);

    const result = await getReadyForDispatchOrders();
    expect(result).toEqual(mockOrders);
  });

  it("retorna arreglo vacío si data es null/undefined", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: null }),
    } as Response);

    const result = await getReadyForDispatchOrders();
    expect(result).toEqual([]);
  });

  it("lanza error si la respuesta no es ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(getReadyForDispatchOrders()).rejects.toThrow("Error al obtener órdenes");
  });
});
