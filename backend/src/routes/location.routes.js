import { Router } from "express";
import { getAllLocations, getLocationById } from "../controllers/location.controller.js";

const router = Router();

// GET /api/locations
router.get("/", getAllLocations);

// GET /api/locations/:id
router.get("/:id", getLocationById);

export default router;
