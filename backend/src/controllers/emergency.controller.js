import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { EmergencyCenter } from "../models/EmergencyCenter.js";
import { processEmergencyFacilities } from "../services/emergency.service.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

/**
 * @desc    Get nearby emergency centers for a location with distance calculation and categorization
 * @route   GET /api/emergency/:locationId
 * @access  Public
 */
export const getEmergencyServices = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    let location = null;
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

    let rawServices = await EmergencyCenter.find({ locationId: location._id }).lean();

    // If no facilities exist in MongoDB for this location, provide fallback dummy facilities for Risk Map & Emergency Suite
    if (!Array.isArray(rawServices) || rawServices.length === 0) {
      const lat = location.latitude || 27.7172;
      const lon = location.longitude || 85.3240;

      rawServices = [
        {
          _id: `dummy-hospital-${location._id || "default"}`,
          name: `${location.name} Central Hospital & Emergency Triage`,
          type: "Hospital",
          address: `Main Medical Corridor, ${location.name}`,
          phone: "+977 (1) 4410111",
          availability: "24/7 ICU & Emergency Triage Active",
          latitude: lat + 0.0072,
          longitude: lon + 0.0058,
          isDemo: true
        },
        {
          _id: `dummy-shelter-${location._id || "default"}`,
          name: `${location.name} Community Disaster Shelter`,
          type: "Shelter",
          address: `High-Ground Refuge Zone, ${location.name}`,
          phone: "+977 (1) 4220222",
          availability: "Capacity: 800 Evacuees Ready",
          latitude: lat - 0.0065,
          longitude: lon - 0.0048,
          isDemo: true
        },
        {
          _id: `dummy-police-${location._id || "default"}`,
          name: `${location.name} Emergency Police Precinct`,
          type: "Police",
          address: `Civic Control Plaza, ${location.name}`,
          phone: "100",
          availability: "Rapid Action Unit On Duty",
          latitude: lat + 0.0045,
          longitude: lon - 0.0082,
          isDemo: true
        },
        {
          _id: `dummy-fire-${location._id || "default"}`,
          name: `${location.name} Fire & Rescue Station`,
          type: "Fire Station",
          address: `Municipal Fire Depot, ${location.name}`,
          phone: "101",
          availability: "Rescue Crews & Pumping Units Active",
          latitude: lat - 0.0058,
          longitude: lon + 0.0075,
          isDemo: true
        }
      ];
    }

    const { services, groupedServices } = processEmergencyFacilities(
      rawServices,
      location.latitude,
      location.longitude
    );

    return res.status(200).json({
      success: true,
      data: {
        locationId: location._id,
        locationName: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        isDemoData: rawServices.some((s) => s.isDemo !== false),
        count: services.length,
        services,
        groupedServices
      }
    });
  } catch (error) {
    next(error);
  }
};
