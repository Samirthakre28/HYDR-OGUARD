/**
 * HydroGuard - Explainable Disaster Risk Calculation Engine
 *
 * NOTE: HydroGuard estimates localized disaster risk using environmental,
 * geographic, and historical indicators. This is a deterministic mathematical
 * model and does not claim to predict earthquakes or guarantee disaster occurrences.
 */

/**
 * Validates and normalizes raw risk calculation inputs.
 * @param {Object} input - Environmental and geographic input parameters
 * @returns {{ isValid: boolean, errors: string[], normalized?: Object }}
 */
export function validateRiskInput(input) {
  const errors = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errors: ["Request body must be a valid JSON object containing risk parameters."]
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
    const val = input[field];

    if (val === undefined || val === null || val === "") {
      errors.push(`Missing required field: '${field}'.`);
      continue;
    }

    const num = Number(val);

    if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
      errors.push(`Field '${field}' must be a valid finite number.`);
      continue;
    }

    if (num < 0 || num > 100) {
      errors.push(`Field '${field}' must be a normalized value between 0 and 100. Received: ${num}.`);
      continue;
    }

    normalized[field] = num;
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? normalized : undefined
  };
}

/**
 * Classifies a 0-100 numerical score into categorical risk levels.
 * Thresholds:
 *   0 - 25:   LOW
 *   26 - 50:  MODERATE
 *   51 - 75:  HIGH
 *   76 - 100: CRITICAL
 *
 * @param {number} score
 * @returns {{ level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL', score: number }}
 */
export function getRiskLevel(score) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  if (clampedScore <= 25) {
    return { level: "LOW", score: clampedScore };
  }
  if (clampedScore <= 50) {
    return { level: "MODERATE", score: clampedScore };
  }
  if (clampedScore <= 75) {
    return { level: "HIGH", score: clampedScore };
  }
  return { level: "CRITICAL", score: clampedScore };
}

/**
 * Calculate Flood Risk
 * Formula: Rainfall (40%) + River Level (30%) + Elevation (10%) + Historical Risk (20%)
 * @param {Object} input
 * @returns {number} Integer between 0 and 100
 */
export function calculateFloodRisk(input) {
  const { rainfall, riverLevel, elevation, historicalRisk } = input;
  const rawScore =
    rainfall * 0.40 +
    riverLevel * 0.30 +
    elevation * 0.10 +
    historicalRisk * 0.20;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Calculate Landslide Risk
 * Formula: Rainfall (30%) + Slope (35%) + Historical Risk (20%) + Elevation (15%)
 * (Weights total 1.0)
 * @param {Object} input
 * @returns {number} Integer between 0 and 100
 */
export function calculateLandslideRisk(input) {
  const { rainfall, slope, historicalRisk, elevation } = input;
  const rawScore =
    rainfall * 0.30 +
    slope * 0.35 +
    historicalRisk * 0.20 +
    elevation * 0.15;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Calculate Seismic Risk (estimate based on supplied activity & historical recurrence)
 * Formula: Seismic Activity (60%) + Historical Risk (40%)
 * @param {Object} input
 * @returns {number} Integer between 0 and 100
 */
export function calculateSeismicRisk(input) {
  const { seismicActivity, historicalRisk } = input;
  const rawScore =
    seismicActivity * 0.60 +
    historicalRisk * 0.40;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Calculate Aggregated Overall Risk
 * Formula: Flood Risk (40%) + Landslide Risk (35%) + Seismic Risk (25%)
 * @param {{ floodRisk: number, landslideRisk: number, seismicRisk: number }} risks
 * @returns {number} Integer between 0 and 100
 */
export function calculateOverallRisk({ floodRisk, landslideRisk, seismicRisk }) {
  const rawScore =
    floodRisk * 0.40 +
    landslideRisk * 0.35 +
    seismicRisk * 0.25;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Extracts structured, explainable contributing factor drivers based on input thresholds.
 * @param {Object} input
 * @returns {Array<{ factor: string, impact: string, explanation: string, value: number }>}
 */
export function extractContributingFactors(input, includeAll = false) {
  const { rainfall, riverLevel, slope, elevation, historicalRisk, seismicActivity } = input;

  // Helper to determine impact level
  const getImpact = (val) => {
    if (val >= 85) return "CRITICAL";
    if (val >= 70) return "HIGH";
    if (val >= 50) return "MODERATE";
    return "LOW";
  };

  const rawFactors = [
    {
      name: "Rainfall",
      factor: "Heavy rainfall",
      value: rainfall,
      weight: 0.40,
      contribution: Number((rainfall * 0.40).toFixed(1)),
      impact: getImpact(rainfall),
      explanation: "Surface precipitation driving flash flood and soil saturation risk."
    },
    {
      name: "River Level",
      factor: "Rising river level",
      value: riverLevel,
      weight: 0.30,
      contribution: Number((riverLevel * 0.30).toFixed(1)),
      impact: getImpact(riverLevel),
      explanation: "Hydrological river gauge stage height relative to flood thresholds."
    },
    {
      name: "Slope",
      factor: "Steep terrain",
      value: slope,
      weight: 0.35,
      contribution: Number((slope * 0.35).toFixed(1)),
      impact: getImpact(slope),
      explanation: "Digital elevation model gradient indicating landslide susceptibility."
    },
    {
      name: "Historical Risk",
      factor: "Historical disaster frequency",
      value: historicalRisk,
      weight: 0.20,
      contribution: Number((historicalRisk * 0.20).toFixed(1)),
      impact: getImpact(historicalRisk),
      explanation: "Recurrence frequency of severe environmental hazards in this catchment."
    },
    {
      name: "Seismic Activity",
      factor: "Elevated seismic activity",
      value: seismicActivity,
      weight: 0.60,
      contribution: Number((seismicActivity * 0.60).toFixed(1)),
      impact: getImpact(seismicActivity),
      explanation: "Tectonic ground acceleration and earthquake epicenter proximity."
    },
    {
      name: "Elevation",
      factor: "Low elevation exposure",
      value: elevation,
      weight: 0.10,
      contribution: Number((elevation * 0.10).toFixed(1)),
      impact: getImpact(elevation),
      explanation: "Terrain elevation above mean sea level influencing water pooling."
    }
  ];

  if (includeAll) {
    return rawFactors.sort((a, b) => b.contribution - a.contribution);
  }

  // Filter elevated factors (>= 50) for standard risk engine factors output (5 core factors)
  return rawFactors
    .filter((f) => f.name !== "Elevation" && f.value >= 50)
    .sort((a, b) => b.value - a.value);
}

/**
 * Comprehensive risk calculation orchestrator
 * @param {Object} input - Normalized environmental and geographic inputs
 * @returns {Object} Structured hazard sub-scores, overall risk, and explainable factors
 */
export function calculateAllRisks(input) {
  // Validate and normalize
  const validation = validateRiskInput(input);
  if (!validation.isValid) {
    const err = new Error("Invalid risk input");
    err.errors = validation.errors;
    err.statusCode = 400;
    throw err;
  }

  const validData = validation.normalized;

  // Calculate individual hazard sub-scores
  const floodScore = calculateFloodRisk(validData);
  const landslideScore = calculateLandslideRisk(validData);
  const seismicScore = calculateSeismicRisk(validData);

  // Calculate aggregated overall risk
  const overallScore = calculateOverallRisk({
    floodRisk: floodScore,
    landslideRisk: landslideScore,
    seismicRisk: seismicScore
  });

  // Extract explainable contributing drivers
  const factors = extractContributingFactors(validData, false);
  const allFactorBreakdown = extractContributingFactors(validData, true);

  return {
    flood: getRiskLevel(floodScore),
    landslide: getRiskLevel(landslideScore),
    seismic: getRiskLevel(seismicScore),
    overall: getRiskLevel(overallScore),
    factors,
    allFactorBreakdown,
    inputs: validData,
    calculatedAt: new Date().toISOString()
  };
}

export default {
  validateRiskInput,
  getRiskLevel,
  calculateFloodRisk,
  calculateLandslideRisk,
  calculateSeismicRisk,
  calculateOverallRisk,
  extractContributingFactors,
  calculateAllRisks
};
