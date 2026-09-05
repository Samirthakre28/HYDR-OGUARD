import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

export const FALLBACK_LOCATIONS = [
  {
    _id: "kathmandu-np",
    id: "kathmandu-np",
    name: "Kathmandu",
    region: "Bagmati Province",
    country: "Nepal",
    latitude: 27.7172,
    longitude: 85.3240,
    elevation: 1400
  },
  {
    _id: "mumbai-in",
    id: "mumbai-in",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    elevation: 14
  },
  {
    _id: "nashik-in",
    id: "nashik-in",
    name: "Nashik",
    region: "Maharashtra",
    country: "India",
    latitude: 19.9975,
    longitude: 73.7898,
    elevation: 584
  },
  {
    _id: "delhi-in",
    id: "delhi-in",
    name: "New Delhi",
    region: "National Capital Region",
    country: "India",
    latitude: 28.6139,
    longitude: 77.2090,
    elevation: 216
  },
  {
    _id: "uttarkashi-in",
    id: "uttarkashi-in",
    name: "Uttarkashi",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.7268,
    longitude: 78.4354,
    elevation: 1158
  },
  {
    _id: "chamoli-in",
    id: "chamoli-in",
    name: "Chamoli",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.4000,
    longitude: 79.3300,
    elevation: 1550
  },
  {
    _id: "tokyo-jp",
    id: "tokyo-jp",
    name: "Tokyo",
    region: "Kanto",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    elevation: 40
  },
  {
    _id: "london-uk",
    id: "london-uk",
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    elevation: 35
  }
];

/**
 * @desc    Get all available locations
 * @route   GET /api/locations
 * @access  Public
 */
export const getAllLocations = async (req, res, next) => {
  try {
    let locations = [];
    try {
      locations = await Location.find().sort({ name: 1 });
    } catch (_) {}

    if (!locations || locations.length === 0) {
      locations = FALLBACK_LOCATIONS;
    }

    return res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      count: FALLBACK_LOCATIONS.length,
      data: FALLBACK_LOCATIONS
    });
  }
};

/**
 * @desc    Get single location by ID or Name
 * @route   GET /api/locations/:id
 * @access  Public
 */
export const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let location = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      location = await Location.findById(id);
    }

    if (!location && typeof id === "string") {
      const escapedPrefix = escapeRegex(id.split("-")[0]);
      try {
        location = await Location.findOne({
          name: { $regex: new RegExp(`^${escapedPrefix}$`, "i") }
        });
      } catch (_) {}
    }

    if (!location) {
      location = FALLBACK_LOCATIONS.find(
        (l) => l.id === id || l._id === id || l.name.toLowerCase() === id.toLowerCase() || id.toLowerCase().startsWith(l.name.toLowerCase())
      );
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location not found with ID: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    next(error);
  }
};
