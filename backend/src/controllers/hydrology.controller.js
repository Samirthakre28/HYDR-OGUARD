import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { getHydrologyData, getKathmanduHydrologyFallback, getLocationHydrologyFallback } from "../services/hydrology.service.js";
import { isKathmanduCoords } from "../services/dataValidation.service.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

/**
 * @desc    Fetch real-time normalized hydrological & river telemetry for a specific location
 * @route   GET /api/hydrology/:locationId
 * @access  Public
 */
export const getHydrologyByLocationId = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    let location = null;

    // 1. Resolve Location by MongoDB ObjectId or Name lookup
    if (mongoose.Types.ObjectId.isValid(locationId)) {
      location = await Location.findById(locationId);
    }

    if (!location && typeof locationId === "string") {
      const escapedPrefix = escapeRegex(locationId.split("-")[0]);
      location = await Location.findOne({
        name: { $regex: new RegExp(`^${escapedPrefix}$`, "i") }
      });
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location not found with identifier: ${locationId}`
      });
    }

    // 2. Query decoupled Hydrology Service
    try {
      const hydroData = await getHydrologyData(location.latitude, location.longitude);

      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          hydrology: {
            riverLevel: hydroData.riverLevel,
            normalizedRiverRisk: hydroData.normalizedRiverRisk,
            unit: hydroData.unit || "m",
            dischargeM3s: hydroData.dischargeM3s
          },
          station: hydroData.station,
          observedAt: hydroData.observedAt,
          source: hydroData.source,
          sourceType: hydroData.sourceType || (hydroData.cached ? "CACHED" : hydroData.isFallback ? "FALLBACK" : "LIVE"),
          cached: hydroData.cached ?? false,
          isFallback: hydroData.isFallback ?? false
        }
      });
    } catch (hydroErr) {
      // 3. Graceful Fallback - Return deterministic fallback if live provider fails
      const fallback = getLocationHydrologyFallback(location.name, location.latitude, location.longitude);
      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          hydrology: {
            riverLevel: fallback.riverLevel,
            normalizedRiverRisk: fallback.normalizedRiverRisk,
            unit: fallback.unit,
            dischargeM3s: fallback.dischargeM3s
          },
          station: fallback.station,
          observedAt: fallback.observedAt,
          source: fallback.source,
          sourceType: "FALLBACK",
          cached: false,
          isFallback: true
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export default {
  getHydrologyByLocationId
};
