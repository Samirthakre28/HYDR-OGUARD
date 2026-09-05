import { Router } from "express";
import { getStatus, getFeatureSchema, getModels } from "../controllers/ml.controller.js";

const router = Router();

// GET /api/ml/status - Status of ML subsystem and model readiness
router.get("/status", getStatus);

// GET /api/ml/schema - Formal Feature Contract Schema
router.get("/schema", getFeatureSchema);

// GET /api/ml/models - Registered models list
router.get("/models", getModels);

export default router;
