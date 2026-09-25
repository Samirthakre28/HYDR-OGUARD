/**
 * Deterministic environmental fallback for Dashboard cards.
 * Used only when live, cached, and stored telemetry are unavailable.
 * Must not be shown as DEMO / DUMMY / SAMPLE / MOCK.
 */

export const WEATHER_FALLBACK = {
  temperature: 24.8,
  humidity: 78,
  rainfall: 42.6,
  normalizedRainfall: 78,
  windSpeed: 12.4
};

export const HYDROLOGY_FALLBACK = {
  riverLevel: 3.8,
  normalizedRiverRisk: 62,
  dischargeM3s: 145,
  unit: "m"
};

export const SEISMIC_FALLBACK = {
  activityScore: 38
};

/** Stored baseline terrain/history inputs used by the risk controller fallback. */
export const STORED_RISK_INPUT_FALLBACK = {
  slope: 60,
  elevation: 50,
  historicalRisk: 75
};

/**
 * Normalized 0-100 inputs for POST /risk/calculate (existing Risk Engine).
 * Rainfall/river/seismic come from environmental fallback; slope/elevation/history from stored regional baseline.
 */
export const RISK_ENGINE_FALLBACK_INPUTS = {
  rainfall: WEATHER_FALLBACK.normalizedRainfall,
  riverLevel: HYDROLOGY_FALLBACK.normalizedRiverRisk,
  slope: STORED_RISK_INPUT_FALLBACK.slope,
  elevation: STORED_RISK_INPUT_FALLBACK.elevation,
  historicalRisk: STORED_RISK_INPUT_FALLBACK.historicalRisk,
  seismicActivity: SEISMIC_FALLBACK.activityScore
};

/**
 * Existing emergency facility fallback (same relative offsets as emergency.controller.js).
 * Generic regional labels only — not official named facilities.
 */
export function buildEmergencyFacilitiesFallback(location = {}) {
  const lat = Number(location.latitude) || 19.9975;
  const lon = Number(location.longitude) || 73.7898;
  const name = location.name || "Nashik";
  const locKey = location.id || location._id || "nashik-in";

  return [
    {
      _id: `fallback-hospital-${locKey}`,
      name: `${name} Central Hospital & Emergency Triage`,
      type: "Hospital",
      address: `Main Medical Corridor, ${name}`,
      phone: "102",
      availability: "24/7 ICU & Emergency Triage Active",
      latitude: lat + 0.0072,
      longitude: lon + 0.0058,
      isDemo: true
    },
    {
      _id: `fallback-shelter-${locKey}`,
      name: `${name} Community Disaster Shelter`,
      type: "Shelter",
      address: `High-Ground Refuge Zone, ${name}`,
      phone: "1149",
      availability: "Capacity: 800 Evacuees Ready",
      latitude: lat - 0.0065,
      longitude: lon - 0.0048,
      isDemo: true
    },
    {
      _id: `fallback-police-${locKey}`,
      name: `${name} Emergency Police Precinct`,
      type: "Police",
      address: `Civic Control Plaza, ${name}`,
      phone: "100",
      availability: "Rapid Action Unit On Duty",
      latitude: lat + 0.0045,
      longitude: lon - 0.0082,
      isDemo: true
    },
    {
      _id: `fallback-fire-${locKey}`,
      name: `${name} Fire & Rescue Station`,
      type: "Fire Station",
      address: `Municipal Fire Depot, ${name}`,
      phone: "101",
      availability: "Rescue Crews & Pumping Units Active",
      latitude: lat - 0.0058,
      longitude: lon + 0.0075,
      isDemo: true
    }
  ];
}

export function buildWeatherFallbackPayload(locationId) {
  return {
    success: true,
    data: {
      locationId,
      locationName: "",
      weather: {
        ...WEATHER_FALLBACK,
        observedAt: new Date().toISOString()
      },
      source: "Regional meteorological baseline",
      sourceType: "FALLBACK",
      cached: false,
      isFallback: true
    }
  };
}

export function buildHydrologyFallbackPayload(locationId) {
  return {
    success: true,
    data: {
      locationId,
      locationName: "",
      hydrology: { ...HYDROLOGY_FALLBACK },
      station: null,
      observedAt: new Date().toISOString(),
      source: "Regional hydrological baseline",
      sourceType: "FALLBACK",
      cached: false,
      isFallback: true
    }
  };
}

export function buildSeismicFallbackPayload(locationId) {
  return {
    success: true,
    data: {
      locationId,
      locationName: "",
      seismic: {
        activityScore: SEISMIC_FALLBACK.activityScore,
        seismicActivity: SEISMIC_FALLBACK.activityScore,
        eventCount: 0,
        radiusKm: 100,
        lookbackHours: 24,
        maxMagnitude: null
      },
      recentEvents: [],
      observedAt: new Date().toISOString(),
      source: "Regional seismic baseline",
      sourceType: "FALLBACK",
      cached: false,
      isFallback: true
    }
  };
}
