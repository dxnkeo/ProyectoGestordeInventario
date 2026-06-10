// ============================================================
// Rutas: Picking (Lista de picking por lotes)
// GET /picking?orderIds=id1,id2,id3  → lista consolidada
// SCRUM-70
// ============================================================

import { Router } from "express";
import * as pickingController from "../controllers/picking.controller";

const router: Router = Router();

router.get("/", pickingController.getBatchPickList);

export default router;
