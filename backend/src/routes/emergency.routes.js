import { Router } from "express";
import { getEmergencyServices } from "../controllers/emergency.controller.js";

const router = Router();

// GET /api/emergency/:locationId (Emergency centers for location)
router.get("/:locationId", getEmergencyServices);

export default router;
