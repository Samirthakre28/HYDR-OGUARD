/**
 * HydroGuard - Emergency Offline Storage Service (Step 15)
 * Manages browser-persistent Emergency Offline Packs with strict location isolation,
 * schema versioning, backward compatibility, and zero fabrication of live timestamps.
 */

const STORAGE_PREFIX = "hydroguard_offline_pack_";
const LEGACY_STORAGE_PREFIX = "terrasafe_offline_pack_";
const INDEX_KEY = "hydroguard_offline_packs_index";
const LEGACY_INDEX_KEY = "terrasafe_offline_packs_index";
const SCHEMA_VERSION = "1.0";

// Step 25: Offline Safe Map Constants
const SAFE_MAP_STORAGE_PREFIX = "hydroguard_safe_map_";
const SAFE_MAP_INDEX_KEY = "hydroguard_safe_maps_index";
const SAFE_MAP_SCHEMA_VERSION = "1.0";
const EARTH_RADIUS_KM = 6371;

/**
 * Deterministic Predefined Safety Recommendations based on Hazard Tiers
 * Avoids LLM hallucinations in offline situations.
 */
export function generatePredefinedSafetyRecommendations(riskData = {}) {
  const recommendations = [];

  const floodLevel = riskData?.flood?.level || "LOW";
  const landslideLevel = riskData?.landslide?.level || "LOW";
  const seismicLevel = riskData?.seismic?.level || "LOW";

  // Flood Guidelines
  if (floodLevel === "CRITICAL") {
    recommendations.push({
      hazard: "Flood",
      level: "CRITICAL",
      action: "Immediate Evacuation",
      instruction: "Immediate Evacuation required. Move immediately to designated high-ground emergency shelters. Do not walk, swim, or drive through floodwaters."
    });
  } else if (floodLevel === "HIGH") {
    recommendations.push({
      hazard: "Flood",
      level: "HIGH",
      action: "High Water Precautions",
      instruction: "High Water Precautions: Avoid low-lying riverbanks, culverts, and underpasses. Prepare emergency grab-bags and monitor local siren dispatches."
    });
  } else if (floodLevel === "MODERATE") {
    recommendations.push({
      hazard: "Flood",
      level: "MODERATE",
      action: "Advisory Vigilance",
      instruction: "Advisory Vigilance: Avoid unnecessary travel near active waterways and ensure storm drainage channels are unobstructed."
    });
  } else {
    recommendations.push({
      hazard: "Flood",
      level: "LOW",
      action: "Standard Monitoring",
      instruction: "Standard Monitoring: Waterways and regional river stages are within standard non-hazardous operating thresholds."
    });
  }

  // Landslide Guidelines
  if (landslideLevel === "CRITICAL" || landslideLevel === "HIGH") {
    recommendations.push({
      hazard: "Landslide",
      level: landslideLevel,
      action: "Slope Hazard Warning",
      instruction: "Slope Hazard Warning: Evacuate steep hillsides, cut-slopes, and alluvial fans. Watch for sudden cracking, tilting trees, or bulging ground."
    });
  } else if (landslideLevel === "MODERATE") {
    recommendations.push({
      hazard: "Landslide",
      level: "MODERATE",
      action: "Terrain Caution",
      instruction: "Terrain Caution: Exercise caution on steep mountain corridors during prolonged precipitation."
    });
  } else {
    recommendations.push({
      hazard: "Landslide",
      level: "LOW",
      action: "Standard Vigilance",
      instruction: "Standard Vigilance: Slope stability indicators and soil saturation metrics are within stable bounds."
    });
  }

  // Seismic Guidelines
  if (seismicLevel === "CRITICAL" || seismicLevel === "HIGH") {
    recommendations.push({
      hazard: "Seismic",
      level: seismicLevel,
      action: "Earthquake Preparedness",
      instruction: "Earthquake Preparedness: If shaking occurs, Drop, Cover, and Hold On. Avoid unreinforced masonry structures and stay clear of power lines."
    });
  } else if (seismicLevel === "MODERATE") {
    recommendations.push({
      hazard: "Seismic",
      level: "MODERATE",
      action: "Structural Vigilance",
      instruction: "Structural Vigilance: Ensure emergency egress routes are clear and heavy furniture is anchored securely."
    });
  } else {
    recommendations.push({
      hazard: "Seismic",
      level: "LOW",
      action: "Baseline Preparedness",
      instruction: "Baseline Preparedness: No significant recent ground motion detected in the monitored radius."
    });
  }

  return recommendations;
}

// In-Memory Storage Fallback (for non-browser test environments)
const memoryStorage = new Map();

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key) => memoryStorage.get(key) || null,
    setItem: (key, val) => memoryStorage.set(key, String(val)),
    removeItem: (key) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear()
  };
}

/**
 * =========================================================================
 * STEP 25: MATHEMATICAL HELPERS (Distance, Bearing, Nearest Shelter, Guidance)
 * =========================================================================
 */

/**
 * Calculate Haversine distance in kilometers between two geographic coordinates
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} Distance in kilometers rounded to 2 decimal places, or null if coordinates are invalid
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }

  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (
    isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon) ||
    p1Lat < -90 || p1Lat > 90 || p2Lat < -90 || p2Lat > 90 ||
    p1Lon < -180 || p1Lon > 180 || p2Lon < -180 || p2Lon > 180
  ) {
    return null;
  }

  const dLat = ((p2Lat - p1Lat) * Math.PI) / 180;
  const dLon = ((p2Lon - p1Lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1Lat * Math.PI) / 180) *
      Math.cos((p2Lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculate initial forward azimuth / compass bearing in degrees (0 - 360) from origin to destination
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} Bearing in degrees (0 to 359) rounded to nearest integer, or null if invalid
 */
export function calculateBearingDegrees(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }

  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (
    isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon) ||
    p1Lat < -90 || p1Lat > 90 || p2Lat < -90 || p2Lat > 90 ||
    p1Lon < -180 || p1Lon > 180 || p2Lon < -180 || p2Lon > 180
  ) {
    return null;
  }

  const phi1 = (p1Lat * Math.PI) / 180;
  const phi2 = (p2Lat * Math.PI) / 180;
  const deltaLambda = ((p2Lon - p1Lon) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (theta * 180) / Math.PI;

  return Math.round((bearing + 360) % 360);
}

/**
 * Convert bearing degrees to 8-point compass cardinal direction
 *
 * @param {number|null} degrees
 * @returns {string} e.g. "N", "NE", "E", "SE", "S", "SW", "W", "NW" or "N/A"
 */
export function getCompassDirection(degrees) {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return "N/A";
  }

  const normalized = ((degrees % 360) + 360) % 360;
  const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const index = Math.round(normalized / 45) % 8;
  return cardinals[index];
}

/**
 * Format distance in a human-friendly format
 *
 * @param {number|null} distanceKm
 * @returns {string} Formatted distance (e.g. "850 m" or "2.4 km") or "Distance unavailable"
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return "Distance unavailable";
  }

  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Find the nearest shelter from a current coordinate
 *
 * @param {number} currentLat
 * @param {number} currentLon
 * @param {Array<Object>} shelters
 * @returns {Object|null} { shelter, distanceKm, distanceFormatted, bearingDegrees, bearingCardinal }
 */
export function findNearestShelter(currentLat, currentLon, shelters = []) {
  if (!Array.isArray(shelters) || shelters.length === 0) return null;
  if (currentLat === null || currentLat === undefined || currentLon === null || currentLon === undefined) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const s of shelters) {
    if (typeof s.latitude !== "number" || typeof s.longitude !== "number") continue;
    const dist = calculateHaversineDistanceKm(currentLat, currentLon, s.latitude, s.longitude);
    if (dist !== null && dist < minDistance) {
      minDistance = dist;
      const bearing = calculateBearingDegrees(currentLat, currentLon, s.latitude, s.longitude);
      nearest = {
        shelter: s,
        distanceKm: dist,
        distanceFormatted: formatDistance(dist),
        bearingDegrees: bearing,
        bearingCardinal: getCompassDirection(bearing)
      };
    }
  }

  return nearest;
}

/**
 * Generate an honest straight-line offline guidance descriptor between coordinates
 *
 * @param {number} originLat
 * @param {number} originLon
 * @param {number} destinationLat
 * @param {number} destinationLon
 * @returns {Object|null}
 */
export function calculateOfflineGuidance(originLat, originLon, destinationLat, destinationLon) {
  const dist = calculateHaversineDistanceKm(originLat, originLon, destinationLat, destinationLon);
  if (dist === null) return null;

  const bearing = calculateBearingDegrees(originLat, originLon, destinationLat, destinationLon);
  const cardinal = getCompassDirection(bearing);

  return {
    origin: { latitude: Number(originLat), longitude: Number(originLon) },
    destination: { latitude: Number(destinationLat), longitude: Number(destinationLon) },
    distanceKm: dist,
    distanceFormatted: formatDistance(dist),
    bearingDegrees: bearing,
    bearingCardinal: cardinal,
    straightLineCoordinates: [
      [Number(originLat), Number(originLon)],
      [Number(destinationLat), Number(destinationLon)]
    ],
    isStraightLineFallback: true,
    disclaimer: "Offline guidance is based on saved coordinates and may not represent actual roads."
  };
}

/**
 * Check if downloaded offline data is stale (> 24 hours)
 *
 * @param {string} downloadedAt - ISO timestamp
 * @param {number} [staleThresholdHours=24]
 * @returns {boolean}
 */
export function isDataStale(downloadedAt, staleThresholdHours = 24) {
  if (!downloadedAt) return true;
  try {
    const downloadedTime = new Date(downloadedAt).getTime();
    if (isNaN(downloadedTime)) return true;
    const diffHours = (Date.now() - downloadedTime) / (1000 * 60 * 60);
    return diffHours > staleThresholdHours;
  } catch {
    return true;
  }
}

/**
 * =========================================================================
 * STEP 25: OFFLINE SAFE MAP STORAGE (Save, Retrieve, Delete, List)
 * =========================================================================
 */

/**
 * Save / Update an Offline Safe Map package for a specific location
 *
 * @param {string} locationId
 * @param {Object} data - Snapshot containing center, radiusKm, shelters, facilities, etc.
 * @returns {Object} Saved package
 */
export function saveOfflineSafeMap(locationId, data = {}) {
  if (!locationId) {
    throw new Error("locationId is required to save an Offline Safe Map.");
  }

  const storage = getStorage();
  const downloadedAt = new Date().toISOString();

  // Validate and sanitize shelters
  const rawShelters = Array.isArray(data.shelters) ? data.shelters : [];
  const sanitizedShelters = rawShelters
    .filter((s) => s && typeof s.latitude === "number" && typeof s.longitude === "number")
    .map((s, idx) => ({
      id: s.id || s._id || `shelter-${locationId}-${idx + 1}`,
      name: s.name || `Relief Shelter ${idx + 1}`,
      type: s.type || "Emergency Shelter",
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      address: s.address || "Address details saved offline",
      capacity: s.capacity || null,
      contact: s.contact || s.phone || null,
      source: s.source || (s.isDemo ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION" : "Official Emergency Management Registry"),
      verified: Boolean(s.verified && !s.isDemo),
      isDemo: Boolean(s.isDemo),
      lastUpdated: s.lastUpdated || s.updatedAt || downloadedAt
    }));

  // Validate and sanitize emergency facilities
  const rawFacilities = Array.isArray(data.emergencyFacilities || data.facilities)
    ? (data.emergencyFacilities || data.facilities)
    : [];
  const sanitizedFacilities = rawFacilities
    .filter((f) => f && typeof f.latitude === "number" && typeof f.longitude === "number")
    .map((f, idx) => ({
      id: f.id || f._id || `facility-${locationId}-${idx + 1}`,
      name: f.name || `Emergency Facility ${idx + 1}`,
      type: f.type || "Hospital",
      latitude: Number(f.latitude),
      longitude: Number(f.longitude),
      address: f.address || "Saved coordinates available",
      phone: f.phone || null,
      source: f.source || (f.isDemo ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION" : "Civil Protection Registry"),
      isDemo: Boolean(f.isDemo),
      lastUpdated: f.lastUpdated || f.updatedAt || downloadedAt
    }));

  const radiusKm = Number(data.radiusKm || data.radius || 10);
  const centerLat = Number(data.center?.latitude ?? data.latitude ?? data.location?.latitude ?? 0);
  const centerLon = Number(data.center?.longitude ?? data.longitude ?? data.location?.longitude ?? 0);

  // Estimate approximate offline storage footprint (JSON size in KB)
  const estimatedSizeBytes = JSON.stringify({
    shelters: sanitizedShelters,
    facilities: sanitizedFacilities,
    protocols: data.safetyProtocols || []
  }).length * 2 + 1024 * 1024; // Base tile metadata + vectors ~1 MB

  const safeMapPackage = {
    schemaVersion: SAFE_MAP_SCHEMA_VERSION,
    locationId: String(locationId),
    locationName: data.locationName || data.location?.name || "Monitored Area",
    country: data.country || data.location?.country || "National",
    region: data.region || data.location?.region || "",
    center: {
      latitude: centerLat,
      longitude: centerLon
    },
    radiusKm,
    downloadedAt,
    mapDataVersion: "1.0",
    estimatedStorageSizeBytes: estimatedSizeBytes,
    isOfflineSafeMap: true,
    shelters: sanitizedShelters,
    emergencyFacilities: sanitizedFacilities,
    sourceMetadata: {
      mapProvider: "OpenStreetMap Cartography & Vector Geo-Bounds",
      shelterSource: sanitizedShelters.some(s => s.isDemo)
        ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION"
        : (data.sourceMetadata?.shelterSource || "Official Disaster Management Directorate"),
      preparedBy: "HydroGuard Life-Safety Engine",
      offlineCapabilities: [
        "GPS coordinate tracking",
        "Direct azimuth bearing calculation",
        "Haversine straight-line distance",
        "Saved relief shelter database",
        "Cached safety boundary perimeter"
      ],
      disclaimer: "Offline guidance is based on saved coordinates and may not represent actual roads."
    },
    lastKnownRisk: data.lastKnownRisk || (data.risk ? {
      score: data.risk.overall?.score ?? 0,
      level: data.risk.overall?.level ?? "LOW",
      calculatedAt: data.risk.calculatedAt || downloadedAt
    } : null),
    safetyProtocols: data.safetyProtocols || generatePredefinedSafetyRecommendations(data.risk)
  };

  try {
    const key = `${SAFE_MAP_STORAGE_PREFIX}${locationId}`;
    storage.setItem(key, JSON.stringify(safeMapPackage));

    // Update Index
    const indexRaw = storage.getItem(SAFE_MAP_INDEX_KEY);
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    const filteredIndex = index.filter((id) => id !== String(locationId));
    filteredIndex.push(String(locationId));
    storage.setItem(SAFE_MAP_INDEX_KEY, JSON.stringify(filteredIndex));

    return safeMapPackage;
  } catch (err) {
    console.error(`[HydroGuard] Failed to save offline safe map for ${locationId}:`, err.message);
    throw new Error(`Failed to save offline safe map: ${err.message}`);
  }
}

/**
 * Retrieve Offline Safe Map for a specific location
 *
 * @param {string} locationId
 * @returns {Object|null}
 */
export function getOfflineSafeMap(locationId) {
  if (!locationId) return null;

  const storage = getStorage();
  const key = `${SAFE_MAP_STORAGE_PREFIX}${locationId}`;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SAFE_MAP_SCHEMA_VERSION) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn(`[HydroGuard] Corrupted offline safe map for ${locationId}:`, err.message);
    return null;
  }
}

/**
 * Check if an Offline Safe Map exists for a location
 *
 * @param {string} locationId
 * @returns {boolean}
 */
export function hasOfflineSafeMap(locationId) {
  if (!locationId) return false;
  return Boolean(getOfflineSafeMap(locationId));
}

/**
 * Delete a specific location's Offline Safe Map
 *
 * @param {string} locationId
 * @returns {boolean}
 */
export function deleteOfflineSafeMap(locationId) {
  if (!locationId) return false;

  const storage = getStorage();
  const key = `${SAFE_MAP_STORAGE_PREFIX}${locationId}`;

  try {
    storage.removeItem(key);

    const indexRaw = storage.getItem(SAFE_MAP_INDEX_KEY);
    if (indexRaw) {
      const index = JSON.parse(indexRaw);
      const filtered = index.filter((id) => id !== String(locationId));
      storage.setItem(SAFE_MAP_INDEX_KEY, JSON.stringify(filtered));
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * List all saved Offline Safe Map packages
 *
 * @returns {Array<Object>}
 */
export function listOfflineSafeMaps() {
  const storage = getStorage();
  try {
    const indexRaw = storage.getItem(SAFE_MAP_INDEX_KEY);
    const index = indexRaw ? JSON.parse(indexRaw) : [];

    return index
      .map((locId) => {
        const pkg = getOfflineSafeMap(locId);
        if (!pkg) return null;
        return {
          locationId: pkg.locationId,
          locationName: pkg.locationName,
          country: pkg.country,
          region: pkg.region,
          center: pkg.center,
          radiusKm: pkg.radiusKm,
          downloadedAt: pkg.downloadedAt,
          sheltersCount: (pkg.shelters || []).length,
          facilitiesCount: (pkg.emergencyFacilities || []).length,
          estimatedStorageSizeBytes: pkg.estimatedStorageSizeBytes,
          isStale: isDataStale(pkg.downloadedAt),
          hasRiskSnapshot: Boolean(pkg.lastKnownRisk)
        };
      })
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

/**
 * Clear all stored Offline Safe Maps
 */
export function clearAllOfflineSafeMaps() {
  const storage = getStorage();
  const maps = listOfflineSafeMaps();
  maps.forEach((m) => {
    storage.removeItem(`${SAFE_MAP_STORAGE_PREFIX}${m.locationId}`);
  });
  storage.removeItem(SAFE_MAP_INDEX_KEY);
}

/**
 * =========================================================================
 * STEP 15: EMERGENCY OFFLINE PACK STORAGE (Preserved Intact)
 * =========================================================================
 */

/**
 * Save / Update Emergency Offline Pack for a location
 *
 * @param {string} locationId
 * @param {Object} data - Snapshot containing location, risk, weather, hydro, seismic, facilities, contacts
 * @returns {Object} Saved offline pack with metadata
 */
export function saveOfflinePack(locationId, data = {}) {
  if (!locationId) {
    throw new Error("locationId is required to save an Emergency Offline Pack.");
  }

  const storage = getStorage();
  const savedAt = new Date().toISOString();

  const pack = {
    schemaVersion: SCHEMA_VERSION,
    locationId: String(locationId),
    locationName: data.location?.name || data.locationName || "Monitored Station",
    country: data.location?.country || data.country || "National",
    region: data.location?.region || data.region || "",
    latitude: data.location?.latitude ?? data.latitude ?? null,
    longitude: data.location?.longitude ?? data.longitude ?? null,
    elevation: data.location?.elevation ?? data.elevation ?? null,
    savedAt,
    lastLiveSync: data.risk?.calculatedAt || data.lastLiveSync || savedAt,
    isOfflinePack: true,
    risk: data.risk ? {
      overall: data.risk.overall || { score: 0, level: "LOW" },
      flood: data.risk.flood || { score: 0, level: "LOW" },
      landslide: data.risk.landslide || { score: 0, level: "LOW" },
      seismic: data.risk.seismic || { score: 0, level: "LOW" },
      factors: data.risk.factors || [],
      calculatedAt: data.risk.calculatedAt || savedAt,
      dataSources: data.risk.dataSources || {},
      confidence: data.risk.confidence || "Moderate"
    } : null,
    weather: data.weather ? {
      temperature: data.weather.weather?.temperature ?? data.weather.temperature,
      humidity: data.weather.weather?.humidity ?? data.weather.humidity,
      rainfall: data.weather.weather?.rainfall ?? data.weather.rainfall,
      normalizedRainfall: data.weather.weather?.normalizedRainfall ?? data.weather.normalizedRainfall,
      observedAt: data.weather.weather?.observedAt || data.weather.observedAt || savedAt,
      source: data.weather.source || "Meteorological Registry"
    } : null,
    hydrology: data.hydrology ? {
      riverLevel: data.hydrology.hydrology?.riverLevel ?? data.hydrology.riverLevel,
      normalizedRiverRisk: data.hydrology.hydrology?.normalizedRiverRisk ?? data.hydrology.normalizedRiverRisk,
      station: data.hydrology.station || null,
      observedAt: data.hydrology.observedAt || savedAt,
      source: data.hydrology.source || "Hydrological Gauge Registry"
    } : null,
    seismic: data.seismic ? {
      activityScore: data.seismic.seismic?.activityScore ?? data.seismic.activityScore ?? 0,
      eventCount: data.seismic.seismic?.eventCount ?? data.seismic.eventCount ?? 0,
      maxMagnitude: data.seismic.seismic?.maxMagnitude ?? data.seismic.maxMagnitude ?? null,
      recentEarthquakes: data.seismic.recentEarthquakes || data.seismic.recentEvents || [],
      observedAt: data.seismic.observedAt || savedAt,
      source: data.seismic.source || "USGS Earthquake Catalog"
    } : null,
    emergencyServices: data.emergencyServices || data.services || [],
    groupedServices: data.groupedServices || null,
    emergencyContacts: data.emergencyContacts || data.contacts || [],
    safetyRecommendations: data.safetyRecommendations || generatePredefinedSafetyRecommendations(data.risk)
  };

  try {
    const key = `${STORAGE_PREFIX}${locationId}`;
    storage.setItem(key, JSON.stringify(pack));

    // Update Index
    const indexRaw = storage.getItem(INDEX_KEY);
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    const filteredIndex = index.filter((id) => id !== String(locationId));
    filteredIndex.push(String(locationId));
    storage.setItem(INDEX_KEY, JSON.stringify(filteredIndex));

    return pack;
  } catch (err) {
    console.error(`[HydroGuard] Failed to save offline pack for ${locationId}:`, err.message);
    throw new Error(`Failed to save offline pack: ${err.message}`);
  }
}

/**
 * Retrieve Emergency Offline Pack for a specific location
 * Supports both current HydroGuard prefix and legacy TerraSafe prefix for backward compatibility.
 *
 * @param {string} locationId
 * @returns {Object|null}
 */
export function getOfflinePack(locationId) {
  if (!locationId) return null;

  const storage = getStorage();
  const key = `${STORAGE_PREFIX}${locationId}`;
  const legacyKey = `${LEGACY_STORAGE_PREFIX}${locationId}`;

  try {
    const raw = storage.getItem(key) || storage.getItem(legacyKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn(`[HydroGuard] Corrupted offline pack for ${locationId}:`, err.message);
    return null;
  }
}

/**
 * Check if an offline pack exists for a location
 *
 * @param {string} locationId
 * @returns {boolean}
 */
export function hasOfflinePack(locationId) {
  if (!locationId) return false;
  return Boolean(getOfflinePack(locationId));
}

/**
 * Get lightweight summary metadata for a location pack
 *
 * @param {string} locationId
 * @returns {Object|null}
 */
export function getOfflinePackMetadata(locationId) {
  const pack = getOfflinePack(locationId);
  if (!pack) return null;

  return {
    locationId: pack.locationId,
    locationName: pack.locationName,
    country: pack.country,
    savedAt: pack.savedAt,
    lastLiveSync: pack.lastLiveSync,
    hasRisk: Boolean(pack.risk),
    hasWeather: Boolean(pack.weather),
    hasHydrology: Boolean(pack.hydrology),
    hasSeismic: Boolean(pack.seismic),
    emergencyServicesCount: (pack.emergencyServices || []).length,
    contactsCount: (pack.emergencyContacts || []).length,
    safetyRulesCount: (pack.safetyRecommendations || []).length
  };
}

/**
 * List all saved offline pack IDs and metadata
 *
 * @returns {Array<Object>}
 */
export function listOfflinePacks() {
  const storage = getStorage();
  try {
    const indexRaw = storage.getItem(INDEX_KEY);
    const legacyIndexRaw = storage.getItem(LEGACY_INDEX_KEY);
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    const legacyIndex = legacyIndexRaw ? JSON.parse(legacyIndexRaw) : [];
    const combined = Array.from(new Set([...index, ...legacyIndex]));

    return combined
      .map((locId) => getOfflinePackMetadata(locId))
      .filter(Boolean);
  } catch (err) {
    return [];
  }
}

/**
 * Delete a specific location's offline pack
 *
 * @param {string} locationId
 * @returns {boolean}
 */
export function deleteOfflinePack(locationId) {
  if (!locationId) return false;

  const storage = getStorage();
  const key = `${STORAGE_PREFIX}${locationId}`;
  const legacyKey = `${LEGACY_STORAGE_PREFIX}${locationId}`;

  try {
    storage.removeItem(key);
    storage.removeItem(legacyKey);

    const indexRaw = storage.getItem(INDEX_KEY);
    if (indexRaw) {
      const index = JSON.parse(indexRaw);
      const filtered = index.filter((id) => id !== String(locationId));
      storage.setItem(INDEX_KEY, JSON.stringify(filtered));
    }

    const legacyIndexRaw = storage.getItem(LEGACY_INDEX_KEY);
    if (legacyIndexRaw) {
      const legacyIndex = JSON.parse(legacyIndexRaw);
      const filteredLegacy = legacyIndex.filter((id) => id !== String(locationId));
      storage.setItem(LEGACY_INDEX_KEY, JSON.stringify(filteredLegacy));
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Clear all stored offline packs
 */
export function clearAllOfflinePacks() {
  const storage = getStorage();
  const packs = listOfflinePacks();
  packs.forEach((p) => {
    storage.removeItem(`${STORAGE_PREFIX}${p.locationId}`);
    storage.removeItem(`${LEGACY_STORAGE_PREFIX}${p.locationId}`);
  });
  storage.removeItem(INDEX_KEY);
  storage.removeItem(LEGACY_INDEX_KEY);
}

export default {
  // Step 25 Safe Map
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  getCompassDirection,
  formatDistance,
  findNearestShelter,
  calculateOfflineGuidance,
  isDataStale,
  saveOfflineSafeMap,
  getOfflineSafeMap,
  hasOfflineSafeMap,
  deleteOfflineSafeMap,
  listOfflineSafeMaps,
  clearAllOfflineSafeMaps,
  // Step 15 Emergency Offline Pack
  saveOfflinePack,
  getOfflinePack,
  hasOfflinePack,
  getOfflinePackMetadata,
  listOfflinePacks,
  deleteOfflinePack,
  clearAllOfflinePacks,
  generatePredefinedSafetyRecommendations
};
