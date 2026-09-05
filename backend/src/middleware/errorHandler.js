/**
 * HydroGuard - Global Error Handling Middleware (Step 16 Security & Resilience)
 * Sanitizes server error responses, prevents secret leakage (Mongo URIs, API keys),
 * and standardizes JSON error payload structures.
 */

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    errorType: "NOT_FOUND",
    message: `Resource not found: ${req.originalUrl}`
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);

  // Classify error type
  let errorType = "SERVER_ERROR";
  if (err.name === "CorsError" || err.message?.includes("CORS policy")) {
    errorType = "FORBIDDEN";
  } else if (err.type === "entity.too.large") {
    errorType = "PAYLOAD_TOO_LARGE";
  } else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    errorType = "BAD_REQUEST";
  } else if (statusCode === 400) errorType = "BAD_REQUEST";
  else if (statusCode === 401) errorType = "UNAUTHORIZED";
  else if (statusCode === 403) errorType = "FORBIDDEN";
  else if (statusCode === 404) errorType = "NOT_FOUND";
  else if (statusCode === 408) errorType = "TIMEOUT";
  else if (statusCode === 413) errorType = "PAYLOAD_TOO_LARGE";
  else if (statusCode === 429) errorType = "RATE_LIMITED";

  // Sanitize message to prevent leaking secrets/internal URIs/paths
  let safeMessage = err.message || "An internal server error occurred.";
  if (safeMessage.includes("mongodb://") || safeMessage.includes("mongodb+srv://")) {
    safeMessage = "Database operation could not be completed.";
  }
  if (safeMessage.includes("API_KEY") || safeMessage.includes("secret") || safeMessage.includes("token")) {
    safeMessage = "External provider authentication error.";
  }
  if (err.type === "entity.too.large") {
    safeMessage = "Request payload exceeds size limit (1MB).";
  }

  const isProd = process.env.NODE_ENV === "production";

  // In production, mask internal paths or unclassified server error details
  if (isProd && statusCode >= 500) {
    safeMessage = "An internal server error occurred. Please try again later.";
  }

  res.status(statusCode === 200 ? 500 : statusCode).json({
    success: false,
    errorType,
    message: safeMessage,
    errors: err.errors || undefined,
    stack: isProd ? undefined : err.stack
  });
};

export default {
  notFoundHandler,
  errorHandler
};
