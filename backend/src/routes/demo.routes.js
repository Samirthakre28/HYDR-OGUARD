/**
 * HydroGuard - Demo Mode Routes (Step 20)
 *
 * Dedicated namespace for deterministic demo scenarios and risk execution.
 */

import { Router } from "express";
import {
  getScenarios,
  getScenario,
  calculateDemoRisk
} from "../controllers/demo.controller.js";

const router = Router();

// GET /api/demo/scenarios - List all deterministic demo scenarios
router.get("/scenarios", getScenarios);

// GET /api/demo/scenarios/:scenarioId - Get details of one scenario
router.get("/scenarios/:scenarioId", getScenario);

// POST /api/demo/risk/:scenarioId - Evaluate scenario through deterministic Risk Engine
router.post("/risk/:scenarioId", calculateDemoRisk);

export default router;
