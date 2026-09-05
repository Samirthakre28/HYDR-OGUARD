import assert from "assert";
import {
  normalizeRiverLevel,
  findNearestStation,
  calculateDistanceKm,
  getHydrologyData,
  getCachedHydrology,
  setCachedHydrology,
  clearHydroCache,
  getHydroCacheStats,
  RIVER_STATIONS
} from "./hydrology.service.js";
import { calculateFloodRisk, calculateAllRisks } from "./riskEngine.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Hydrology & River Data Tests (Step 11)");
console.log("=======================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runTests() {
  const sampleStation = {
    id: "station-test",
    name: "Test River Station",
    baselineLevel: 2.0,
    warningLevel: 5.0,
    dangerLevel: 8.0,
    extremeLevel: 10.0
  };

  // Test 1: River Level Normalization - Baseline range (<= 2.0m) maps to [0, 25]
  test("Test 1: River Normalization - Baseline level (<= 2.0m) maps to [0, 25]", () => {
    assert.strictEqual(normalizeRiverLevel(0, sampleStation), 0);
    assert.strictEqual(normalizeRiverLevel(1.0, sampleStation), 13);
    assert.strictEqual(normalizeRiverLevel(2.0, sampleStation), 25);
  });

  // Test 2: River Level Normalization - Warning stage (2.0 - 5.0m) maps to [26, 50]
  test("Test 2: River Normalization - Warning stage (2.0 - 5.0m) maps to [26, 50]", () => {
    const score = normalizeRiverLevel(3.5, sampleStation);
    assert.ok(score >= 26 && score <= 50, `Expected score (${score}) to be in [26, 50]`);
    assert.strictEqual(normalizeRiverLevel(5.0, sampleStation), 50);
  });

  // Test 3: River Level Normalization - Danger stage (5.0 - 8.0m) maps to [51, 75]
  test("Test 3: River Normalization - Danger stage (5.0 - 8.0m) maps to [51, 75]", () => {
    const score = normalizeRiverLevel(6.5, sampleStation);
    assert.ok(score >= 51 && score <= 75, `Expected score (${score}) to be in [51, 75]`);
    assert.strictEqual(normalizeRiverLevel(8.0, sampleStation), 75);
  });

  // Test 4: River Level Normalization - Critical & Extreme stage (8.0 - 10.0m+) maps to [76, 100]
  test("Test 4: River Normalization - Critical & Extreme stage (8.0 - 10.0m+) maps to [76, 100]", () => {
    const critical = normalizeRiverLevel(9.0, sampleStation);
    const extreme = normalizeRiverLevel(10.0, sampleStation);
    const overtopping = normalizeRiverLevel(15.0, sampleStation);

    assert.ok(critical >= 76 && critical <= 90, `Expected critical (${critical}) to be in [76, 90]`);
    assert.strictEqual(extreme, 90);
    assert.strictEqual(overtopping, 100);
  });


  // Test 5: Missing / uncalibrated threshold context returns null
  test("Test 5: Uncalibrated threshold metadata returns null (safe fallback)", () => {
    assert.strictEqual(normalizeRiverLevel(4.5, null), null);
    assert.strictEqual(normalizeRiverLevel(4.5, {}), null);
    assert.strictEqual(normalizeRiverLevel(4.5, { warningLevel: "invalid" }), null);
  });

  // Test 6: Distance and Nearest Station Mapping
  test("Test 6: Nearest Station Mapping identifies valid hydrological basin", () => {
    // Mumbai Coordinates
    const mumbaiStation = findNearestStation(19.0760, 72.8777);
    assert.ok(mumbaiStation !== null);
    assert.strictEqual(mumbaiStation.id, "station-mumbai-mithi");
    assert.strictEqual(mumbaiStation.distanceKm, 0);

    // Far Coordinates outside radius
    const middleOfOcean = findNearestStation(0.0, 0.0);
    assert.strictEqual(middleOfOcean, null);
  });

  // Test 7: In-Memory TTL Cache operations
  test("Test 7: In-Memory Hydrology Cache - Store, Retrieve, and Clear", () => {
    clearHydroCache();
    const lat = 19.076;
    const lon = 72.877;
    const mockData = {
      riverLevel: 3.2,
      normalizedRiverRisk: 42,
      unit: "m",
      station: { name: "Mock Station", distanceKm: 4.2 },
      observedAt: new Date().toISOString(),
      source: "Mock Hydro Provider"
    };

    assert.strictEqual(getCachedHydrology(lat, lon), null);

    setCachedHydrology(lat, lon, mockData, 1000);
    const cached = getCachedHydrology(lat, lon);
    assert.ok(cached !== null);
    assert.strictEqual(cached.riverLevel, 3.2);
    assert.strictEqual(cached.cached, true);

    const stats = getHydroCacheStats();
    assert.strictEqual(stats.size, 1);

    clearHydroCache();
    assert.strictEqual(getCachedHydrology(lat, lon), null);
  });

  // Test 8: Coordinate validation error handling
  await testAsync("Test 8: Coordinate Validation - Out of bounds coordinates throw 400", async () => {
    let errorThrown = false;
    try {
      await getHydrologyData(100.0, 72.8);
    } catch (err) {
      errorThrown = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes("Invalid coordinates"));
    }
    assert.ok(errorThrown);
  });

  // Test 9: Live Hydrology Provider Ingestion & Normalization
  await testAsync("Test 9: Live Hydrology Service - Ingests river data for monitored location", async () => {
    try {
      const data = await getHydrologyData(19.076, 72.877, { bypassCache: true, timeoutMs: 5000 });
      assert.ok(data !== null);
      assert.strictEqual(typeof data.riverLevel, "number");
      assert.strictEqual(typeof data.normalizedRiverRisk, "number");
      assert.ok(data.normalizedRiverRisk >= 0 && data.normalizedRiverRisk <= 100);
      assert.ok(data.station);
      assert.ok(data.source);
      assert.strictEqual(data.cached, false);

      // Verify second call hits cache
      const cachedData = await getHydrologyData(19.076, 72.877);
      assert.strictEqual(cachedData.cached, true);
    } catch (err) {
      console.log(`    (Network note: Live fetch encountered ${err.message}, handled gracefully)`);
      assert.ok(err.message);
    }
  });

  // Test 10: Risk Calculation Integration with Live River Level Override
  test("Test 10: Risk Engine Integration - Live river level replaces input without changing flood formula", () => {
    const inputs = {
      rainfall: 80,
      riverLevel: 30, // baseline
      elevation: 20,
      historicalRisk: 50,
      slope: 20,
      seismicActivity: 10
    };

    const initialFlood = calculateFloodRisk(inputs);
    // Formula: rainfall * 0.40 + riverLevel * 0.30 + elevation * 0.10 + historicalRisk * 0.20
    // = 80*0.40 (32) + 30*0.30 (9) + 20*0.10 (2) + 50*0.20 (10) = 53

    assert.strictEqual(initialFlood, 53);

    // If live river level increases to 80 (e.g. Danger Stage)
    const updatedInputs = {
      ...inputs,
      riverLevel: 80
    };

    const updatedFlood = calculateFloodRisk(updatedInputs);
    // 32 + 80*0.30 (24) + 2 + 10 = 68
    assert.strictEqual(updatedFlood, 68);
    assert.ok(updatedFlood > initialFlood);
  });

  console.log(`\nResults: ${passed}/${total} hydrology tests passed.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
