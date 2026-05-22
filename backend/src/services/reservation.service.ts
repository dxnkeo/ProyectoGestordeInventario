import prisma from "../prisma/client";
import { AppError } from "../utils/AppError";

export const createTemporaryReservation = async (data: {
  orderId: number;
  sku: string;
  locationId: string;
  quantity: number;
}) => {
  // 1. Obtener la ubicación para verificar el horario
  const location = await prisma.location.findUnique({
    where: { id: data.locationId }
  });

  if (!location) throw new AppError("Ubicación no encontrada", 404);

  // 2. VERIFICACIÓN DE HORARIO DE DESPACHO
  
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  const startMinutes = parseTime(location.dispatchStart);
  const endMinutes = parseTime(location.dispatchEnd);

  if (currentTotalMinutes < startMinutes || currentTotalMinutes > endMinutes) {
    throw new AppError(
      `No se puede reservar: La sede "${location.name}" fuera de horario (${location.dispatchStart}-${location.dispatchEnd}).`,
      400
    );
  }

    // 3. VERIFICACIÓN DE LÍMITE DE DESPACHO DIARIO
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayReservations = await prisma.reservation.aggregate({
    _sum: { quantity: true },
    where: {
      locationId: data.locationId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { not: "CANCELLED" },
    },
  });

  const currentDailyTotal = todayReservations._sum.quantity || 0;

  if (currentDailyTotal + data.quantity > location.maxDailyDispatch) {
    throw new AppError(
      `No se puede reservar: La ubicación superaría su límite de despacho (${currentDailyTotal}/${location.maxDailyDispatch} artículos reservados hoy).`,
      400
    );
  }

  // 4. validar si hay stock físico disponible

  // 5. Crear la reserva temporal ("PENDING")
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 15); 

  const reservation = await prisma.reservation.create({
    data: {
      orderId: data.orderId,
      sku: data.sku,
      locationId: data.locationId,
      quantity: data.quantity,
      status: "PENDING",    
      expiresAt: expires
    }
  });

  return reservation;
};
