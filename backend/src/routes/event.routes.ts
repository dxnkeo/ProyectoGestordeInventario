import { Router } from "express";
import { param, query } from "express-validator";
import * as eventController from "../controllers/event.controller";
import { validateRequest } from "../middlewares/validateRequest";

const router: ReturnType<typeof Router> = Router();

router.get(
  "/outbox",
  query("status")
    .optional()
    .isIn(["PENDING", "SENT", "FAILED", "DEAD"]),
  validateRequest,
  eventController.listEvents
);

router.post(
  "/outbox/:id/retry",
  param("id").isUUID(),
  validateRequest,
  eventController.retryFailedEvent
);

export default router;
