import { Router } from "express";
import {
  getRiskByLocationId,
  calculateRisk,
  getRiskExplanation
} from "../controllers/risk.controller.js";

const router = Router();

// POST /api/risk/calculate (Calculate risk dynamically from parameters)
router.post("/calculate", calculateRisk);

// POST /api/risk/explanation (AI-powered risk explanation & safety actions)
router.post("/explanation", getRiskExplanation);

// GET /api/risk/:locationId (Fetch stored risk telemetry for location)
router.get("/:locationId", getRiskByLocationId);

export default router;
