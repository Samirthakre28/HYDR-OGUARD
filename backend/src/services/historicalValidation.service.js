/**
 * HydroGuard - Historical Validation & Backtesting Service (Step 19)
 *
 * Provides deterministic evaluation and backtesting of the HydroGuard Risk Engine
 * against historical and synthetic environmental disaster scenarios.
 *
 * NOTE: Historical backtesting is an evaluation framework only. It measures how the
 * deterministic engine scores past scenarios compared to labeled outcomes. It does
 * NOT alter live risk calculations and does NOT claim predictive certainty.
 */

import { calculateAllRisks } from "./riskEngine.service.js";
import {
  validateCoordinates,
  validateTimestamp,
  validateRiskEngineInputGate
} from "./dataValidation.service.js";

// Evaluation Risk Boundary (scores >= 51 represent Elevated Threat: HIGH or CRITICAL)
export const ELEVATED_RISK_THRESHOLD = 51;

// Minimum number of labeled samples required before reporting statistical classification rates
export const MIN_LABELED_SAMPLES_FOR_METRICS = 5;

// Dataset Provenance Types
export const DATASET_TYPES = {
  VERIFIED_HISTORICAL: "VERIFIED_HISTORICAL",
  SYNTHETIC_TEST_FIXTURE: "SYNTHETIC_TEST_FIXTURE",
  USER_PROVIDED: "USER_PROVIDED",
  UNKNOWN: "UNKNOWN"
};

// Supported Disaster Hazard Categories
export const HAZARDS = {
  FLOOD: "FLOOD",
  LANDSLIDE: "LANDSLIDE",
  SEISMIC: "SEISMIC",
  OVERALL: "OVERALL"
};

/**
 * Validates a single historical or synthetic scenario object.
 *
 * @param {Object} scenario
 * @returns {{ isValid: boolean, normalized?: Object, errors: string[] }}
 */
export function validateScenario(scenario) {
  const errors = [];

  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    return { isValid: false, errors: ["Scenario must be a valid JSON object."] };
  }

  if (!scenario.id || typeof scenario.id !== "string" || scenario.id.trim() === "") {
    errors.push("Scenario 'id' is required.");
  }

  // Validate Timestamp
  if (!scenario.observedAt) {
    errors.push("Scenario 'observedAt' timestamp is required.");
  } else {
    const tsCheck = validateTimestamp(scenario.observedAt);
    if (!tsCheck.isValid) {
      errors.push(`Invalid 'observedAt': ${tsCheck.error}`);
    }
  }

  // Validate Coordinates if provided
  if (scenario.latitude !== undefined || scenario.longitude !== undefined) {
    const coordCheck = validateCoordinates(scenario.latitude, scenario.longitude);
    if (!coordCheck.isValid) {
      errors.push(`Invalid coordinates: ${coordCheck.error}`);
    }
  }

  // Validate Environmental Inputs using Step 17 Risk Engine Input Gate
  if (!scenario.inputs || typeof scenario.inputs !== "object") {
    errors.push("Scenario 'inputs' object is required.");
  } else {
    const gate = validateRiskEngineInputGate(scenario.inputs);
    if (!gate.valid) {
      errors.push(...gate.missingFields.map(f => `Missing required input: '${f}'`));
      errors.push(...gate.invalidFields.map(f => `Invalid input parameter: '${f}'`));
    }
  }

  // Validate Outcome Structure if provided
  if (scenario.outcome) {
    if (typeof scenario.outcome !== "object") {
      errors.push("Scenario 'outcome' must be an object { hazard, occurred }.");
    } else {
      if (scenario.outcome.hazard && !["FLOOD", "LANDSLIDE", "SEISMIC", "MULTI_HAZARD", "OVERALL"].includes(scenario.outcome.hazard.toUpperCase())) {
        errors.push(`Unknown outcome hazard: '${scenario.outcome.hazard}'. Expected FLOOD, LANDSLIDE, SEISMIC, or OVERALL.`);
      }
      if (scenario.outcome.occurred !== undefined && scenario.outcome.occurred !== null && typeof scenario.outcome.occurred !== "boolean") {
        errors.push("Scenario outcome 'occurred' must be a boolean (true/false) or null if unlabeled.");
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    normalized: isValid ? {
      id: String(scenario.id).trim(),
      locationId: scenario.locationId ? String(scenario.locationId) : "loc-historical",
      locationName: scenario.locationName || "Monitored Zone",
      latitude: scenario.latitude !== undefined ? Number(scenario.latitude) : null,
      longitude: scenario.longitude !== undefined ? Number(scenario.longitude) : null,
      observedAt: new Date(scenario.observedAt).toISOString(),
      inputs: {
        rainfall: Number(scenario.inputs.rainfall),
        riverLevel: Number(scenario.inputs.riverLevel),
        slope: Number(scenario.inputs.slope),
        elevation: Number(scenario.inputs.elevation),
        historicalRisk: Number(scenario.inputs.historicalRisk),
        seismicActivity: Number(scenario.inputs.seismicActivity)
      },
      outcome: scenario.outcome ? {
        hazard: (scenario.outcome.hazard || "OVERALL").toUpperCase(),
        occurred: typeof scenario.outcome.occurred === "boolean" ? scenario.outcome.occurred : null
      } : null,
      datasetType: Object.values(DATASET_TYPES).includes(scenario.datasetType)
        ? scenario.datasetType
        : (scenario.id.includes("synthetic") ? DATASET_TYPES.SYNTHETIC_TEST_FIXTURE : DATASET_TYPES.UNKNOWN),
      source: scenario.source || "HISTORICAL_EVALUATION_DATASET"
    } : undefined
  };
}

/**
 * Runs a single historical scenario through the deterministic Risk Engine.
 *
 * @param {Object} rawScenario
 * @returns {Object} Structured evaluation result
 */
export function runHistoricalScenario(rawScenario) {
  const validation = validateScenario(rawScenario);

  if (!validation.isValid) {
    const error = new Error("Historical scenario validation failed.");
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  const scenario = validation.normalized;

  // Run through deterministic Risk Engine (Single Source of Truth)
  const risks = calculateAllRisks(scenario.inputs);

  const hasOutcome = scenario.outcome && scenario.outcome.occurred !== null && scenario.outcome.occurred !== undefined;
  let evaluationMatch = null;

  if (hasOutcome) {
    const hazardType = scenario.outcome.hazard;
    let relevantScore = risks.overall.score;

    if (hazardType === "FLOOD") relevantScore = risks.flood.score;
    else if (hazardType === "LANDSLIDE") relevantScore = risks.landslide.score;
    else if (hazardType === "SEISMIC") relevantScore = risks.seismic.score;

    const isElevated = relevantScore >= ELEVATED_RISK_THRESHOLD;
    const actualOccurred = scenario.outcome.occurred;

    if (isElevated && actualOccurred) evaluationMatch = "TRUE_POSITIVE";
    else if (!isElevated && !actualOccurred) evaluationMatch = "TRUE_NEGATIVE";
    else if (isElevated && !actualOccurred) evaluationMatch = "FALSE_POSITIVE";
    else if (!isElevated && actualOccurred) evaluationMatch = "FALSE_NEGATIVE";
  }

  return {
    scenarioId: scenario.id,
    locationId: scenario.locationId,
    locationName: scenario.locationName,
    observedAt: scenario.observedAt,
    datasetType: scenario.datasetType,
    source: scenario.source,
    calculatedRisk: {
      overall: risks.overall,
      flood: risks.flood,
      landslide: risks.landslide,
      seismic: risks.seismic,
      isElevated: risks.overall.score >= ELEVATED_RISK_THRESHOLD
    },
    actualOutcome: scenario.outcome || null,
    isEvaluated: hasOutcome,
    evaluationMatch
  };
}

/**
 * Computes confusion matrix and classification metrics with zero-denominator safety.
 */
function computeMetrics(tp, tn, fp, fn) {
  const total = tp + tn + fp + fn;
  if (total === 0) {
    return {
      labeledSamples: 0,
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      precision: null,
      recall: null,
      f1: null,
      accuracy: null
    };
  }

  const precision = (tp + fp) > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : null;
  const recall = (tp + fn) > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : null;
  let f1 = null;
  if (precision !== null && recall !== null && (precision + recall) > 0) {
    f1 = Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000;
  }
  const accuracy = total > 0 ? Math.round(((tp + tn) / total) * 1000) / 1000 : null;

  return {
    labeledSamples: total,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    f1,
    accuracy
  };
}

/**
 * Evaluates a batch of historical scenarios and computes multi-hazard evaluation metrics.
 *
 * @param {Array<Object>} scenarios - Array of raw scenario objects
 * @param {Object} [options]
 * @param {number} [options.minSamples=MIN_LABELED_SAMPLES_FOR_METRICS]
 * @returns {Object} Comprehensive backtest evaluation report
 */
export function evaluateBacktestBatch(scenarios = [], options = {}) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return {
      status: "OK",
      evaluationStatus: "NO_DATA",
      sampleSize: 0,
      labeledSamples: 0,
      containsSyntheticData: false,
      hazards: {
        flood: computeMetrics(0, 0, 0, 0),
        landslide: computeMetrics(0, 0, 0, 0),
        seismic: computeMetrics(0, 0, 0, 0),
        overall: computeMetrics(0, 0, 0, 0)
      },
      results: [],
      limitations: [
        "No historical scenarios provided for backtesting.",
        "Evaluation requires verified or synthetic scenario inputs."
      ]
    };
  }

  const minSamples = options.minSamples || MIN_LABELED_SAMPLES_FOR_METRICS;

  // 1. Deduplicate Scenarios (by scenarioId or locationId+observedAt+hazard)
  const seenKeys = new Set();
  const uniqueScenarios = [];

  for (const item of scenarios) {
    const key = item.id || `${item.locationId}_${item.observedAt}_${item.outcome?.hazard}_${item.source}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueScenarios.push(item);
    }
  }

  // 2. Execute Each Scenario
  const results = [];
  let containsSynthetic = false;

  const counts = {
    overall: { tp: 0, tn: 0, fp: 0, fn: 0 },
    flood: { tp: 0, tn: 0, fp: 0, fn: 0 },
    landslide: { tp: 0, tn: 0, fp: 0, fn: 0 },
    seismic: { tp: 0, tn: 0, fp: 0, fn: 0 }
  };

  for (const s of uniqueScenarios) {
    try {
      const res = runHistoricalScenario(s);
      results.push(res);

      if (res.datasetType === DATASET_TYPES.SYNTHETIC_TEST_FIXTURE) {
        containsSynthetic = true;
      }

      if (res.isEvaluated && res.evaluationMatch) {
        const hazard = (res.actualOutcome?.hazard || "OVERALL").toLowerCase();
        const targetHazard = counts[hazard] ? hazard : "overall";

        if (res.evaluationMatch === "TRUE_POSITIVE") {
          counts[targetHazard].tp++;
          counts.overall.tp++;
        } else if (res.evaluationMatch === "TRUE_NEGATIVE") {
          counts[targetHazard].tn++;
          counts.overall.tn++;
        } else if (res.evaluationMatch === "FALSE_POSITIVE") {
          counts[targetHazard].fp++;
          counts.overall.fp++;
        } else if (res.evaluationMatch === "FALSE_NEGATIVE") {
          counts[targetHazard].fn++;
          counts.overall.fn++;
        }
      }
    } catch (err) {
      console.warn(`[HydroGuard Backtest] Scenario ${s?.id || "unknown"} validation error:`, err.message);
    }
  }

  const totalLabeled = counts.overall.tp + counts.overall.tn + counts.overall.fp + counts.overall.fn;
  let evaluationStatus = "EVALUATED";

  if (totalLabeled === 0) {
    evaluationStatus = "UNLABELED_DATASET";
  } else if (totalLabeled < minSamples) {
    evaluationStatus = "INSUFFICIENT_SAMPLE";
  }

  // 3. Assemble Limitations
  const limitations = [
    "Evaluation results evaluate the deterministic Risk Engine on historical inputs.",
    "Backtest results do not prove future disaster prediction accuracy.",
    "Performance metrics depend on ground-truth label accuracy and regional coverage."
  ];

  if (containsSynthetic) {
    limitations.unshift("WARNING: Evaluation batch contains synthetic test fixtures. Excluded from real-world performance claims.");
  }
  if (totalLabeled < minSamples) {
    limitations.push(`Sample size (${totalLabeled}) is below the minimum threshold (${minSamples}) for statistical confidence.`);
  }

  return {
    status: "OK",
    evaluationStatus,
    sampleSize: results.length,
    labeledSamples: totalLabeled,
    containsSyntheticData: containsSynthetic,
    hazards: {
      flood: computeMetrics(counts.flood.tp, counts.flood.tn, counts.flood.fp, counts.flood.fn),
      landslide: computeMetrics(counts.landslide.tp, counts.landslide.tn, counts.landslide.fp, counts.landslide.fn),
      seismic: computeMetrics(counts.seismic.tp, counts.seismic.tn, counts.seismic.fp, counts.seismic.fn),
      overall: computeMetrics(counts.overall.tp, counts.overall.tn, counts.overall.fp, counts.overall.fn)
    },
    results,
    limitations
  };
}

/**
 * Standard Synthetic Test Fixtures for Automated Testing and Evaluation Demos.
 * Clearly labeled with datasetType: SYNTHETIC_TEST_FIXTURE.
 */
export function getSyntheticTestFixtures() {
  return [
    {
      id: "synthetic-flood-severe-01",
      locationId: "loc-mumbai",
      locationName: "Mumbai Coastal Basin",
      observedAt: "2024-07-15T12:00:00.000Z",
      inputs: { rainfall: 85, riverLevel: 80, slope: 30, elevation: 10, historicalRisk: 70, seismicActivity: 5 },
      outcome: { hazard: "FLOOD", occurred: true },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    },
    {
      id: "synthetic-flood-dry-02",
      locationId: "loc-mumbai",
      locationName: "Mumbai Coastal Basin",
      observedAt: "2024-01-10T12:00:00.000Z",
      inputs: { rainfall: 5, riverLevel: 10, slope: 30, elevation: 10, historicalRisk: 20, seismicActivity: 5 },
      outcome: { hazard: "FLOOD", occurred: false },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    },
    {
      id: "synthetic-landslide-steep-03",
      locationId: "loc-uttarkashi",
      locationName: "Uttarkashi Alpine Zone",
      observedAt: "2024-08-05T14:00:00.000Z",
      inputs: { rainfall: 80, riverLevel: 40, slope: 85, elevation: 60, historicalRisk: 75, seismicActivity: 10 },
      outcome: { hazard: "LANDSLIDE", occurred: true },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    },
    {
      id: "synthetic-landslide-stable-04",
      locationId: "loc-delhi",
      locationName: "New Delhi Plains",
      observedAt: "2024-03-20T10:00:00.000Z",
      inputs: { rainfall: 10, riverLevel: 15, slope: 5, elevation: 10, historicalRisk: 10, seismicActivity: 5 },
      outcome: { hazard: "LANDSLIDE", occurred: false },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    },
    {
      id: "synthetic-seismic-high-05",
      locationId: "loc-chamoli",
      locationName: "Chamoli Active Fault",
      observedAt: "2024-05-12T08:30:00.000Z",
      inputs: { rainfall: 20, riverLevel: 25, slope: 60, elevation: 50, historicalRisk: 80, seismicActivity: 85 },
      outcome: { hazard: "SEISMIC", occurred: true },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    },
    {
      id: "synthetic-seismic-quiet-06",
      locationId: "loc-london",
      locationName: "London Stable Basin",
      observedAt: "2024-06-01T12:00:00.000Z",
      inputs: { rainfall: 20, riverLevel: 20, slope: 10, elevation: 5, historicalRisk: 5, seismicActivity: 0 },
      outcome: { hazard: "SEISMIC", occurred: false },
      datasetType: DATASET_TYPES.SYNTHETIC_TEST_FIXTURE,
      source: "SYNTHETIC_BENCHMARK_FIXTURE"
    }
  ];
}

export default {
  validateScenario,
  runHistoricalScenario,
  evaluateBacktestBatch,
  getSyntheticTestFixtures,
  ELEVATED_RISK_THRESHOLD,
  MIN_LABELED_SAMPLES_FOR_METRICS,
  DATASET_TYPES,
  HAZARDS
};
