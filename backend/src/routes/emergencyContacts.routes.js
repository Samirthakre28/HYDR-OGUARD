import { Router } from "express";
import { getEmergencyContactsByLocationId } from "../controllers/emergencyContacts.controller.js";

const router = Router();

// GET /api/emergency-contacts/:locationId
router.get("/:locationId", getEmergencyContactsByLocationId);

export default router;
