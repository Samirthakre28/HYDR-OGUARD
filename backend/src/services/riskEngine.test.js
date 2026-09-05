import assert from "node:assert/strict";
import {
  calculateFloodRisk,
  calculateLandslideRisk,
  calculateSeismicRisk,
  calculateOverallRisk,
  getRiskLevel,
  validateRiskInput,
  extractContributingFactors,
  calculateAllRisks
} from "./riskEngine.service.js";

console.log("==================================================");
console.log("🧪 HydroGuard - Risk Engine Unit Test Suite");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}\n`);
    failed++;
  }
}

// ----------------------------------------------------
// Test 1: Low Inputs (all around 10-20)
// ----------------------------------------------------
runTest("Test 1: Low inputs produce LOW hazard and overall risks", () => {
  const lowInput = {
    rainfall: 15,
    riverLevel: 10,
    slope: 12,
    elevation: 20,
    historicalRisk: 15,
    seismicActivity: 10
  };

  const result = calculateAllRisks(lowInput);

  assert.equal(result.flood.level, "LOW", "Flood risk should be LOW");
  assert.equal(result.landslide.level, "LOW", "Landslide risk should be LOW");
  assert.equal(result.seismic.level, "LOW", "Seismic risk should be LOW");
  assert.equal(result.overall.level, "LOW", "Overall risk should be LOW");
  assert.ok(result.overall.score <= 25, "Overall score should be <= 25");
  assert.equal(result.factors.length, 0, "No elevated factors should trigger for low inputs");
});

// ----------------------------------------------------
// Test 2: High Flood Conditions
// ----------------------------------------------------
runTest("Test 2: High rainfall and river level produce HIGH/CRITICAL flood risk", () => {
  const highFloodInput = {
    rainfall: 90,
    riverLevel: 90,
    slope: 30,
    elevation: 30,
    historicalRisk: 80,
    seismicActivity: 20
  };

  const result = calculateAllRisks(highFloodInput);

  // 90*0.40 (36) + 90*0.30 (27) + 30*0.10 (3) + 80*0.20 (16) = 82 (CRITICAL)
  assert.equal(result.flood.score, 82);
  assert.equal(result.flood.level, "CRITICAL");
  assert.ok(result.overall.score >= 51, "Overall score should be >= 51");

  // Verify contributing factors include rainfall and river level
  const factorNames = result.factors.map((f) => f.factor);
  assert.ok(factorNames.includes("Heavy rainfall"), "Should include Heavy rainfall factor");
  assert.ok(factorNames.includes("Rising river level"), "Should include Rising river level factor");
});

// ----------------------------------------------------
// Test 3: High Landslide Conditions
// ----------------------------------------------------
runTest("Test 3: High rainfall + steep slope produce HIGH/CRITICAL landslide risk", () => {
  const highLandslideInput = {
    rainfall: 85,
    riverLevel: 30,
    slope: 90,
    elevation: 60,
    historicalRisk: 80,
    seismicActivity: 20
  };

  const result = calculateAllRisks(highLandslideInput);

  // 85*0.30 (25.5) + 90*0.35 (31.5) + 80*0.20 (16) + 60*0.15 (9) = 82 (CRITICAL)
  assert.equal(result.landslide.score, 82);
  assert.equal(result.landslide.level, "CRITICAL");

  const factorNames = result.factors.map((f) => f.factor);
  assert.ok(factorNames.includes("Steep terrain"), "Should include Steep terrain factor");
});

// ----------------------------------------------------
// Test 4: High Seismic Conditions
// ----------------------------------------------------
runTest("Test 4: High seismic activity produces elevated seismic risk", () => {
  const highSeismicInput = {
    rainfall: 20,
    riverLevel: 20,
    slope: 15,
    elevation: 10,
    historicalRisk: 85,
    seismicActivity: 90
  };

  const result = calculateAllRisks(highSeismicInput);

  // 90*0.60 (54) + 85*0.40 (34) = 88 (CRITICAL)
  assert.equal(result.seismic.score, 88);
  assert.equal(result.seismic.level, "CRITICAL");

  const factorNames = result.factors.map((f) => f.factor);
  assert.ok(factorNames.includes("Elevated seismic activity"), "Should include Elevated seismic activity");
});

// ----------------------------------------------------
// Test 5: Boundary Values (0 and 100)
// ----------------------------------------------------
runTest("Test 5: Extreme boundaries 0 and 100 evaluate correctly", () => {
  const allZero = {
    rainfall: 0,
    riverLevel: 0,
    slope: 0,
    elevation: 0,
    historicalRisk: 0,
    seismicActivity: 0
  };
  const zeroResult = calculateAllRisks(allZero);
  assert.equal(zeroResult.overall.score, 0);
  assert.equal(zeroResult.overall.level, "LOW");

  const allHundred = {
    rainfall: 100,
    riverLevel: 100,
    slope: 100,
    elevation: 100,
    historicalRisk: 100,
    seismicActivity: 100
  };
  const hundredResult = calculateAllRisks(allHundred);
  assert.equal(hundredResult.overall.score, 100);
  assert.equal(hundredResult.overall.level, "CRITICAL");
  assert.equal(hundredResult.factors.length, 5, "All 5 elevated factors should be present");
});

// ----------------------------------------------------
// Test 6: Input Validation Checks
// ----------------------------------------------------
runTest("Test 6: Invalid inputs (>100, negative, missing, non-numeric) are rejected", () => {
  // Over 100
  const overHundred = validateRiskInput({
    rainfall: 150,
    riverLevel: 20,
    slope: 30,
    elevation: 40,
    historicalRisk: 50,
    seismicActivity: 60
  });
  assert.equal(overHundred.isValid, false, "Should reject rainfall > 100");

  // Negative
  const negative = validateRiskInput({
    rainfall: -10,
    riverLevel: 20,
    slope: 30,
    elevation: 40,
    historicalRisk: 50,
    seismicActivity: 60
  });
  assert.equal(negative.isValid, false, "Should reject negative value");

  // Missing field
  const missing = validateRiskInput({
    rainfall: 50,
    slope: 30
  });
  assert.equal(missing.isValid, false, "Should reject missing fields");

  // Non-numeric
  const nonNumeric = validateRiskInput({
    rainfall: "invalid",
    riverLevel: 20,
    slope: 30,
    elevation: 40,
    historicalRisk: 50,
    seismicActivity: 60
  });
  assert.equal(nonNumeric.isValid, false, "Should reject string/non-numeric input");
});

console.log(`\n==================================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
