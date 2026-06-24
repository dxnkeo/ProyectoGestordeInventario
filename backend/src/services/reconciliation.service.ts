// ============================================================
// Servicio: Conciliación stock lógico vs físico (auditorías)
// ============================================================

import { ReservationStatus } from "@prisma/client";
import prisma from "../prisma/client";
import { NotFoundError, ValidationError } from "../utils/errors";
import { createMovement } from "./movement.service";

export type ReconciliationStatus = "OK" | "SOBRANTE" | "FALTANTE" | "SIN_CONTEO";

export interface ReconciliationRow {
  productId: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  period: string;
  stockLogico: number;
  reservado: number;
  stockDisponible: number;
  stockFisico: number | null;
  diferencia: number | null;
  estado: ReconciliationStatus;
  physicalCountId?: string;
}

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const validatePeriod = (period: string): void => {
  if (!PERIOD_REGEX.test(period)) {
    throw new ValidationError('period debe tener formato "YYYY-MM" (ej. 2026-06).');
  }
};

const getReservedMap = async (): Promise<Map<string, number>> => {
  const agg = await prisma.reservation.groupBy({
    by: ["sku", "locationId"],
    where: { status: ReservationStatus.ACTIVE },
    _sum: { quantity: true },
  });
  return new Map(agg.map((r) => [`${r.sku}:${r.locationId}`, r._sum.quantity ?? 0]));
};

export const getReconciliationReport = async (
  period: string
): Promise<ReconciliationRow[]> => {
  validatePeriod(period);

  const [stocks, counts, reservedMap] = await Promise.all([
    prisma.stock.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ location: { name: "asc" } }, { product: { sku: "asc" } }],
    }),
    prisma.physicalCount.findMany({ where: { period } }),
    getReservedMap(),
  ]);

  const countMap = new Map(
    counts.map((c) => [`${c.productId}:${c.locationId}`, c])
  );

  return stocks.map((stock) => {
    const reserved =
      reservedMap.get(`${stock.product.sku}:${stock.locationId}`) ?? 0;
    const stockDisponible = stock.quantity - reserved;
    const count = countMap.get(`${stock.productId}:${stock.locationId}`);
    const stockFisico = count?.countedQty ?? null;
    const diferencia =
      stockFisico !== null ? stockFisico - stock.quantity : null;

    let estado: ReconciliationStatus = "SIN_CONTEO";
    if (diferencia !== null) {
      if (diferencia === 0) estado = "OK";
      else if (diferencia > 0) estado = "SOBRANTE";
      else estado = "FALTANTE";
    }

    return {
      productId: stock.productId,
      sku: stock.product.sku,
      productName: stock.product.name,
      locationId: stock.locationId,
      locationName: stock.location.name,
      period,
      stockLogico: stock.quantity,
      reservado: reserved,
      stockDisponible,
      stockFisico,
      diferencia,
      estado,
      physicalCountId: count?.id,
    };
  });
};

export const exportReconciliationCsv = async (period: string): Promise<string> => {
  const rows = await getReconciliationReport(period);
  const header =
    "periodo,sku,producto,ubicacion,stock_logico,reservado,disponible,stock_fisico,diferencia,estado";
  const lines = rows.map(
    (r) =>
      `${r.period},${r.sku},"${r.productName}","${r.locationName}",${r.stockLogico},${r.reservado},${r.stockDisponible},${r.stockFisico ?? ""},${r.diferencia ?? ""},${r.estado}`
  );
  return [header, ...lines].join("\n");
};

export const upsertPhysicalCount = async (dto: {
  sku: string;
  locationId: string;
  countedQty: number;
  period: string;
  countedBy?: string;
  note?: string;
}) => {
  validatePeriod(dto.period);

  if (dto.countedQty < 0) {
    throw new ValidationError("countedQty no puede ser negativo.");
  }

  const sku = dto.sku.trim().toUpperCase();
  const product = await prisma.product.findUnique({ where: { sku } });
  if (!product) throw new NotFoundError("Producto (SKU)", sku);

  const location = await prisma.location.findUnique({
    where: { id: dto.locationId },
  });
  if (!location) throw new NotFoundError("Ubicación", dto.locationId);

  return prisma.physicalCount.upsert({
    where: {
      productId_locationId_period: {
        productId: product.id,
        locationId: dto.locationId,
        period: dto.period,
      },
    },
    create: {
      productId: product.id,
      locationId: dto.locationId,
      countedQty: dto.countedQty,
      period: dto.period,
      countedBy: dto.countedBy,
      note: dto.note,
    },
    update: {
      countedQty: dto.countedQty,
      countedAt: new Date(),
      countedBy: dto.countedBy,
      note: dto.note,
    },
    include: {
      product: { select: { sku: true, name: true } },
      location: { select: { name: true } },
    },
  });
};

export const regularizeDifference = async (
  productId: string,
  locationId: string,
  period: string
) => {
  validatePeriod(period);

  const count = await prisma.physicalCount.findUnique({
    where: { productId_locationId_period: { productId, locationId, period } },
    include: { product: true, location: true },
  });

  if (!count) {
    throw new NotFoundError(
      "Conteo físico",
      `${productId}@${locationId}@${period}`
    );
  }

  const stock = await prisma.stock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });

  const stockLogico = stock?.quantity ?? 0;
  const diff = count.countedQty - stockLogico;

  if (diff === 0) {
    return { adjusted: false, message: "No hay diferencia que regularizar." };
  }

  const type = diff > 0 ? "IN" : "OUT";
  const quantity = Math.abs(diff);

  const movement = await createMovement({
    productId,
    locationId,
    type,
    quantity,
    note: `Conciliación ${period} — ajuste ${type} (${count.countedQty} físico vs ${stockLogico} lógico)`,
  });

  return {
    adjusted: true,
    movement,
    diferenciaRegularizada: diff,
    product: count.product.name,
    location: count.location.name,
  };
};
