import { Router } from "express";
import {
  getCurrentAlert,
  getAlertHistory,
  submitAlertFeedback,
  getAlertFeedback,
  getAlertFeedbackSummary
} from "../controllers/alert.controller.js";

const router = Router();

// GET /api/alerts/feedback/summary (Aggregated user alert accuracy stats)
router.get("/feedback/summary", getAlertFeedbackSummary);

// POST /api/alerts/:alertId/feedback (Submit user accuracy feedback)
router.post("/:alertId/feedback", submitAlertFeedback);

// GET /api/alerts/:alertId/feedback (Get feedback list for an alert)
router.get("/:alertId/feedback", getAlertFeedback);

// GET /api/alerts/:locationId (Current real-time alert)
router.get("/:locationId", getCurrentAlert);

// GET /api/alerts/:locationId/history (Historical alerts log)
router.get("/:locationId/history", getAlertHistory);

export default router;
