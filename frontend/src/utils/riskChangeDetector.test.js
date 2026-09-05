import assert from "assert";
import {
  detectRiskChange,
  MEANINGFUL_SCORE_DELTA_THRESHOLD
} from "./riskChangeDetector.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Risk Change Detector Unit Tests (Step 10)");
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

// Test 1: Initial load / missing data produces null (no change event)
test("Test 1: Initial load returns null", () => {
  assert.strictEqual(detectRiskChange(null, { overall: { score: 50, level: "MODERATE" } }), null);
  assert.strictEqual(detectRiskChange({ overall: { score: 50, level: "MODERATE" } }, null), null);
});

// Test 2: Negligible change (< 5 score difference, same level) returns null
test("Test 2: Negligible score shift (< 5 points, same level) returns null", () => {
  const prev = {
    overall: { score: 60, level: "HIGH" },
    flood: { score: 50, level: "MODERATE" },
    landslide: { score: 40, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };
  const curr = {
    overall: { score: 62, level: "HIGH" },
    flood: { score: 52, level: "MODERATE" },
    landslide: { score: 41, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };

  const change = detectRiskChange(prev, curr);
  assert.strictEqual(change, null);
});

// Test 3: Meaningful score shift (>= 5 points) within same level
test("Test 3: Meaningful score increase (>= 5 points) triggers change event", () => {
  const prev = {
    overall: { score: 60, level: "HIGH" },
    flood: { score: 50, level: "MODERATE" },
    landslide: { score: 40, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };
  const curr = {
    overall: { score: 67, level: "HIGH" },
    flood: { score: 60, level: "HIGH" },
    landslide: { score: 40, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };

  const change = detectRiskChange(prev, curr, "Mumbai");
  assert.ok(change !== null);
  assert.strictEqual(change.hasMeaningfulChange, true);
  assert.strictEqual(change.scoreDiff, 7);
  assert.strictEqual(change.isSeverityIncrease, true);
  assert.ok(change.message.includes("+7 points"));
});

// Test 4: Categorical level increase (HIGH -> CRITICAL)
test("Test 4: Risk level escalation (HIGH -> CRITICAL) triggers escalation notification", () => {
  const prev = {
    overall: { score: 62, level: "HIGH" },
    flood: { score: 60, level: "HIGH" },
    landslide: { score: 50, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };
  const curr = {
    overall: { score: 78, level: "CRITICAL" },
    flood: { score: 85, level: "CRITICAL" },
    landslide: { score: 65, level: "HIGH" },
    seismic: { score: 30, level: "MODERATE" }
  };

  const change = detectRiskChange(prev, curr, "Mumbai");
  assert.ok(change !== null);
  assert.strictEqual(change.isLevelShift, true);
  assert.strictEqual(change.isSeverityIncrease, true);
  assert.strictEqual(change.previousLevel, "HIGH");
  assert.strictEqual(change.currentLevel, "CRITICAL");
  assert.strictEqual(change.title, "Risk Level Escalated");
  assert.ok(change.message.includes("HIGH (62/100) to CRITICAL (78/100)"));
});

// Test 5: Categorical level decrease (CRITICAL -> HIGH)
test("Test 5: Risk level improvement (CRITICAL -> HIGH) triggers improvement notification", () => {
  const prev = {
    overall: { score: 78, level: "CRITICAL" },
    flood: { score: 85, level: "CRITICAL" },
    landslide: { score: 65, level: "HIGH" },
    seismic: { score: 30, level: "MODERATE" }
  };
  const curr = {
    overall: { score: 62, level: "HIGH" },
    flood: { score: 60, level: "HIGH" },
    landslide: { score: 50, level: "MODERATE" },
    seismic: { score: 30, level: "MODERATE" }
  };

  const change = detectRiskChange(prev, curr, "Tokyo");
  assert.ok(change !== null);
  assert.strictEqual(change.isLevelShift, true);
  assert.strictEqual(change.isSeverityIncrease, false);
  assert.strictEqual(change.title, "Risk Level Improved");
  assert.ok(change.message.includes("CRITICAL (78/100) to HIGH (62/100)"));
});

console.log(`\nResults: ${passed}/${total} risk change tests passed.\n`);

if (passed !== total) {
  process.exit(1);
}
