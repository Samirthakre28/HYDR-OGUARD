/**
 * HydroGuard - Future ML Architecture Unit Tests (Step 22)
 *
 * Verifies the integrity of the Future ML interfaces, Model Registry,
 * Feature Contracts, Safety Gates, Fallback Behavior, and Invariants.
 */

import {
  getModelStatus,
  getModelMetadata,
  validateModelInput,
  validateModelOutput,
  predict,
  formatFeaturePayload,
  evaluateModelComparison,
  FEATURE_SCHEMA
} from "./mlRiskModel.service.js";

import {
  registerModel,
  getModel,
  listModels,
  getActiveModel,
  promoteModel,
  resetRegistry,
  ML_STATUS,
  SAFETY_GATES
} from "./mlModelRegistry.service.js";

import { calculateAllRisks } from "./riskEngine.service.js";
import { runDemoScenario, getDemoScenarios } from "./demoScenario.service.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASSED: ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("  HydroGuard - Future ML Architecture Tests (Step 22)");
console.log("=======================================================\n");

// Reset model registry state before tests
resetRegistry();

// Test 1: ML mode defaults to disabled
const status1 = getModelStatus();
assert(status1.enabled === false && status1.mode === "disabled", "Test 1: ML mode defaults to disabled");

// Test 2: Model status reports NOT_CONFIGURED
assert(status1.status === "NOT_CONFIGURED" && status1.activeModel === null, "Test 2: Model status reports NOT_CONFIGURED");

// Test 3: No prediction is generated when model unavailable
const prediction3 = predict({});
assert(
  prediction3.available === false &&
    prediction3.status === "NOT_CONFIGURED" &&
    prediction3.fallback?.authoritative === true,
  "Test 3: No prediction is generated when model unavailable (safe placeholder returned)"
);

// Test 4: Invalid ML input (missing location) is rejected
const invalidInput4 = {
  signals: {
    rainfall: { value: 50 },
    riverLevel: { value: 40 },
    slope: { value: 30 },
    elevation: { value: 20 },
    historicalRisk: { value: 50 },
    seismicActivity: { value: 10 }
  }
};
const res4 = validateModelInput(invalidInput4);
assert(res4.isValid === false && res4.errors.some((e) => e.includes("location")), "Test 4: Invalid ML input missing location is rejected");

// Test 5: Invalid feature range (<0 or >100) is rejected
const invalidInput5 = {
  location: { locationId: "loc-1", latitude: 35.0, longitude: 139.0 },
  signals: {
    rainfall: { value: 150 }, // Out of range (>100)
    riverLevel: { value: 40 },
    slope: { value: 30 },
    elevation: { value: 20 },
    historicalRisk: { value: 50 },
    seismicActivity: { value: 10 }
  }
};
const res5 = validateModelInput(invalidInput5);
assert(res5.isValid === false && res5.errors.some((e) => e.includes("outside expected range")), "Test 5: Out-of-bounds feature value (>100) is rejected");

// Test 6: Missing required feature is rejected safely
const invalidInput6 = {
  location: { locationId: "loc-1", latitude: 35.0, longitude: 139.0 },
  signals: {
    rainfall: { value: 50 },
    // missing riverLevel
    slope: { value: 30 },
    elevation: { value: 20 },
    historicalRisk: { value: 50 },
    seismicActivity: { value: 10 }
  }
};
const res6 = validateModelInput(invalidInput6);
assert(res6.isValid === false && res6.errors.some((e) => e.includes("riverLevel")), "Test 6: Missing required feature signal is rejected safely");

// Test 7: Stale feature (exceeded TTL) is detected and flagged
const staleTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h old (rainfall max is 15m)
const staleInput7 = {
  location: { locationId: "loc-1", latitude: 35.0, longitude: 139.0 },
  signals: {
    rainfall: { value: 50, observedAt: staleTimestamp },
    riverLevel: { value: 40 },
    slope: { value: 30 },
    elevation: { value: 20 },
    historicalRisk: { value: 50 },
    seismicActivity: { value: 10 }
  }
};
const res7 = validateModelInput(staleInput7);
assert(res7.isValid === true && res7.metadata.rainfall_normalized.isStale === true, "Test 7: Stale telemetry exceeding TTL is detected in metadata");

// Test 8: Invalid model output format is rejected
const invalidOutput8 = { available: true, modelId: "test-model" }; // missing probability and hazard
const res8 = validateModelOutput(invalidOutput8);
assert(res8.isValid === false && res8.errors.length > 0, "Test 8: Incomplete model output is rejected by output validator");

// Test 9: Probability outside [0.0, 1.0] is rejected
const invalidOutput9 = {
  available: true,
  modelId: "test-model",
  modelVersion: "1.0.0",
  hazard: "flood",
  probability: 1.45, // Invalid probability
  prediction: "HIGH",
  generatedAt: new Date().toISOString()
};
const res9 = validateModelOutput(invalidOutput9);
assert(res9.isValid === false && res9.errors.some((e) => e.includes("probability")), "Test 9: Probability outside [0.0, 1.0] is rejected");

// Test 10: Unknown model lookup returns null
const unknownModel10 = getModel("non-existent-model", "1.0.0");
assert(unknownModel10 === null, "Test 10: Unknown model ID lookup returns null");

// Test 11: Model version mismatch returns null
registerModel({
  modelId: "flood-xgboost",
  version: "1.0.0",
  featureSchemaVersion: "1.0.0",
  targetHazard: "flood",
  datasetVersion: "glofas-v1"
});
const mismatched11 = getModel("flood-xgboost", "2.0.0");
assert(mismatched11 === null, "Test 11: Model version mismatch returns null");

// Test 12: Deterministic engine remains functional and authoritative
const sampleInputs = {
  rainfall: 80,
  riverLevel: 70,
  slope: 60,
  elevation: 30,
  historicalRisk: 50,
  seismicActivity: 10
};
const riskResult12 = calculateAllRisks(sampleInputs);
assert(
  riskResult12.overall.score >= 0 &&
    riskResult12.overall.score <= 100 &&
    riskResult12.flood.level === "HIGH",
  "Test 12: Deterministic Risk Engine remains fully functional and authoritative"
);

// Test 13: ML failure falls back to deterministic engine in evaluation comparison
const failedComparison13 = evaluateModelComparison(riskResult12, { available: false });
assert(
  failedComparison13.comparisonAvailable === false &&
    failedComparison13.status === "ML_UNAVAILABLE" &&
    failedComparison13.authoritativeRisk.overall.score === riskResult12.overall.score,
  "Test 13: ML failure gracefully falls back to deterministic Risk Engine"
);

// Test 14: Demo mode remains isolated from ML pipeline
const demoScenario14 = runDemoScenario("demo-landslide-001");
assert(
  demoScenario14.isDemo === true &&
    demoScenario14.confidence.sourceCoverage === "SYNTHETIC_DEMO" &&
    demoScenario14.risk.landslide.level === "CRITICAL",
  "Test 14: Demo mode remains strictly isolated with synthetic provenance"
);

// Test 15: Synthetic fixtures cannot be promoted to PRODUCTION
registerModel({
  modelId: "synthetic-trained-model",
  version: "0.1.0",
  featureSchemaVersion: "1.0.0",
  targetHazard: "flood",
  datasetVersion: "synthetic-step19-fixtures",
  isSynthetic: true
});

const allGatesPassed = {};
SAFETY_GATES.forEach((gate) => {
  allGatesPassed[gate] = true;
});

const promotionRes15 = promoteModel("synthetic-trained-model", "0.1.0", ML_STATUS.PRODUCTION, allGatesPassed);
assert(
  promotionRes15.success === false &&
    promotionRes15.failedGates.includes("NON_SYNTHETIC_REQUIREMENT"),
  "Test 15: Synthetic fixtures cannot be promoted to PRODUCTION status"
);

// Test 16: No random ML output - Predict produces identical deterministic placeholder
const predA = predict({});
const predB = predict({});
assert(
  JSON.stringify(predA) === JSON.stringify(predB) &&
    predA.available === false &&
    predA.status === "NOT_CONFIGURED",
  "Test 16: Zero random numbers; ML interface returns deterministic constant placeholder"
);

// Test 17: Model metadata does not expose secrets or filesystem paths
const modelList17 = listModels();
const serialized17 = JSON.stringify(modelList17);
assert(
  !serialized17.includes("password") &&
    !serialized17.includes("secret") &&
    !serialized17.includes("apiKey") &&
    !serialized17.includes("C:\\") &&
    !serialized17.includes("/home/"),
  "Test 17: Model registry metadata does not leak secrets, API keys, or server paths"
);

// Test 18: Unverified model cannot be promoted without passing 12 safety gates
registerModel({
  modelId: "unverified-candidate",
  version: "1.0.0",
  featureSchemaVersion: "1.0.0",
  targetHazard: "landslide",
  datasetVersion: "em-dat-v1"
});
const failedPromotion18 = promoteModel("unverified-candidate", "1.0.0", ML_STATUS.PRODUCTION, {
  VALID_MODEL_ARTIFACT: true // Missing other 11 gates
});
assert(
  failedPromotion18.success === false && failedPromotion18.failedGates.length === 11,
  "Test 18: Promotion is rejected if any of the 12 safety gates are missing"
);

// Test 19: Feature payload formatter formats valid contract structure
const formattedPayload19 = formatFeaturePayload(
  { locationId: "loc-test-1", latitude: 20.0, longitude: 77.0 },
  { rainfall: 40, riverLevel: 30, slope: 50, elevation: 20, historicalRisk: 60, seismicActivity: 10 }
);
const inputValidation19 = validateModelInput(formattedPayload19);
assert(
  inputValidation19.isValid === true &&
    inputValidation19.normalizedFeatures.rainfall_normalized === 40,
  "Test 19: formatFeaturePayload outputs schema-compliant Feature Input Contract"
);

// Test 20: Existing risk calculation formulas remain 100% exact and unchanged
// Baseline: Rainfall (80*0.4) + River (70*0.3) + Elevation (30*0.1) + Hist (50*0.2) = 32 + 21 + 3 + 10 = 66
// Landslide: Rainfall (80*0.3) + Slope (60*0.35) + Hist (50*0.2) + Elevation (30*0.15) = 24 + 21 + 10 + 4.5 = 59.5 -> 60
// Seismic: Seismic (10*0.6) + Hist (50*0.4) = 6 + 20 = 26
// Overall: Flood (66*0.4) + Landslide (60*0.35) + Seismic (26*0.25) = 26.4 + 21 + 6.5 = 53.9 -> 54
assert(
  riskResult12.flood.score === 66 &&
    riskResult12.landslide.score === 60 &&
    riskResult12.seismic.score === 26 &&
    riskResult12.overall.score === 54,
  "Test 20: Mathematical risk engine formulas and weights are 100% exact and preserved"
);

console.log("\n=======================================================");
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
