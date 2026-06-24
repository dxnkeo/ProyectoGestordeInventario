// ============================================================
// Job: Procesamiento de eventos outbox (Grupo 9)
// ============================================================

import { config } from "../config/config";
import { logger } from "../config/logger";
import { processPendingEvents } from "../services/event.service";

let intervalId: ReturnType<typeof setInterval> | null = null;

export const startEventWorker = (): void => {
  if (process.env.NODE_ENV === "test") return;

  const run = async (): Promise<void> => {
    try {
      const count = await processPendingEvents();
      if (count > 0) {
        logger.info(`Eventos outbox enviados: ${count}`);
      }
    } catch (error) {
      logger.error("Error en worker de eventos outbox", { error });
    }
  };

  void run();
  intervalId = setInterval(() => void run(), config.eventWorkerIntervalMs);

  logger.info("Worker de eventos outbox iniciado", {
    intervalMs: config.eventWorkerIntervalMs,
    analyticsUrl: config.analyticsEventsUrl ?? "(no configurada)",
  });
};

export const stopEventWorker = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
