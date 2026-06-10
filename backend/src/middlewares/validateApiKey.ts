// ============================================================
// Middleware: Validación de API Key para integraciones externas
// SCRUM-31: Verifica el header X-Api-Key contra la variable EXTERNAL_API_KEY
// ============================================================

import type { Request, Response, NextFunction } from "express";

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = process.env.EXTERNAL_API_KEY;

  if (!apiKey) {
    res.status(503).json({
      success: false,
      message: "El servicio de integración externa no está configurado.",
    });
    return;
  }

  const provided = req.headers["x-api-key"];

  if (!provided || provided !== apiKey) {
    res.status(401).json({
      success: false,
      message: "API Key inválida o no proporcionada.",
    });
    return;
  }

  next();
};
