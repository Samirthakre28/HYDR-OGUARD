/**
 * HydroGuard - Data Validation, Freshness & Provenance Test Suite (Step 17)
 *
 * Verifies:
 * - Coordinate bounds validation (lat: -90..90, lon: -180..180)
 * - Physical metric validation & explicit unit bounds (mm, m, M, km/h, etc.)
 * - Timestamp parsing, clock-skew protection, and missing date handling
 * - Freshness tier evaluation (FRESH, AGING, STALE, UNKNOWN) across providers
 * - Location isolation and distance mismatch detection
 * - Duplicate / replay observation detection
 * - Stored / Demo vs Live provenance tagging (Zero fake live data)
 * - Risk Engine Input Gate boundary
 */

import assert from "assert";
import {
  validateCoordinates,
  validateTimestamp,
  evaluateFreshness,
  validatePhysicalMetric,
  validateLocationMatch,
  detectDuplicateObservation,
  normalizeEnvironmentalSignal,
  validateRiskEngineInputGate,
  FRESHNESS_STATES,
  DATA_STATUS,
  FRESHNESS_THRESHOLDS,
  PHYSICAL_METRIC_BOUNDS,
  MAX_FUTURE_CLOCK_SKEW_MS
} from "./dataValidation.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Data Validation & Freshness Tests (Step 17)");
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
// 1. Physical Metric & Unit Validation
// -------------------------------------------------------------

runTest("Test 1: Valid rainfall (mm) is accepted with correct physical unit", () => {
  const result = validatePhysicalMetric("rainfall", 45.5, "mm");
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.value, 45.5);
  assert.strictEqual(result.unit, "mm");
});

runTest("Test 2: Negative rainfall is rejected", () => {
  const result = validatePhysicalMetric("rainfall", -10, "mm");
  assert.strictEqual(result.isValid, false);
  assert(result.error.includes("cannot be less than 0"));
});

runTest("Test 3: NaN and non-finite rainfall values are rejected", () => {
  const resultNaN = validatePhysicalMetric("rainfall", NaN, "mm");
  assert.strictEqual(resultNaN.isValid, false);

  const resultInf = validatePhysicalMetric("rainfall", Infinity, "mm");
  assert.strictEqual(resultInf.isValid, false);
});

runTest("Test 4: Impossible extreme single-interval rainfall (>500mm) is rejected", () => {
  const result = validatePhysicalMetric("rainfall", 750, "mm");
  assert.strictEqual(result.isValid, false);
  assert(result.error.includes("exceeds maximum physical limit"));
});

runTest("Test 5: Valid river level (m) is accepted and negative is rejected", () => {
  const validResult = validatePhysicalMetric("riverLevel", 4.2, "m");
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.value, 4.2);

  const invalidResult = validatePhysicalMetric("riverLevel", -1.5, "m");
  assert.strictEqual(invalidResult.isValid, false);
});

runTest("Test 6: Valid seismic magnitude (M) is accepted and impossible magnitude (>10) is rejected", () => {
  const valid = validatePhysicalMetric("seismicMagnitude", 6.8, "M");
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.value, 6.8);

  const impossible = validatePhysicalMetric("seismicMagnitude", 14.5, "M");
  assert.strictEqual(impossible.isValid, false);
  assert(impossible.error.includes("exceeds maximum physical limit"));
});

runTest("Test 7: Unit mismatch is caught and rejected", () => {
  const mismatch = validatePhysicalMetric("rainfall", 25, "inches");
  assert.strictEqual(mismatch.isValid, false);
  assert(mismatch.error.includes("Unit mismatch"));
});

// -------------------------------------------------------------
// 2. Coordinate Boundaries & Location Isolation
// -------------------------------------------------------------

runTest("Test 8: Valid coordinates pass boundary checks", () => {
  const mumbai = validateCoordinates(19.0760, 72.8777);
  assert.strictEqual(mumbai.isValid, true);
  assert.strictEqual(mumbai.latitude, 19.076);
  assert.strictEqual(mumbai.longitude, 72.8777);
});

runTest("Test 9: Out-of-bounds latitude (< -90 or > 90) is rejected", () => {
  const tooNorth = validateCoordinates(95.0, 72.0);
  assert.strictEqual(tooNorth.isValid, false);
  assert(tooNorth.error.includes("out of bounds"));

  const tooSouth = validateCoordinates(-91.5, 0);
  assert.strictEqual(tooSouth.isValid, false);
});

runTest("Test 10: Out-of-bounds longitude (< -180 or > 180) is rejected", () => {
  const tooEast = validateCoordinates(20.0, 185.0);
  assert.strictEqual(tooEast.isValid, false);
  assert(tooEast.error.includes("out of bounds"));

  const nonNumeric = validateCoordinates("abc", "def");
  assert.strictEqual(nonNumeric.isValid, false);
});

runTest("Test 11: Location match validation detects location isolation violations (>100km drift)", () => {
  // Mumbai vs Tokyo (Distance > 6,000 km)
  const mumbai = { latitude: 19.076, longitude: 72.8777, locationId: "loc-mumbai" };
  const tokyo = { latitude: 35.6762, longitude: 139.6503, locationId: "loc-tokyo" };

  const check = validateLocationMatch(mumbai, tokyo, 100);
  assert.strictEqual(check.isMatch, false);
  assert(check.error.includes("Location ID mismatch") || check.error.includes("exceeds maximum"));
});

runTest("Test 12: Nearby station within threshold passes location matching", () => {
  const mumbaiCenter = { latitude: 19.0760, longitude: 72.8777 };
  const mithiRiverGauge = { latitude: 19.0800, longitude: 72.8800 }; // ~0.5 km away

  const check = validateLocationMatch(mumbaiCenter, mithiRiverGauge, 50);
  assert.strictEqual(check.isMatch, true);
  assert(check.distanceKm < 2);
});

// -------------------------------------------------------------
// 3. Timestamp & Freshness Tier Validation
// -------------------------------------------------------------

runTest("Test 13: Valid ISO timestamp parses correctly", () => {
  const iso = new Date().toISOString();
  const res = validateTimestamp(iso);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.isFutureSkew, false);
});

runTest("Test 14: Malformed timestamp string is flagged as invalid", () => {
  const res = validateTimestamp("not-a-valid-date-string");
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes("Malformed timestamp"));
});

runTest("Test 15: Future-dated timestamp beyond clock skew (5 mins) is flagged", () => {
  const futureDate = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins in future
  const res = validateTimestamp(futureDate);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.isFutureSkew, true);
});

runTest("Test 16: Weather freshness evaluated as FRESH (<= 30 min)", () => {
  const now = 1700000000000;
  const observedAt = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min old
  const report = evaluateFreshness(observedAt, "WEATHER", now);
  assert.strictEqual(report.freshness, FRESHNESS_STATES.FRESH);
  assert.strictEqual(report.ageMinutes, 10);
});

runTest("Test 17: Weather freshness evaluated as AGING (30 - 120 min)", () => {
  const now = 1700000000000;
  const observedAt = new Date(now - 45 * 60 * 1000).toISOString(); // 45 min old
  const report = evaluateFreshness(observedAt, "WEATHER", now);
  assert.strictEqual(report.freshness, FRESHNESS_STATES.AGING);
  assert.strictEqual(report.ageMinutes, 45);
});

runTest("Test 18: Weather freshness evaluated as STALE (> 120 min)", () => {
  const now = 1700000000000;
  const observedAt = new Date(now - 180 * 60 * 1000).toISOString(); // 3 hours old
  const report = evaluateFreshness(observedAt, "WEATHER", now);
  assert.strictEqual(report.freshness, FRESHNESS_STATES.STALE);
  assert.strictEqual(report.ageMinutes, 180);
});

runTest("Test 19: Missing timestamp produces UNKNOWN freshness without throwing exception", () => {
  const report = evaluateFreshness(null, "WEATHER");
  assert.strictEqual(report.freshness, FRESHNESS_STATES.UNKNOWN);
  assert.strictEqual(report.ageMinutes, null);
});

// -------------------------------------------------------------
// 4. Duplicate Observation & Provenance Descriptor Validation
// -------------------------------------------------------------

runTest("Test 20: Duplicate observation detected when timestamp and value match", () => {
  const iso = "2026-09-04T12:00:00.000Z";
  const obs1 = { observedAt: iso, rainfall: 12.4 };
  const obs2 = { observedAt: iso, rainfall: 12.4 };

  const check = detectDuplicateObservation(obs1, obs2);
  assert.strictEqual(check.isDuplicate, true);
});

runTest("Test 21: Stored/demo data is explicitly labeled STORED and never LIVE", () => {
  const slopeSignal = normalizeEnvironmentalSignal({
    value: 65,
    unit: "score (0-100)",
    source: "stored_demo_terrain",
    status: DATA_STATUS.STORED
  });

  assert.strictEqual(slopeSignal.status, "STORED");
  assert.strictEqual(slopeSignal.source, "stored_demo_terrain");
  assert.notStrictEqual(slopeSignal.status, "LIVE");
});

runTest("Test 22: Live weather signal descriptor preserves observation time and evaluated freshness", () => {
  const now = Date.now();
  const observedTime = new Date(now - 5 * 60 * 1000).toISOString(); // 5 min ago

  const weatherSignal = normalizeEnvironmentalSignal({
    value: 22.5,
    unit: "mm",
    source: "Open-Meteo Live API",
    observedAt: observedTime,
    status: DATA_STATUS.LIVE,
    providerType: "WEATHER"
  });

  assert.strictEqual(weatherSignal.status, "LIVE");
  assert.strictEqual(weatherSignal.unit, "mm");
  assert.strictEqual(weatherSignal.source, "Open-Meteo Live API");
  assert.strictEqual(weatherSignal.freshness, FRESHNESS_STATES.FRESH);
  assert.strictEqual(weatherSignal.observedAt, observedTime);
});

// -------------------------------------------------------------
// 5. Risk Engine Input Gate Boundary
// -------------------------------------------------------------

runTest("Test 23: Risk Engine Input Gate passes complete valid inputs cleanly", () => {
  const validInputs = {
    rainfall: 45,
    riverLevel: 30,
    slope: 55,
    elevation: 20,
    historicalRisk: 40,
    seismicActivity: 15
  };

  const gate = validateRiskEngineInputGate(validInputs);
  assert.strictEqual(gate.valid, true);
  assert.deepStrictEqual(gate.normalized, validInputs);
  assert.strictEqual(gate.missingFields.length, 0);
  assert.strictEqual(gate.invalidFields.length, 0);
});

runTest("Test 24: Risk Engine Input Gate blocks missing or corrupted inputs without crashing", () => {
  const corruptedInputs = {
    rainfall: "invalid_string",
    riverLevel: null,
    slope: -5,
    elevation: 20,
    historicalRisk: Infinity,
    seismicActivity: 150
  };

  const gate = validateRiskEngineInputGate(corruptedInputs);
  assert.strictEqual(gate.valid, false);
  assert(gate.missingFields.includes("riverLevel"));
  assert(gate.invalidFields.some(f => f.includes("rainfall")));
  assert(gate.invalidFields.some(f => f.includes("slope")));
  assert(gate.invalidFields.some(f => f.includes("historicalRisk")));
  assert(gate.invalidFields.some(f => f.includes("seismicActivity")));
});

console.log("\n=======================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
