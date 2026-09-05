import { Router } from "express";
import { getSeismicByLocationId } from "../controllers/seismic.controller.js";

const router = Router();

// GET /api/seismic/:locationId
router.get("/:locationId", getSeismicByLocationId);

export default router;
