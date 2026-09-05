import { Router } from "express";
import {
  runBacktest,
  getBacktestSummary
} from "../controllers/validation.controller.js";

const router = Router();

// Route: POST /api/validation/backtest - Run backtest on scenario batch
router.post("/backtest", runBacktest);

// Route: GET /api/validation/backtest/summary - Retrieve summary metrics & dataset status
router.get("/backtest/summary", getBacktestSummary);

export default router;
