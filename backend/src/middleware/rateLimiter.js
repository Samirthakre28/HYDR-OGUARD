/**
 * HydroGuard - Sliding-Window Rate Limiting Middleware (Step 21)
 *
 * Protects public endpoints from volumetric abuse, denial of service, and brute-force
 * polling while maintaining full operational throughput for normal 5-minute dashboard refreshes.
 */

import { config } from "../config/index.js";

// In-memory hit-record store: IP -> Array of timestamps
const hitStore = new Map();

/**
 * Cleanup expired records to prevent unbounded memory growth
 * @param {number} windowMs
 */
function cleanupExpiredHits(windowMs) {
  const cutoff = Date.now() - windowMs;
  for (const [ip, timestamps] of hitStore.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      hitStore.delete(ip);
    } else {
      hitStore.set(ip, valid);
    }
  }
}

// Periodic cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  cleanupExpiredHits(config.rateLimitWindowMs || 900000);
}, 300000);
cleanupInterval.unref(); // Allow process to exit cleanly in tests

/**
 * Creates an Express rate-limiting middleware instance.
 *
 * @param {Object} [options]
 * @param {number} [options.windowMs] - Time window in milliseconds
 * @param {number} [options.max] - Max allowed requests per IP per window
 * @param {string} [options.message] - Custom user-facing rate-limit message
 * @param {Function} [options.skip] - Optional filter function (req => boolean)
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || config.rateLimitWindowMs || 900000;
  const max = options.max || config.rateLimitMaxRequests || 300;
  const message = options.message || "Too many requests. Rate limit exceeded. Please try again later.";
  const skip = options.skip || (() => false);

  return function rateLimiterMiddleware(req, res, next) {
    if (skip(req)) {
      return next();
    }

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const now = Date.now();
    const cutoff = now - windowMs;

    const existingHits = hitStore.get(clientIp) || [];
    const validHits = existingHits.filter((t) => t > cutoff);

    // Calculate headers
    const remaining = Math.max(0, max - validHits.length - 1);
    const oldestHit = validHits.length > 0 ? validHits[0] : now;
    const resetTimeSeconds = Math.ceil((oldestHit + windowMs - now) / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", Math.max(0, resetTimeSeconds));

    if (validHits.length >= max) {
      res.setHeader("Retry-After", Math.max(1, resetTimeSeconds));
      return res.status(429).json({
        success: false,
        errorType: "RATE_LIMITED",
        message,
        retryAfterSeconds: Math.max(1, resetTimeSeconds)
      });
    }

    validHits.push(now);
    hitStore.set(clientIp, validHits);

    next();
  };
}

/**
 * Standard API Rate Limiter (Default: 300 requests / 15 min per IP)
 */
export const standardLimiter = createRateLimiter({
  windowMs: config.rateLimitWindowMs || 900000,
  max: config.rateLimitMaxRequests || 300,
  skip: (req) => req.path === "/health" // Exempt lightweight health check
});

/**
 * Strict Rate Limiter for CPU/AI-intensive actions (Default: 60 requests / 15 min per IP)
 */
export const sensitiveActionsLimiter = createRateLimiter({
  windowMs: config.rateLimitWindowMs || 900000,
  max: config.rateLimitSensitiveMax || 60,
  message: "High-volume request rate limit exceeded for computational actions. Please slow down."
});

/**
 * Reset memory store (useful for unit testing)
 */
export function _resetRateLimits() {
  hitStore.clear();
}

export default {
  createRateLimiter,
  standardLimiter,
  sensitiveActionsLimiter,
  _resetRateLimits
};
