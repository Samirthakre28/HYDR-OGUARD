/**
 * HydroGuard - Future ML Risk Model Service Interface
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * 1. HydroGuard does NOT currently use a production ML model.
 * 2. The production risk calculation is 100% deterministic, explainable, and authoritative.
 * 3. This service provides strict interfaces, input/output validation contracts,
 *    and fallback protection for future machine learning research.
 * 4. Zero fabricated predictions, synthetic scores, or random numbers are generated.
 */

import config from "../config/index.js";
import { getActiveModel, getModel, ALLOWED_HAZARDS, ML_STATUS } from "./mlModelRegistry.service.js";

/**
 * Standard Feature Schema Specification for Future ML Models
 */
export const FEATURE_SCHEMA = {
  version: "1.0.0",
  features: {
    rainfall_normalized: {
      name: "rainfall_normalized",
      source: "weather/open-meteo",
      unit: "mm/hr (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 900000, // 15 minutes
      missingBehavior: "UNAVAILABLE",
      description: "Hourly precipitation rate normalized against extreme localized flood baselines"
    },
    river_level_normalized: {
      name: "river_level_normalized",
      source: "hydrology/glofas-open-meteo",
      unit: "m (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 900000,
      missingBehavior: "UNAVAILABLE",
      description: "Nearest river basin water stage normalized against stage warning thresholds"
    },
    slope_normalized: {
      name: "slope_normalized",
      source: "geographic/terrain-elevation",
      unit: "degrees (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 86400000, // 24 hours
      missingBehavior: "UNAVAILABLE",
      description: "Local topographical gradient slope normalized against steep incline thresholds"
    },
    elevation_normalized: {
      name: "elevation_normalized",
      source: "geographic/terrain-elevation",
      unit: "meters (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 86400000,
      missingBehavior: "UNAVAILABLE",
      description: "Local ground elevation above sea level normalized against low-lying floodplain baselines"
    },
    historical_risk_normalized: {
      name: "historical_risk_normalized",
      source: "historical/disaster-catalog",
      unit: "score (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 604800000, // 7 days
      missingBehavior: "UNAVAILABLE",
      description: "Verified historical disaster recurrence frequency for the local district"
    },
    seismic_activity_normalized: {
      name: "seismic_activity_normalized",
      source: "seismic/usgs-catalog",
      unit: "magnitude-proximity (normalized 0-100)",
      expectedRange: [0, 100],
      freshnessMaxTtlMs: 900000,
      missingBehavior: "UNAVAILABLE",
      description: "24-hour earthquake count and magnitude proximity within 100km radius"
    }
  }
};

/**
 * Returns current status of the future ML system and configuration.
 * @returns {Object}
 */
export function getModelStatus() {
  const activeModel = getActiveModel();
  const isConfigured = config.mlMode !== "disabled" && activeModel !== null;

  return {
    enabled: isConfigured,
    mode: config.mlMode,
    status: isConfigured ? activeModel.status : "NOT_CONFIGURED",
    activeModel: activeModel
      ? {
          modelId: activeModel.modelId,
          version: activeModel.version,
          targetHazard: activeModel.targetHazard,
          datasetVersion: activeModel.datasetVersion
        }
      : null,
    deterministicAuthoritative: true,
    message: "No production ML model is configured. HydroGuard uses the deterministic explainable Risk Engine."
  };
}

/**
 * Retrieves metadata for a specified or active model.
 * @param {string} [modelId]
 * @param {string} [version]
 * @returns {Object}
 */
export function getModelMetadata(modelId, version) {
  if (modelId && version) {
    const model = getModel(modelId, version);
    if (model) return { ...model };
  }

  // Safe default schema placeholder
  return {
    modelId: modelId || "future-ml-risk-model",
    version: version || "not-configured",
    status: ML_STATUS.NOT_DEPLOYED,
    trainedAt: null,
    datasetVersion: null,
    featureSchemaVersion: FEATURE_SCHEMA.version,
    features: Object.keys(FEATURE_SCHEMA.features),
    target: null,
    metrics: null,
    isSynthetic: false
  };
}

/**
 * Validates raw signals against the standardized Model Input Contract.
 * @param {Object} input - Structured input containing location and environmental signals
 * @returns {{ isValid: boolean, errors: string[], normalizedFeatures?: Object, metadata?: Object }}
 */
export function validateModelInput(input) {
  const errors = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errors: ["Input must be a valid JSON object containing location and signals."]
    };
  }

  // Validate location
  const { location, signals } = input;
  if (!location || typeof location !== "object") {
    errors.push("Missing required 'location' object.");
  } else {
    if (!location.locationId || typeof location.locationId !== "string") {
      errors.push("Missing or invalid location.locationId.");
    }
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Invalid location.latitude: ${location.latitude}. Must be between -90 and 90.`);
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(`Invalid location.longitude: ${location.longitude}. Must be between -180 and 180.`);
    }
  }

  // Validate signals
  if (!signals || typeof signals !== "object") {
    errors.push("Missing required 'signals' object.");
    return { isValid: false, errors };
  }

  const normalizedFeatures = {};
  const featureMetadata = {};
  const requiredSignals = ["rainfall", "riverLevel", "slope", "elevation", "historicalRisk", "seismicActivity"];

  const signalToFeatureMap = {
    rainfall: "rainfall_normalized",
    riverLevel: "river_level_normalized",
    slope: "slope_normalized",
    elevation: "elevation_normalized",
    historicalRisk: "historical_risk_normalized",
    seismicActivity: "seismic_activity_normalized"
  };

  const now = Date.now();

  for (const signalKey of requiredSignals) {
    const signal = signals[signalKey];
    const featureName = signalToFeatureMap[signalKey];
    const schemaDef = FEATURE_SCHEMA.features[featureName];

    if (!signal || typeof signal !== "object") {
      errors.push(`Missing signal: '${signalKey}'.`);
      continue;
    }

    const value = signal.normalizedValue !== undefined ? signal.normalizedValue : signal.value;
    const num = Number(value);

    if (value === undefined || value === null || isNaN(num) || !isFinite(num)) {
      errors.push(`Signal '${signalKey}' has invalid or non-numeric value.`);
      continue;
    }

    if (num < 0 || num > 100) {
      errors.push(`Signal '${signalKey}' normalized value ${num} is outside expected range [0, 100].`);
      continue;
    }

    // Check observation timestamp if provided
    let isStale = false;
    if (signal.observedAt) {
      const obsTime = new Date(signal.observedAt).getTime();
      if (isNaN(obsTime)) {
        errors.push(`Signal '${signalKey}' has invalid timestamp 'observedAt'.`);
        continue;
      }
      if (schemaDef && now - obsTime > schemaDef.freshnessMaxTtlMs) {
        isStale = true;
      }
    }

    normalizedFeatures[featureName] = num;
    featureMetadata[featureName] = {
      source: signal.source || "unknown",
      observedAt: signal.observedAt || new Date().toISOString(),
      unit: signal.unit || "normalized",
      isStale
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedFeatures: errors.length === 0 ? normalizedFeatures : undefined,
    metadata: errors.length === 0 ? featureMetadata : undefined
  };
}

/**
 * Validates output from a potential future ML predictor.
 * @param {Object} output
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateModelOutput(output) {
  const errors = [];

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return {
      isValid: false,
      errors: ["Model output must be a valid JSON object."]
    };
  }

  if (typeof output.available !== "boolean") {
    errors.push("Field 'available' must be a boolean.");
  }

  if (output.available === true) {
    if (!output.modelId || typeof output.modelId !== "string") {
      errors.push("Active prediction must include non-empty 'modelId'.");
    }

    if (!output.modelVersion || typeof output.modelVersion !== "string") {
      errors.push("Active prediction must include non-empty 'modelVersion'.");
    }

    if (!output.hazard || !ALLOWED_HAZARDS.includes(output.hazard)) {
      errors.push(`Invalid hazard: '${output.hazard}'. Allowed: ${ALLOWED_HAZARDS.join(", ")}`);
    }

    const prob = Number(output.probability);
    if (output.probability === undefined || isNaN(prob) || prob < 0.0 || prob > 1.0) {
      errors.push(`Field 'probability' must be a finite number between 0.0 and 1.0. Received: ${output.probability}`);
    }

    const validPredictions = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
    if (!output.prediction || !validPredictions.includes(output.prediction)) {
      errors.push(`Field 'prediction' must be one of: ${validPredictions.join(", ")}`);
    }

    if (!output.generatedAt || isNaN(new Date(output.generatedAt).getTime())) {
      errors.push("Field 'generatedAt' must be a valid ISO timestamp.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Future ML Prediction Interface Placeholder.
 *
 * NOTE: Returns a safe unconfigured response. No fake scores or random values are returned.
 *
 * @param {Object} validatedSignals
 * @returns {Object}
 */
export function predict(validatedSignals) {
  // In the current MVP, no production ML model is deployed or active.
  return {
    available: false,
    status: "NOT_CONFIGURED",
    message: "No production ML model is configured. Deterministic Risk Engine remains authoritative.",
    fallback: {
      engine: "DETERMINISTIC_RISK_ENGINE",
      authoritative: true
    }
  };
}

/**
 * Formats raw location and environmental signals into the standardized ML Feature Input Contract.
 * @param {Object} location
 * @param {Object} signals
 * @returns {Object}
 */
export function formatFeaturePayload(location, signals) {
  return {
    schemaVersion: FEATURE_SCHEMA.version,
    location: {
      locationId: location?.locationId || location?.id || "unknown",
      latitude: location?.latitude ?? 0,
      longitude: location?.longitude ?? 0
    },
    signals: {
      rainfall: {
        value: signals?.rainfall?.value ?? signals?.rainfall ?? 0,
        normalizedValue: signals?.rainfall?.normalizedValue ?? signals?.rainfall ?? 0,
        unit: signals?.rainfall?.unit || "mm",
        source: signals?.rainfall?.source || "weather/provider",
        observedAt: signals?.rainfall?.observedAt || new Date().toISOString()
      },
      riverLevel: {
        value: signals?.riverLevel?.value ?? signals?.riverLevel ?? 0,
        normalizedValue: signals?.riverLevel?.normalizedValue ?? signals?.riverLevel ?? 0,
        unit: signals?.riverLevel?.unit || "m",
        source: signals?.riverLevel?.source || "hydrology/provider",
        observedAt: signals?.riverLevel?.observedAt || new Date().toISOString()
      },
      slope: {
        value: signals?.slope?.value ?? signals?.slope ?? 0,
        normalizedValue: signals?.slope?.normalizedValue ?? signals?.slope ?? 0,
        unit: signals?.slope?.unit || "degrees",
        source: signals?.slope?.source || "geographic/terrain",
        observedAt: signals?.slope?.observedAt || new Date().toISOString()
      },
      elevation: {
        value: signals?.elevation?.value ?? signals?.elevation ?? 0,
        normalizedValue: signals?.elevation?.normalizedValue ?? signals?.elevation ?? 0,
        unit: signals?.elevation?.unit || "m",
        source: signals?.elevation?.source || "geographic/elevation",
        observedAt: signals?.elevation?.observedAt || new Date().toISOString()
      },
      historicalRisk: {
        value: signals?.historicalRisk?.value ?? signals?.historicalRisk ?? 0,
        normalizedValue: signals?.historicalRisk?.normalizedValue ?? signals?.historicalRisk ?? 0,
        unit: signals?.historicalRisk?.unit || "score",
        source: signals?.historicalRisk?.source || "historical/catalog",
        observedAt: signals?.historicalRisk?.observedAt || new Date().toISOString()
      },
      seismicActivity: {
        value: signals?.seismicActivity?.value ?? signals?.seismicActivity ?? 0,
        normalizedValue: signals?.seismicActivity?.normalizedValue ?? signals?.seismicActivity ?? 0,
        unit: signals?.seismicActivity?.unit || "normalized",
        source: signals?.seismicActivity?.source || "seismic/usgs",
        observedAt: signals?.seismicActivity?.observedAt || new Date().toISOString()
      }
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * Evaluates comparison between Deterministic Risk Engine score and future ML output for shadow mode.
 * @param {Object} deterministicRisk
 * @param {Object} mlOutput
 * @returns {Object}
 */
export function evaluateModelComparison(deterministicRisk, mlOutput) {
  if (!mlOutput || !mlOutput.available) {
    return {
      comparisonAvailable: false,
      status: "ML_UNAVAILABLE",
      authoritativeEngine: "DETERMINISTIC_RISK_ENGINE",
      authoritativeRisk: deterministicRisk
    };
  }

  const outputValidation = validateModelOutput(mlOutput);
  if (!outputValidation.isValid) {
    return {
      comparisonAvailable: false,
      status: "INVALID_ML_OUTPUT",
      errors: outputValidation.errors,
      authoritativeEngine: "DETERMINISTIC_RISK_ENGINE",
      authoritativeRisk: deterministicRisk
    };
  }

  // In future shadow mode, calculate score delta without changing authoritative risk
  return {
    comparisonAvailable: true,
    status: "SHADOW_EVALUATION",
    authoritativeEngine: "DETERMINISTIC_RISK_ENGINE",
    authoritativeRisk: deterministicRisk,
    mlCandidate: {
      modelId: mlOutput.modelId,
      modelVersion: mlOutput.modelVersion,
      hazard: mlOutput.hazard,
      probability: mlOutput.probability,
      prediction: mlOutput.prediction
    },
    comparisonNotes: "ML score is evaluated in shadow mode only and does not alter user-facing risk scores."
  };
}

export default {
  FEATURE_SCHEMA,
  getModelStatus,
  getModelMetadata,
  validateModelInput,
  validateModelOutput,
  predict,
  formatFeaturePayload,
  evaluateModelComparison
};
