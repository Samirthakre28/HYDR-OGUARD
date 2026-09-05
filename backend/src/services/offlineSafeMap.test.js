/**
 * Unit Test Suite for HydroGuard Offline Safe Map & Pre-Downloaded Shelter System (Step 25)
 */

import {
  saveOfflineSafeMap,
  getOfflineSafeMap,
  hasOfflineSafeMap,
  deleteOfflineSafeMap,
  listOfflineSafeMaps,
  clearAllOfflineSafeMaps,
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  getCompassDirection,
  formatDistance,
  findNearestShelter,
  calculateOfflineGuidance,
  isDataStale
} from "../../../frontend/src/services/offlineStorage.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ Test ${passedCount + failedCount + 1}: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ Test ${passedCount + failedCount + 1} FAILED: ${message}`);
    failedCount++;
  }
}

console.log("\n=======================================================");
console.log("  HydroGuard - Offline Safe Map Tests (Step 25)");
console.log("=======================================================\n");

// Clear any state before running tests
clearAllOfflineSafeMaps();

// --- 1. MATHEMATICAL & GEOGRAPHIC UTILITIES ---

// Test 1: Haversine Distance Calculation (Mumbai Gateway of India to KEM Hospital ~9.8 km)
const mumbaiGateway = { lat: 18.9220, lon: 72.8347 };
const mumbaiKEM = { lat: 19.0028, lon: 72.8427 };
const calcDist = calculateHaversineDistanceKm(mumbaiGateway.lat, mumbaiGateway.lon, mumbaiKEM.lat, mumbaiKEM.lon);
assert(
  typeof calcDist === "number" && calcDist > 8.5 && calcDist < 10.5,
  `Haversine distance calculation is geographically accurate (~${calcDist} km)`
);

// Test 2: Invalid coordinates rejected safely by distance calculator
const invalidDist1 = calculateHaversineDistanceKm(null, 72.8, 19.0, 72.8);
const invalidDist2 = calculateHaversineDistanceKm(19.0, 200, 19.0, 72.8); // Longitude > 180
assert(
  invalidDist1 === null && invalidDist2 === null,
  "Invalid coordinates (null, out of bounds) safely return null without throwing"
);

// Test 3: Forward Azimuth Bearing Calculation (North: ~0°, East: ~90°, South: ~180°, West: ~270°)
const bearingNorth = calculateBearingDegrees(0, 0, 10, 0); // Due North
const bearingEast = calculateBearingDegrees(0, 0, 0, 10);  // Due East
const bearingSouth = calculateBearingDegrees(10, 0, 0, 0); // Due South
const bearingWest = calculateBearingDegrees(0, 10, 0, 0);  // Due West
assert(
  bearingNorth === 0 && bearingEast === 90 && bearingSouth === 180 && bearingWest === 270,
  `Forward azimuth bearing degrees calculated correctly (N:${bearingNorth}°, E:${bearingEast}°, S:${bearingSouth}°, W:${bearingWest}°)`
);

// Test 4: Compass Cardinal Direction Mapping
const dirN = getCompassDirection(0);
const dirNE = getCompassDirection(45);
const dirE = getCompassDirection(90);
const dirSE = getCompassDirection(135);
const dirS = getCompassDirection(180);
const dirSW = getCompassDirection(225);
const dirW = getCompassDirection(270);
const dirNW = getCompassDirection(315);
assert(
  dirN === "N" && dirNE === "NE" && dirE === "E" && dirSE === "SE" &&
  dirS === "S" && dirSW === "SW" && dirW === "W" && dirNW === "NW",
  "8-point compass cardinal directions mapped accurately from degrees"
);

// Test 5: Distance Formatting (<1km in meters, >=1km in km)
const fmtMeters = formatDistance(0.45);
const fmtKm = formatDistance(12.34);
assert(
  fmtMeters === "450 m" && fmtKm === "12.3 km" && formatDistance(null) === "Distance unavailable",
  "Distance formatting renders human-friendly meters and kilometers"
);

// --- 2. NEAREST SHELTER & OFFLINE GUIDANCE ---

const sampleShelters = [
  {
    id: "shelter-north",
    name: "North High-Ground Relief Center",
    type: "High-Ground Relief",
    latitude: 19.1000,
    longitude: 72.8500,
    capacity: "500 persons",
    source: "Municipal Disaster Authority",
    verified: true,
    isDemo: false
  },
  {
    id: "shelter-south",
    name: "South Coastal Evacuation Ground",
    type: "Emergency Shelter",
    latitude: 18.9500,
    longitude: 72.8200,
    capacity: "1200 persons",
    source: "Civil Defense Corps",
    verified: true,
    isDemo: false
  }
];

// Test 6: Nearest Shelter Search
const userCoord = { lat: 19.0900, lon: 72.8480 }; // Close to shelter-north
const nearest = findNearestShelter(userCoord.lat, userCoord.lon, sampleShelters);
assert(
  nearest !== null &&
  nearest.shelter.id === "shelter-north" &&
  nearest.distanceKm < 2.0 &&
  typeof nearest.bearingCardinal === "string" &&
  nearest.bearingCardinal.length <= 2,
  `findNearestShelter accurately identifies closest shelter (${nearest?.distanceKm} km ${nearest?.bearingCardinal} ${nearest?.bearingDegrees}°)`
);

// Test 7: Offline Straight-Line Guidance with Disclaimer
const guidance = calculateOfflineGuidance(userCoord.lat, userCoord.lon, sampleShelters[0].latitude, sampleShelters[0].longitude);
assert(
  guidance !== null &&
  guidance.isStraightLineFallback === true &&
  guidance.straightLineCoordinates.length === 2 &&
  guidance.disclaimer.includes("Offline guidance is based on saved coordinates") &&
  !guidance.disclaimer.includes("road route"),
  "calculateOfflineGuidance creates honest straight-line vectors with explicit safety disclaimer"
);

// --- 3. OFFLINE SAFE MAP STORAGE & PROVENANCE ---

// Test 8: Save Offline Safe Map for Nashik
const nashikData = {
  locationName: "Nashik",
  country: "India",
  region: "Maharashtra",
  center: { latitude: 19.9975, longitude: 73.7898 },
  radiusKm: 10,
  shelters: [
    {
      id: "nashik-sh-1",
      name: "Nashik Central Relief Ground",
      type: "Emergency Shelter",
      latitude: 20.0050,
      longitude: 73.7950,
      address: "MG Road, Nashik",
      capacity: "800 persons",
      source: "Maharashtra SDMA",
      verified: true,
      isDemo: false
    }
  ],
  emergencyFacilities: [
    {
      id: "nashik-hosp-1",
      name: "Nashik Civil Hospital",
      type: "Hospital",
      latitude: 19.9920,
      longitude: 73.7850,
      address: "Trimbak Road, Nashik",
      source: "State Health Dept",
      isDemo: false
    }
  ],
  risk: { overall: { score: 48, level: "MODERATE" }, calculatedAt: "2026-09-04T10:00:00.000Z" }
};

const savedNashik = saveOfflineSafeMap("nashik-loc-1", nashikData);
assert(
  savedNashik.schemaVersion === "1.0" &&
  savedNashik.locationId === "nashik-loc-1" &&
  savedNashik.isOfflineSafeMap === true &&
  savedNashik.radiusKm === 10 &&
  savedNashik.shelters.length === 1 &&
  savedNashik.emergencyFacilities.length === 1,
  "Offline Safe Map package saved with version 1.0, sanitized shelters, and facilities"
);

// Test 9: Retrieve Saved Safe Map
const retrievedNashik = getOfflineSafeMap("nashik-loc-1");
assert(
  retrievedNashik !== null &&
  retrievedNashik.locationName === "Nashik" &&
  retrievedNashik.shelters[0].name === "Nashik Central Relief Ground" &&
  hasOfflineSafeMap("nashik-loc-1") === true,
  "getOfflineSafeMap retrieves saved package with exact shelter records"
);

// Test 10: Location Isolation (Pune cannot access Nashik safe map)
assert(
  getOfflineSafeMap("pune-loc-2") === null && hasOfflineSafeMap("pune-loc-2") === false,
  "Strict location isolation: Pune cannot access Nashik offline safe map"
);

// Test 11: Demo Shelter Marking
const demoShelterData = {
  locationName: "Demo Area",
  center: { latitude: 28.6139, longitude: 77.2090 },
  radiusKm: 5,
  shelters: [
    {
      name: "Synthetic Shelter Test",
      latitude: 28.6200,
      longitude: 77.2100,
      isDemo: true
    }
  ]
};
const savedDemo = saveOfflineSafeMap("demo-loc-3", demoShelterData);
assert(
  savedDemo.shelters[0].source.includes("DEMO DATA") &&
  savedDemo.shelters[0].verified === false &&
  savedDemo.shelters[0].isDemo === true,
  "Demo shelters are strictly labeled 'DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION'"
);

// Test 12: List Downloaded Safe Map Packages
const allMaps = listOfflineSafeMaps();
assert(
  allMaps.length === 2 &&
  allMaps.some(m => m.locationId === "nashik-loc-1") &&
  allMaps.some(m => m.locationId === "demo-loc-3"),
  "listOfflineSafeMaps returns metadata summary of all downloaded areas"
);

// Test 13: Stale Data Warning Checker
const freshTimestamp = new Date().toISOString();
const oldTimestamp = new Date(Date.now() - 30 * 3600 * 1000).toISOString(); // 30 hours ago
assert(
  isDataStale(freshTimestamp, 24) === false && isDataStale(oldTimestamp, 24) === true,
  "isDataStale correctly flags data older than 24 hours as stale"
);

// Test 14: Delete Offline Safe Map
const deleted = deleteOfflineSafeMap("demo-loc-3");
assert(
  deleted === true &&
  hasOfflineSafeMap("demo-loc-3") === false &&
  hasOfflineSafeMap("nashik-loc-1") === true,
  "deleteOfflineSafeMap removes targeted package while preserving others"
);

// Test 15: Missing locationId safety
let errThrown = false;
try {
  saveOfflineSafeMap(null, {});
} catch {
  errThrown = true;
}
assert(errThrown === true, "saveOfflineSafeMap safely rejects null locationId");

// Clean up
clearAllOfflineSafeMaps();
assert(listOfflineSafeMaps().length === 0, "clearAllOfflineSafeMaps clears all packages");

console.log(`\nResults: ${passedCount}/${passedCount + failedCount} offline safe map tests passed.\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
