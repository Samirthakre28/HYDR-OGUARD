/**
 * HydroGuard - Risk Confidence & Data Reliability Service (Step 18)
 *
 * Evaluates a transparent, deterministic qualitative confidence level for
 * the HydroGuard risk assessment based on input data quality, freshness,
 * availability, and provenance.
 *
 * CONFIDENCE LEVELS:
 * - HIGH: All relevant feeds are active, valid, and fresh.
 * - MODERATE: Some feeds are cached, aging, or rely on stored baseline benchmarks.
 * - LOW: Key inputs are stale, degraded, or partially unavailable.
 * - UNKNOWN: Required telemetry is missing or unparseable.
 *
 * CRITICAL INVARIANT:
 * Confidence evaluates DATA RELIABILITY only and NEVER modifies, scales, or
 * weights the mathematical risk scores computed by the Risk Engine.
 */

import { FRESHNESS_STATES, DATA_STATUS } from "./dataValidation.service.js";

// Qualitative Confidence Levels
export const CONFIDENCE_LEVELS = {
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN"
};

// Source Coverage Levels
export const SOURCE_COVERAGE = {
  FULL: "FULL",         // All primary live telemetry feeds (Weather, Hydro, Seismic) active
  PARTIAL: "PARTIAL",   // 1-2 live feeds active, others cached/stored
  LIMITED: "LIMITED",   // Only stored baseline or cached snapshots available
  NONE: "NONE"          // No valid inputs available
};

/**
 * Evaluates hazard-specific confidence for Flood Risk.
 * Flood risk depends heavily on Rainfall (live) and River Level (live/station).
 */
function evaluateFloodConfidence(environmentalSignals, inputs) {
  const rainSignal = environmentalSignals?.rainfall;
  const riverSignal = environmentalSignals?.riverLevel;

  if (inputs?.rainfall === undefined || inputs?.riverLevel === undefined) {
    return CONFIDENCE_LEVELS.UNKNOWN;
  }

  const rainStatus = rainSignal?.status || DATA_STATUS.STORED;
  const riverStatus = riverSignal?.status || DATA_STATUS.STORED;
  const rainFresh = rainSignal?.freshness || FRESHNESS_STATES.UNKNOWN;
  const riverFresh = riverSignal?.freshness || FRESHNESS_STATES.UNKNOWN;

  // Stale or unavailable feeds
  if (rainStatus === DATA_STATUS.UNAVAILABLE || riverStatus === DATA_STATUS.UNAVAILABLE ||
      rainFresh === FRESHNESS_STATES.STALE || riverFresh === FRESHNESS_STATES.STALE) {
    return CONFIDENCE_LEVELS.LOW;
  }

  // Both live and fresh
  if (rainStatus === DATA_STATUS.LIVE && rainFresh === FRESHNESS_STATES.FRESH &&
      riverStatus === DATA_STATUS.LIVE && riverFresh === FRESHNESS_STATES.FRESH) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  // One live + one cached/aging/stored baseline
  if ((rainStatus === DATA_STATUS.LIVE || rainStatus === DATA_STATUS.CACHED) &&
      (riverStatus === DATA_STATUS.LIVE || riverStatus === DATA_STATUS.CACHED || riverStatus === DATA_STATUS.STORED)) {
    return CONFIDENCE_LEVELS.MODERATE;
  }

  return CONFIDENCE_LEVELS.MODERATE;
}

/**
 * Evaluates hazard-specific confidence for Landslide Risk.
 * Landslide risk depends on Rainfall (live/dynamic), Slope (stored terrain), and Elevation (location).
 */
function evaluateLandslideConfidence(environmentalSignals, inputs) {
  const rainSignal = environmentalSignals?.rainfall;

  if (inputs?.rainfall === undefined || inputs?.slope === undefined || inputs?.elevation === undefined) {
    return CONFIDENCE_LEVELS.UNKNOWN;
  }

  const rainStatus = rainSignal?.status || DATA_STATUS.STORED;
  const rainFresh = rainSignal?.freshness || FRESHNESS_STATES.UNKNOWN;

  if (rainStatus === DATA_STATUS.UNAVAILABLE || rainFresh === FRESHNESS_STATES.STALE) {
    return CONFIDENCE_LEVELS.LOW;
  }

  // Terrain slope & elevation are physical static benchmarks
  if (rainStatus === DATA_STATUS.LIVE && rainFresh === FRESHNESS_STATES.FRESH) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  if (rainStatus === DATA_STATUS.CACHED || rainFresh === FRESHNESS_STATES.AGING) {
    return CONFIDENCE_LEVELS.MODERATE;
  }

  return CONFIDENCE_LEVELS.MODERATE;
}

/**
 * Evaluates hazard-specific confidence for Seismic Risk.
 * Seismic risk depends on Seismic Activity (USGS catalog / lookback window) and Historical Recurrence.
 */
function evaluateSeismicConfidence(environmentalSignals, inputs) {
  const seismicSignal = environmentalSignals?.seismicActivity;

  if (inputs?.seismicActivity === undefined || inputs?.historicalRisk === undefined) {
    return CONFIDENCE_LEVELS.UNKNOWN;
  }

  const seismicStatus = seismicSignal?.status || DATA_STATUS.STORED;
  const seismicFresh = seismicSignal?.freshness || FRESHNESS_STATES.UNKNOWN;

  if (seismicStatus === DATA_STATUS.UNAVAILABLE || seismicFresh === FRESHNESS_STATES.STALE) {
    return CONFIDENCE_LEVELS.LOW;
  }

  if (seismicStatus === DATA_STATUS.LIVE && (seismicFresh === FRESHNESS_STATES.FRESH || seismicFresh === FRESHNESS_STATES.AGING)) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  if (seismicStatus === DATA_STATUS.CACHED) {
    return CONFIDENCE_LEVELS.MODERATE;
  }

  return CONFIDENCE_LEVELS.MODERATE;
}

/**
 * Computes overall source coverage tier.
 */
function computeSourceCoverage(environmentalSignals) {
  if (!environmentalSignals || Object.keys(environmentalSignals).length === 0) {
    return SOURCE_COVERAGE.NONE;
  }

  const signals = [
    environmentalSignals.rainfall,
    environmentalSignals.riverLevel,
    environmentalSignals.seismicActivity
  ].filter(Boolean);

  if (signals.length === 0) {
    return SOURCE_COVERAGE.NONE;
  }

  const liveCount = signals.filter(s => s.status === DATA_STATUS.LIVE).length;
  const cachedCount = signals.filter(s => s.status === DATA_STATUS.CACHED).length;

  if (liveCount >= 3) {
    return SOURCE_COVERAGE.FULL;
  }
  if (liveCount >= 1 || cachedCount >= 2) {
    return SOURCE_COVERAGE.PARTIAL;
  }
  if (cachedCount >= 1 || signals.some(s => s.status === DATA_STATUS.STORED)) {
    return SOURCE_COVERAGE.LIMITED;
  }

  return SOURCE_COVERAGE.NONE;
}

/**
 * Builds deterministic human-readable confidence explanation reasons based on actual input metadata.
 */
function generateConfidenceReasons({
  environmentalSignals,
  inputs,
  sourceCoverage,
  hasMissingData,
  hasStaleData,
  hasCachedData,
  hasUnavailableData
}) {
  const reasons = [];

  // 1. Weather / Rainfall explanation
  const rain = environmentalSignals?.rainfall;
  if (rain) {
    if (rain.status === DATA_STATUS.LIVE && rain.freshness === FRESHNESS_STATES.FRESH) {
      reasons.push("Rainfall feed is live and fresh from meteorological sensors.");
    } else if (rain.status === DATA_STATUS.CACHED) {
      reasons.push("Rainfall data is showing a cached observation snapshot.");
    } else if (rain.freshness === FRESHNESS_STATES.AGING) {
      reasons.push("Rainfall observation is aging (>30 min old).");
    } else if (rain.freshness === FRESHNESS_STATES.STALE || rain.status === DATA_STATUS.UNAVAILABLE) {
      reasons.push("Rainfall feed is stale or unreachable.");
    }
  }

  // 2. Hydrology / River level explanation
  const river = environmentalSignals?.riverLevel;
  if (river) {
    if (river.status === DATA_STATUS.LIVE && river.freshness === FRESHNESS_STATES.FRESH) {
      reasons.push("River stage telemetry is live from regional monitoring gauges.");
    } else if (river.status === DATA_STATUS.CACHED) {
      reasons.push("River data is cached from the previous valid station observation.");
    } else if (river.status === DATA_STATUS.STORED) {
      reasons.push("River level utilizes calibrated station baseline benchmark.");
    } else if (river.status === DATA_STATUS.UNAVAILABLE || river.freshness === FRESHNESS_STATES.STALE) {
      reasons.push("Hydrological river gauge feed is currently unavailable.");
    }
  }

  // 3. Seismic activity explanation
  const seismic = environmentalSignals?.seismicActivity;
  if (seismic) {
    if (seismic.status === DATA_STATUS.LIVE) {
      reasons.push("Earthquake catalog observations are live from USGS monitoring.");
    } else if (seismic.status === DATA_STATUS.CACHED) {
      reasons.push("Seismic activity is showing cached USGS earthquake data.");
    } else if (seismic.status === DATA_STATUS.STORED) {
      reasons.push("Seismic profile utilizes historical baseline records.");
    }
  }

  // 4. Stored baseline terrain & historical risk note
  reasons.push("Terrain slope and historical disaster frequency use stored baseline benchmarks.");

  // 5. Missing or unavailable data warnings
  if (hasMissingData) {
    reasons.push("Some risk engine parameters were missing and required fallback defaults.");
  }
  if (hasUnavailableData) {
    reasons.push("One or more upstream external data feeds are currently unreachable.");
  }
  if (!hasMissingData && !hasStaleData && !hasUnavailableData && sourceCoverage === SOURCE_COVERAGE.FULL) {
    reasons.push("All required multi-hazard risk inputs are available and verified.");
  }

  return reasons;
}

/**
 * Calculates deterministic Risk Confidence and Reliability metrics.
 *
 * @param {Object} params
 * @param {Object} params.inputs - Validated inputs { rainfall, riverLevel, slope, elevation, historicalRisk, seismicActivity }
 * @param {Object} [params.environmentalSignals] - Standardized signal descriptors from Step 17
 * @param {Object} [params.dataSources] - Data source attribution map
 * @param {Object} [params.risks] - Calculated risk object { overall, flood, landslide, seismic }
 * @returns {{
 *   overall: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN',
 *   flood: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN',
 *   landslide: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN',
 *   seismic: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN',
 *   sourceCoverage: 'FULL' | 'PARTIAL' | 'LIMITED' | 'NONE',
 *   hasMissingData: boolean,
 *   hasStaleData: boolean,
 *   hasCachedData: boolean,
 *   hasStoredBaselineData: boolean,
 *   hasUnavailableData: boolean,
 *   reasons: string[]
 * }}
 */
export function calculateRiskConfidence(params = {}) {
  const {
    inputs = {},
    environmentalSignals = {},
    dataSources = {},
    risks = {}
  } = params || {};

  // 1. Data Availability Checks
  const requiredFields = ["rainfall", "riverLevel", "slope", "elevation", "historicalRisk", "seismicActivity"];
  const missingFields = requiredFields.filter(f => inputs[f] === undefined || inputs[f] === null || isNaN(Number(inputs[f])));
  const hasMissingData = missingFields.length > 0;

  // 2. Data Status & Freshness Flags
  const signalsArray = Object.values(environmentalSignals || {});
  const hasStaleData = signalsArray.some(s => s.freshness === FRESHNESS_STATES.STALE);
  const hasCachedData = signalsArray.some(s => s.status === DATA_STATUS.CACHED) ||
    Object.values(dataSources || {}).some(src => typeof src === "string" && src.includes("cached"));
  const hasUnavailableData = signalsArray.some(s => s.status === DATA_STATUS.UNAVAILABLE);
  const hasStoredBaselineData = signalsArray.some(s => s.status === DATA_STATUS.STORED) || true; // Terrain/slope always stored

  // 3. Source Coverage Tier
  const sourceCoverage = computeSourceCoverage(environmentalSignals);

  // 4. Hazard-Specific Confidence
  const floodConf = evaluateFloodConfidence(environmentalSignals, inputs);
  const landslideConf = evaluateLandslideConfidence(environmentalSignals, inputs);
  const seismicConf = evaluateSeismicConfidence(environmentalSignals, inputs);

  // 5. Overall Confidence Derivation
  let overall = CONFIDENCE_LEVELS.MODERATE;

  if (hasMissingData && missingFields.length >= 3) {
    overall = CONFIDENCE_LEVELS.UNKNOWN;
  } else if (hasMissingData || hasStaleData || hasUnavailableData) {
    overall = CONFIDENCE_LEVELS.LOW;
  } else if (sourceCoverage === SOURCE_COVERAGE.FULL &&
             floodConf === CONFIDENCE_LEVELS.HIGH &&
             landslideConf === CONFIDENCE_LEVELS.HIGH &&
             seismicConf === CONFIDENCE_LEVELS.HIGH) {
    overall = CONFIDENCE_LEVELS.HIGH;
  } else if (sourceCoverage === SOURCE_COVERAGE.FULL ||
             sourceCoverage === SOURCE_COVERAGE.PARTIAL ||
             sourceCoverage === SOURCE_COVERAGE.LIMITED ||
             hasCachedData) {
    overall = CONFIDENCE_LEVELS.MODERATE;
  } else {
    overall = CONFIDENCE_LEVELS.LOW;
  }

  // 6. Formulate Explainable Reasons
  const reasons = generateConfidenceReasons({
    environmentalSignals,
    inputs,
    sourceCoverage,
    hasMissingData,
    hasStaleData,
    hasCachedData,
    hasUnavailableData
  });

  return {
    overall,
    flood: floodConf,
    landslide: landslideConf,
    seismic: seismicConf,
    sourceCoverage,
    hasMissingData,
    hasStaleData,
    hasCachedData,
    hasStoredBaselineData,
    hasUnavailableData,
    reasons
  };
}

export default {
  calculateRiskConfidence,
  CONFIDENCE_LEVELS,
  SOURCE_COVERAGE
};
