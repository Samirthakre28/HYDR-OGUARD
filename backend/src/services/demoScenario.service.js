/**
 * HydroGuard - Deterministic Demo Scenario Service (Step 20)
 *
 * Provides a fixed, isolated catalog of synthetic demonstration scenarios that
 * run deterministically through the existing Risk Engine formulas.
 *
 * CRITICAL GUARDRAILS:
 * 1. Zero formula modification: Evaluates inputs strictly through existing calculateAllRisks.
 * 2. Zero live contamination: Isolated from live location caches, Mongo alerts, & offline packs.
 * 3. Explicit provenance: All outputs are strictly tagged "SYNTHETIC DEMO DATA — NOT LIVE CONDITIONS".
 * 4. Deterministic: Same scenario ID + same inputs = exact same risk calculations.
 */

import { calculateAllRisks, validateRiskInput } from "./riskEngine.service.js";

export const DEMO_DATASET_TYPE = "SYNTHETIC_DEMO";
export const DEMO_PROVENANCE = "SYNTHETIC DEMO DATA — NOT LIVE CONDITIONS";
export const DEMO_FIXED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

/**
 * Predefined Deterministic Demo Scenario Catalog
 */
export const DEMO_SCENARIO_CATALOG = [
  {
    scenarioId: "demo-low-001",
    name: "Stable Conditions",
    description: "Dry, stable meteorological conditions with baseline river levels and minimal seismic activity.",
    datasetType: DEMO_DATASET_TYPE,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    scenarioDefinedAt: DEMO_FIXED_TIMESTAMP,
    expectedHazardFocus: "LOW",
    inputs: {
      rainfall: 8,
      riverLevel: 10,
      slope: 15,
      elevation: 25,
      historicalRisk: 10,
      seismicActivity: 5
    }
  },
  {
    scenarioId: "demo-flood-001",
    name: "Heavy Rainfall & Rising River",
    description: "Intense monsoonal precipitation combined with river stage reaching flood threshold in a low-lying valley.",
    datasetType: DEMO_DATASET_TYPE,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    scenarioDefinedAt: DEMO_FIXED_TIMESTAMP,
    expectedHazardFocus: "FLOOD",
    inputs: {
      rainfall: 92,
      riverLevel: 88,
      slope: 20,
      elevation: 18,
      historicalRisk: 40,
      seismicActivity: 10
    }
  },
  {
    scenarioId: "demo-landslide-001",
    name: "Intense Rainfall on Steep Terrain",
    description: "Saturated soil overburden on steep mountain slopes subject to prolonged torrential rainfall.",
    datasetType: DEMO_DATASET_TYPE,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    scenarioDefinedAt: DEMO_FIXED_TIMESTAMP,
    expectedHazardFocus: "LANDSLIDE",
    inputs: {
      rainfall: 88,
      riverLevel: 30,
      slope: 82,
      elevation: 65,
      historicalRisk: 60,
      seismicActivity: 15
    }
  },
  {
    scenarioId: "demo-seismic-001",
    name: "Elevated Seismic Activity",
    description: "High-magnitude ground shaking along active fault zone with moderate historical seismic frequency.",
    datasetType: DEMO_DATASET_TYPE,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    scenarioDefinedAt: DEMO_FIXED_TIMESTAMP,
    expectedHazardFocus: "SEISMIC",
    inputs: {
      rainfall: 15,
      riverLevel: 20,
      slope: 30,
      elevation: 35,
      historicalRisk: 45,
      seismicActivity: 88
    }
  },
  {
    scenarioId: "demo-multi-001",
    name: "Compound Hazard",
    description: "Simultaneous extreme rainfall, cresting river levels, steep slopes, and strong earthquake shaking.",
    datasetType: DEMO_DATASET_TYPE,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    scenarioDefinedAt: DEMO_FIXED_TIMESTAMP,
    expectedHazardFocus: "MULTI_HAZARD",
    inputs: {
      rainfall: 90,
      riverLevel: 85,
      slope: 75,
      elevation: 50,
      historicalRisk: 70,
      seismicActivity: 80
    }
  }
];

/**
 * Returns a copy of the available deterministic demo scenarios.
 * @returns {Array<Object>}
 */
export function getDemoScenarios() {
  return JSON.parse(JSON.stringify(DEMO_SCENARIO_CATALOG));
}

/**
 * Retrieves a specific demo scenario by ID.
 * @param {string} scenarioId
 * @returns {Object|null}
 */
export function getDemoScenarioById(scenarioId) {
  if (!scenarioId || typeof scenarioId !== "string") return null;
  const found = DEMO_SCENARIO_CATALOG.find(
    (s) => s.scenarioId.toLowerCase() === scenarioId.trim().toLowerCase()
  );
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

/**
 * Validates a demo scenario's metadata and inputs.
 * @param {Object} scenario
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateDemoScenario(scenario) {
  const errors = [];
  if (!scenario || typeof scenario !== "object") {
    return { isValid: false, errors: ["Scenario must be a valid JSON object."] };
  }

  if (!scenario.scenarioId || typeof scenario.scenarioId !== "string") {
    errors.push("Missing or invalid scenarioId.");
  }

  if (!scenario.name || typeof scenario.name !== "string") {
    errors.push("Missing or invalid scenario name.");
  }

  const inputValidation = validateRiskInput(scenario.inputs);
  if (!inputValidation.isValid) {
    errors.push(...inputValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates an in-memory DEMO ALERT based on calculated risk results.
 * This is non-persistent and will NOT trigger real emergency notifications.
 * @param {Object} riskResult
 * @param {Object} scenario
 * @returns {Object}
 */
export function generateDemoAlert(riskResult, scenario) {
  const severity = riskResult?.overall?.level || "LOW";
  const hazardTypes = [];
  if (riskResult.flood?.score >= 51) hazardTypes.push("Flood");
  if (riskResult.landslide?.score >= 51) hazardTypes.push("Landslide");
  if (riskResult.seismic?.score >= 51) hazardTypes.push("Seismic");

  let hasAlert = severity !== "LOW";
  let title = `[DEMO ALERT] ${scenario.name}`;
  let message = `[DEMO ONLY - NOT A REAL DISASTER] ${scenario.description} Calculated Risk: ${severity} (${riskResult.overall.score}/100).`;

  return {
    hasAlert,
    severity,
    title,
    message,
    hazardTypes,
    location: `Demo: ${scenario.name}`,
    isDemoAlert: true,
    isDemo: true,
    provenance: DEMO_PROVENANCE,
    createdAt: scenario.scenarioDefinedAt || DEMO_FIXED_TIMESTAMP
  };
}

/**
 * Runs a deterministic demo scenario through the existing Risk Engine.
 * @param {string|Object} scenarioOrId
 * @returns {Object} Complete calculated demo assessment
 */
export function runDemoScenario(scenarioOrId) {
  let scenario = null;
  if (typeof scenarioOrId === "string") {
    scenario = getDemoScenarioById(scenarioOrId);
    if (!scenario) {
      const err = new Error(`Demo scenario not found: '${scenarioOrId}'`);
      err.statusCode = 404;
      throw err;
    }
  } else if (scenarioOrId && typeof scenarioOrId === "object") {
    scenario = scenarioOrId;
  } else {
    const err = new Error("Invalid scenario identifier or payload.");
    err.statusCode = 400;
    throw err;
  }

  // Validate scenario inputs
  const validation = validateDemoScenario(scenario);
  if (!validation.isValid) {
    const err = new Error("Invalid demo scenario inputs.");
    err.statusCode = 400;
    err.errors = validation.errors;
    throw err;
  }

  // 1. Calculate deterministic risks via existing Risk Engine
  const riskResult = calculateAllRisks(scenario.inputs);

  // 2. Generate non-persistent Demo Alert
  const demoAlert = generateDemoAlert(riskResult, scenario);

  // 3. Construct transparent Demo Confidence metadata
  const demoConfidence = {
    overall: "HIGH",
    flood: "HIGH",
    landslide: "HIGH",
    seismic: "HIGH",
    sourceCoverage: "SYNTHETIC_DEMO",
    isDemo: true,
    hasCachedData: false,
    hasStaleData: false,
    hasMissingInputs: false,
    provenance: DEMO_PROVENANCE,
    reasons: [
      `Deterministic synthetic demo scenario: "${scenario.name}"`,
      "Inputs are fixed benchmark demonstration parameters (0–100 scale)",
      "Zero live sensor feeds utilized; isolated from live location pipelines"
    ]
  };

  // 4. Return structured response
  return {
    mode: "DEMO",
    isDemo: true,
    scenario: {
      scenarioId: scenario.scenarioId,
      name: scenario.name,
      description: scenario.description,
      datasetType: DEMO_DATASET_TYPE,
      isDemo: true,
      provenance: DEMO_PROVENANCE,
      expectedHazardFocus: scenario.expectedHazardFocus,
      scenarioDefinedAt: scenario.scenarioDefinedAt || DEMO_FIXED_TIMESTAMP
    },
    risk: {
      flood: riskResult.flood,
      landslide: riskResult.landslide,
      seismic: riskResult.seismic,
      overall: riskResult.overall,
      factors: riskResult.factors,
      inputs: riskResult.inputs,
      calculatedAt: riskResult.calculatedAt
    },
    alert: demoAlert,
    confidence: demoConfidence,
    provenance: DEMO_PROVENANCE
  };
}

export default {
  DEMO_DATASET_TYPE,
  DEMO_PROVENANCE,
  DEMO_FIXED_TIMESTAMP,
  DEMO_SCENARIO_CATALOG,
  getDemoScenarios,
  getDemoScenarioById,
  validateDemoScenario,
  generateDemoAlert,
  runDemoScenario
};
