import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { getSeismicData, getKathmanduSeismicFallback, getLocationSeismicFallback } from "../services/seismic.service.js";
import { isKathmanduCoords } from "../services/dataValidation.service.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

/**
 * @desc    Fetch real-time normalized seismic activity telemetry for a specific location
 * @route   GET /api/seismic/:locationId
 * @access  Public
 */
export const getSeismicByLocationId = async (req, res, next) => {
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

    // 2. Query decoupled Seismic Service
    try {
      const seismicData = await getSeismicData(location.latitude, location.longitude);

      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          seismic: {
            activityScore: seismicData.activityScore,
            eventCount: seismicData.eventCount,
            radiusKm: seismicData.radiusKm,
            lookbackHours: seismicData.lookbackHours,
            maxMagnitude: seismicData.maxMagnitude
          },
          recentEvents: seismicData.recentEvents,
          observedAt: seismicData.observedAt,
          source: seismicData.source,
          sourceType: seismicData.sourceType || (seismicData.cached ? "CACHED" : seismicData.isFallback ? "FALLBACK" : "LIVE"),
          cached: seismicData.cached ?? false,
          isFallback: seismicData.isFallback ?? false
        }
      });
    } catch (seismicErr) {
      // 3. Graceful Fallback - Return deterministic fallback if live provider fails
      const fallback = getLocationSeismicFallback(location.name, location.latitude, location.longitude);
      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          seismic: {
            activityScore: fallback.activityScore,
            eventCount: fallback.eventCount,
            radiusKm: fallback.radiusKm,
            lookbackHours: fallback.lookbackHours,
            maxMagnitude: fallback.maxMagnitude
          },
          recentEvents: fallback.recentEvents,
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
  getSeismicByLocationId
};
