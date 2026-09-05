/**
 * HydroGuard - Emergency Service Engine (Step 13)
 * Handles distance calculation, formatting, proximity sorting, and categorization for emergency facilities.
 */

const EARTH_RADIUS_KM = 6371;

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
 * Format distance in a human-friendly format
 *
 * @param {number|null} distanceKm
 * @returns {string} Formatted distance (e.g. "850 m" or "1.2 km") or "Distance unavailable"
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
 * Process, enrich, calculate distance, sort, and categorize emergency facilities
 *
 * @param {Array<Object>} facilities - Array of emergency facility documents
 * @param {number} locationLat - Selected location latitude
 * @param {number} locationLon - Selected location longitude
 * @returns {{
 *   services: Array<Object>,
 *   groupedServices: {
 *     hospitals: Array<Object>,
 *     police: Array<Object>,
 *     fireRescue: Array<Object>,
 *     shelters: Array<Object>
 *   }
 * }}
 */
export function processEmergencyFacilities(facilities = [], locationLat, locationLon) {
  if (!Array.isArray(facilities)) {
    return {
      services: [],
      groupedServices: {
        hospitals: [],
        police: [],
        fireRescue: [],
        shelters: []
      }
    };
  }

  const enriched = facilities.map((fac) => {
    const rawFac = fac.toObject ? fac.toObject() : { ...fac };
    const hasCoords = fac.latitude !== undefined && fac.latitude !== null && fac.longitude !== undefined && fac.longitude !== null;
    
    let distanceKm = null;
    if (hasCoords && locationLat !== undefined && locationLon !== undefined) {
      distanceKm = calculateHaversineDistanceKm(locationLat, locationLon, fac.latitude, fac.longitude);
    }

    const isDemo = rawFac.isDemo !== false;

    return {
      id: rawFac._id || rawFac.id,
      _id: rawFac._id || rawFac.id,
      name: rawFac.name || "Emergency Facility",
      type: rawFac.type || "Other",
      address: rawFac.address || "Address unavailable",
      phone: rawFac.phone || null,
      availability: rawFac.availability || "Operational / Available",
      latitude: hasCoords ? Number(rawFac.latitude) : null,
      longitude: hasCoords ? Number(rawFac.longitude) : null,
      distanceKm,
      distanceFormatted: formatDistance(distanceKm),
      isDemo,
      source: rawFac.source || (isDemo ? "Demo Data (Simulation)" : "Official Emergency Registry"),
      updatedAt: rawFac.updatedAt || new Date().toISOString()
    };
  });

  // Sort helper: prioritize items with known distance (ascending), then fallback to name
  const sortByDistance = (a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;
    return a.name.localeCompare(b.name);
  };

  const hospitals = enriched.filter((s) => s.type === "Hospital").sort(sortByDistance);
  const police = enriched.filter((s) => s.type === "Police").sort(sortByDistance);
  const fireRescue = enriched.filter((s) => s.type === "Fire Station" || s.type === "Fire & Rescue").sort(sortByDistance);
  const shelters = enriched.filter((s) => s.type === "Shelter").sort(sortByDistance);

  // Flat list sorted by distance
  const allServicesSorted = [...enriched].sort(sortByDistance);

  return {
    services: allServicesSorted,
    groupedServices: {
      hospitals,
      police,
      fireRescue,
      shelters
    }
  };
}

export default {
  calculateHaversineDistanceKm,
  formatDistance,
  processEmergencyFacilities
};
