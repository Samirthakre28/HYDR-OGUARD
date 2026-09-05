import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { getWeatherData, getKathmanduWeatherFallback, getLocationWeatherFallback } from "../services/weather.service.js";
import { isKathmanduCoords } from "../services/dataValidation.service.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

/**
 * @desc    Fetch real-time normalized environmental weather data for a specific location
 * @route   GET /api/weather/:locationId
 * @access  Public
 */
export const getWeatherByLocationId = async (req, res, next) => {
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

    // 2. Query decoupled Weather Service
    try {
      const weatherData = await getWeatherData(location.latitude, location.longitude);

      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          weather: {
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            rainfall: weatherData.rainfall,
            normalizedRainfall: weatherData.normalizedRainfall,
            windSpeed: weatherData.windSpeed,
            observedAt: weatherData.observedAt
          },
          source: weatherData.source,
          sourceType: weatherData.sourceType || (weatherData.cached ? "CACHED" : weatherData.isFallback ? "FALLBACK" : "LIVE"),
          cached: weatherData.cached ?? false,
          isFallback: weatherData.isFallback ?? false
        }
      });
    } catch (weatherErr) {
      // 3. Graceful Fallback - Do not crash, return controlled deterministic fallback
      const fallback = getLocationWeatherFallback(location.name, location.latitude, location.longitude);
      return res.status(200).json({
        success: true,
        data: {
          locationId: location._id,
          locationName: location.name,
          weather: {
            temperature: fallback.temperature,
            humidity: fallback.humidity,
            rainfall: fallback.rainfall,
            normalizedRainfall: fallback.normalizedRainfall,
            windSpeed: fallback.windSpeed,
            observedAt: fallback.observedAt
          },
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
  getWeatherByLocationId
};
