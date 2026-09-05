import assert from "node:assert/strict";
import {
  validateAIInput,
  cleanJsonText,
  generateRiskExplanation
} from "./aiExplanation.service.js";

console.log("\n=======================================================");
console.log("🧪 HydroGuard - AI Explanation Layer Test Suite");
console.log("=======================================================\n");

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
  // ----------------------------------------------------
  // Test 1: Valid riskData passes input validation
  // ----------------------------------------------------
  await runTest("Test 1: Valid riskData object passes validation", () => {
    const validData = {
      overall: { score: 72, level: "HIGH" },
      flood: { score: 80, level: "CRITICAL" },
      landslide: { score: 65, level: "HIGH" },
      seismic: { score: 40, level: "MODERATE" },
      factors: [{ factor: "Heavy rainfall", impact: "HIGH", explanation: "Flood driver" }],
      inputs: { rainfall: 90, riverLevel: 80 }
    };

    const val = validateAIInput(validData);
    assert.equal(val.isValid, true);
    assert.equal(val.errors.length, 0);
  });

  // ----------------------------------------------------
  // Test 2: Missing riskData or category rejected (400)
  // ----------------------------------------------------
  await runTest("Test 2: Missing riskData or category is rejected", () => {
    const missingCategory = {
      overall: { score: 72, level: "HIGH" },
      flood: { score: 80, level: "CRITICAL" }
      // missing landslide & seismic
    };

    const val = validateAIInput(missingCategory);
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some((e) => e.includes("landslide")));
    assert.ok(val.errors.some((e) => e.includes("seismic")));
  });

  // ----------------------------------------------------
  // Test 3: Out-of-bounds score rejected
  // ----------------------------------------------------
  await runTest("Test 3: Out-of-bounds score (> 100 or < 0) is rejected", () => {
    const invalidScore = {
      overall: { score: 120, level: "HIGH" },
      flood: { score: 80, level: "CRITICAL" },
      landslide: { score: 65, level: "HIGH" },
      seismic: { score: 40, level: "MODERATE" }
    };

    const val = validateAIInput(invalidScore);
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some((e) => e.includes("between 0 and 100")));
  });

  // ----------------------------------------------------
  // Test 4: Invalid level name rejected
  // ----------------------------------------------------
  await runTest("Test 4: Invalid level string is rejected", () => {
    const invalidLevel = {
      overall: { score: 72, level: "EXTREME_DANGER" },
      flood: { score: 80, level: "CRITICAL" },
      landslide: { score: 65, level: "HIGH" },
      seismic: { score: 40, level: "MODERATE" }
    };

    const val = validateAIInput(invalidLevel);
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some((e) => e.includes("valid 'level'")));
  });

  // ----------------------------------------------------
  // Test 5: Clean JSON Markdown Stripper
  // ----------------------------------------------------
  await runTest("Test 5: cleanJsonText strips markdown fences cleanly", () => {
    const markdown = "```json\n{\n  \"summary\": \"Test summary\"\n}\n```";
    const cleaned = cleanJsonText(markdown);
    assert.equal(cleaned, '{\n  "summary": "Test summary"\n}');
  });

  // ----------------------------------------------------
  // Test 6: Missing API Key returns controlled response (no crash)
  // ----------------------------------------------------
  await runTest("Test 6: Missing AI API key returns controlled unconfigured state without throwing", async () => {
    const validData = {
      overall: { score: 20, level: "LOW" },
      flood: { score: 24, level: "LOW" },
      landslide: { score: 19, level: "LOW" },
      seismic: { score: 16, level: "LOW" }
    };

    // Calling without API key configured
    const res = await generateRiskExplanation(validData);
    assert.equal(res.success, false);
    assert.equal(res.isConfigured, false);
    assert.ok(res.message.includes("AI_API_KEY"));
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
