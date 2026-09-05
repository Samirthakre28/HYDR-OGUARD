/**
 * HydroGuard - Input Sanitizer & NoSQL Injection Protection Middleware (Step 21)
 *
 * Sanitizes input parameters, rejects malicious NoSQL operators ($gt, $ne, $where),
 * and escapes regular expression special characters to protect against ReDoS.
 */

/**
 * Escapes characters with special meaning in regular expressions.
 * Prevents ReDoS and regex parse exceptions when constructing RegExp from user input.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates whether an identifier string is a safe alphanumeric slug or MongoDB ID.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidIdentifier(id) {
  if (!id || typeof id !== "string") return false;
  // Allow alphanumeric, underscores, and hyphens (up to 64 chars)
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id.trim());
}

/**
 * Recursively scans an object for dangerous NoSQL operator keys ($ prefix).
 * @param {any} obj
 * @returns {boolean} True if a key starting with '$' was found
 */
export function hasNoSqlOperators(obj) {
  if (!obj || typeof obj !== "object") return false;

  if (Array.isArray(obj)) {
    return obj.some((item) => hasNoSqlOperators(item));
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }
    if (typeof obj[key] === "object" && hasNoSqlOperators(obj[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively removes keys starting with '$' or containing '.'
 * @param {any} obj
 * @returns {any} Sanitized object
 */
export function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeNoSql(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue; // Strip operator key
    }
    clean[key] = typeof value === "object" ? sanitizeNoSql(value) : value;
  }
  return clean;
}

/**
 * Express middleware to sanitize requests against NoSQL injection and malformed input.
 */
export function inputSanitizer(req, res, next) {
  // Check for dangerous NoSQL operators in query parameters
  if (req.query && hasNoSqlOperators(req.query)) {
    return res.status(400).json({
      success: false,
      errorType: "BAD_REQUEST",
      message: "Malformed query parameter. Operator injection is not permitted."
    });
  }

  // Check for dangerous NoSQL operators in request body
  if (req.body && hasNoSqlOperators(req.body)) {
    // Sanitize body or reject if blatant injection attempt
    req.body = sanitizeNoSql(req.body);
  }

  next();
}

export default {
  escapeRegex,
  isValidIdentifier,
  hasNoSqlOperators,
  sanitizeNoSql,
  inputSanitizer
};
