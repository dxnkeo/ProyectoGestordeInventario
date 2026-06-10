// ============================================================
// Servicio: Sync (Sincronización entre almacenes)
// SCRUM-68: Detecta desequilibrios de stock entre ubicaciones
//           y ejecuta transferencias de balanceo.
// ============================================================

import prisma from "../prisma/client";
import { createTransfer } from "./movement.service";
import { getActiveReservedQuantity } from "./reservation.service";

export type BalanceStatus = "EXCESS" | "DEFICIT" | "OK";

export interface LocationBalance {
  locationId: string;
  locationName: string;
  locationType: string;
  priority: number;
  quantity: number;
  reserved: number;
  stockDisponible: number;
  average: number;
  status: BalanceStatus;
  suggestedTransferQty: number;
}

export interface ProductBalance {
  productId: string;
  productName: string;
  sku: string;
  minStock: number;
  totalStock: number;
  averagePerLocation: number;
  locations: LocationBalance[];
  suggestedTransfers: Array<{
    fromLocationId: string;
    fromLocationName: string;
    toLocationId: string;
    toLocationName: string;
    quantity: number;
  }>;
}

/**
 * Analiza el balance de stock por producto entre ubicaciones.
 * Clasifica cada ubicación como EXCESS, DEFICIT u OK.
 * SCRUM-68.
 */
export const getStockBalance = async (): Promise<ProductBalance[]> => {
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: {
          location: {
            select: { id: true, name: true, type: true, priority: true },
          },
        },
      },
    },
  });

  const results: ProductBalance[] = [];

  for (const product of products) {
    if (product.stocks.length < 2) continue;

    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    const avg = totalStock / product.stocks.length;

    const locationBalances: LocationBalance[] = await Promise.all(
      product.stocks.map(async (s) => {
        const reserved = await getActiveReservedQuantity(product.sku, s.locationId);
        const stockDisponible = s.quantity - reserved;

        let status: BalanceStatus = "OK";
        let suggestedTransferQty = 0;

        if (s.quantity <= product.minStock) {
          status = "DEFICIT";
          suggestedTransferQty = Math.ceil(avg) - s.quantity;
        } else if (s.quantity > avg * 1.5 && s.quantity - Math.ceil(avg) > 0) {
          status = "EXCESS";
          suggestedTransferQty = s.quantity - Math.ceil(avg);
        }

        return {
          locationId: s.locationId,
          locationName: s.location.name,
          locationType: s.location.type,
          priority: s.location.priority,
          quantity: s.quantity,
          reserved,
          stockDisponible,
          average: Math.round(avg * 10) / 10,
          status,
          suggestedTransferQty: Math.max(0, suggestedTransferQty),
        };
      })
    );

    const excesses = locationBalances.filter((l) => l.status === "EXCESS");
    const deficits = locationBalances.filter((l) => l.status === "DEFICIT");

    const suggestedTransfers: ProductBalance["suggestedTransfers"] = [];

    for (const deficit of deficits) {
      let needed = deficit.suggestedTransferQty;
      for (const excess of excesses) {
        if (needed <= 0 || excess.stockDisponible <= 0) continue;
        const qty = Math.min(needed, excess.stockDisponible);
        suggestedTransfers.push({
          fromLocationId: excess.locationId,
          fromLocationName: excess.locationName,
          toLocationId: deficit.locationId,
          toLocationName: deficit.locationName,
          quantity: qty,
        });
        needed -= qty;
      }
    }

    if (locationBalances.some((l) => l.status !== "OK")) {
      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        minStock: product.minStock,
        totalStock,
        averagePerLocation: Math.round(avg * 10) / 10,
        locations: locationBalances,
        suggestedTransfers,
      });
    }
  }

  return results;
};

/**
 * Ejecuta una transferencia de balanceo entre dos ubicaciones.
 * Delega en createTransfer (movement.service) con nota automática.
 * SCRUM-68.
 */
export const executeSuggestedTransfer = async (dto: {
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
}) => {
  return createTransfer({
    ...dto,
    note: "Sincronización automática de balance entre almacenes",
  });
};
