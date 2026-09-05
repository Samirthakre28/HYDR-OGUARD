/**
 * HydroGuard - Real-Time Environmental Data Integration Service (Step 9)
 *
 * Provides decoupled weather ingestion, piecewise rainfall risk normalization,
 * in-memory TTL caching, and provider abstraction.
 *
 * NOTE: Normalization of precipitation into the 0-100 Risk Engine scale is an
 * engineering heuristic for localized hazard modeling and is not scientifically certified.
 */

import { config } from "../config/index.js";

/**
 * Deterministic environmental fallback used only when live and cached weather are unavailable.
 */
export const WEATHER_FALLBACK_VALUES = {
  temperature: 24.8,
  humidity: 78,
  rainfall: 42.6,
  normalizedRainfall: 78,
  windSpeed: 12.4
};

/**
 * Returns deterministic fallback weather dataset
 */
export function getKathmanduWeatherFallback() {
  return {
    temperature: WEATHER_FALLBACK_VALUES.temperature,
    humidity: WEATHER_FALLBACK_VALUES.humidity,
    rainfall: WEATHER_FALLBACK_VALUES.rainfall,
    normalizedRainfall: WEATHER_FALLBACK_VALUES.normalizedRainfall,
    windSpeed: WEATHER_FALLBACK_VALUES.windSpeed,
    observedAt: new Date().toISOString(),
    source: "Regional meteorological baseline",
    cached: false,
    isFallback: true,
    sourceType: "FALLBACK"
  };
}

/**
 * Returns the same deterministic weather fallback for any location.
 * Used only after live and cached weather are unavailable.
 */
export function getLocationWeatherFallback() {
  return getKathmanduWeatherFallback();
}

// Centralized Rainfall Normalization Thresholds (in mm)
export const RAINFALL_THRESHOLDS = {
  TRACE_MAX: 2.5,       // 0 - 2.5 mm: Trace / light sprinkle -> 0 - 25 risk score
  MODERATE_MAX: 15.0,   // 2.5 - 15 mm: Moderate rainfall -> 26 - 50 risk score
  HEAVY_MAX: 40.0,      // 15 - 40 mm: Heavy rainfall -> 51 - 75 risk score
  VERY_HEAVY_MAX: 80.0, // 40 - 80 mm: Very heavy / torrential -> 76 - 90 risk score
  EXTREME_MAX: 120.0    // > 80 mm: Cloudburst / extreme -> approaches 100
};

/**
 * Normalizes raw rainfall in physical units (millimeters) to the 0-100 scale
 * expected by the HydroGuard Risk Engine.
 *
 * Piecewise mapping:
 * - 0 mm           => 0
 * - 0 to 2.5 mm    => 0 to 25 (Trace / Light)
 * - 2.5 to 15 mm   => 26 to 50 (Moderate)
 * - 15 to 40 mm    => 51 to 75 (Heavy)
 * - 40 to 80 mm    => 76 to 90 (Very Heavy)
 * - > 80 mm        => 91 to 100 (Extreme / Torrential)
 *
 * @param {number|string} rawValue - Precipitation in millimeters (mm)
 * @returns {number} Integer between 0 and 100
 */
export function normalizeRainfall(rawValue) {
  const value = Number(rawValue);

  if (isNaN(value) || value <= 0) {
    return 0;
  }

  let normalizedScore = 0;

  if (value <= RAINFALL_THRESHOLDS.TRACE_MAX) {
    // 0 - 2.5mm maps to 0 - 25
    normalizedScore = (value / RAINFALL_THRESHOLDS.TRACE_MAX) * 25;
  } else if (value <= RAINFALL_THRESHOLDS.MODERATE_MAX) {
    // 2.5 - 15mm maps to 26 - 50
    const ratio = (value - RAINFALL_THRESHOLDS.TRACE_MAX) / (RAINFALL_THRESHOLDS.MODERATE_MAX - RAINFALL_THRESHOLDS.TRACE_MAX);
    normalizedScore = 26 + ratio * 24;
  } else if (value <= RAINFALL_THRESHOLDS.HEAVY_MAX) {
    // 15 - 40mm maps to 51 - 75
    const ratio = (value - RAINFALL_THRESHOLDS.MODERATE_MAX) / (RAINFALL_THRESHOLDS.HEAVY_MAX - RAINFALL_THRESHOLDS.MODERATE_MAX);
    normalizedScore = 51 + ratio * 24;
  } else if (value <= RAINFALL_THRESHOLDS.VERY_HEAVY_MAX) {
    // 40 - 80mm maps to 76 - 90
    const ratio = (value - RAINFALL_THRESHOLDS.HEAVY_MAX) / (RAINFALL_THRESHOLDS.VERY_HEAVY_MAX - RAINFALL_THRESHOLDS.HEAVY_MAX);
    normalizedScore = 76 + ratio * 14;
  } else {
    // 80 - 120mm+ maps to 91 - 100
    const ratio = Math.min(1, (value - RAINFALL_THRESHOLDS.VERY_HEAVY_MAX) / (RAINFALL_THRESHOLDS.EXTREME_MAX - RAINFALL_THRESHOLDS.VERY_HEAVY_MAX));
    normalizedScore = 91 + ratio * 9;
  }

  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

// In-Memory Coordinate-Based Weather Cache
// Format: Map<string, { data: Object, expiresAt: number }>
const weatherCache = new Map();

/**
 * Generates cache key from lat/lon rounded to 3 decimal places (~110m precision)
 */
function getCacheKey(lat, lon) {
  return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
}

/**
 * Retrieves cached weather data if not expired
 */
export function getCachedWeather(latitude, longitude) {
  const key = getCacheKey(latitude, longitude);
  const entry = weatherCache.get(key);

  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return { ...entry.data, cached: true };
    }
    // Expired
    weatherCache.delete(key);
  }
  return null;
}

/**
 * Stores weather data in cache with TTL
 */
export function setCachedWeather(latitude, longitude, data, ttlMs = config.weatherCacheTtlMs) {
  const key = getCacheKey(latitude, longitude);
  weatherCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlMs || 300000)
  });
}

/**
 * Clears weather cache (useful for testing)
 */
export function clearWeatherCache() {
  weatherCache.clear();
}

/**
 * Returns weather cache diagnostic metrics
 */
export function getWeatherCacheStats() {
  return {
    size: weatherCache.size,
    ttlMs: config.weatherCacheTtlMs
  };
}

/**
 * Fetches current weather from Open-Meteo API (Default Provider)
 * @param {number} lat
 * @param {number} lon
 * @param {number} [timeoutMs=6000]
 */
async function fetchOpenMeteoWeather(lat, lon, timeoutMs = 6000) {
  const baseUrl = config.weatherApiUrl || "https://api.open-meteo.com/v1/forecast";
  const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,wind_speed_10m&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather provider returned HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();

    if (!payload || !payload.current) {
      throw new Error("Invalid response schema received from weather provider");
    }

    const current = payload.current;

    // Open-Meteo provides precipitation / rain in mm
    const rawRainfall = Number(current.rain ?? current.precipitation ?? 0);
    const temperature = Number(current.temperature_2m ?? 0);
    const humidity = Number(current.relative_humidity_2m ?? 0);
    const windSpeed = Number(current.wind_speed_10m ?? 0);
    const observedAt = current.time ? new Date(current.time).toISOString() : new Date().toISOString();

    return {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.max(0, Math.min(100, Math.round(humidity))),
      rainfall: Math.max(0, Math.round(rawRainfall * 10) / 10),
      normalizedRainfall: normalizeRainfall(rawRainfall),
      windSpeed: Math.max(0, Math.round(windSpeed * 10) / 10),
      observedAt,
      source: "Open-Meteo Live API"
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Weather provider request timed out");
    }
    throw error;
  }
}

/**
 * Fetches current weather from Generic / OpenWeatherMap API when API key is provided
 * @param {number} lat
 * @param {number} lon
 * @param {string} apiKey
 * @param {number} [timeoutMs=6000]
 */
async function fetchOpenWeatherMap(lat, lon, apiKey, timeoutMs = 6000) {
  const baseUrl = config.weatherApiUrl && !config.weatherApiUrl.includes("open-meteo")
    ? config.weatherApiUrl
    : "https://api.openweathermap.org/data/2.5/weather";

  const url = `${baseUrl}?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather provider HTTP ${response.status}`);
    }

    const payload = await response.json();

    const rawRainfall = Number(payload.rain?.["1h"] ?? payload.rain?.["3h"] ?? 0);
    const temperature = Number(payload.main?.temp ?? 0);
    const humidity = Number(payload.main?.humidity ?? 0);
    const windSpeed = Number((payload.wind?.speed ?? 0) * 3.6); // convert m/s to km/h
    const observedAt = payload.dt ? new Date(payload.dt * 1000).toISOString() : new Date().toISOString();

    return {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.max(0, Math.min(100, Math.round(humidity))),
      rainfall: Math.max(0, Math.round(rawRainfall * 10) / 10),
      normalizedRainfall: normalizeRainfall(rawRainfall),
      windSpeed: Math.max(0, Math.round(windSpeed * 10) / 10),
      observedAt,
      source: "OpenWeatherMap API"
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Weather provider request timed out");
    }
    throw error;
  }
}

/**
 * Provider-agnostic Weather Dispatcher
 * @param {number} lat
 * @param {number} lon
 * @param {Object} [options]
 */
async function fetchFromProvider(lat, lon, options = {}) {
  // If custom API key is present and url is not explicitly set to open-meteo, use OpenWeatherMap
  if (config.weatherApiKey && !config.weatherApiUrl.includes("open-meteo")) {
    return fetchOpenWeatherMap(lat, lon, config.weatherApiKey, options.timeoutMs);
  }

  // Otherwise, default to high-performance Open-Meteo
  return fetchOpenMeteoWeather(lat, lon, options.timeoutMs);
}

/**
 * Primary public method to get normalized real-time environmental weather data
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object} [options]
 * @param {boolean} [options.bypassCache=false]
 * @param {number} [options.timeoutMs=6000]
 * @returns {Promise<{
 *   temperature: number,
 *   humidity: number,
 *   rainfall: number,
 *   normalizedRainfall: number,
 *   windSpeed: number,
 *   observedAt: string,
 *   source: string,
 *   cached: boolean
 * }>}
 */
export async function getWeatherData(latitude, longitude, options = {}) {
  // 1. Validate coordinate bounds
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error("Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.");
    error.statusCode = 400;
    throw error;
  }

  // 2. Check in-memory cache unless explicitly bypassed
  if (!options.bypassCache) {
    const cached = getCachedWeather(lat, lon);
    if (cached) {
      return cached;
    }
  }

  // 3. Fetch from active weather provider
  try {
    const normalizedData = await fetchFromProvider(lat, lon, options);

    // 4. Save to in-memory cache
    setCachedWeather(lat, lon, normalizedData);

    return {
      ...normalizedData,
      cached: false,
      sourceType: "LIVE"
    };
  } catch (providerErr) {
    return getLocationWeatherFallback();
  }
}

export default {
  getWeatherData,
  getKathmanduWeatherFallback,
  getLocationWeatherFallback,
  normalizeRainfall,
  getCachedWeather,
  setCachedWeather,
  clearWeatherCache,
  getWeatherCacheStats,
  RAINFALL_THRESHOLDS
};
