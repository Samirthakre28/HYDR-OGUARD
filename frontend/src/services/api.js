/**
 * HydroGuard - Frontend API Service Client (Step 16 Resilient Architecture)
 * Handles communication with the Express/Node.js backend with structured error categorization,
 * configurable timeout protection, and non-crashing graceful failure responses.
 */

import {
  buildEmergencyFacilitiesFallback,
  buildHydrologyFallbackPayload,
  buildSeismicFallbackPayload,
  buildWeatherFallbackPayload,
  RISK_ENGINE_FALLBACK_INPUTS
} from "../data/environmentalFallback";
import { locations as presetLocations } from "../data/locations";

const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "/api";
export const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Standardized API Error Types
 */
export const API_ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  ABORTED: "ABORTED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
};

function isAbortLike(error) {
  return error?.name === "AbortError" || error?.type === API_ERROR_TYPES.ABORTED;
}

/**
 * Creates a structured API Error object
 *
 * @param {string} type - Key from API_ERROR_TYPES
 * @param {string} message - User-friendly error message
 * @param {number} [status=0] - HTTP status code
 * @param {boolean} [retryable=true] - Whether the operation can be retried safely
 * @param {Error} [originalError=null]
 * @returns {Error} Enhanced error with structured telemetry
 */
export function createApiError(type, message, status = 0, retryable = true, originalError = null) {
  const error = new Error(message || "An unexpected API error occurred.");
  error.name = "ApiError";
  error.type = type || API_ERROR_TYPES.UNKNOWN_ERROR;
  error.status = status;
  error.retryable = retryable;
  error.timestamp = new Date().toISOString();
  if (originalError) {
    error.originalError = originalError;
  }
  return error;
}

/**
 * Robust API request wrapper with timeout abort protection and error classification
 *
 * @param {string} endpoint - API relative path
 * @param {RequestInit & { timeoutMs?: number }} [options]
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL.replace(/\/$/, "")}${cleanEndpoint}`;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  // Timeout AbortController
  const timeoutController = new AbortController();
  let isTimeout = false;
  const timeoutId = setTimeout(() => {
    isTimeout = true;
    timeoutController.abort();
  }, timeoutMs);

  // Link external signal if provided
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw createApiError(
        API_ERROR_TYPES.ABORTED,
        "Request cancelled before dispatch.",
        0,
        false
      );
    }
    options.signal.addEventListener("abort", () => {
      timeoutController.abort();
    });
  }

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options,
    signal: timeoutController.signal
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // Safely parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      if (!response.ok) {
        throw createApiError(
          response.status >= 500 ? API_ERROR_TYPES.SERVER_ERROR : API_ERROR_TYPES.INVALID_RESPONSE,
          `Server returned HTTP ${response.status} with non-JSON body.`,
          response.status,
          response.status >= 500,
          jsonErr
        );
      }
      throw createApiError(
        API_ERROR_TYPES.INVALID_RESPONSE,
        "Server returned malformed or non-JSON data.",
        response.status,
        false,
        jsonErr
      );
    }

    if (!response.ok) {
      let errorType = API_ERROR_TYPES.UNKNOWN_ERROR;
      let retryable = false;

      if (response.status === 404) {
        errorType = API_ERROR_TYPES.NOT_FOUND;
        retryable = false;
      } else if (response.status >= 500) {
        errorType = API_ERROR_TYPES.SERVER_ERROR;
        retryable = true;
      } else if (response.status === 429) {
        errorType = API_ERROR_TYPES.SERVER_ERROR;
        retryable = true;
      }

      const msg = data?.message || `API Error: HTTP ${response.status} ${response.statusText}`;
      const err = createApiError(errorType, msg, response.status, retryable);
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // 1. If already structured ApiError, rethrow
    if (error.name === "ApiError") {
      throw error;
    }

    // 2. Handle Timeout
    if (isTimeout) {
      throw createApiError(
        API_ERROR_TYPES.TIMEOUT,
        `Request to ${cleanEndpoint} timed out after ${timeoutMs}ms.`,
        408,
        true,
        error
      );
    }

    // 3. Handle External Abort
    if (error.name === "AbortError" || options.signal?.aborted) {
      const abortErr = createApiError(
        API_ERROR_TYPES.ABORTED,
        "Request cancelled due to station switch.",
        0,
        false,
        error
      );
      abortErr.name = "AbortError";
      throw abortErr;
    }

    // 4. Handle Network / Connection Errors
    const isNetworkOff = typeof navigator !== "undefined" && !navigator.onLine;
    const isFetchFail = error instanceof TypeError || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError");

    if (isNetworkOff || isFetchFail) {
      throw createApiError(
        API_ERROR_TYPES.NETWORK_ERROR,
        isNetworkOff ? "Network connection is offline." : "Unable to reach server. Please check your internet connection.",
        0,
        true,
        error
      );
    }

    // 5. General Fallback
    console.error(`[HydroGuard API Client] Request failed for ${url}:`, error.message);
    throw createApiError(
      API_ERROR_TYPES.UNKNOWN_ERROR,
      error.message || "An unknown network error occurred.",
      0,
      true,
      error
    );
  }
}

/**
 * Fetch all monitored locations
 * @returns {Promise<{ success: boolean, count: number, data: Array }>}
 */
export async function getLocations() {
  return request("/locations");
}

/**
 * Fetch single location by ID
 * @param {string} id
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getLocation(id) {
  if (!id) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  return request(`/locations/${id}`);
}

/**
 * Fetch latest calculated risk telemetry for a location
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: { location: Object, risk: Object } }>}
 */
export async function getRiskData(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  try {
    return await request(`/risk/${locationId}`, { signal });
  } catch (error) {
    if (isAbortLike(error)) throw error;
    const calculated = await calculateRisk(RISK_ENGINE_FALLBACK_INPUTS);
    if (calculated?.success && calculated.data) {
      return {
        success: true,
        data: { risk: calculated.data },
        sourceType: "FALLBACK"
      };
    }
    throw error;
  }
}

/**
 * Calculate dynamic disaster risk scores and explainable causal drivers from environmental inputs
 * @param {Object} input - { rainfall, riverLevel, slope, elevation, historicalRisk, seismicActivity }
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function calculateRisk(input) {
  return request("/risk/calculate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

/**
 * Generate AI-powered risk summary, key drivers, safety recommendations, and warnings
 * @param {Object} riskData - Authoritative risk data object
 * @param {AbortSignal} [signal] - Optional abort signal for race condition handling
 * @returns {Promise<{ success: boolean, data?: Object, message?: string, isConfigured?: boolean }>}
 */
export async function getRiskExplanation(riskData, signal) {
  if (!riskData) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "riskData is required for AI explanation", 400, false);
  return request("/risk/explanation", {
    method: "POST",
    body: JSON.stringify({ riskData }),
    signal
  });
}

/**
 * Fetch current real-time alert for a location
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getCurrentAlert(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  return request(`/alerts/${locationId}`, { signal });
}

/**
 * Fetch historical alerts log for a location
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, count: number, data: Array }>}
 */
export async function getAlertHistory(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  return request(`/alerts/${locationId}/history`, { signal });
}

/**
 * Fetch nearby emergency facilities for a location
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getEmergencyServices(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  try {
    return await request(`/emergency/${locationId}`, { signal });
  } catch (error) {
    if (isAbortLike(error)) throw error;
    const loc = presetLocations.find(
      (l) => l.id === locationId || l.name.toLowerCase() === String(locationId).split("-")[0].toLowerCase()
    ) || { name: "Kathmandu", latitude: 27.7172, longitude: 85.3240, id: locationId };
    const services = buildEmergencyFacilitiesFallback(loc);
    return {
      success: true,
      data: {
        locationId,
        locationName: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isDemoData: false,
        sourceType: "FALLBACK",
        count: services.length,
        services
      }
    };
  }
}

/**
 * Fetch real-time normalized weather observations for a location (Step 9)
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: { locationId: string, locationName: string, weather: Object, source: string, cached?: boolean } }>}
 */
export async function getWeatherData(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  try {
    return await request(`/weather/${locationId}`, { signal });
  } catch (error) {
    if (isAbortLike(error)) throw error;
    return buildWeatherFallbackPayload(locationId);
  }
}

/**
 * Fetch real-time normalized hydrological & river telemetry for a location (Step 11)
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: { locationId: string, locationName: string, hydrology: Object, station: Object, source: string, cached?: boolean } }>}
 */
export async function getHydrologyData(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  try {
    return await request(`/hydrology/${locationId}`, { signal });
  } catch (error) {
    if (isAbortLike(error)) throw error;
    return buildHydrologyFallbackPayload(locationId);
  }
}

/**
 * Fetch real-time normalized seismic activity telemetry for a location (Step 12)
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: { locationId: string, locationName: string, seismic: Object, recentEarthquakes: Array, source: string, cached?: boolean } }>}
 */
export async function getSeismicData(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  try {
    return await request(`/seismic/${locationId}`, { signal });
  } catch (error) {
    if (isAbortLike(error)) throw error;
    return buildSeismicFallbackPayload(locationId);
  }
}

/**
 * Fetch verified quick emergency contacts for a location (Step 14)
 * @param {string} locationId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: { locationId: string, locationName: string, country: string, region: string, source: string, isConfigured: boolean, contacts: Array } }>}
 */
export async function getQuickEmergencyContacts(locationId, signal) {
  if (!locationId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Location ID is required", 400, false);
  return request(`/emergency-contacts/${locationId}`, { signal });
}

/**
 * Run historical / synthetic backtesting batch evaluation against the deterministic risk engine (Step 19)
 * @param {Array<Object>} [scenarios] - Array of scenario objects to backtest (or empty for default fixtures)
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function runBacktest(scenarios = [], signal) {
  return request("/validation/backtest", {
    method: "POST",
    body: JSON.stringify({ scenarios }),
    signal
  });
}

/**
 * Get backtesting summary and benchmark metrics against test fixtures (Step 19)
 * @param {boolean} [includeSynthetic=true] - Whether to include synthetic test fixtures
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getBacktestSummary(includeSynthetic = true, signal) {
  const query = includeSynthetic ? "?includeSynthetic=true" : "?includeSynthetic=false";
  return request(`/validation/backtest/summary${query}`, { signal });
}

/**
 * Fetch list of all available deterministic demo scenarios (Step 20)
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Array<Object>, count: number }>}
 */
export async function getDemoScenarios(signal) {
  return request("/demo/scenarios", { signal });
}

/**
 * Fetch a specific deterministic demo scenario by ID (Step 20)
 * @param {string} scenarioId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function getDemoScenario(scenarioId, signal) {
  if (!scenarioId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Scenario ID is required", 400, false);
  return request(`/demo/scenarios/${scenarioId}`, { signal });
}

/**
 * Run a deterministic demo scenario through the existing Risk Engine (Step 20)
 * @param {string} scenarioId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function runDemoRisk(scenarioId, signal) {
  if (!scenarioId) throw createApiError(API_ERROR_TYPES.INVALID_RESPONSE, "Scenario ID is required", 400, false);
  return request(`/demo/risk/${scenarioId}`, {
    method: "POST",
    signal
  });
}

/**
 * Submit alert accuracy feedback
 * @param {string} alertId
 * @param {Object} feedbackData
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function submitAlertFeedback(alertId, feedbackData, signal) {
  const cleanId = alertId || "general-alert";
  return request(`/alerts/${cleanId}/feedback`, {
    method: "POST",
    body: JSON.stringify(feedbackData),
    signal
  });
}

/**
 * Get feedback list for specific alert
 * @param {string} alertId
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Array, summary: Object }>}
 */
export async function getAlertFeedback(alertId, signal) {
  const cleanId = alertId || "general-alert";
  return request(`/alerts/${cleanId}/feedback`, { signal });
}

/**
 * Get overall alert accuracy feedback summary
 * @param {Object} [params]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ success: boolean, data: Object, disclaimer: string }>}
 */
export async function getAlertFeedbackSummary(params = {}, signal) {
  const modeQuery = params.mode ? `?mode=${encodeURIComponent(params.mode)}` : "";
  return request(`/alerts/feedback/summary${modeQuery}`, { signal });
}

/**
 * Health check endpoint
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function checkHealth() {
  return request("/health");
}

export default {
  API_ERROR_TYPES,
  DEFAULT_TIMEOUT_MS,
  createApiError,
  getLocations,
  getLocation,
  getRiskData,
  calculateRisk,
  getRiskExplanation,
  getCurrentAlert,
  getAlertHistory,
  getEmergencyServices,
  getQuickEmergencyContacts,
  getWeatherData,
  getHydrologyData,
  getSeismicData,
  runBacktest,
  getBacktestSummary,
  getDemoScenarios,
  getDemoScenario,
  runDemoRisk,
  submitAlertFeedback,
  getAlertFeedback,
  getAlertFeedbackSummary,
  checkHealth
};


