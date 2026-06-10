import { AlertStatus } from "@prisma/client";
import prisma from "../prisma/client";
import { NotFoundError } from "../utils/errors";

const alertInclude = {
  product: { select: { id: true, name: true, sku: true, minStock: true } },
  location: { select: { id: true, name: true, type: true } },
} as const;

/**
 * Sincroniza alertas PENDING con el stock físico actual.
 * Crea alertas faltantes cuando quantity <= minStock del producto
 * y resuelve las que ya no aplican.
 */
export const syncCriticalAlerts = async (): Promise<void> => {
  const stocks = await prisma.stock.findMany({
    include: {
      product: { select: { minStock: true } },
    },
  });

  for (const stock of stocks) {
    const { minStock } = stock.product;
    const isCritical = stock.quantity <= minStock;

    if (isCritical) {
      const existing = await prisma.stockAlert.findFirst({
        where: {
          productId: stock.productId,
          locationId: stock.locationId,
          status: "PENDING",
        },
      });

      if (existing) {
        if (
          existing.currentStock !== stock.quantity ||
          existing.minStock !== minStock
        ) {
          await prisma.stockAlert.update({
            where: { id: existing.id },
            data: {
              currentStock: stock.quantity,
              minStock,
            },
          });
        }
      } else {
        await prisma.stockAlert.create({
          data: {
            productId: stock.productId,
            locationId: stock.locationId,
            currentStock: stock.quantity,
            minStock,
            status: "PENDING",
          },
        });
      }
      continue;
    }

    await prisma.stockAlert.updateMany({
      where: {
        productId: stock.productId,
        locationId: stock.locationId,
        status: "PENDING",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });
  }
};

/**
 * Retorna todas las alertas de stock, opcionalmente filtradas por estado.
 */
export const findAlerts = async (status?: string) => {
  await syncCriticalAlerts();

  const where: { status?: AlertStatus } = {};
  if (status) {
    where.status = status as AlertStatus;
  }

  return prisma.stockAlert.findMany({
    where,
    include: alertInclude,
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Marca una alerta como resuelta manualmente.
 * Lanza NotFoundError si la alerta no existe.
 */
export const resolveAlertById = async (id: string) => {
  const alert = await prisma.stockAlert.findUnique({ where: { id } });

  if (!alert) {
    throw new NotFoundError("Alerta", id);
  }

  return prisma.stockAlert.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });
};
