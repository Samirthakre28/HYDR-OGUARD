/**
 * HydroGuard - Data Validation, Freshness & Provenance Hardening Service (Step 17)
 *
 * Provides central validation boundaries for:
 * 1. Physical environmental metrics & explicit unit constraints
 * 2. Coordinate boundaries and location isolation matching
 * 3. ISO timestamp format and clock-skew tolerance checking
 * 4. Provider-specific freshness tier evaluation (FRESH, AGING, STALE, UNKNOWN)
 * 5. Replay / duplicate observation detection
 * 6. Risk Engine Input Gate boundary to prevent invalid calculation inputs
 * 7. Normalized environmental signal descriptor generation
 */

// Freshness Tiers & State Constants
export const FRESHNESS_STATES = {
  FRESH: "FRESH",
  AGING: "AGING",
  STALE: "STALE",
  UNKNOWN: "UNKNOWN"
};

// Data Status Taxonomy
export const DATA_STATUS = {
  LIVE: "LIVE",
  CACHED: "CACHED",
  STORED: "STORED",
  FALLBACK: "FALLBACK",
  UNAVAILABLE: "UNAVAILABLE"
};

/**
 * Checks if coordinate pair matches Kathmandu location boundary
 */
export function isKathmanduCoords(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || isNaN(lon)) return false;
  return Math.abs(lat - 27.7172) < 0.1 && Math.abs(lon - 85.3240) < 0.1;
}

// Provider-specific Freshness Thresholds (in Milliseconds)
export const FRESHNESS_THRESHOLDS = {
  WEATHER: {
    FRESH_MAX_MS: 30 * 60 * 1000,      // <= 30 minutes: Fresh
    AGING_MAX_MS: 120 * 60 * 1000      // 30 min to 2 hours: Aging, > 2 hours: Stale
  },
  HYDROLOGY: {
    FRESH_MAX_MS: 60 * 60 * 1000,      // <= 60 minutes: Fresh
    AGING_MAX_MS: 240 * 60 * 1000      // 1 to 4 hours: Aging, > 4 hours: Stale
  },
  SEISMIC: {
    FRESH_MAX_MS: 60 * 60 * 1000,      // <= 60 minutes: Fresh
    AGING_MAX_MS: 360 * 60 * 1000      // 1 to 6 hours: Aging, > 6 hours: Stale
  },
  DEFAULT: {
    FRESH_MAX_MS: 60 * 60 * 1000,
    AGING_MAX_MS: 180 * 60 * 1000
  }
};

// Maximum Allowed Clock Skew for Future Timestamps (5 minutes)
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

// Maximum Physical Feasibility Ranges for Environmental Metrics
export const PHYSICAL_METRIC_BOUNDS = {
  rainfall: { min: 0, max: 500, unit: "mm" },                // 0 to 500 mm in single interval
  riverLevel: { min: 0, max: 100, unit: "m" },               // 0 to 100 meters
  discharge: { min: 0, max: 200000, unit: "m³/s" },          // 0 to 200,000 m³/s
  seismicMagnitude: { min: 0, max: 10.0, unit: "M" },        // 0 to 10.0 Moment Magnitude
  seismicActivity: { min: 0, max: 100, unit: "score (0-100)" }, // 0 to 100 scale
  slope: { min: 0, max: 100, unit: "score (0-100)" },        // 0 to 100 scale
  elevation: { min: -500, max: 9000, unit: "m" },            // -500m to 9000m (Dead Sea to Everest)
  historicalRisk: { min: 0, max: 100, unit: "score (0-100)" } // 0 to 100 scale
};

/**
 * Validates geographic coordinate values.
 * Latitude must be within [-90, +90] and Longitude within [-180, +180].
 *
 * @param {number|string} latitude
 * @param {number|string} longitude
 * @returns {{ isValid: boolean, latitude?: number, longitude?: number, error?: string }}
 */
export function validateCoordinates(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined || latitude === "" || longitude === "") {
    return { isValid: false, error: "Coordinates are required." };
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (typeof lat !== "number" || isNaN(lat) || !isFinite(lat)) {
    return { isValid: false, error: `Invalid latitude: '${latitude}'. Must be a finite number.` };
  }

  if (typeof lon !== "number" || isNaN(lon) || !isFinite(lon)) {
    return { isValid: false, error: `Invalid longitude: '${longitude}'. Must be a finite number.` };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: `Latitude ${lat} out of bounds. Must be between -90 and 90.` };
  }

  if (lon < -180 || lon > 180) {
    return { isValid: false, error: `Longitude ${lon} out of bounds. Must be between -180 and 180.` };
  }

  return { isValid: true, latitude: lat, longitude: lon };
}

/**
 * Validates an incoming timestamp string or Date object.
 * Checks for validity, ISO parseability, and impossible future timestamps beyond clock skew.
 *
 * @param {string|number|Date} rawTimestamp
 * @param {number} [maxFutureSkewMs=MAX_FUTURE_CLOCK_SKEW_MS]
 * @returns {{ isValid: boolean, parsedDate?: Date, isoString?: string, isFutureSkew: boolean, error?: string }}
 */
export function validateTimestamp(rawTimestamp, maxFutureSkewMs = MAX_FUTURE_CLOCK_SKEW_MS) {
  if (!rawTimestamp) {
    return { isValid: false, isFutureSkew: false, error: "Timestamp is missing." };
  }

  const parsed = new Date(rawTimestamp);
  const timeMs = parsed.getTime();

  if (isNaN(timeMs)) {
    return { isValid: false, isFutureSkew: false, error: `Malformed timestamp: '${rawTimestamp}'.` };
  }

  const nowMs = Date.now();
  if (timeMs > nowMs + maxFutureSkewMs) {
    return {
      isValid: false,
      parsedDate: parsed,
      isoString: parsed.toISOString(),
      isFutureSkew: true,
      error: `Timestamp is future-dated beyond clock skew tolerance (${Math.round((timeMs - nowMs) / 1000)}s ahead).`
    };
  }

  return {
    isValid: true,
    parsedDate: parsed,
    isoString: parsed.toISOString(),
    isFutureSkew: false
  };
}

/**
 * Evaluates the freshness tier of an observation based on observedAt timestamp and provider type.
 *
 * @param {string|Date} observedAt - Observation timestamp
 * @param {'WEATHER'|'HYDROLOGY'|'SEISMIC'|'DEFAULT'} [providerType='DEFAULT']
 * @param {number} [customNowMs] - Optional timestamp for testing
 * @returns {{ freshness: 'FRESH'|'AGING'|'STALE'|'UNKNOWN', ageMs: number|null, ageMinutes: number|null, reason?: string }}
 */
export function evaluateFreshness(observedAt, providerType = "DEFAULT", customNowMs) {
  const tsValidation = validateTimestamp(observedAt);

  if (!tsValidation.isValid) {
    return {
      freshness: FRESHNESS_STATES.UNKNOWN,
      ageMs: null,
      ageMinutes: null,
      reason: tsValidation.error || "Timestamp invalid or missing"
    };
  }

  const nowMs = customNowMs !== undefined ? customNowMs : Date.now();
  const observedMs = tsValidation.parsedDate.getTime();
  const ageMs = Math.max(0, nowMs - observedMs);
  const ageMinutes = Math.round((ageMs / (60 * 1000)) * 10) / 10;

  const thresholds = FRESHNESS_THRESHOLDS[providerType.toUpperCase()] || FRESHNESS_THRESHOLDS.DEFAULT;

  if (ageMs <= thresholds.FRESH_MAX_MS) {
    return { freshness: FRESHNESS_STATES.FRESH, ageMs, ageMinutes };
  }

  if (ageMs <= thresholds.AGING_MAX_MS) {
    return { freshness: FRESHNESS_STATES.AGING, ageMs, ageMinutes };
  }

  return { freshness: FRESHNESS_STATES.STALE, ageMs, ageMinutes };
}

/**
 * Validates a physical metric value and its unit against expected operational bounds.
 *
 * @param {string} metricName - Key from PHYSICAL_METRIC_BOUNDS
 * @param {number|string} rawValue - Numerical value
 * @param {string} [unit] - Expected unit string
 * @returns {{ isValid: boolean, value?: number, unit?: string, error?: string }}
 */
export function validatePhysicalMetric(metricName, rawValue, unit) {
  const bounds = PHYSICAL_METRIC_BOUNDS[metricName];
  if (!bounds) {
    return { isValid: false, error: `Unknown metric type: '${metricName}'.` };
  }

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return { isValid: false, error: `Metric '${metricName}' value is missing.` };
  }

  const num = Number(rawValue);

  if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: `Metric '${metricName}' must be a finite number. Received: '${rawValue}'.` };
  }

  if (num < bounds.min) {
    return {
      isValid: false,
      error: `Metric '${metricName}' cannot be less than ${bounds.min} ${bounds.unit}. Received: ${num}.`
    };
  }

  if (num > bounds.max) {
    return {
      isValid: false,
      error: `Metric '${metricName}' exceeds maximum physical limit of ${bounds.max} ${bounds.unit}. Received: ${num}.`
    };
  }

  // Unit mismatch check if unit was explicitly supplied
  if (unit && typeof unit === "string" && unit.toLowerCase() !== bounds.unit.toLowerCase()) {
    return {
      isValid: false,
      error: `Unit mismatch for '${metricName}'. Expected '${bounds.unit}', received '${unit}'.`
    };
  }

  return {
    isValid: true,
    value: num,
    unit: bounds.unit
  };
}

/**
 * Calculates Haversine great-circle distance between two coordinate pairs in km.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates that data from a provider or cache belongs to the requested location.
 * Prevents cross-location contamination (e.g. Mumbai request receiving Tokyo data).
 *
 * @param {{ latitude: number, longitude: number, locationId?: string }} requested
 * @param {{ latitude: number, longitude: number, locationId?: string }} received
 * @param {number} [maxAllowedDistanceKm=100]
 * @returns {{ isMatch: boolean, distanceKm?: number, error?: string }}
 */
export function validateLocationMatch(requested, received, maxAllowedDistanceKm = 100) {
  if (!requested || !received) {
    return { isMatch: false, error: "Requested and received location details are required." };
  }

  // If explicit locationId is present on both, verify direct match
  if (requested.locationId && received.locationId) {
    const reqId = String(requested.locationId);
    const recId = String(received.locationId);
    if (reqId !== recId) {
      return {
        isMatch: false,
        error: `Location ID mismatch: requested '${reqId}', received '${recId}'.`
      };
    }
  }

  const reqCoords = validateCoordinates(requested.latitude, requested.longitude);
  const recCoords = validateCoordinates(received.latitude, received.longitude);

  if (!reqCoords.isValid) {
    return { isMatch: false, error: `Invalid requested coordinates: ${reqCoords.error}` };
  }

  if (!recCoords.isValid) {
    return { isMatch: false, error: `Invalid received coordinates: ${recCoords.error}` };
  }

  const distanceKm = Math.round(calculateDistance(
    reqCoords.latitude,
    reqCoords.longitude,
    recCoords.latitude,
    recCoords.longitude
  ) * 10) / 10;

  if (distanceKm > maxAllowedDistanceKm) {
    return {
      isMatch: false,
      distanceKm,
      error: `Location coordinate drift of ${distanceKm}km exceeds maximum allowed threshold of ${maxAllowedDistanceKm}km.`
    };
  }

  return { isMatch: true, distanceKm };
}

/**
 * Detects duplicate/replay observations without fabricating new timestamps.
 *
 * @param {Object} previousObs
 * @param {Object} currentObs
 * @returns {{ isDuplicate: boolean, reason?: string }}
 */
export function detectDuplicateObservation(previousObs, currentObs) {
  if (!previousObs || !currentObs) {
    return { isDuplicate: false };
  }

  const prevTime = previousObs.observedAt ? new Date(previousObs.observedAt).getTime() : null;
  const currTime = currentObs.observedAt ? new Date(currentObs.observedAt).getTime() : null;

  if (prevTime && currTime && prevTime === currTime) {
    // Exact identical observation timestamp
    return {
      isDuplicate: true,
      reason: "Observation timestamp matches previous record exactly (replayed data)."
    };
  }

  return { isDuplicate: false };
}

/**
 * Structured Normalization Helper for Environmental Signals.
 * Produces consistent metadata across rainfall, hydrology, seismic, terrain, and historical indicators.
 *
 * @param {Object} params
 * @param {number} params.value - Physical or normalized value
 * @param {string} params.unit - Physical unit (mm, m, °C, km/h, etc.)
 * @param {string} params.source - Provenance source label
 * @param {string|Date} [params.observedAt] - ISO timestamp of actual observation
 * @param {string} [params.locationId] - Location ID
 * @param {number} [params.latitude] - Monitored latitude
 * @param {number} [params.longitude] - Monitored longitude
 * @param {'LIVE'|'CACHED'|'STORED'|'UNAVAILABLE'} [params.status='LIVE'] - Telemetry status
 * @param {'WEATHER'|'HYDROLOGY'|'SEISMIC'|'DEFAULT'} [params.providerType='DEFAULT'] - Provider category
 * @returns {Object} Structured environmental signal descriptor
 */
export function normalizeEnvironmentalSignal({
  value,
  unit,
  source,
  observedAt = null,
  locationId = null,
  latitude = null,
  longitude = null,
  status = DATA_STATUS.LIVE,
  providerType = "DEFAULT"
}) {
  const freshnessReport = observedAt ? evaluateFreshness(observedAt, providerType) : { freshness: FRESHNESS_STATES.UNKNOWN, ageMs: null, ageMinutes: null };

  return {
    value: typeof value === "number" && !isNaN(value) ? value : null,
    unit: unit || "dimensionless",
    source: source || (status === DATA_STATUS.STORED ? "stored_demo_data" : "unknown_source"),
    observedAt: observedAt ? new Date(observedAt).toISOString() : null,
    locationId: locationId ? String(locationId) : null,
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    status: status || (source?.includes("stored") ? DATA_STATUS.STORED : DATA_STATUS.LIVE),
    freshness: status === DATA_STATUS.STORED ? FRESHNESS_STATES.UNKNOWN : freshnessReport.freshness,
    ageMinutes: freshnessReport.ageMinutes
  };
}

/**
 * Risk Engine Input Gate Boundary.
 * Validates all required inputs before they enter the deterministic risk engine.
 * Guarantees that corrupted, negative, NaN, Infinity, or missing parameters are blocked safely.
 *
 * @param {Object} rawInputs - Raw risk engine parameters
 * @returns {{
 *   valid: boolean,
 *   normalized?: {
 *     rainfall: number,
 *     riverLevel: number,
 *     slope: number,
 *     elevation: number,
 *     historicalRisk: number,
 *     seismicActivity: number
 *   },
 *   missingFields: string[],
 *   invalidFields: string[],
 *   warnings: string[]
 * }}
 */
export function validateRiskEngineInputGate(rawInputs) {
  const missingFields = [];
  const invalidFields = [];
  const warnings = [];

  if (!rawInputs || typeof rawInputs !== "object" || Array.isArray(rawInputs)) {
    return {
      valid: false,
      missingFields: ["rainfall", "riverLevel", "slope", "elevation", "historicalRisk", "seismicActivity"],
      invalidFields: ["body"],
      warnings: ["Request body must be a valid JSON object."]
    };
  }

  const requiredFields = [
    "rainfall",
    "riverLevel",
    "slope",
    "elevation",
    "historicalRisk",
    "seismicActivity"
  ];

  const normalized = {};

  for (const field of requiredFields) {
    const val = rawInputs[field];

    if (val === undefined || val === null || val === "") {
      missingFields.push(field);
      continue;
    }

    const num = Number(val);

    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
      invalidFields.push(`${field} (not a finite number: '${val}')`);
      continue;
    }

    if (num < 0 || num > 100) {
      invalidFields.push(`${field} (out of 0-100 range: ${num})`);
      continue;
    }

    normalized[field] = num;
  }

  const isValid = missingFields.length === 0 && invalidFields.length === 0;

  return {
    valid: isValid,
    normalized: isValid ? normalized : undefined,
    missingFields,
    invalidFields,
    warnings
  };
}

export default {
  validateCoordinates,
  validateTimestamp,
  evaluateFreshness,
  validatePhysicalMetric,
  validateLocationMatch,
  detectDuplicateObservation,
  normalizeEnvironmentalSignal,
  validateRiskEngineInputGate,
  isKathmanduCoords,
  FRESHNESS_STATES,
  DATA_STATUS,
  FRESHNESS_THRESHOLDS,
  PHYSICAL_METRIC_BOUNDS,
  MAX_FUTURE_CLOCK_SKEW_MS
};
