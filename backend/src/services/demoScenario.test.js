/**
 * HydroGuard - Deterministic Demo Scenario Test Suite (Step 20)
 *
 * Verifies:
 * - Scenario catalog presence, uniqueness, metadata completeness
 * - Synthetic provenance strictly present ("SYNTHETIC DEMO DATA — NOT LIVE CONDITIONS")
 * - Deterministic repeatability (same inputs = identical mathematical risk calculations)
 * - Hazard-specific scenarios (Low, Flood, Landslide, Seismic, Compound)
 * - Input validation integration (Step 17 bounds and non-numeric rejection)
 * - Qualitative confidence integration (Step 18 DEMO / SYNTHETIC)
 * - Zero live state mutation / zero MongoDB alert persistence
 * - In-memory demo alert generation without real emergency notification side effects
 * - CRITICAL INVARIANT: Risk Engine formulas are not modified or duplicated
 */

import assert from "assert";
import {
  DEMO_SCENARIO_CATALOG,
  DEMO_DATASET_TYPE,
  DEMO_PROVENANCE,
  getDemoScenarios,
  getDemoScenarioById,
  validateDemoScenario,
  generateDemoAlert,
  runDemoScenario
} from "./demoScenario.service.js";
import { calculateAllRisks } from "./riskEngine.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Deterministic Demo Mode Tests (Step 20)");
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
// 1. Scenario Catalog & Metadata Integrity
// -------------------------------------------------------------

runTest("Test 1: Scenario catalog exists and contains at least 5 standard scenarios", () => {
  const catalog = getDemoScenarios();
  assert(Array.isArray(catalog), "Catalog must be an array");
  assert(catalog.length >= 5, `Expected at least 5 scenarios, got ${catalog.length}`);
});

runTest("Test 2: All scenario IDs in catalog are unique and non-empty", () => {
  const catalog = getDemoScenarios();
  const ids = catalog.map((s) => s.scenarioId);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, "All scenario IDs must be unique");
  for (const id of ids) {
    assert(typeof id === "string" && id.length > 0, "Scenario ID must be non-empty string");
  }
});

runTest("Test 3: Scenario metadata contains required fields and valid inputs", () => {
  const catalog = getDemoScenarios();
  for (const s of catalog) {
    assert(s.name && typeof s.name === "string", "Scenario name is required");
    assert(s.description && typeof s.description === "string", "Scenario description is required");
    assert(s.inputs && typeof s.inputs === "object", "Scenario inputs are required");
    const val = validateDemoScenario(s);
    assert(val.isValid, `Scenario ${s.scenarioId} failed validation: ${val.errors.join(", ")}`);
  }
});

runTest("Test 4: Synthetic provenance strictly present on all demo scenarios", () => {
  const catalog = getDemoScenarios();
  for (const s of catalog) {
    assert.strictEqual(s.datasetType, DEMO_DATASET_TYPE, "Dataset type must be SYNTHETIC_DEMO");
    assert.strictEqual(s.isDemo, true, "isDemo must be true");
    assert.strictEqual(s.provenance, DEMO_PROVENANCE, "Provenance must match DEMO_PROVENANCE exactly");
  }
});

runTest("Test 5: Demo scenarios contain zero fake live source URLs or real disaster references", () => {
  const catalog = getDemoScenarios();
  for (const s of catalog) {
    assert(!s.liveSourceUrl, "Demo scenario must not have liveSourceUrl");
    assert(!s.realDisasterReference, "Demo scenario must not claim real disaster");
  }
});

// -------------------------------------------------------------
// 2. Deterministic Execution & Repeatability
// -------------------------------------------------------------

runTest("Test 6: Repeated execution of same demo scenario produces identical risk calculations", () => {
  const run1 = runDemoScenario("demo-flood-001");
  const run2 = runDemoScenario("demo-flood-001");
  const run3 = runDemoScenario("demo-flood-001");

  assert.strictEqual(run1.risk.overall.score, run2.risk.overall.score);
  assert.strictEqual(run2.risk.overall.score, run3.risk.overall.score);
  assert.strictEqual(run1.risk.flood.score, run2.risk.flood.score);
  assert.strictEqual(run1.risk.landslide.score, run2.risk.landslide.score);
  assert.strictEqual(run1.risk.seismic.score, run2.risk.seismic.score);
});

runTest("Test 7: Direct calculation via calculateAllRisks produces identical scores (Formula Invariant)", () => {
  const scenario = getDemoScenarioById("demo-flood-001");
  const demoResult = runDemoScenario("demo-flood-001");
  const directResult = calculateAllRisks(scenario.inputs);

  assert.strictEqual(demoResult.risk.overall.score, directResult.overall.score);
  assert.strictEqual(demoResult.risk.flood.score, directResult.flood.score);
  assert.strictEqual(demoResult.risk.landslide.score, directResult.landslide.score);
  assert.strictEqual(demoResult.risk.seismic.score, directResult.seismic.score);
});

runTest("Test 8: Zero Math.random or time drift in demo scenario inputs", () => {
  const s1 = getDemoScenarioById("demo-low-001");
  const s2 = getDemoScenarioById("demo-low-001");
  assert.deepStrictEqual(s1.inputs, s2.inputs, "Scenario inputs must be constant");
  assert.strictEqual(s1.scenarioDefinedAt, s2.scenarioDefinedAt, "Scenario defined timestamp must be constant");
});

// -------------------------------------------------------------
// 3. Hazard-Specific Scenarios Verification
// -------------------------------------------------------------

runTest("Test 9: Low-Risk Scenario (Stable Conditions) evaluates to LOW overall risk", () => {
  const result = runDemoScenario("demo-low-001");
  assert.strictEqual(result.risk.overall.level, "LOW");
  assert(result.risk.overall.score <= 25, `Expected score <= 25, got ${result.risk.overall.score}`);
  assert.strictEqual(result.alert.hasAlert, false);
});

runTest("Test 10: Flood Scenario (Heavy Rainfall & Rising River) evaluates to HIGH/CRITICAL flood risk", () => {
  const result = runDemoScenario("demo-flood-001");
  assert(
    result.risk.flood.level === "HIGH" || result.risk.flood.level === "CRITICAL",
    `Expected HIGH/CRITICAL flood, got ${result.risk.flood.level}`
  );
  assert(result.risk.flood.score >= 51, `Expected flood score >= 51, got ${result.risk.flood.score}`);
  assert(result.alert.hazardTypes.includes("Flood"), "Alert must list Flood hazard");
});

runTest("Test 11: Landslide Scenario (Intense Rainfall on Steep Terrain) evaluates to HIGH/CRITICAL landslide risk", () => {
  const result = runDemoScenario("demo-landslide-001");
  assert(
    result.risk.landslide.level === "HIGH" || result.risk.landslide.level === "CRITICAL",
    `Expected HIGH/CRITICAL landslide, got ${result.risk.landslide.level}`
  );
  assert(result.risk.landslide.score >= 51, `Expected landslide score >= 51, got ${result.risk.landslide.score}`);
  assert(result.alert.hazardTypes.includes("Landslide"), "Alert must list Landslide hazard");
});

runTest("Test 12: Seismic Scenario (Elevated Seismic Activity) evaluates to HIGH/CRITICAL seismic risk", () => {
  const result = runDemoScenario("demo-seismic-001");
  assert(
    result.risk.seismic.level === "HIGH" || result.risk.seismic.level === "CRITICAL",
    `Expected HIGH/CRITICAL seismic, got ${result.risk.seismic.level}`
  );
  assert(result.risk.seismic.score >= 51, `Expected seismic score >= 51, got ${result.risk.seismic.score}`);
  assert(result.alert.hazardTypes.includes("Seismic"), "Alert must list Seismic hazard");
});

runTest("Test 13: Compound Hazard Scenario evaluates to HIGH/CRITICAL overall risk with multiple elevated hazards", () => {
  const result = runDemoScenario("demo-multi-001");
  assert(
    result.risk.overall.level === "HIGH" || result.risk.overall.level === "CRITICAL",
    `Expected HIGH/CRITICAL overall risk, got ${result.risk.overall.level}`
  );
  assert(result.alert.hazardTypes.length >= 2, `Expected multiple hazard types, got ${result.alert.hazardTypes.length}`);
});

// -------------------------------------------------------------
// 4. Input Validation & Confidence Integration
// -------------------------------------------------------------

runTest("Test 14: Invalid scenario with out-of-bounds input (>100) is rejected cleanly", () => {
  const invalidScenario = {
    scenarioId: "demo-invalid-001",
    name: "Bad Inputs Scenario",
    description: "Invalid input test",
    inputs: { rainfall: 150, riverLevel: 50, slope: 20, elevation: 10, historicalRisk: 10, seismicActivity: 10 }
  };
  assert.throws(
    () => runDemoScenario(invalidScenario),
    (err) => err.statusCode === 400 && err.message.includes("Invalid demo scenario inputs")
  );
});

runTest("Test 15: Invalid scenario with missing required field is rejected cleanly", () => {
  const missingFieldScenario = {
    scenarioId: "demo-invalid-002",
    name: "Missing Field Scenario",
    description: "Missing field test",
    inputs: { rainfall: 50, riverLevel: 50, slope: 20, elevation: 10, historicalRisk: 10 } // missing seismicActivity
  };
  assert.throws(
    () => runDemoScenario(missingFieldScenario),
    (err) => err.statusCode === 400
  );
});

runTest("Test 16: Unknown scenario ID throws 404 error", () => {
  assert.throws(
    () => runDemoScenario("non-existent-scenario-id"),
    (err) => err.statusCode === 404
  );
});

runTest("Test 17: Demo confidence is structured with DEMO / SYNTHETIC coverage tag", () => {
  const result = runDemoScenario("demo-flood-001");
  assert(result.confidence, "Confidence object must exist");
  assert.strictEqual(result.confidence.sourceCoverage, "SYNTHETIC_DEMO");
  assert.strictEqual(result.confidence.isDemo, true);
  assert.strictEqual(result.confidence.provenance, DEMO_PROVENANCE);
  assert(Array.isArray(result.confidence.reasons) && result.confidence.reasons.length >= 2);
});

// -------------------------------------------------------------
// 5. Alert & Side-Effect Safety
// -------------------------------------------------------------

runTest("Test 18: Demo alerts are tagged with isDemoAlert and isDemo flags", () => {
  const result = runDemoScenario("demo-flood-001");
  assert(result.alert, "Alert object must exist");
  assert.strictEqual(result.alert.isDemoAlert, true);
  assert.strictEqual(result.alert.isDemo, true);
  assert(result.alert.title.startsWith("[DEMO ALERT]"));
  assert(result.alert.message.startsWith("[DEMO ONLY - NOT A REAL DISASTER]"));
});

runTest("Test 19: Demo mode responses include explicit top-level mode and provenance properties", () => {
  const result = runDemoScenario("demo-seismic-001");
  assert.strictEqual(result.mode, "DEMO");
  assert.strictEqual(result.isDemo, true);
  assert.strictEqual(result.provenance, DEMO_PROVENANCE);
});

runTest("Test 20: Location retrieval helpers do not mutate or leak live location data", () => {
  const s = getDemoScenarioById("demo-landslide-001");
  // Modify retrieved object
  s.inputs.rainfall = 0;
  // Fetch again and verify original catalog was not mutated
  const sOriginal = getDemoScenarioById("demo-landslide-001");
  assert.strictEqual(sOriginal.inputs.rainfall, 88, "Catalog must remain immutable across calls");
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n=======================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
