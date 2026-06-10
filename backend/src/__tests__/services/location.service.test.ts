import prismaMock from "../__mocks__/prismaClient";
import * as locationService from "../../services/location.service";
import { AppError } from "../../utils/AppError";

const mockLocation = {
  id: "loc-1",
  name: "Bodega A",
  type: "bodega",
  capacity: 100,
  priority: 3,
  createdAt: new Date(),
  stocks: [] as { quantity: number; productId: string }[],
};

// ── createLocation ────────────────────────────────────────────

describe("locationService.createLocation", () => {
  it("crea una ubicación con la prioridad provista (clamp 1-10)", async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce(null);
    prismaMock.location.create.mockResolvedValueOnce({ ...mockLocation, priority: 3 } as any);

    const result = await locationService.createLocation({ name: "Bodega A", type: "bodega", priority: 3 });
    expect(prismaMock.location.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 3 }) })
    );
    expect(result.priority).toBe(3);
  });

  it("usa prioridad 5 por defecto si no se provee", async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce(null);
    prismaMock.location.create.mockResolvedValueOnce({ ...mockLocation, priority: 5 } as any);

    await locationService.createLocation({ name: "Bodega B", type: "bodega" });
    expect(prismaMock.location.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 5 }) })
    );
  });

  it("clamp priority > 10 a 10", async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce(null);
    prismaMock.location.create.mockResolvedValueOnce({ ...mockLocation, priority: 10 } as any);

    await locationService.createLocation({ name: "Bodega C", type: "bodega", priority: 99 });
    expect(prismaMock.location.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 10 }) })
    );
  });

  it("clamp priority < 1 a 1", async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce(null);
    prismaMock.location.create.mockResolvedValueOnce({ ...mockLocation, priority: 1 } as any);

    await locationService.createLocation({ name: "Bodega D", type: "bodega", priority: -5 });
    expect(prismaMock.location.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 1 }) })
    );
  });

  it("lanza AppError 409 si el nombre ya existe", async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce(mockLocation as any);
    await expect(locationService.createLocation({ name: "Bodega A", type: "bodega" }))
      .rejects.toThrow(AppError);
  });
});

// ── getAllLocations ───────────────────────────────────────────

describe("locationService.getAllLocations", () => {
  it("retorna lista ordenada por priority y createdAt", async () => {
    prismaMock.location.findMany.mockResolvedValueOnce([mockLocation] as any);
    const result = await locationService.getAllLocations();
    expect(result).toEqual([mockLocation]);
    expect(prismaMock.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }] })
    );
  });
});

// ── updateLocation ───────────────────────────────────────────

describe("locationService.updateLocation", () => {
  it("actualiza la prioridad si se provee", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(mockLocation as any);
    prismaMock.location.update.mockResolvedValueOnce({ ...mockLocation, priority: 2 } as any);

    await locationService.updateLocation("loc-1", { priority: 2 });
    expect(prismaMock.location.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: 2 }) })
    );
  });

  it("no incluye priority en el update si no se provee", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(mockLocation as any);
    prismaMock.location.update.mockResolvedValueOnce(mockLocation as any);

    await locationService.updateLocation("loc-1", { name: "Nuevo Nombre" });
    const callArg = prismaMock.location.update.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("priority");
  });

  it("lanza AppError 404 si no existe", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(null);
    await expect(locationService.updateLocation("no-existe", {})).rejects.toThrow(AppError);
  });

  it("lanza AppError 409 si el nuevo nombre ya está en uso", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(mockLocation as any);
    prismaMock.location.findFirst.mockResolvedValueOnce({ ...mockLocation, id: "loc-2" } as any);
    await expect(locationService.updateLocation("loc-1", { name: "Bodega Ocupada" })).rejects.toThrow(AppError);
  });
});

// ── getLocationById ──────────────────────────────────────────

describe("locationService.getLocationById", () => {
  it("retorna la ubicación si existe", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(mockLocation as any);
    const result = await locationService.getLocationById("loc-1");
    expect(result.id).toBe("loc-1");
  });

  it("lanza AppError 404 si no existe", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(null);
    await expect(locationService.getLocationById("no-existe")).rejects.toThrow(AppError);
  });
});

// ── deleteLocation ───────────────────────────────────────────

describe("locationService.deleteLocation", () => {
  it("elimina una ubicación sin stock", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce({ ...mockLocation, stocks: [] } as any);
    prismaMock.location.delete.mockResolvedValueOnce(mockLocation as any);

    const result = await locationService.deleteLocation("loc-1");
    expect(result.id).toBe("loc-1");
  });

  it("lanza AppError 404 si no existe", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce(null);
    await expect(locationService.deleteLocation("no-existe")).rejects.toThrow(AppError);
  });

  it("lanza AppError 409 si tiene stock", async () => {
    prismaMock.location.findUnique.mockResolvedValueOnce({
      ...mockLocation,
      stocks: [{ quantity: 10, productId: "p1" }],
    } as any);
    await expect(locationService.deleteLocation("loc-1")).rejects.toThrow(AppError);
  });
});
