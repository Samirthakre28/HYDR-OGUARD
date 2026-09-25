/**
 * HydroGuard - Real-Time Seismic Activity Integration Service (Step 12)
 *
 * Ingests recent earthquake event telemetry from the USGS Earthquake Catalog GeoJSON API.
 * Converts nearby observed seismic events into a normalized 0-100 Seismic Activity Score.
 *
 * NOTE: The seismic activity score represents recent observed earthquake activity within
 * the configured radius and lookback window. This is an explainable engineering MVP heuristic
 * and does NOT claim to predict future earthquakes.
 */

import { config } from "../config/index.js";

/**
 * Deterministic seismic fallback used only when live and cached seismic data are unavailable.
 * Does not invent earthquake events, magnitudes, or epicenters.
 */
export const SEISMIC_FALLBACK_VALUES = {
  activityScore: 38
};

/**
 * Returns deterministic fallback seismic dataset
 */
export function getRegionalSeismicFallback() {
  return {
    activityScore: SEISMIC_FALLBACK_VALUES.activityScore,
    seismicActivity: SEISMIC_FALLBACK_VALUES.activityScore,
    eventCount: 0,
    radiusKm: 100,
    lookbackHours: 24,
    maxMagnitude: null,
    recentEvents: [],
    observedAt: new Date().toISOString(),
    source: "Regional seismic baseline",
    cached: false,
    isFallback: true,
    sourceType: "FALLBACK"
  };
}

export function getKathmanduSeismicFallback() {
  return getRegionalSeismicFallback();
}

/**
 * Returns the same deterministic seismic fallback for any location.
 * Used only after live and cached seismic data are unavailable.
 */
export function getLocationSeismicFallback() {
  return getRegionalSeismicFallback();
}

// Centralized Seismic Calculation Constants & Weights
export const SEISMIC_CONSTANTS = {
  DEFAULT_RADIUS_KM: 100,
  DEFAULT_LOOKBACK_HOURS: 24,
  MAX_DISPLAYED_EVENTS: 5,
  CLUSTER_BONUS_PER_EVENT: 4,
  MAX_CLUSTER_BONUS: 25
};

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers (Haversine Formula)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Converts observed earthquake events into a deterministic 0-100 Seismic Activity Score.
 *
 * Factors:
 * 1. Magnitude scaling: Exponential energy scaling based on Richter/Moment magnitude.
 * 2. Distance attenuation: Linear/quadratic decay as distance approaches radius boundary.
 * 3. Recency decay: Events in recent hours carry higher weight than events near lookback limit.
 * 4. Cluster bonus: Multiple tremors in the lookback window add cumulative activity points.
 *
 * @param {Array<Object>} events - Array of normalized earthquake events
 * @param {Object} [options]
 * @param {number} [options.radiusKm=100]
 * @param {number} [options.lookbackHours=24]
 * @returns {number} Integer between 0 and 100
 */
export function calculateSeismicActivity(events = [], options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return 0;
  }

  const radiusKm = options.radiusKm || SEISMIC_CONSTANTS.DEFAULT_RADIUS_KM;
  const lookbackHours = options.lookbackHours || SEISMIC_CONSTANTS.DEFAULT_LOOKBACK_HOURS;
  const now = Date.now();

  let maxSingleEventScore = 0;
  const validEventScores = [];

  for (const event of events) {
    const mag = Number(event.magnitude ?? 0);
    const dist = Number(event.distanceKm ?? radiusKm);
    const occurredAt = event.occurredAt ? new Date(event.occurredAt).getTime() : now;

    // 1. Magnitude base score
    let baseMagScore = 0;
    if (mag <= 1.5) {
      baseMagScore = 5;
    } else if (mag <= 2.5) {
      // 1.5 to 2.5 => 5 to 20
      baseMagScore = 5 + ((mag - 1.5) / 1.0) * 15;
    } else if (mag <= 4.0) {
      // 2.5 to 4.0 => 20 to 50
      baseMagScore = 20 + ((mag - 2.5) / 1.5) * 30;
    } else if (mag <= 5.5) {
      // 4.0 to 5.5 => 50 to 75
      baseMagScore = 50 + ((mag - 4.0) / 1.5) * 25;
    } else if (mag <= 7.0) {
      // 5.5 to 7.0 => 75 to 90
      baseMagScore = 75 + ((mag - 5.5) / 1.5) * 15;
    } else {
      // > 7.0 => 91 to 100
      baseMagScore = Math.min(100, 91 + (mag - 7.0) * 5);
    }

    // 2. Distance attenuation factor (1.0 at epicentral station, decays to 0.15 at radius limit)
    const normalizedDistance = Math.min(1, Math.max(0, dist / radiusKm));
    const distFactor = Math.max(0.15, 1 - normalizedDistance * 0.85);

    // 3. Recency factor (1.0 for immediate events, decays to 0.4 at 24h limit)
    const elapsedHours = Math.max(0, (now - occurredAt) / (1000 * 60 * 60));
    const normalizedElapsed = Math.min(1, elapsedHours / lookbackHours);
    const recencyFactor = Math.max(0.4, 1 - normalizedElapsed * 0.6);

    // Individual event weighted contribution
    const eventScore = baseMagScore * distFactor * recencyFactor;
    validEventScores.push(eventScore);

    if (eventScore > maxSingleEventScore) {
      maxSingleEventScore = eventScore;
    }
  }

  // 4. Cluster bonus for multiple observed seismic events
  const additionalEventsCount = Math.max(0, validEventScores.length - 1);
  const clusterBonus = Math.min(
    SEISMIC_CONSTANTS.MAX_CLUSTER_BONUS,
    additionalEventsCount * SEISMIC_CONSTANTS.CLUSTER_BONUS_PER_EVENT
  );

  const totalScore = Math.round(maxSingleEventScore + clusterBonus);
  return Math.max(0, Math.min(100, totalScore));
}

// In-Memory Coordinate-Based Seismic Cache
// Format: Map<string, { data: Object, expiresAt: number }>
const seismicCache = new Map();

function getSeismicCacheKey(lat, lon, radiusKm, lookbackHours) {
  return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)},${radiusKm},${lookbackHours}`;
}

export function getCachedSeismic(latitude, longitude, radiusKm, lookbackHours) {
  const key = getSeismicCacheKey(latitude, longitude, radiusKm, lookbackHours);
  const entry = seismicCache.get(key);

  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return { ...entry.data, cached: true };
    }
    seismicCache.delete(key);
  }
  return null;
}

export function setCachedSeismic(latitude, longitude, radiusKm, lookbackHours, data, ttlMs = config.seismicCacheTtlMs) {
  const key = getSeismicCacheKey(latitude, longitude, radiusKm, lookbackHours);
  seismicCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlMs || 300000)
  });
}

export function clearSeismicCache() {
  seismicCache.clear();
}

export function getSeismicCacheStats() {
  return {
    size: seismicCache.size,
    ttlMs: config.seismicCacheTtlMs
  };
}

/**
 * Fetches recent earthquake events from the USGS Earthquake Catalog API
 * @param {number} lat
 * @param {number} lon
 * @param {Object} [options]
 */
async function fetchUSGSSeismicData(lat, lon, options = {}) {
  const baseUrl = config.seismicApiUrl || "https://earthquake.usgs.gov/fdsnws/event/1/query";
  const radiusKm = options.radiusKm || config.seismicRadiusKm || SEISMIC_CONSTANTS.DEFAULT_RADIUS_KM;
  const lookbackHours = options.lookbackHours || config.seismicLookbackHours || SEISMIC_CONSTANTS.DEFAULT_LOOKBACK_HOURS;
  const timeoutMs = options.timeoutMs || 6000;

  const startTimeIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
  const url = `${baseUrl}?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=${radiusKm}&starttime=${encodeURIComponent(startTimeIso)}&orderby=time`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`USGS Seismic API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const geojson = await response.json();

    if (!geojson || !Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON schema from USGS Earthquake API");
    }

    const rawFeatures = geojson.features;

    // Normalize events
    const allEvents = rawFeatures.map((feat) => {
      const coords = feat.geometry?.coordinates || [0, 0, 0];
      const eventLon = coords[0];
      const eventLat = coords[1];
      const depthKm = coords[2] ?? 0;
      const distance = calculateDistanceKm(lat, lon, eventLat, eventLon);

      return {
        id: feat.id || `usgs-${feat.properties?.time || Date.now()}`,
        magnitude: Math.round(Number(feat.properties?.mag ?? 0) * 10) / 10,
        latitude: eventLat,
        longitude: eventLon,
        depthKm: Math.round(depthKm * 10) / 10,
        place: feat.properties?.place || "Near Station",
        occurredAt: feat.properties?.time ? new Date(feat.properties.time).toISOString() : new Date().toISOString(),
        distanceKm: distance
      };
    });

    // Filter to strictly ensure within radius and sort by recency
    const filteredEvents = allEvents
      .filter((e) => e.distanceKm <= radiusKm)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    // Calculate deterministic 0-100 activity score
    const activityScore = calculateSeismicActivity(filteredEvents, { radiusKm, lookbackHours });

    // Extract max magnitude
    let maxMagnitude = 0;
    for (const e of filteredEvents) {
      if (e.magnitude > maxMagnitude) {
        maxMagnitude = e.magnitude;
      }
    }

    // Limit returned list for dashboard display
    const recentEvents = filteredEvents.slice(0, SEISMIC_CONSTANTS.MAX_DISPLAYED_EVENTS);

    return {
      activityScore,
      eventCount: filteredEvents.length,
      radiusKm,
      lookbackHours,
      maxMagnitude,
      recentEvents,
      observedAt: new Date().toISOString(),
      source: "USGS Earthquake Catalog"
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Seismic provider request timed out");
    }
    throw error;
  }
}

/**
 * Primary public method to get normalized real-time seismic telemetry
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object} [options]
 * @returns {Promise<{
 *   activityScore: number,
 *   eventCount: number,
 *   radiusKm: number,
 *   lookbackHours: number,
 *   maxMagnitude: number,
 *   recentEvents: Array<Object>,
 *   observedAt: string,
 *   source: string,
 *   cached: boolean
 * }>}
 */
export async function getSeismicData(latitude, longitude, options = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const radiusKm = options.radiusKm || config.seismicRadiusKm || SEISMIC_CONSTANTS.DEFAULT_RADIUS_KM;
  const lookbackHours = options.lookbackHours || config.seismicLookbackHours || SEISMIC_CONSTANTS.DEFAULT_LOOKBACK_HOURS;

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error("Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.");
    error.statusCode = 400;
    throw error;
  }

  // 1. Check in-memory cache
  if (!options.bypassCache) {
    const cached = getCachedSeismic(lat, lon, radiusKm, lookbackHours);
    if (cached) {
      return cached;
    }
  }

  // 2. Fetch live data from USGS Earthquake Catalog
  try {
    const data = await fetchUSGSSeismicData(lat, lon, { ...options, radiusKm, lookbackHours });

    // 3. Cache telemetry
    setCachedSeismic(lat, lon, radiusKm, lookbackHours, data);

    return {
      ...data,
      cached: false,
      sourceType: "LIVE"
    };
  } catch (providerErr) {
    return getLocationSeismicFallback();
  }
}

export default {
  getSeismicData,
  getKathmanduSeismicFallback,
  getLocationSeismicFallback,
  calculateSeismicActivity,
  calculateDistanceKm,
  getCachedSeismic,
  setCachedSeismic,
  clearSeismicCache,
  getSeismicCacheStats,
  SEISMIC_CONSTANTS
};
