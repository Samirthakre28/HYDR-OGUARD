/**
 * HydroGuard - HTTP Security Headers Middleware (Step 21)
 *
 * Implements defensive HTTP response headers to protect against clickjacking,
 * MIME-type sniffing, cross-site scripting, and unauthorized frame embedding,
 * while ensuring full compatibility with Leaflet/OpenStreetMap tiles.
 */

import { config } from "../config/index.js";

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent Clickjacking / Framing
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Modern recommendation: Disable legacy XSS auditor
  res.setHeader("X-XSS-Protection", "0");

  // Referrer Policy: Send full URL on same origin, strip path/query across origins
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Cross-Origin Isolation Policies
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  // Restrict sensitive browser features by default
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=()");

  // Content-Security-Policy (Permissive for OpenStreetMap tiles and client bundling)
  const cspDirectives = [
    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.openstreetmap.org https://unpkg.com",
    "connect-src 'self' http: https: ws: wss:",
    "font-src 'self' https: data:",
    "frame-ancestors 'self'"
  ];
  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // Strict-Transport-Security: Set ONLY in production over HTTPS (prevents local HTTP breakage)
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (config.nodeEnv === "production" && isSecure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Remove X-Powered-By
  res.removeHeader("X-Powered-By");

  next();
}

export default securityHeaders;
