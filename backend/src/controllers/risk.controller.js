import mongoose from "mongoose";
import { Location } from "../models/Location.js";
import { RiskData } from "../models/RiskData.js";
import {
  calculateAllRisks,
  validateRiskInput
} from "../services/riskEngine.service.js";
import {
  generateRiskExplanation,
  generateDeterministicExplanation,
  validateAIInput
} from "../services/aiExplanation.service.js";
import { FALLBACK_LOCATIONS } from "./location.controller.js";
import { getWeatherData, getLocationWeatherFallback } from "../services/weather.service.js";
import { getHydrologyData, getLocationHydrologyFallback } from "../services/hydrology.service.js";
import { getSeismicData, getLocationSeismicFallback } from "../services/seismic.service.js";
import {
  validateRiskEngineInputGate,
  evaluateFreshness,
  normalizeEnvironmentalSignal,
  validateLocationMatch,
  isKathmanduCoords,
  FRESHNESS_STATES,
  DATA_STATUS
} from "../services/dataValidation.service.js";
import { calculateRiskConfidence } from "../services/riskConfidence.service.js";
import { escapeRegex } from "../middleware/inputSanitizer.js";

/**
 * @desc    Get latest risk telemetry and dynamically calculate threat scores using the Step 5 Risk Engine
 *          Integrates real-time weather rainfall (Step 9), hydrological river telemetry (Step 11),
 *          and USGS seismic activity data (Step 12), with Step 17 Data Validation & Provenance Hardening.
 * @route   GET /api/risk/:locationId
 * @access  Public
 */
export const getRiskByLocationId = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    let location = null;

    // Check if locationId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(locationId)) {
      location = await Location.findById(locationId);
    }

    // Fallback: Check if locationId matches location name (case-insensitive) for flexible resolution
    if (!location && typeof locationId === "string") {
      const escapedPrefix = escapeRegex(locationId.split("-")[0]);
      location = await Location.findOne({
        name: { $regex: new RegExp(`^${escapedPrefix}$`, "i") }
      });
    }

    if (!location) {
      location = FALLBACK_LOCATIONS.find(
        (l) => l.id === locationId || l._id === locationId || l.name.toLowerCase() === locationId.toLowerCase() || locationId.toLowerCase().startsWith(l.name.toLowerCase())
      );
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location not found with identifier: ${locationId}`
      });
    }

    // Fetch latest stored risk record for baseline telemetry
    let riskRecord = await RiskData.findOne({ locationId: location._id }).sort({ updatedAt: -1, createdAt: -1 });

    if (!riskRecord) {
      const isKathmandu = isKathmanduCoords(location.latitude, location.longitude) || (location.name && location.name.toLowerCase().includes("kathmandu"));
      const safeLat = Number(location.latitude) || 20;
      const safeLon = Number(location.longitude) || 75;
      const seed = Math.abs(Math.sin(safeLat * 11.23 + safeLon * 47.51) * 12345.67) % 1;

      riskRecord = {
        rainfall: isKathmandu ? 78 : Math.round(35 + seed * 35),
        riverLevel: isKathmandu ? 62 : Math.round(30 + seed * 35),
        slope: isKathmandu ? 60 : Math.round(20 + seed * 45),
        elevation: isKathmandu ? 50 : Math.min(100, Math.max(10, Math.round((location.elevation || 200) / 25))),
        historicalRisk: isKathmandu ? 75 : Math.round(30 + seed * 40),
        seismicActivity: isKathmandu ? 38 : Math.round(20 + seed * 35)
      };
    }

    // Extract baseline input parameters for calculation engine
    const inputs = {
      rainfall: riskRecord.rainfall,
      riverLevel: riskRecord.riverLevel,
      slope: riskRecord.slope,
      elevation: riskRecord.elevation,
      historicalRisk: riskRecord.historicalRisk,
      seismicActivity: riskRecord.seismicActivity || 0
    };

    // Track explicit provenance for hackathon transparency (Steps 9, 11, 12, 17)
    const dataSources = {
      rainfall: "stored_demo_data",
      riverLevel: "stored_demo_data",
      slope: "stored_demo_data",
      elevation: "stored_location_data",
      historicalRisk: "stored_demo_data",
      seismicActivity: "stored_demo_data"
    };

    // Structured Environmental Signals registry (Step 17)
    const environmentalSignals = {
      slope: normalizeEnvironmentalSignal({
        value: riskRecord.slope,
        unit: "score (0-100)",
        source: "stored_demo_terrain",
        status: DATA_STATUS.STORED,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude
      }),
      elevation: normalizeEnvironmentalSignal({
        value: location.elevation || 0,
        unit: "m",
        source: "stored_location_elevation",
        status: DATA_STATUS.STORED,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude
      }),
      historicalRisk: normalizeEnvironmentalSignal({
        value: riskRecord.historicalRisk,
        unit: "score (0-100)",
        source: "stored_historical_risk",
        status: DATA_STATUS.STORED,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude
      })
    };

    let liveWeatherData = null;
    let liveHydroData = null;
    let liveSeismicData = null;

    // 1. Ingest live weather data to dynamically update the rainfall input source (Step 9 & 17)
    try {
      const weather = await getWeatherData(location.latitude, location.longitude);
      if (weather && typeof weather.normalizedRainfall === "number") {
        inputs.rainfall = weather.normalizedRainfall;
        dataSources.rainfall = weather.cached ? "cached_weather" : weather.isFallback ? "fallback_weather" : "weather_api";
        liveWeatherData = weather;

        environmentalSignals.rainfall = normalizeEnvironmentalSignal({
          value: weather.rainfall,
          unit: "mm",
          source: weather.source || "Open-Meteo Live API",
          observedAt: weather.observedAt,
          locationId: location._id,
          latitude: location.latitude,
          longitude: location.longitude,
          status: weather.cached ? DATA_STATUS.CACHED : weather.isFallback ? DATA_STATUS.FALLBACK : DATA_STATUS.LIVE,
          providerType: "WEATHER"
        });
      }
    } catch (weatherErr) {
      console.warn(`[HydroGuard Risk] Weather lookup fallback for ${location.name}:`, weatherErr.message);
      const fallbackWeather = getLocationWeatherFallback(location.name, location.latitude, location.longitude);
      inputs.rainfall = fallbackWeather.normalizedRainfall;
      dataSources.rainfall = "fallback_weather";
      liveWeatherData = fallbackWeather;
      environmentalSignals.rainfall = normalizeEnvironmentalSignal({
        value: fallbackWeather.rainfall,
        unit: "mm",
        source: fallbackWeather.source,
        observedAt: fallbackWeather.observedAt,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude,
        status: DATA_STATUS.FALLBACK,
        providerType: "WEATHER"
      });
    }

    // 2. Ingest live hydrological / river level telemetry (Step 11 & 17)
    try {
      const hydro = await getHydrologyData(location.latitude, location.longitude);
      if (hydro && typeof hydro.normalizedRiverRisk === "number") {
        inputs.riverLevel = hydro.normalizedRiverRisk;
        dataSources.riverLevel = hydro.cached ? "cached_hydrology" : hydro.isFallback ? "fallback_hydrology" : "hydrology_api";
        liveHydroData = hydro;

        environmentalSignals.riverLevel = normalizeEnvironmentalSignal({
          value: hydro.riverLevel,
          unit: hydro.unit || "m",
          source: hydro.source || "GloFAS River Gauges",
          observedAt: hydro.observedAt,
          locationId: location._id,
          latitude: location.latitude,
          longitude: location.longitude,
          status: hydro.cached ? DATA_STATUS.CACHED : hydro.isFallback ? DATA_STATUS.FALLBACK : DATA_STATUS.LIVE,
          providerType: "HYDROLOGY"
        });
      }
    } catch (hydroErr) {
      console.warn(`[HydroGuard Risk] Hydrology lookup fallback for ${location.name}:`, hydroErr.message);
      const fallbackHydro = getLocationHydrologyFallback(location.name, location.latitude, location.longitude);
      inputs.riverLevel = fallbackHydro.normalizedRiverRisk;
      dataSources.riverLevel = "fallback_hydrology";
      liveHydroData = fallbackHydro;
      environmentalSignals.riverLevel = normalizeEnvironmentalSignal({
        value: fallbackHydro.riverLevel,
        unit: fallbackHydro.unit || "m",
        source: fallbackHydro.source,
        observedAt: fallbackHydro.observedAt,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude,
        status: DATA_STATUS.FALLBACK,
        providerType: "HYDROLOGY"
      });
    }

    // 3. Ingest live seismic activity observations (Step 12 & 17)
    try {
      const seismic = await getSeismicData(location.latitude, location.longitude);
      if (seismic && typeof seismic.activityScore === "number") {
        inputs.seismicActivity = seismic.activityScore;
        dataSources.seismicActivity = seismic.cached ? "cached_seismic" : seismic.isFallback ? "fallback_seismic" : "seismic_api";
        liveSeismicData = seismic;

        environmentalSignals.seismicActivity = normalizeEnvironmentalSignal({
          value: seismic.activityScore,
          unit: "score (0-100)",
          source: seismic.source || "USGS Earthquake Catalog",
          observedAt: seismic.observedAt,
          locationId: location._id,
          latitude: location.latitude,
          longitude: location.longitude,
          status: seismic.cached ? DATA_STATUS.CACHED : seismic.isFallback ? DATA_STATUS.FALLBACK : DATA_STATUS.LIVE,
          providerType: "SEISMIC"
        });
      }
    } catch (seismicErr) {
      console.warn(`[HydroGuard Risk] Seismic lookup fallback for ${location.name}:`, seismicErr.message);
      const fallbackSeismic = getLocationSeismicFallback(location.name, location.latitude, location.longitude);
      inputs.seismicActivity = fallbackSeismic.activityScore;
      dataSources.seismicActivity = "fallback_seismic";
      liveSeismicData = fallbackSeismic;
      environmentalSignals.seismicActivity = normalizeEnvironmentalSignal({
        value: fallbackSeismic.activityScore,
        unit: "score (0-100)",
        source: fallbackSeismic.source,
        observedAt: fallbackSeismic.observedAt,
        locationId: location._id,
        latitude: location.latitude,
        longitude: location.longitude,
        status: DATA_STATUS.FALLBACK,
        providerType: "SEISMIC"
      });
    }

    // Validate inputs through the Step 17 Risk Engine Input Gate boundary
    const inputGate = validateRiskEngineInputGate(inputs);
    if (!inputGate.valid) {
      return res.status(400).json({
        success: false,
        message: "Risk engine input validation failed",
        errors: inputGate.invalidFields.concat(inputGate.missingFields)
      });
    }

    // Calculate dynamic risk scores using the single source of truth Risk Engine
    const calculatedRisk = calculateAllRisks(inputGate.normalized);

    // Annotate response with transparent data provenance, timestamps, live signals, and validation status
    calculatedRisk.dataSources = dataSources;
    calculatedRisk.environmentalSignals = environmentalSignals;
    calculatedRisk.dataFreshness = (liveWeatherData || liveHydroData || liveSeismicData) ? "live" : "fallback_baseline";
    calculatedRisk.lastUpdated = new Date().toISOString();
    if (liveWeatherData) {
      calculatedRisk.liveWeather = liveWeatherData;
    }
    if (liveHydroData) {
      calculatedRisk.riverData = {
        source: liveHydroData.source,
        station: liveHydroData.station?.name || "Regional Hydrological Station",
        distanceKm: liveHydroData.station?.distanceKm ?? 0,
        riverLevel: liveHydroData.riverLevel,
        normalizedRiverRisk: liveHydroData.normalizedRiverRisk,
        unit: liveHydroData.unit || "m",
        observedAt: liveHydroData.observedAt,
        cached: liveHydroData.cached ?? false
      };
    }
    if (liveSeismicData) {
      calculatedRisk.seismicData = {
        source: liveSeismicData.source,
        radiusKm: liveSeismicData.radiusKm,
        lookbackHours: liveSeismicData.lookbackHours,
        eventCount: liveSeismicData.eventCount,
        maxMagnitude: liveSeismicData.maxMagnitude,
        observedAt: liveSeismicData.observedAt,
        cached: liveSeismicData.cached ?? false
      };
    }

    // Calculate deterministic risk confidence and data reliability (Step 18)
    calculatedRisk.confidence = calculateRiskConfidence({
      inputs: inputGate.normalized,
      environmentalSignals,
      dataSources,
      risks: calculatedRisk
    });

    return res.status(200).json({
      success: true,
      data: {
        location,
        risk: calculatedRisk
      }
    });
  } catch (error) {
    next(error);
  }
};



/**
 * @desc    Calculate multi-hazard disaster risk scores dynamically from arbitrary environmental inputs
 * @route   POST /api/risk/calculate
 * @access  Public
 */
export const calculateRisk = (req, res, next) => {
  try {
    const validation = validateRiskInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid risk input",
        errors: validation.errors
      });
    }

    const calculatedRisk = calculateAllRisks(validation.normalized);

    // Attach deterministic confidence metrics (Step 18)
    calculatedRisk.confidence = calculateRiskConfidence({
      inputs: validation.normalized,
      risks: calculatedRisk
    });

    return res.status(200).json({
      success: true,
      data: calculatedRisk
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate AI-powered human-readable risk explanation and safety recommendations
 * @route   POST /api/risk/explanation
 * @access  Public
 */
export const getRiskExplanation = async (req, res, next) => {
  try {
    const { riskData } = req.body;

    // Validate risk data payload before invoking AI
    const validation = validateAIInput(riskData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid risk data provided for AI explanation",
        errors: validation.errors
      });
    }

    const result = await generateRiskExplanation(riskData);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.message,
        isConfigured: result.isConfigured ?? false
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};
