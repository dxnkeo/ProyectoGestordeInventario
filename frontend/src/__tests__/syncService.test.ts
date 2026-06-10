import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStockBalance, executeSyncTransfer } from "../services/syncService";

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockBalance = [
  {
    productId: "prod-1",
    productName: "Producto A",
    sku: "SKU-001",
    minStock: 5,
    totalStock: 52,
    averagePerLocation: 26,
    locations: [],
    suggestedTransfers: [],
  },
];

// ── getStockBalance ────────────────────────────────────────────

describe("getStockBalance", () => {
  it("retorna el balance del servidor", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockBalance }),
    } as Response);

    const result = await getStockBalance();
    expect(result).toEqual(mockBalance);
  });

  it("lanza error si la respuesta no es ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Error de servidor" }),
    } as Response);

    await expect(getStockBalance()).rejects.toThrow("Error de servidor");
  });

  it("lanza mensaje genérico si no viene message del servidor", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(getStockBalance()).rejects.toThrow("Error al obtener balance de stock");
  });
});

// ── executeSyncTransfer ───────────────────────────────────────

describe("executeSyncTransfer", () => {
  const dto = {
    productId: "prod-1",
    sourceLocationId: "loc-1",
    destinationLocationId: "loc-2",
    quantity: 10,
  };

  it("ejecuta la transferencia correctamente", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { movement: {}, updatedStock: {} } }),
    } as Response);

    const result = await executeSyncTransfer(dto);
    expect(result).toBeDefined();
  });

  it("lanza error si la respuesta no es ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Stock insuficiente" }),
    } as Response);

    await expect(executeSyncTransfer(dto)).rejects.toThrow("Stock insuficiente");
  });

  it("lanza mensaje genérico si no viene message del servidor", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(executeSyncTransfer(dto)).rejects.toThrow("Error al ejecutar transferencia");
  });

  it("llama a fetch con method POST y body correcto", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);

    await executeSyncTransfer(dto);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/sync/transfer"),
      expect.objectContaining({ method: "POST", body: JSON.stringify(dto) })
    );
  });
});
