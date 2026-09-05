import { Router } from "express";
import healthRoutes from "./health.routes.js";
import locationRoutes from "./location.routes.js";
import riskRoutes from "./risk.routes.js";
import alertRoutes from "./alert.routes.js";
import emergencyRoutes from "./emergency.routes.js";
import emergencyContactsRoutes from "./emergencyContacts.routes.js";
import weatherRoutes from "./weather.routes.js";
import hydrologyRoutes from "./hydrology.routes.js";
import seismicRoutes from "./seismic.routes.js";
import validationRoutes from "./validation.routes.js";
import demoRoutes from "./demo.routes.js";
import mlRoutes from "./ml.routes.js";

const router = Router();

// Mount API routes
router.use("/health", healthRoutes);
router.use("/locations", locationRoutes);
router.use("/risk", riskRoutes);
router.use("/alerts", alertRoutes);
router.use("/emergency", emergencyRoutes);
router.use("/emergency-contacts", emergencyContactsRoutes);
router.use("/weather", weatherRoutes);
router.use("/hydrology", hydrologyRoutes);
router.use("/seismic", seismicRoutes);
router.use("/validation", validationRoutes);
router.use("/demo", demoRoutes);
router.use("/ml", mlRoutes);

export default router;



