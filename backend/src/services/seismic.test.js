import assert from "assert";
import {
  calculateSeismicActivity,
  calculateDistanceKm,
  getSeismicData,
  getCachedSeismic,
  setCachedSeismic,
  clearSeismicCache,
  getSeismicCacheStats,
  SEISMIC_CONSTANTS
} from "./seismic.service.js";
import { calculateSeismicRisk, calculateAllRisks } from "./riskEngine.service.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Seismic Activity & Earthquake Tests (Step 12)");
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
  const now = Date.now();

  // Test 1: Zero events returns 0 activity score
  test("Test 1: Zero events produces 0 activity score", () => {
    assert.strictEqual(calculateSeismicActivity([]), 0);
    assert.strictEqual(calculateSeismicActivity(null), 0);
  });

  // Test 2: Single micro-event produces low activity score
  test("Test 2: Single micro-event (M 1.8) produces low activity score (< 20)", () => {
    const events = [
      {
        id: "ev1",
        magnitude: 1.8,
        distanceKm: 25,
        occurredAt: new Date(now - 1000 * 60 * 30).toISOString() // 30 min ago
      }
    ];
    const score = calculateSeismicActivity(events);
    assert.ok(score >= 0 && score <= 20, `Expected score (${score}) to be in [0, 20]`);
  });

  // Test 3: Moderate nearby event produces elevated score
  test("Test 3: Moderate nearby event (M 4.5, 20km away) produces elevated score [40, 75]", () => {
    const events = [
      {
        id: "ev2",
        magnitude: 4.5,
        distanceKm: 20,
        occurredAt: new Date(now - 1000 * 60 * 15).toISOString() // 15 min ago
      }
    ];
    const score = calculateSeismicActivity(events);
    assert.ok(score >= 40 && score <= 75, `Expected score (${score}) to be in [40, 75]`);
  });

  // Test 4: Major close event produces critical score (> 80)
  test("Test 4: Major close earthquake (M 6.8, 10km away) produces critical score (> 80)", () => {
    const events = [
      {
        id: "ev3",
        magnitude: 6.8,
        distanceKm: 10,
        occurredAt: new Date(now - 1000 * 60 * 10).toISOString()
      }
    ];
    const score = calculateSeismicActivity(events);
    assert.ok(score >= 80 && score <= 100, `Expected score (${score}) to be in [80, 100]`);
  });

  // Test 5: Distance attenuation (closer event produces higher score than distant event)
  test("Test 5: Distance attenuation reduces score for distant events", () => {
    const closeEvent = [
      {
        id: "ev-close",
        magnitude: 4.0,
        distanceKm: 10,
        occurredAt: new Date(now - 1000 * 60 * 60).toISOString()
      }
    ];
    const distantEvent = [
      {
        id: "ev-distant",
        magnitude: 4.0,
        distanceKm: 90,
        occurredAt: new Date(now - 1000 * 60 * 60).toISOString()
      }
    ];

    const closeScore = calculateSeismicActivity(closeEvent);
    const distantScore = calculateSeismicActivity(distantEvent);
    assert.ok(closeScore > distantScore, `Expected closeScore (${closeScore}) > distantScore (${distantScore})`);
  });

  // Test 6: Recency weighting (recent event produces higher score than old event)
  test("Test 6: Recency weighting prioritizes immediate events over older lookback events", () => {
    const recentEvent = [
      {
        id: "ev-recent",
        magnitude: 4.0,
        distanceKm: 30,
        occurredAt: new Date(now - 1000 * 60 * 10).toISOString() // 10 min ago
      }
    ];
    const oldEvent = [
      {
        id: "ev-old",
        magnitude: 4.0,
        distanceKm: 30,
        occurredAt: new Date(now - 1000 * 60 * 60 * 22).toISOString() // 22 hours ago
      }
    ];

    const recentScore = calculateSeismicActivity(recentEvent);
    const oldScore = calculateSeismicActivity(oldEvent);
    assert.ok(recentScore > oldScore, `Expected recentScore (${recentScore}) > oldScore (${oldScore})`);
  });

  // Test 7: Multi-event cluster bonus increases score
  test("Test 7: Earthquake cluster bonus rewards multiple observed events", () => {
    const singleEvent = [
      {
        id: "ev-1",
        magnitude: 3.5,
        distanceKm: 30,
        occurredAt: new Date(now - 1000 * 60 * 60).toISOString()
      }
    ];
    const clusterEvents = [
      {
        id: "ev-1",
        magnitude: 3.5,
        distanceKm: 30,
        occurredAt: new Date(now - 1000 * 60 * 60).toISOString()
      },
      {
        id: "ev-2",
        magnitude: 3.2,
        distanceKm: 35,
        occurredAt: new Date(now - 1000 * 60 * 45).toISOString()
      },
      {
        id: "ev-3",
        magnitude: 2.9,
        distanceKm: 28,
        occurredAt: new Date(now - 1000 * 60 * 30).toISOString()
      }
    ];

    const singleScore = calculateSeismicActivity(singleEvent);
    const clusterScore = calculateSeismicActivity(clusterEvents);
    assert.ok(clusterScore > singleScore, `Expected clusterScore (${clusterScore}) > singleScore (${singleScore})`);
  });

  // Test 8: In-Memory TTL Cache operations
  test("Test 8: In-Memory Seismic Cache - Store, Retrieve, and Clear", () => {
    clearSeismicCache();
    const lat = 35.676;
    const lon = 139.650;
    const mockData = {
      activityScore: 55,
      eventCount: 3,
      radiusKm: 100,
      lookbackHours: 24,
      maxMagnitude: 4.2,
      recentEvents: [],
      observedAt: new Date().toISOString(),
      source: "Mock USGS Catalog"
    };

    assert.strictEqual(getCachedSeismic(lat, lon, 100, 24), null);

    setCachedSeismic(lat, lon, 100, 24, mockData, 1000);
    const cached = getCachedSeismic(lat, lon, 100, 24);
    assert.ok(cached !== null);
    assert.strictEqual(cached.activityScore, 55);
    assert.strictEqual(cached.cached, true);

    const stats = getSeismicCacheStats();
    assert.strictEqual(stats.size, 1);

    clearSeismicCache();
    assert.strictEqual(getCachedSeismic(lat, lon, 100, 24), null);
  });

  // Test 9: Coordinate validation error handling
  await testAsync("Test 9: Coordinate Validation - Out of bounds coordinates throw 400", async () => {
    let errorThrown = false;
    try {
      await getSeismicData(95.0, 139.6);
    } catch (err) {
      errorThrown = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes("Invalid coordinates"));
    }
    assert.ok(errorThrown);
  });

  // Test 10: Risk Engine Integration with Live Seismic Activity Override
  test("Test 10: Risk Engine Integration - Live seismic activity replaces input without altering formula", () => {
    const inputs = {
      rainfall: 30,
      riverLevel: 30,
      elevation: 20,
      slope: 20,
      historicalRisk: 50,
      seismicActivity: 20 // baseline
    };

    const initialSeismic = calculateSeismicRisk(inputs);
    // Formula: seismicActivity * 0.60 + historicalRisk * 0.40
    // = 20 * 0.60 (12) + 50 * 0.40 (20) = 32
    assert.strictEqual(initialSeismic, 32);

    // If live seismic activity increases to 80
    const updatedInputs = {
      ...inputs,
      seismicActivity: 80
    };
    const updatedSeismic = calculateSeismicRisk(updatedInputs);
    // = 80 * 0.60 (48) + 50 * 0.40 (20) = 68
    assert.strictEqual(updatedSeismic, 68);
    assert.ok(updatedSeismic > initialSeismic);
  });

  console.log(`\nResults: ${passed}/${total} seismic tests passed.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
