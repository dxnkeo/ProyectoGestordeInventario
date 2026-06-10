// ============================================================
// Servicio: Picking (Lista de picking consolidada por lotes)
// SCRUM-70: Agrupa ítems de múltiples órdenes por ubicación
//           para optimizar el recorrido físico del almacén.
// ============================================================

import prisma from "../prisma/client";
import { AppError } from "../utils/AppError";

export interface PickItem {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  orders: Array<{ orderId: string; quantity: number }>;
}

export interface LocationPickGroup {
  location: { id: string; name: string; type: string; priority: number };
  items: PickItem[];
  totalUnits: number;
}

export interface BatchPickList {
  orderIds: string[];
  validOrders: number;
  skippedOrders: string[];
  groups: LocationPickGroup[];
  totalUnits: number;
}

/**
 * Genera una lista de picking consolidada para un conjunto de órdenes.
 * Solo incluye órdenes en estado READY_FOR_DISPATCH.
 * Agrupa ítems por ubicación (ordenados por priority ASC) y luego por producto.
 * SCRUM-70.
 *
 * @param orderIds IDs de las órdenes a incluir en el lote
 * @throws AppError 400 si no se proporcionan orderIds
 */
export const getBatchPickList = async (orderIds: string[]): Promise<BatchPickList> => {
  if (!orderIds || orderIds.length === 0) {
    throw new AppError("Se debe proporcionar al menos un orderIds.", 400);
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      items: {
        include: {
          product:  { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true, type: true, priority: true } },
        },
      },
    },
  });

  const skippedOrders = orderIds.filter(
    (id) => !orders.find((o) => o.id === id && o.status === "READY_FOR_DISPATCH")
  );

  const validOrders = orders.filter((o) => o.status === "READY_FOR_DISPATCH");

  // Agrupar por locationId → productId
  const locationMap = new Map<string, {
    location: LocationPickGroup["location"];
    productMap: Map<string, PickItem>;
  }>();

  for (const order of validOrders) {
    for (const item of order.items) {
      const locKey = item.locationId;

      if (!locationMap.has(locKey)) {
        locationMap.set(locKey, {
          location: item.location,
          productMap: new Map(),
        });
      }

      const locEntry = locationMap.get(locKey)!;
      const prodKey = item.productId;

      if (!locEntry.productMap.has(prodKey)) {
        locEntry.productMap.set(prodKey, {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          totalQuantity: 0,
          orders: [],
        });
      }

      const pickItem = locEntry.productMap.get(prodKey)!;
      pickItem.totalQuantity += item.quantity;
      pickItem.orders.push({ orderId: order.id, quantity: item.quantity });
    }
  }

  // Convertir Map a array y ordenar por priority ASC
  const groups: LocationPickGroup[] = Array.from(locationMap.values())
    .map(({ location, productMap }) => {
      const items = Array.from(productMap.values());
      const totalUnits = items.reduce((sum, i) => sum + i.totalQuantity, 0);
      return { location, items, totalUnits };
    })
    .sort((a, b) => a.location.priority - b.location.priority);

  const totalUnits = groups.reduce((sum, g) => sum + g.totalUnits, 0);

  return {
    orderIds,
    validOrders: validOrders.length,
    skippedOrders,
    groups,
    totalUnits,
  };
};
