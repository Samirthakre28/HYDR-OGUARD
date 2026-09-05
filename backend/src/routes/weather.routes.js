import { Router } from "express";
import { getWeatherByLocationId } from "../controllers/weather.controller.js";

const router = Router();

// GET /api/weather/:locationId
router.get("/:locationId", getWeatherByLocationId);

export default router;
