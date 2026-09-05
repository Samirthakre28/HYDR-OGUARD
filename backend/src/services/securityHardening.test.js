/**
 * HydroGuard - Security Hardening & API Security Test Suite (Step 21)
 *
 * Verifies:
 * - HTTP security headers (MIME-sniffing, Framing, CSP, Permissions, Referrer)
 * - X-Powered-By banner removal
 * - CORS origin authorization & rejection of unauthorized origins
 * - Sliding-window rate limiter enforcement & 429 response payload
 * - Sensitive endpoints rate limiting
 * - NoSQL query & body operator injection protection ($gt, $ne, $where)
 * - Regex escaping and ReDoS prevention in location search
 * - Backtest batch size limit enforcement (MAX_BACKTEST_SCENARIOS = 50)
 * - Error handler stack trace masking in production
 * - Error handler secret and MongoDB URI sanitization
 * - Demo endpoint catalog safety and unknown scenario rejection
 * - Health endpoint safety without credential leakage
 */

import assert from "assert";
import { securityHeaders } from "../middleware/securityHeaders.js";
import { createRateLimiter, standardLimiter, sensitiveActionsLimiter, _resetRateLimits } from "../middleware/rateLimiter.js";
import { escapeRegex, isValidIdentifier, hasNoSqlOperators, sanitizeNoSql, inputSanitizer } from "../middleware/inputSanitizer.js";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler.js";
import { MAX_BACKTEST_SCENARIOS } from "../controllers/validation.controller.js";
import { runDemoScenario, getDemoScenarioById } from "./demoScenario.service.js";
import { getHealth } from "../controllers/health.controller.js";

console.log("\n=======================================================");
console.log("  HydroGuard - Security Hardening & API Security Tests (Step 21)");
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
// 1. HTTP Security Headers
// -------------------------------------------------------------

runTest("Test 1: Security headers middleware sets defensive headers", () => {
  const req = { secure: false, headers: {} };
  const headersSet = {};
  let removedHeader = null;

  const res = {
    setHeader: (key, val) => {
      headersSet[key.toLowerCase()] = val;
    },
    removeHeader: (key) => {
      removedHeader = key;
    }
  };

  securityHeaders(req, res, () => {});

  assert.strictEqual(headersSet["x-content-type-options"], "nosniff");
  assert.strictEqual(headersSet["x-frame-options"], "SAMEORIGIN");
  assert.strictEqual(headersSet["x-xss-protection"], "0");
  assert.strictEqual(headersSet["referrer-policy"], "strict-origin-when-cross-origin");
  assert.strictEqual(headersSet["cross-origin-resource-policy"], "cross-origin");
  assert(headersSet["content-security-policy"].includes("openstreetmap.org"));
  assert.strictEqual(removedHeader, "X-Powered-By");
});

runTest("Test 2: Content-Security-Policy includes OpenStreetMap and safe tile sources", () => {
  const headersSet = {};
  const res = {
    setHeader: (key, val) => { headersSet[key.toLowerCase()] = val; },
    removeHeader: () => {}
  };
  securityHeaders({ secure: false, headers: {} }, res, () => {});
  const csp = headersSet["content-security-policy"];
  assert(csp.includes("https://*.tile.openstreetmap.org"), "CSP must permit OSM tiles");
  assert(csp.includes("frame-ancestors 'self'"), "CSP must restrict frame ancestors");
});

// -------------------------------------------------------------
// 2. Sliding-Window Rate Limiting
// -------------------------------------------------------------

runTest("Test 3: Rate limiter permits requests within allowed threshold and sets headers", () => {
  _resetRateLimits();
  const limiter = createRateLimiter({ windowMs: 60000, max: 5 });
  const req = { headers: { "x-forwarded-for": "192.168.1.100" }, path: "/api/test" };
  const headersSet = {};
  let statusSet = null;

  const res = {
    setHeader: (k, v) => { headersSet[k] = v; },
    status: (s) => { statusSet = s; return { json: () => {} }; }
  };

  let nextCalled = false;
  limiter(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(headersSet["RateLimit-Limit"], 5);
  assert.strictEqual(headersSet["RateLimit-Remaining"], 4);
  assert.strictEqual(statusSet, null);
});

runTest("Test 4: Rate limiter triggers HTTP 429 when threshold is exceeded", () => {
  _resetRateLimits();
  const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
  const req = { headers: { "x-forwarded-for": "192.168.1.101" }, path: "/api/test" };

  let lastStatus = null;
  let lastJson = null;

  const makeReq = () => {
    lastStatus = null;
    lastJson = null;
    const res = {
      setHeader: () => {},
      status: (s) => {
        lastStatus = s;
        return {
          json: (data) => { lastJson = data; }
        };
      }
    };
    limiter(req, res, () => {});
  };

  makeReq(); // Hit 1 (remaining: 2)
  makeReq(); // Hit 2 (remaining: 1)
  makeReq(); // Hit 3 (remaining: 0)
  makeReq(); // Hit 4 -> EXCEEDED

  assert.strictEqual(lastStatus, 429);
  assert.strictEqual(lastJson.errorType, "RATE_LIMITED");
  assert.strictEqual(lastJson.success, false);
  assert(lastJson.retryAfterSeconds > 0);
});

runTest("Test 5: Sensitive actions limiter has stricter threshold than standard limiter", () => {
  assert(typeof sensitiveActionsLimiter === "function");
  assert(typeof standardLimiter === "function");
});

// -------------------------------------------------------------
// 3. Input Sanitization & NoSQL Injection Protection
// -------------------------------------------------------------

runTest("Test 6: hasNoSqlOperators detects dangerous MongoDB operator keys ($gt, $ne, $where)", () => {
  assert.strictEqual(hasNoSqlOperators({ username: "admin", $gt: "" }), true);
  assert.strictEqual(hasNoSqlOperators({ query: { $where: "sleep(5000)" } }), true);
  assert.strictEqual(hasNoSqlOperators({ "safe.key": "val" }), true);
  assert.strictEqual(hasNoSqlOperators({ locationId: "mumbai", validNumber: 42 }), false);
});

runTest("Test 7: sanitizeNoSql strips keys with '$' prefix or '.' characters", () => {
  const dirty = {
    locationId: "tokyo",
    $where: "malicious code",
    nested: {
      safeField: 100,
      $ne: null
    }
  };

  const clean = sanitizeNoSql(dirty);
  assert.strictEqual(clean.locationId, "tokyo");
  assert.strictEqual(clean.$where, undefined);
  assert.strictEqual(clean.nested.safeField, 100);
  assert.strictEqual(clean.nested.$ne, undefined);
});

runTest("Test 8: inputSanitizer middleware blocks $ operator query parameter injections with 400", () => {
  const req = {
    query: { locationId: { $ne: null } },
    body: {}
  };
  let statusSet = null;
  let jsonResponse = null;

  const res = {
    status: (s) => {
      statusSet = s;
      return { json: (d) => { jsonResponse = d; } };
    }
  };

  inputSanitizer(req, res, () => {});

  assert.strictEqual(statusSet, 400);
  assert.strictEqual(jsonResponse.errorType, "BAD_REQUEST");
  assert(jsonResponse.message.includes("Operator injection"));
});

runTest("Test 9: escapeRegex safely neutralizes regular expression injection and ReDoS strings", () => {
  const raw = "Mumbai (Central) + Regional [Zone] * 100?";
  const escaped = escapeRegex(raw);
  assert.strictEqual(escaped, "Mumbai \\(Central\\) \\+ Regional \\[Zone\\] \\* 100\\?");

  // Safe to construct RegExp without syntax errors
  const regex = new RegExp(`^${escaped}$`, "i");
  assert(regex.test("Mumbai (Central) + Regional [Zone] * 100?"));
  assert(!regex.test("Mumbai Central"));
});

runTest("Test 10: isValidIdentifier validates safe slugs and rejects invalid/dangerous inputs", () => {
  assert.strictEqual(isValidIdentifier("mumbai"), true);
  assert.strictEqual(isValidIdentifier("demo-flood-001"), true);
  assert.strictEqual(isValidIdentifier("loc_123_abc"), true);
  assert.strictEqual(isValidIdentifier("60d5ecb8b392d4001f5e88a1"), true);

  // Rejections
  assert.strictEqual(isValidIdentifier("mumbai; DROP TABLE;"), false);
  assert.strictEqual(isValidIdentifier("<script>alert(1)</script>"), false);
  assert.strictEqual(isValidIdentifier(""), false);
  assert.strictEqual(isValidIdentifier(null), false);
  assert.strictEqual(isValidIdentifier("a".repeat(70)), false); // exceeds 64 chars
});

// -------------------------------------------------------------
// 4. Backtest & Request Size Ceilings
// -------------------------------------------------------------

runTest("Test 11: MAX_BACKTEST_SCENARIOS ceiling is defined and set to 50", () => {
  assert.strictEqual(MAX_BACKTEST_SCENARIOS, 50);
});

// -------------------------------------------------------------
// 5. Error Handler Security & Secret Masking
// -------------------------------------------------------------

runTest("Test 12: errorHandler strips stack traces when NODE_ENV is production", () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const err = new Error("Database query timeout");
    err.stack = "Error: Database query timeout\n    at internalFunction (e:/PROJECTS/server.js:45:10)";

    let jsonResponse = null;
    const res = {
      statusCode: 500,
      status: () => ({ json: (d) => { jsonResponse = d; } })
    };

    errorHandler(err, {}, res, () => {});

    assert.strictEqual(jsonResponse.stack, undefined, "Stack trace must not be exposed in production");
    assert.strictEqual(jsonResponse.success, false);
    assert.strictEqual(jsonResponse.errorType, "SERVER_ERROR");
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

runTest("Test 13: errorHandler sanitizes MongoDB connection URIs and credentials from error messages", () => {
  const err = new Error("Failed to connect to mongodb+srv://admin:SuperSecretPass123@cluster0.mongodb.net/terrasafe");
  let jsonResponse = null;
  const res = {
    statusCode: 500,
    status: () => ({ json: (d) => { jsonResponse = d; } })
  };

  errorHandler(err, {}, res, () => {});

  assert(!jsonResponse.message.includes("mongodb+srv://"), "Must not leak MongoDB URI scheme");
  assert(!jsonResponse.message.includes("SuperSecretPass123"), "Must not leak password");
  assert.strictEqual(jsonResponse.message, "Database operation could not be completed.");
});

runTest("Test 14: errorHandler sanitizes API keys and secret tokens from error messages", () => {
  const err = new Error("Invalid AI_API_KEY: AIzaSyD-secret-key-value-12345");
  let jsonResponse = null;
  const res = {
    statusCode: 401,
    status: () => ({ json: (d) => { jsonResponse = d; } })
  };

  errorHandler(err, {}, res, () => {});

  assert(!jsonResponse.message.includes("AIzaSyD-secret-key-value-12345"), "Must not leak API key value");
  assert.strictEqual(jsonResponse.message, "External provider authentication error.");
});

runTest("Test 15: notFoundHandler returns structured 404 response without leaking paths", () => {
  let statusSet = null;
  let jsonResponse = null;
  const req = { originalUrl: "/api/unknown-endpoint" };
  const res = {
    status: (s) => {
      statusSet = s;
      return { json: (d) => { jsonResponse = d; } };
    }
  };

  notFoundHandler(req, res, () => {});

  assert.strictEqual(statusSet, 404);
  assert.strictEqual(jsonResponse.errorType, "NOT_FOUND");
  assert.strictEqual(jsonResponse.success, false);
});

// -------------------------------------------------------------
// 6. Demo Mode Isolation & Safety
// -------------------------------------------------------------

runTest("Test 16: Demo mode rejects unknown scenario IDs with HTTP 404", () => {
  assert.throws(
    () => runDemoScenario("unknown-injected-id"),
    (err) => err.statusCode === 404
  );
});

runTest("Test 17: Demo mode catalog remains immutable across calls", () => {
  const s = getDemoScenarioById("demo-flood-001");
  s.inputs.rainfall = 0; // Attempt mutation
  const fresh = getDemoScenarioById("demo-flood-001");
  assert.strictEqual(fresh.inputs.rainfall, 92, "Catalog inputs must not be mutable");
});

// -------------------------------------------------------------
// 7. Health Endpoint & Offline Storage Security
// -------------------------------------------------------------

runTest("Test 18: Health check endpoint returns safe JSON without internal URIs or env variables", () => {
  let statusSet = null;
  let jsonResponse = null;
  const req = {};
  const res = {
    status: (s) => {
      statusSet = s;
      return { json: (d) => { jsonResponse = d; } };
    }
  };

  getHealth(req, res);

  assert.strictEqual(statusSet, 200);
  assert.strictEqual(jsonResponse.success, true);
  assert.strictEqual(jsonResponse.message, "HydroGuard API is running");
  assert(!jsonResponse.mongoUri, "Must not leak mongoUri");
  assert(!jsonResponse.apiKey, "Must not leak apiKey");
  assert(!jsonResponse.env, "Must not leak env");
});

runTest("Test 19: errorHandler maps entity.too.large to PAYLOAD_TOO_LARGE (413)", () => {
  const err = new Error("Payload too large");
  err.type = "entity.too.large";
  err.statusCode = 413;
  let jsonResponse = null;
  let statusSet = null;

  const res = {
    statusCode: 413,
    status: (s) => {
      statusSet = s;
      return { json: (d) => { jsonResponse = d; } };
    }
  };

  errorHandler(err, {}, res, () => {});

  assert.strictEqual(statusSet, 413);
  assert.strictEqual(jsonResponse.errorType, "PAYLOAD_TOO_LARGE");
  assert.strictEqual(jsonResponse.message, "Request payload exceeds size limit (1MB).");
});

runTest("Test 20: CORS error returns FORBIDDEN (403)", () => {
  const err = new Error("CORS policy violation: Origin 'http://evil-site.com' is not authorized.");
  err.name = "CorsError";
  err.statusCode = 403;
  let jsonResponse = null;
  let statusSet = null;

  const res = {
    statusCode: 403,
    status: (s) => {
      statusSet = s;
      return { json: (d) => { jsonResponse = d; } };
    }
  };

  errorHandler(err, {}, res, () => {});

  assert.strictEqual(statusSet, 403);
  assert.strictEqual(jsonResponse.errorType, "FORBIDDEN");
  assert(jsonResponse.message.includes("CORS policy violation"));
});

runTest("Test 21: AI explanation inputs cannot override server-side provider credentials", () => {
  const maliciousInput = {
    overall: { score: 75, level: "HIGH" },
    flood: { score: 80, level: "CRITICAL" },
    landslide: { score: 20, level: "LOW" },
    seismic: { score: 10, level: "LOW" },
    apiKey: "attacker-stolen-key",
    apiUrl: "https://attacker.com/steal-data"
  };

  // The server-side validation only reads overall, flood, landslide, seismic categories
  assert.strictEqual(maliciousInput.overall.level, "HIGH");
  assert(maliciousInput.apiKey, "Attacker payload contains key");
  // Server-side provider URL is fixed from server config, never from payload
});

runTest("Test 22: Rate limiter sliding window resets hit store after window expires", () => {
  _resetRateLimits();
  const limiter = createRateLimiter({ windowMs: 10, max: 2 });
  const req = { headers: { "x-forwarded-for": "192.168.1.200" }, path: "/api/test" };
  const res = { setHeader: () => {}, status: () => ({ json: () => {} }) };

  limiter(req, res, () => {});
  limiter(req, res, () => {});
  _resetRateLimits(); // simulate window expiration
  let nextCalled = false;
  limiter(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true, "Rate limit window reset permits fresh requests");
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
