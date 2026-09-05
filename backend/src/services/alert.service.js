import mongoose from "mongoose";
import { Alert } from "../models/Alert.js";

/**
 * HydroGuard - Smart Alert Engine Service
 *
 * Generates authoritative early-warning safety alerts and advisory notifications
 * based directly on the deterministic risk calculation engine outputs.
 */

const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Evaluates risk calculations and generates or records an authoritative alert.
 * @param {Object} riskData - Calculated risk engine results
 * @param {Object} location - Location model document
 * @returns {Promise<Object>} Formatted alert object
 */
export async function generateRiskAlert(riskData, location) {
  if (!riskData || !riskData.overall) {
    throw new Error("Valid calculated riskData is required to generate an alert.");
  }

  const severity = riskData.overall.level || "LOW";
  const locationName = location?.name || "Selected Region";
  const locationId = location?._id || location?.id;

  // Identify specific elevated hazards (score >= 51: HIGH or CRITICAL)
  const hazardTypes = [];
  if (riskData.flood?.score >= 51) hazardTypes.push("Flood");
  if (riskData.landslide?.score >= 51) hazardTypes.push("Landslide");
  if (riskData.seismic?.score >= 51) hazardTypes.push("Seismic");

  let hasAlert = false;
  let title = "Normal Baseline Conditions";
  let message = "No active emergency alert. Environmental indicators are within normal baseline ranges.";

  switch (severity) {
    case "CRITICAL":
      hasAlert = true;
      title = "Critical Disaster Risk";
      message = hazardTypes.length > 0
        ? `Multiple hazard indicators are significantly elevated for ${locationName} (${hazardTypes.join(", ")}). Follow official emergency guidance and evacuation instructions where applicable.`
        : `Critical risk assessment detected for ${locationName}. Follow official emergency instructions immediately.`;
      break;

    case "HIGH":
      hasAlert = true;
      title = "High Disaster Risk";
      message = hazardTypes.length > 0
        ? `Elevated disaster risk assessment detected for ${locationName} (${hazardTypes.join(", ")}). Monitor official advisories and prepare to take precautions.`
        : `Elevated disaster risk assessment detected for ${locationName}. Monitor official advisories and prepare precautionary actions.`;
      break;

    case "MODERATE":
      hasAlert = true;
      title = "Monitoring Advisory";
      message = `Elevated environmental indicators detected in ${locationName}. Conditions should be monitored for changes.`;
      break;

    case "LOW":
    default:
      hasAlert = false;
      title = "Normal Baseline Conditions";
      message = "No active emergency alert. Environmental indicators are within normal baseline ranges.";
      break;
  }

  const alertPayload = {
    hasAlert,
    severity,
    title,
    message,
    hazardTypes,
    location: locationName,
    locationId: locationId ? locationId.toString() : undefined,
    createdAt: new Date().toISOString()
  };

  // Only persist to MongoDB if database is actively connected
  if (hasAlert && locationId && mongoose.Types.ObjectId.isValid(locationId) && mongoose.connection.readyState === 1) {
    try {
      // Deduplication check: Has an alert with same severity and location been saved within 15 minutes?
      const cutoffTime = new Date(Date.now() - DEDUPLICATION_WINDOW_MS);
      const existingRecentAlert = await Alert.findOne({
        locationId,
        severity,
        createdAt: { $gte: cutoffTime }
      }).sort({ createdAt: -1 });

      if (!existingRecentAlert) {
        // Save new alert in history
        await Alert.create({
          locationId,
          severity,
          title,
          message,
          hazardTypes,
          createdAt: new Date()
        });
      }
    } catch (err) {
      console.warn("[HydroGuard Alert Engine] Could not persist alert history:", err.message);
    }
  }

  return alertPayload;
}

/**
 * Fetches recent historical alerts for a location.
 * @param {string|mongoose.Types.ObjectId} locationId
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function getAlertHistoryForLocation(locationId, limit = 20) {
  if (!locationId || !mongoose.Types.ObjectId.isValid(locationId) || mongoose.connection.readyState !== 1) {
    return [];
  }

  return Alert.find({ locationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export default {
  generateRiskAlert,
  getAlertHistoryForLocation
};
