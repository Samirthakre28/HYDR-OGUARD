import assert from "node:assert/strict";
import { generateRiskAlert } from "./alert.service.js";

console.log("==================================================");
console.log("🧪 HydroGuard - Alert Engine Unit Test Suite");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}\n`);
    failed++;
  }
}

async function runAllTests() {
  const dummyLoc = { name: "Test Valley", _id: "6a99a3bd8108d956bb1cadf3" };

  // ----------------------------------------------------
  // Test 1: Low risk generates no emergency alert
  // ----------------------------------------------------
  await runTest("Test 1: Low risk produces hasAlert=false and LOW severity", async () => {
    const lowRisk = {
      overall: { score: 20, level: "LOW" },
      flood: { score: 24, level: "LOW" },
      landslide: { score: 19, level: "LOW" },
      seismic: { score: 16, level: "LOW" }
    };

    const alert = await generateRiskAlert(lowRisk, dummyLoc);
    assert.equal(alert.hasAlert, false);
    assert.equal(alert.severity, "LOW");
    assert.equal(alert.hazardTypes.length, 0);
  });

  // ----------------------------------------------------
  // Test 2: Moderate risk generates monitoring advisory
  // ----------------------------------------------------
  await runTest("Test 2: Moderate risk produces MODERATE advisory alert", async () => {
    const modRisk = {
      overall: { score: 45, level: "MODERATE" },
      flood: { score: 48, level: "MODERATE" },
      landslide: { score: 35, level: "MODERATE" },
      seismic: { score: 25, level: "LOW" }
    };

    const alert = await generateRiskAlert(modRisk, dummyLoc);
    assert.equal(alert.hasAlert, true);
    assert.equal(alert.severity, "MODERATE");
    assert.equal(alert.title, "Monitoring Advisory");
  });

  // ----------------------------------------------------
  // Test 3: High flood risk tags Flood hazard
  // ----------------------------------------------------
  await runTest("Test 3: High flood risk tags Flood hazard and HIGH severity", async () => {
    const highFloodRisk = {
      overall: { score: 65, level: "HIGH" },
      flood: { score: 80, level: "CRITICAL" },
      landslide: { score: 45, level: "MODERATE" },
      seismic: { score: 30, level: "MODERATE" }
    };

    const alert = await generateRiskAlert(highFloodRisk, dummyLoc);
    assert.equal(alert.hasAlert, true);
    assert.equal(alert.severity, "HIGH");
    assert.ok(alert.hazardTypes.includes("Flood"));
    assert.ok(alert.message.includes("Flood"));
  });

  // ----------------------------------------------------
  // Test 4: Critical multi-hazard tags all elevated hazards
  // ----------------------------------------------------
  await runTest("Test 4: Critical multi-hazard tags Flood, Landslide, Seismic", async () => {
    const criticalMultiRisk = {
      overall: { score: 85, level: "CRITICAL" },
      flood: { score: 78, level: "CRITICAL" },
      landslide: { score: 88, level: "CRITICAL" },
      seismic: { score: 80, level: "CRITICAL" }
    };

    const alert = await generateRiskAlert(criticalMultiRisk, dummyLoc);
    assert.equal(alert.hasAlert, true);
    assert.equal(alert.severity, "CRITICAL");
    assert.equal(alert.hazardTypes.length, 3);
    assert.ok(alert.hazardTypes.includes("Flood"));
    assert.ok(alert.hazardTypes.includes("Landslide"));
    assert.ok(alert.hazardTypes.includes("Seismic"));
  });

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
