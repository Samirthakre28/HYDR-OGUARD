import { Router } from "express";
import { getHydrologyByLocationId } from "../controllers/hydrology.controller.js";

const router = Router();

// GET /api/hydrology/:locationId
router.get("/:locationId", getHydrologyByLocationId);

export default router;
