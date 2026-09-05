/**
 * HydroGuard - Historical Validation & Backtesting Test Suite (Step 19)
 *
 * Verifies:
 * - Scenario schema and input gate validation
 * - Deterministic Risk Engine execution on historical inputs
 * - Ground-truth outcome comparison (TP, TN, FP, FN)
 * - Precision, Recall, F1 metrics calculation with zero-denominator safety
 * - Sample size sufficiency checks (< 5 samples -> INSUFFICIENT_SAMPLE)
 * - Synthetic test fixture vs verified dataset provenance tracking
 * - Duplicate scenario deduplication
 * - CRITICAL INVARIANT: Live Risk Engine formulas and scores remain 100% untouched
 */

import assert from "assert";
import {
  validateScenario,
  runHistoricalScenario,
  evaluateBacktestBatch,
  getSyntheticTestFixtures,
  ELEVATED_RISK_THRESHOLD,
  DATASET_TYPES,
  HAZARDS
} from "./historicalValidation.service.js";
import { calculateAllRisks } from "./riskEngine.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Historical Validation & Backtest Tests (Step 19)");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASSED: ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${error.message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. Scenario Schema & Input Validation
// -------------------------------------------------------------

runTest("Test 1: Valid historical scenario runs and returns correct calculated risk scores", () => {
  const scenario = {
    id: "hist-mumbai-2024",
    locationId: "loc-mumbai",
    locationName: "Mumbai Basin",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 80, riverLevel: 75, slope: 30, elevation: 15, historicalRisk: 60, seismicActivity: 10 },
    outcome: { hazard: "FLOOD", occurred: true },
    datasetType: DATASET_TYPES.VERIFIED_HISTORICAL,
    source: "GOV_DISASTER_RECORDS"
  };

  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.scenarioId, "hist-mumbai-2024");
  assert.strictEqual(typeof res.calculatedRisk.overall.score, "number");
  assert.strictEqual(res.evaluationMatch, "TRUE_POSITIVE");
});

runTest("Test 2: Invalid negative rainfall in scenario is rejected", () => {
  const scenario = {
    id: "invalid-01",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: -20, riverLevel: 30, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 5 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("rainfall")));
});

runTest("Test 3: Invalid river level in scenario is rejected", () => {
  const scenario = {
    id: "invalid-02",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 40, riverLevel: "not_a_number", slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 5 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("riverLevel")));
});

runTest("Test 4: Invalid seismic input (>100) in scenario is rejected", () => {
  const scenario = {
    id: "invalid-03",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 40, riverLevel: 30, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 150 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("seismicActivity")));
});

runTest("Test 5: Missing required field in inputs is rejected", () => {
  const scenario = {
    id: "invalid-04",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 40, riverLevel: 30, elevation: 10, historicalRisk: 10, seismicActivity: 5 } // missing slope
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("slope")));
});

runTest("Test 6: Malformed timestamp string in scenario is rejected", () => {
  const scenario = {
    id: "invalid-05",
    observedAt: "not_a_date",
    inputs: { rainfall: 40, riverLevel: 30, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 5 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("observedAt")));
});

runTest("Test 7: Future timestamp beyond clock-skew is rejected", () => {
  const scenario = {
    id: "invalid-06",
    observedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    inputs: { rainfall: 40, riverLevel: 30, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 5 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("future-dated")));
});

// -------------------------------------------------------------
// 2. Synthetic vs Verified Provenance
// -------------------------------------------------------------

runTest("Test 8: Synthetic test fixture is explicitly tagged as SYNTHETIC_TEST_FIXTURE", () => {
  const fixtures = getSyntheticTestFixtures();
  assert(fixtures.length >= 4);
  for (const f of fixtures) {
    assert.strictEqual(f.datasetType, DATASET_TYPES.SYNTHETIC_TEST_FIXTURE);
  }
});

runTest("Test 9: Batch evaluation flags containsSyntheticData when synthetic fixtures are present", () => {
  const fixtures = getSyntheticTestFixtures();
  const report = evaluateBacktestBatch(fixtures);
  assert.strictEqual(report.containsSyntheticData, true);
  assert(report.limitations.some(l => l.includes("contains synthetic test fixtures")));
});

runTest("Test 10: Unlabeled scenario (occurred: null) is safely excluded from confusion matrix", () => {
  const scenario = {
    id: "unlabeled-01",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 80, riverLevel: 75, slope: 30, elevation: 15, historicalRisk: 60, seismicActivity: 10 },
    outcome: { hazard: "FLOOD", occurred: null }
  };

  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.isEvaluated, false);
  assert.strictEqual(res.evaluationMatch, null);
});

// -------------------------------------------------------------
// 3. Confusion Matrix: TP, TN, FP, FN
// -------------------------------------------------------------

runTest("Test 11: Flood True Positive (High Risk Score + Flood Occurred) evaluated correctly", () => {
  const scenario = {
    id: "tp-flood",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 90, riverLevel: 85, slope: 20, elevation: 10, historicalRisk: 70, seismicActivity: 0 },
    outcome: { hazard: "FLOOD", occurred: true }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "TRUE_POSITIVE");
});

runTest("Test 12: Flood True Negative (Low Risk Score + Flood Did Not Occur) evaluated correctly", () => {
  const scenario = {
    id: "tn-flood",
    observedAt: "2024-01-10T12:00:00.000Z",
    inputs: { rainfall: 5, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 },
    outcome: { hazard: "FLOOD", occurred: false }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "TRUE_NEGATIVE");
});

runTest("Test 13: Flood False Positive (High Risk Score + Flood Did Not Occur) evaluated correctly", () => {
  const scenario = {
    id: "fp-flood",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 90, riverLevel: 85, slope: 20, elevation: 10, historicalRisk: 70, seismicActivity: 0 },
    outcome: { hazard: "FLOOD", occurred: false }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "FALSE_POSITIVE");
});

runTest("Test 14: Flood False Negative (Low Risk Score + Flood Occurred) evaluated correctly", () => {
  const scenario = {
    id: "fn-flood",
    observedAt: "2024-01-10T12:00:00.000Z",
    inputs: { rainfall: 5, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 },
    outcome: { hazard: "FLOOD", occurred: true }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "FALSE_NEGATIVE");
});

// -------------------------------------------------------------
// 4. Precision, Recall, F1, and Zero-Denominator Safety
// -------------------------------------------------------------

runTest("Test 15: Precision, Recall, and F1 calculated accurately on balanced batch", () => {
  const batch = [
    // 2 TP
    { id: "s1", observedAt: "2024-01-01T00:00:00Z", inputs: { rainfall: 90, riverLevel: 80, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: true } },
    { id: "s2", observedAt: "2024-01-02T00:00:00Z", inputs: { rainfall: 85, riverLevel: 75, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: true } },
    // 2 TN
    { id: "s3", observedAt: "2024-01-03T00:00:00Z", inputs: { rainfall: 10, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    { id: "s4", observedAt: "2024-01-04T00:00:00Z", inputs: { rainfall: 5, riverLevel: 5, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    // 1 FP
    { id: "s5", observedAt: "2024-01-05T00:00:00Z", inputs: { rainfall: 80, riverLevel: 70, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } }
  ];

  const report = evaluateBacktestBatch(batch);
  // TP=2, FP=1 -> Precision = 2/3 = 0.667
  // TP=2, FN=0 -> Recall = 2/2 = 1.0
  // F1 = 2 * (0.667 * 1.0) / (0.667 + 1.0) = 0.8
  assert.strictEqual(report.hazards.flood.truePositives, 2);
  assert.strictEqual(report.hazards.flood.trueNegatives, 2);
  assert.strictEqual(report.hazards.flood.falsePositives, 1);
  assert.strictEqual(report.hazards.flood.falseNegatives, 0);
  assert.strictEqual(report.hazards.flood.precision, 0.667);
  assert.strictEqual(report.hazards.flood.recall, 1);
  assert.strictEqual(report.hazards.flood.f1, 0.8);
});

runTest("Test 16: Zero-denominator precision/recall returns null (never NaN or 0)", () => {
  // Batch with only True Negatives (TP=0, FP=0, FN=0) -> Precision & Recall denominator is 0
  const batch = [
    { id: "s1", observedAt: "2024-01-01T00:00:00Z", inputs: { rainfall: 10, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    { id: "s2", observedAt: "2024-01-02T00:00:00Z", inputs: { rainfall: 5, riverLevel: 5, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    { id: "s3", observedAt: "2024-01-03T00:00:00Z", inputs: { rainfall: 15, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    { id: "s4", observedAt: "2024-01-04T00:00:00Z", inputs: { rainfall: 5, riverLevel: 5, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } },
    { id: "s5", observedAt: "2024-01-05T00:00:00Z", inputs: { rainfall: 8, riverLevel: 8, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } }
  ];

  const report = evaluateBacktestBatch(batch);
  assert.strictEqual(report.hazards.flood.precision, null);
  assert.strictEqual(report.hazards.flood.recall, null);
  assert.strictEqual(report.hazards.flood.f1, null);
});

runTest("Test 17: Insufficient sample size (< 5) is flagged with INSUFFICIENT_SAMPLE status", () => {
  const smallBatch = [
    { id: "s1", observedAt: "2024-01-01T00:00:00Z", inputs: { rainfall: 90, riverLevel: 80, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: true } },
    { id: "s2", observedAt: "2024-01-02T00:00:00Z", inputs: { rainfall: 10, riverLevel: 10, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: false } }
  ];

  const report = evaluateBacktestBatch(smallBatch, { minSamples: 5 });
  assert.strictEqual(report.evaluationStatus, "INSUFFICIENT_SAMPLE");
  assert.strictEqual(report.labeledSamples, 2);
});

// -------------------------------------------------------------
// 5. Deduplication & Location Isolation
// -------------------------------------------------------------

runTest("Test 18: Duplicate scenario IDs are deduplicated and counted once", () => {
  const duplicateBatch = [
    { id: "scenario-dup", observedAt: "2024-01-01T00:00:00Z", inputs: { rainfall: 90, riverLevel: 80, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: true } },
    { id: "scenario-dup", observedAt: "2024-01-01T00:00:00Z", inputs: { rainfall: 90, riverLevel: 80, slope: 20, elevation: 10, historicalRisk: 50, seismicActivity: 0 }, outcome: { hazard: "FLOOD", occurred: true } }
  ];

  const report = evaluateBacktestBatch(duplicateBatch);
  assert.strictEqual(report.sampleSize, 1);
  assert.strictEqual(report.results.length, 1);
});

runTest("Test 19: Location coordinate validation detects out of bounds scenario coordinates", () => {
  const scenario = {
    id: "invalid-coords",
    latitude: 95.0, // out of bounds
    longitude: 72.0,
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 40, riverLevel: 30, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 5 }
  };
  const val = validateScenario(scenario);
  assert.strictEqual(val.isValid, false);
  assert(val.errors.some(e => e.includes("coordinates")));
});

// -------------------------------------------------------------
// 6. Hazard-Specific & Multi-Hazard Coverage
// -------------------------------------------------------------

runTest("Test 20: Landslide scenario evaluates Landslide metrics correctly", () => {
  const scenario = {
    id: "landslide-01",
    observedAt: "2024-08-01T12:00:00.000Z",
    inputs: { rainfall: 85, riverLevel: 30, slope: 85, elevation: 50, historicalRisk: 80, seismicActivity: 0 },
    outcome: { hazard: "LANDSLIDE", occurred: true }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "TRUE_POSITIVE");
  assert.strictEqual(res.actualOutcome.hazard, "LANDSLIDE");
});

runTest("Test 21: Seismic scenario evaluates Seismic metrics correctly", () => {
  const scenario = {
    id: "seismic-01",
    observedAt: "2024-05-10T12:00:00.000Z",
    inputs: { rainfall: 10, riverLevel: 10, slope: 10, elevation: 10, historicalRisk: 60, seismicActivity: 90 },
    outcome: { hazard: "SEISMIC", occurred: true }
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.evaluationMatch, "TRUE_POSITIVE");
  assert.strictEqual(res.actualOutcome.hazard, "SEISMIC");
});

runTest("Test 22: Empty scenarios batch returns NO_DATA status gracefully without throwing exception", () => {
  const report = evaluateBacktestBatch([]);
  assert.strictEqual(report.evaluationStatus, "NO_DATA");
  assert.strictEqual(report.sampleSize, 0);
});

// -------------------------------------------------------------
// 7. CRITICAL INVARIANT: Risk Engine Formulas Untouched
// -------------------------------------------------------------

runTest("Test 23: CRITICAL INVARIANT - Risk Engine output on identical inputs matches calculateAllRisks exactly", () => {
  const inputs = { rainfall: 65, riverLevel: 50, slope: 55, elevation: 25, historicalRisk: 40, seismicActivity: 30 };
  const directRisk = calculateAllRisks(inputs);

  const scenario = {
    id: "invariant-check",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs,
    outcome: { hazard: "FLOOD", occurred: true }
  };

  const evalResult = runHistoricalScenario(scenario);
  assert.strictEqual(evalResult.calculatedRisk.overall.score, directRisk.overall.score);
  assert.strictEqual(evalResult.calculatedRisk.flood.score, directRisk.flood.score);
  assert.strictEqual(evalResult.calculatedRisk.landslide.score, directRisk.landslide.score);
  assert.strictEqual(evalResult.calculatedRisk.seismic.score, directRisk.seismic.score);
});

runTest("Test 24: Repeated evaluation of same scenario batch produces deterministic identical results", () => {
  const fixtures = getSyntheticTestFixtures();
  const report1 = evaluateBacktestBatch(fixtures);
  const report2 = evaluateBacktestBatch(fixtures);

  assert.strictEqual(report1.sampleSize, report2.sampleSize);
  assert.strictEqual(report1.labeledSamples, report2.labeledSamples);
  assert.deepStrictEqual(report1.hazards.overall, report2.hazards.overall);
});

runTest("Test 25: Unknown outcome hazards are normalized to OVERALL safely", () => {
  const scenario = {
    id: "unspecified-hazard",
    observedAt: "2024-07-15T12:00:00.000Z",
    inputs: { rainfall: 85, riverLevel: 75, slope: 50, elevation: 20, historicalRisk: 50, seismicActivity: 10 },
    outcome: { occurred: true } // hazard not specified
  };
  const res = runHistoricalScenario(scenario);
  assert.strictEqual(res.actualOutcome.hazard, "OVERALL");
  assert.strictEqual(res.evaluationMatch, "TRUE_POSITIVE");
});

runTest("Test 26: Synthetic test fixtures are never labeled as VERIFIED_HISTORICAL", () => {
  const syntheticFixtures = getSyntheticTestFixtures();
  for (const f of syntheticFixtures) {
    assert.notStrictEqual(f.datasetType, DATASET_TYPES.VERIFIED_HISTORICAL);
  }
});

console.log("\n=======================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
