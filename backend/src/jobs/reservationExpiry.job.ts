// ============================================================
// Job: Expiración automática de reservas (TTL Grupo 3)
// ============================================================

import { config } from "../config/config";
import { logger } from "../config/logger";
import { expireStaleReservations } from "../services/reservation.service";

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startReservationExpiryJob = (): void => {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const run = async (): Promise<void> => {
    try {
      const count = await expireStaleReservations();
      if (count > 0) {
        logger.info(`Reservas expiradas automáticamente: ${count}`);
      }
    } catch (error) {
      logger.error("Error al expirar reservas vencidas", { error });
    }
  };

  void run();
  intervalId = setInterval(() => void run(), config.reservationExpiryIntervalMs);
  logger.info("Job de expiración de reservas iniciado", {
    intervalMs: config.reservationExpiryIntervalMs,
    ttlMinutes: config.reservationTtlMinutes,
  });
};

export const stopReservationExpiryJob = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
