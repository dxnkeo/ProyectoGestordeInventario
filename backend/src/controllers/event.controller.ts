import { Request, Response, NextFunction } from "express";
import { EventStatus } from "@prisma/client";
import * as eventService from "../services/event.service";
import { sendSuccess } from "../utils/response";

export const listEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const statusParam = req.query.status as string | undefined;
    const status = statusParam
      ? (statusParam.toUpperCase() as EventStatus)
      : undefined;
    const events = await eventService.listOutboundEvents(status);
    sendSuccess(res, events, `${events.length} evento(s) en outbox.`);
  } catch (error) {
    next(error);
  }
};

export const retryFailedEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const event = await eventService.retryEvent(id);
    sendSuccess(res, event, "Evento reencolado para reintento.");
  } catch (error) {
    next(error);
  }
};
