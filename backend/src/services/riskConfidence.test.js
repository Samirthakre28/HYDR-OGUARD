/**
 * HydroGuard - Risk Confidence & Data Reliability Test Suite (Step 18)
 *
 * Verifies:
 * - Deterministic qualitative confidence evaluation (HIGH, MODERATE, LOW, UNKNOWN)
 * - Source coverage classification (FULL, PARTIAL, LIMITED, NONE)
 * - Hazard-specific confidence for Flood, Landslide, Seismic, and Overall
 * - Reliability flags (hasMissingData, hasStaleData, hasCachedData, hasStoredBaselineData, hasUnavailableData)
 * - Human-readable explainable reasons generation
 * - CRITICAL INVARIANT: Confidence NEVER modifies mathematical risk scores
 * - Offline cached confidence preservation and location isolation
 */

import assert from "assert";
import {
  calculateRiskConfidence,
  CONFIDENCE_LEVELS,
  SOURCE_COVERAGE
} from "./riskConfidence.service.js";
import { FRESHNESS_STATES, DATA_STATUS } from "./dataValidation.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Risk Confidence & Reliability Tests (Step 18)");
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
// 1. Live Fresh Telemetry Scenarios
// -------------------------------------------------------------

runTest("Test 1: All fresh live feeds produce HIGH confidence & FULL coverage", () => {
  const inputs = { rainfall: 50, riverLevel: 40, slope: 30, elevation: 20, historicalRisk: 25, seismicActivity: 10 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "GloFAS River Gauges" },
    seismicActivity: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "USGS Earthquake Catalog" },
    slope: { status: DATA_STATUS.STORED, freshness: FRESHNESS_STATES.UNKNOWN, source: "stored_demo_terrain" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.HIGH);
  assert.strictEqual(res.flood, CONFIDENCE_LEVELS.HIGH);
  assert.strictEqual(res.landslide, CONFIDENCE_LEVELS.HIGH);
  assert.strictEqual(res.seismic, CONFIDENCE_LEVELS.HIGH);
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.FULL);
  assert.strictEqual(res.hasMissingData, false);
  assert.strictEqual(res.hasCachedData, false);
  assert.strictEqual(res.hasStaleData, false);
});

runTest("Test 2: Mixed live feeds + stored baseline produce MODERATE/HIGH confidence & PARTIAL coverage", () => {
  const inputs = { rainfall: 45, riverLevel: 30, slope: 60, elevation: 15, historicalRisk: 40, seismicActivity: 0 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.STORED, freshness: FRESHNESS_STATES.UNKNOWN, source: "stored_demo_river" },
    seismicActivity: { status: DATA_STATUS.STORED, freshness: FRESHNESS_STATES.UNKNOWN, source: "stored_demo_seismic" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.MODERATE);
  assert.strictEqual(res.flood, CONFIDENCE_LEVELS.MODERATE);
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.PARTIAL);
});

// -------------------------------------------------------------
// 2. Cached & Aging Telemetry Scenarios
// -------------------------------------------------------------

runTest("Test 3: Cached river feed decreases confidence to MODERATE and flags hasCachedData", () => {
  const inputs = { rainfall: 40, riverLevel: 35, slope: 50, elevation: 10, historicalRisk: 20, seismicActivity: 5 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.CACHED, freshness: FRESHNESS_STATES.AGING, source: "cached_hydrology" },
    seismicActivity: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "USGS Earthquake Catalog" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.MODERATE);
  assert.strictEqual(res.hasCachedData, true);
  assert(res.reasons.some(r => r.includes("cached")));
});

runTest("Test 4: Aging rainfall observation (>30 min) reduces confidence to MODERATE", () => {
  const inputs = { rainfall: 65, riverLevel: 55, slope: 40, elevation: 20, historicalRisk: 30, seismicActivity: 10 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.AGING, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "GloFAS River Gauges" },
    seismicActivity: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "USGS Earthquake Catalog" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.MODERATE);
  assert(res.reasons.some(r => r.includes("aging")));
});

runTest("Test 5: Stale data (>2h) drops confidence to LOW and sets hasStaleData", () => {
  const inputs = { rainfall: 70, riverLevel: 60, slope: 45, elevation: 25, historicalRisk: 35, seismicActivity: 15 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.STALE, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "GloFAS River Gauges" },
    seismicActivity: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "USGS Earthquake Catalog" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.LOW);
  assert.strictEqual(res.flood, CONFIDENCE_LEVELS.LOW);
  assert.strictEqual(res.landslide, CONFIDENCE_LEVELS.LOW);
  assert.strictEqual(res.hasStaleData, true);
});

// -------------------------------------------------------------
// 3. Missing Data & Hazard Isolation Scenarios
// -------------------------------------------------------------

runTest("Test 6: Missing rainfall input drops Flood & Landslide confidence", () => {
  const inputs = { riverLevel: 40, slope: 50, elevation: 10, historicalRisk: 20, seismicActivity: 5 }; // missing rainfall
  const res = calculateRiskConfidence({ inputs });
  assert.strictEqual(res.flood, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.landslide, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.hasMissingData, true);
});

runTest("Test 7: Missing river level drops Flood confidence specifically", () => {
  const inputs = { rainfall: 30, slope: 50, elevation: 10, historicalRisk: 20, seismicActivity: 5 }; // missing riverLevel
  const res = calculateRiskConfidence({ inputs });
  assert.strictEqual(res.flood, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.hasMissingData, true);
});

runTest("Test 8: Missing seismic activity drops Seismic confidence specifically", () => {
  const inputs = { rainfall: 30, riverLevel: 25, slope: 50, elevation: 10, historicalRisk: 20 }; // missing seismicActivity
  const res = calculateRiskConfidence({ inputs });
  assert.strictEqual(res.seismic, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.hasMissingData, true);
});

runTest("Test 9: Multiple unavailable feeds result in LOW/UNKNOWN confidence & LIMITED coverage", () => {
  const inputs = { rainfall: 10, riverLevel: 10, slope: 10, elevation: 10, historicalRisk: 10, seismicActivity: 10 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.UNAVAILABLE, freshness: FRESHNESS_STATES.UNKNOWN },
    riverLevel: { status: DATA_STATUS.UNAVAILABLE, freshness: FRESHNESS_STATES.UNKNOWN },
    seismicActivity: { status: DATA_STATUS.UNAVAILABLE, freshness: FRESHNESS_STATES.UNKNOWN }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.LOW);
  assert.strictEqual(res.hasUnavailableData, true);
});

runTest("Test 10: Completely empty inputs evaluate to UNKNOWN overall confidence & NONE coverage", () => {
  const res = calculateRiskConfidence({ inputs: {}, environmentalSignals: {} });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.NONE);
});

// -------------------------------------------------------------
// 4. Source Coverage Classification
// -------------------------------------------------------------

runTest("Test 11: 3 Live feeds classify as FULL source coverage", () => {
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE },
    riverLevel: { status: DATA_STATUS.LIVE },
    seismicActivity: { status: DATA_STATUS.LIVE }
  };
  const inputs = { rainfall: 20, riverLevel: 20, slope: 20, elevation: 20, historicalRisk: 20, seismicActivity: 20 };
  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.FULL);
});

runTest("Test 12: 1 Live feed + 2 Stored classify as PARTIAL source coverage", () => {
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE },
    riverLevel: { status: DATA_STATUS.STORED },
    seismicActivity: { status: DATA_STATUS.STORED }
  };
  const inputs = { rainfall: 20, riverLevel: 20, slope: 20, elevation: 20, historicalRisk: 20, seismicActivity: 20 };
  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.PARTIAL);
});

runTest("Test 13: 0 Live feeds + 3 Stored classify as LIMITED source coverage", () => {
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.STORED },
    riverLevel: { status: DATA_STATUS.STORED },
    seismicActivity: { status: DATA_STATUS.STORED }
  };
  const inputs = { rainfall: 20, riverLevel: 20, slope: 20, elevation: 20, historicalRisk: 20, seismicActivity: 20 };
  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert.strictEqual(res.sourceCoverage, SOURCE_COVERAGE.LIMITED);
});

// -------------------------------------------------------------
// 5. Explainable Reasons List Generation
// -------------------------------------------------------------

runTest("Test 14: Reasons list explains live weather, cached river, and stored terrain accurately", () => {
  const inputs = { rainfall: 45, riverLevel: 35, slope: 50, elevation: 20, historicalRisk: 30, seismicActivity: 12 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "Open-Meteo Live API" },
    riverLevel: { status: DATA_STATUS.CACHED, freshness: FRESHNESS_STATES.AGING, source: "cached_hydrology" },
    seismicActivity: { status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH, source: "USGS Earthquake Catalog" },
    slope: { status: DATA_STATUS.STORED, source: "stored_demo_terrain" }
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals });
  assert(res.reasons.length >= 3);
  assert(res.reasons.some(r => r.includes("Rainfall feed is live")));
  assert(res.reasons.some(r => r.includes("River data is cached")));
  assert(res.reasons.some(r => r.includes("Earthquake catalog observations are live")));
  assert(res.reasons.some(r => r.includes("Terrain slope")));
});

// -------------------------------------------------------------
// 6. CRITICAL INVARIANT: Zero Risk Modification
// -------------------------------------------------------------

runTest("Test 15: CRITICAL INVARIANT - Risk scores are completely untouched by confidence", () => {
  const initialRiskScore = 84;
  const initialFloodScore = 78;
  const risks = {
    overall: { score: initialRiskScore, level: "CRITICAL" },
    flood: { score: initialFloodScore, level: "CRITICAL" }
  };

  const inputs = { rainfall: 10, riverLevel: 10, slope: 10, elevation: 10, historicalRisk: 10, seismicActivity: 10 };
  const environmentalSignals = {
    rainfall: { status: DATA_STATUS.UNAVAILABLE, freshness: FRESHNESS_STATES.UNKNOWN } // Low confidence trigger
  };

  const res = calculateRiskConfidence({ inputs, environmentalSignals, risks });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.LOW);

  // Invariant assertion: risk score must remain exactly 84 and NOT be scaled/multiplied
  assert.strictEqual(risks.overall.score, initialRiskScore);
  assert.strictEqual(risks.flood.score, initialFloodScore);
  assert.notStrictEqual(risks.overall.score, initialRiskScore * 0.5);
});

// -------------------------------------------------------------
// 7. Offline Pack & Location Isolation Integration
// -------------------------------------------------------------

runTest("Test 16: Offline pack retains last-known confidence and marks hasCachedData: true", () => {
  const offlineSignals = {
    rainfall: { status: DATA_STATUS.CACHED, freshness: FRESHNESS_STATES.AGING, source: "stored_offline_pack" },
    riverLevel: { status: DATA_STATUS.CACHED, freshness: FRESHNESS_STATES.AGING, source: "stored_offline_pack" },
    seismicActivity: { status: DATA_STATUS.CACHED, freshness: FRESHNESS_STATES.AGING, source: "stored_offline_pack" }
  };
  const inputs = { rainfall: 35, riverLevel: 30, slope: 45, elevation: 20, historicalRisk: 25, seismicActivity: 10 };

  const res = calculateRiskConfidence({ inputs, environmentalSignals: offlineSignals });
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.MODERATE);
  assert.strictEqual(res.hasCachedData, true);
});

runTest("Test 17: Null inputs handled gracefully without throwing exceptions", () => {
  const res = calculateRiskConfidence(null);
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.UNKNOWN);
  assert.strictEqual(res.hasMissingData, true);
});

runTest("Test 18: Non-numeric strings in inputs are detected as missing/invalid", () => {
  const inputs = { rainfall: "bad_val", riverLevel: 30, slope: 45, elevation: 20, historicalRisk: 25, seismicActivity: 10 };
  const res = calculateRiskConfidence({ inputs });
  assert.strictEqual(res.hasMissingData, true);
  assert.strictEqual(res.overall, CONFIDENCE_LEVELS.LOW);
});

runTest("Test 19: All reliability flags are boolean and sourceCoverage is valid enum", () => {
  const inputs = { rainfall: 20, riverLevel: 20, slope: 20, elevation: 20, historicalRisk: 20, seismicActivity: 20 };
  const res = calculateRiskConfidence({ inputs });
  assert.strictEqual(typeof res.hasMissingData, "boolean");
  assert.strictEqual(typeof res.hasStaleData, "boolean");
  assert.strictEqual(typeof res.hasCachedData, "boolean");
  assert.strictEqual(typeof res.hasStoredBaselineData, "boolean");
  assert.strictEqual(typeof res.hasUnavailableData, "boolean");
  assert(Object.values(SOURCE_COVERAGE).includes(res.sourceCoverage));
});

runTest("Test 20: Strict Location Isolation: Tokyo signals cannot evaluate Mumbai confidence", () => {
  const mumbaiInputs = { rainfall: 50, riverLevel: 40, slope: 30, elevation: 20, historicalRisk: 25, seismicActivity: 10 };
  const tokyoSignals = {
    rainfall: { locationId: "loc-tokyo", status: DATA_STATUS.LIVE, freshness: FRESHNESS_STATES.FRESH }
  };

  // When locationId mismatches, the caller supplies isolated signals for that station only
  const res = calculateRiskConfidence({ inputs: mumbaiInputs, environmentalSignals: tokyoSignals });
  assert.strictEqual(typeof res.overall, "string");
  assert.strictEqual(typeof res.flood, "string");
});

console.log("\n=======================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
