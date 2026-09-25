/**
 * HydroGuard - Real-Time Hydrological & River Data Service (Step 11)
 *
 * Provides decoupled river discharge / stage ingestion, station-specific threshold normalization,
 * and in-memory TTL caching.
 *
 * NOTE: River flood risk normalization requires station-specific threshold tiers
 * (warning, danger, extreme) and is an explainable engineering MVP heuristic.
 */

import { config } from "../config/index.js";

/**
 * Deterministic hydrological fallback used only when live and cached hydrology are unavailable.
 * Does not claim an official named gauge or station identity.
 */
export const HYDROLOGY_FALLBACK_VALUES = {
  riverLevel: 3.8,
  normalizedRiverRisk: 62,
  dischargeM3s: 145,
  unit: "m"
};

/**
 * Returns deterministic fallback hydrological dataset
 */
export function getRegionalHydrologyFallback() {
  return {
    riverLevel: HYDROLOGY_FALLBACK_VALUES.riverLevel,
    normalizedRiverRisk: HYDROLOGY_FALLBACK_VALUES.normalizedRiverRisk,
    dischargeM3s: HYDROLOGY_FALLBACK_VALUES.dischargeM3s,
    unit: HYDROLOGY_FALLBACK_VALUES.unit,
    station: null,
    observedAt: new Date().toISOString(),
    source: "Regional hydrological baseline",
    cached: false,
    isFallback: true,
    sourceType: "FALLBACK"
  };
}

export function getKathmanduHydrologyFallback() {
  return getRegionalHydrologyFallback();
}

/**
 * Returns the same deterministic hydrology fallback for any location.
 * Used only after live and cached hydrology are unavailable.
 */
export function getLocationHydrologyFallback() {
  return getRegionalHydrologyFallback();
}

// Calibrated Hydrological Monitoring Station Registry for Primary Monitored Zones
export const RIVER_STATIONS = [
  {
    id: "station-mumbai-mithi",
    name: "Mithi River Basin Station",
    region: "Mumbai",
    latitude: 19.0760,
    longitude: 72.8777,
    riverName: "Mithi River",
    unit: "m",
    baselineLevel: 1.5,
    warningLevel: 3.5,
    dangerLevel: 5.0,
    extremeLevel: 7.0
  },
  {
    id: "station-nashik-godavari",
    name: "Godavari River Panchavati Station",
    region: "Nashik",
    latitude: 19.9975,
    longitude: 73.7898,
    riverName: "Godavari River",
    unit: "m",
    baselineLevel: 2.0,
    warningLevel: 5.0,
    dangerLevel: 7.5,
    extremeLevel: 10.0
  },
  {
    id: "station-delhi-yamuna",
    name: "Yamuna Old Railway Bridge Station",
    region: "New Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    riverName: "Yamuna River",
    unit: "m",
    baselineLevel: 2.5,
    warningLevel: 5.5,
    dangerLevel: 8.0,
    extremeLevel: 11.0
  },
  {
    id: "station-uttarkashi-bhagirathi",
    name: "Bhagirathi Alpine Gorge Station",
    region: "Uttarkashi",
    latitude: 30.7268,
    longitude: 78.4354,
    riverName: "Bhagirathi River",
    unit: "m",
    baselineLevel: 3.0,
    warningLevel: 6.5,
    dangerLevel: 9.0,
    extremeLevel: 12.0
  },
  {
    id: "station-chamoli-alaknanda",
    name: "Alaknanda River Catchment Station",
    region: "Chamoli",
    latitude: 30.4000,
    longitude: 79.3300,
    riverName: "Alaknanda River",
    unit: "m",
    baselineLevel: 4.0,
    warningLevel: 8.0,
    dangerLevel: 11.5,
    extremeLevel: 15.0
  }
];

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers (Haversine Formula)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the nearest calibrated hydrological station within maximum radius (default 65 km)
 */
export function findNearestStation(latitude, longitude, maxRadiusKm = 65) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  let nearest = null;
  let minDistance = Infinity;

  for (const station of RIVER_STATIONS) {
    const dist = calculateDistanceKm(lat, lon, station.latitude, station.longitude);
    if (dist < minDistance && dist <= maxRadiusKm) {
      minDistance = dist;
      nearest = { ...station, distanceKm: dist };
    }
  }

  return nearest;
}

/**
 * Normalizes measured river level/stage into the 0-100 Risk Engine input scale
 * using station-specific contextual threshold tiers.
 *
 * Tier Mapping:
 * - Level <= baselineLevel            => 0 to 25 (Normal / Low)
 * - baseline < Level <= warningLevel  => 26 to 50 (Moderate / Advisory)
 * - warning < Level <= dangerLevel    => 51 to 75 (High / Bankfull)
 * - danger < Level <= extremeLevel    => 76 to 90 (Critical / Severe Inundation)
 * - Level > extremeLevel              => 91 to 100 (Extreme Overtopping)
 *
 * @param {number|string} rawValue - Measured river height in meters
 * @param {Object} context - Station threshold metadata { baselineLevel, warningLevel, dangerLevel, extremeLevel }
 * @returns {number|null} Normalized score (0-100) or null if context is uncalibrated
 */
export function normalizeRiverLevel(rawValue, context) {
  const value = Number(rawValue);

  if (isNaN(value) || value < 0) {
    return 0;
  }

  // Without station-specific threshold tiers, absolute river level cannot be safely normalized
  if (
    !context ||
    typeof context.warningLevel !== "number" ||
    typeof context.dangerLevel !== "number" ||
    typeof context.extremeLevel !== "number"
  ) {
    return null;
  }

  const baseline = Number(context.baselineLevel ?? 0);
  const warning = context.warningLevel;
  const danger = context.dangerLevel;
  const extreme = context.extremeLevel;

  let normalizedScore = 0;

  if (value <= baseline) {
    // 0 to baseline => maps to 0 - 25
    normalizedScore = baseline > 0 ? (value / baseline) * 25 : 0;
  } else if (value <= warning) {
    // baseline to warning => maps to 26 - 50
    const ratio = (value - baseline) / (warning - baseline);
    normalizedScore = 26 + ratio * 24;
  } else if (value <= danger) {
    // warning to danger => maps to 51 - 75
    const ratio = (value - warning) / (danger - warning);
    normalizedScore = 51 + ratio * 24;
  } else if (value <= extreme) {
    // danger to extreme => maps to 76 - 90
    const ratio = (value - danger) / (extreme - danger);
    normalizedScore = 76 + ratio * 14;
  } else {
    // > extreme => maps to 91 - 100
    const over = value - extreme;
    const ratio = Math.min(1, over / (extreme * 0.5 || 2.0));
    normalizedScore = 91 + ratio * 9;
  }

  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

// In-Memory Hydrological Cache
// Format: Map<string, { data: Object, expiresAt: number }>
const hydroCache = new Map();

function getHydroCacheKey(lat, lon) {
  return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
}

export function getCachedHydrology(latitude, longitude) {
  const key = getHydroCacheKey(latitude, longitude);
  const entry = hydroCache.get(key);

  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return { ...entry.data, cached: true };
    }
    hydroCache.delete(key);
  }
  return null;
}

export function setCachedHydrology(latitude, longitude, data, ttlMs = config.hydroCacheTtlMs) {
  const key = getHydroCacheKey(latitude, longitude);
  hydroCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlMs || 300000)
  });
}

export function clearHydroCache() {
  hydroCache.clear();
}

export function getHydroCacheStats() {
  return {
    size: hydroCache.size,
    ttlMs: config.hydroCacheTtlMs
  };
}

/**
 * Fetches hydrological discharge and stage telemetry from Open-Meteo GloFAS / Flood API
 */
async function fetchGlofasHydrology(lat, lon, station, timeoutMs = 6000) {
  const baseUrl = config.hydroApiUrl || "https://flood-api.open-meteo.com/v1/flood";
  const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Hydrology provider returned HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();

    if (!payload || !payload.daily) {
      throw new Error("Invalid response schema from hydrology provider");
    }

    const discharge = Number(payload.daily.river_discharge?.[0] ?? payload.daily.river_discharge_mean?.[0] ?? 0);
    const meanDischarge = Number(payload.daily.river_discharge_mean?.[0] || 1);

    // Calculate stage estimation from discharge ratio against station baseline & warning tiers
    const dischargeRatio = discharge / (meanDischarge > 0 ? meanDischarge : 1);
    const baseline = station.baselineLevel || 1.5;
    const warning = station.warningLevel || 4.0;

    // Derived river level in meters
    const estimatedLevel = Math.max(
      0.1,
      Math.round((baseline + (warning - baseline) * Math.max(0, dischargeRatio - 0.5) * 0.6) * 10) / 10
    );

    const normalizedRiverRisk = normalizeRiverLevel(estimatedLevel, station);

    if (normalizedRiverRisk === null) {
      throw new Error("Unable to calibrate river risk from station thresholds");
    }

    return {
      riverLevel: estimatedLevel,
      normalizedRiverRisk,
      dischargeM3s: Math.round(discharge * 10) / 10,
      unit: station.unit || "m",
      station: {
        id: station.id,
        name: station.name,
        riverName: station.riverName,
        distanceKm: station.distanceKm
      },
      thresholds: {
        baselineLevel: station.baselineLevel,
        warningLevel: station.warningLevel,
        dangerLevel: station.dangerLevel,
        extremeLevel: station.extremeLevel
      },
      observedAt: new Date().toISOString(),
      source: "Open-Meteo GloFAS Hydrology API"
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Hydrology provider request timed out");
    }
    throw error;
  }
}

/**
 * Public method to get normalized real-time hydrological data for coordinates
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object} [options]
 * @returns {Promise<{
 *   riverLevel: number,
 *   normalizedRiverRisk: number,
 *   dischargeM3s?: number,
 *   unit: string,
 *   station: Object,
 *   observedAt: string,
 *   source: string,
 *   cached: boolean
 * }>}
 */
export async function getHydrologyData(latitude, longitude, options = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error("Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.");
    error.statusCode = 400;
    throw error;
  }

  // 1. Check in-memory cache
  if (!options.bypassCache) {
    const cached = getCachedHydrology(lat, lon);
    if (cached) {
      return cached;
    }
  }

  try {
    // 2. Identify nearest calibrated hydrological station
    const station = findNearestStation(lat, lon);

    if (!station) {
      const err = new Error("No nearby calibrated river monitoring station within coverage radius.");
      err.statusCode = 404;
      err.isStationUnavailable = true;
      throw err;
    }

    // 3. Ingest live hydrological telemetry
    const data = await fetchGlofasHydrology(lat, lon, station, options.timeoutMs);

    // 4. Cache telemetry
    setCachedHydrology(lat, lon, data);

    return {
      ...data,
      cached: false,
      sourceType: "LIVE"
    };
  } catch (providerErr) {
    return getLocationHydrologyFallback();
  }
}

export default {
  getHydrologyData,
  getKathmanduHydrologyFallback,
  getLocationHydrologyFallback,
  normalizeRiverLevel,
  findNearestStation,
  calculateDistanceKm,
  getCachedHydrology,
  setCachedHydrology,
  clearHydroCache,
  getHydroCacheStats,
  RIVER_STATIONS
};
