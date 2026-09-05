/**
 * Unit Test Suite for HydroGuard Emergency Service (Step 13)
 */

import {
  calculateHaversineDistanceKm,
  formatDistance,
  processEmergencyFacilities
} from "./emergency.service.js";

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
console.log("  HydroGuard - Emergency Help & Proximity Tests (Step 13)");
console.log("=======================================================\n");

// Test 1: Haversine distance calculation between two points
const d1 = calculateHaversineDistanceKm(19.0760, 72.8777, 19.0800, 72.8800);
assert(typeof d1 === "number" && d1 > 0 && d1 < 1.0, `Haversine distance between close points is ${d1} km`);

// Test 2: Haversine invalid coordinates return null
const dInvalid = calculateHaversineDistanceKm(100, 200, 19.0, 72.0);
assert(dInvalid === null, "Invalid coordinates return null");

// Test 3: Distance formatting under 1km maps to meters
const formatMeters = formatDistance(0.85);
assert(formatMeters === "850 m", `0.85 km formats to "850 m" (actual: "${formatMeters}")`);

// Test 4: Distance formatting >= 1km maps to km with 1 decimal
const formatKm = formatDistance(4.73);
assert(formatKm === "4.7 km", `4.73 km formats to "4.7 km" (actual: "${formatKm}")`);

// Test 5: Distance formatting for null or undefined
const formatNull = formatDistance(null);
assert(formatNull === "Distance unavailable", `Null distance formats to "Distance unavailable" (actual: "${formatNull}")`);

// Test 6: Categorization and distance sorting of multiple facilities
const mockFacilities = [
  {
    name: "Far Hospital",
    type: "Hospital",
    latitude: 19.1200,
    longitude: 72.8900,
    phone: "+91 99999",
    availability: "Available"
  },
  {
    name: "Close Hospital",
    type: "Hospital",
    latitude: 19.0780,
    longitude: 72.8790,
    phone: "+91 88888",
    availability: "Busy"
  },
  {
    name: "Central Police Station",
    type: "Police",
    latitude: 19.0770,
    longitude: 72.8780,
    phone: "+91 77777"
  },
  {
    name: "Main Fire Depot",
    type: "Fire Station",
    latitude: 19.0790,
    longitude: 72.8810,
    phone: "+91 66666"
  },
  {
    name: "Community Relief Shelter",
    type: "Shelter",
    latitude: 19.0820,
    longitude: 72.8830,
    phone: null
  }
];

const result = processEmergencyFacilities(mockFacilities, 19.0760, 72.8777);

// Test 7: Grouped categories structure
assert(
  result.groupedServices.hospitals.length === 2 &&
  result.groupedServices.police.length === 1 &&
  result.groupedServices.fireRescue.length === 1 &&
  result.groupedServices.shelters.length === 1,
  "Facilities are correctly partitioned into 4 categories"
);

// Test 8: Hospitals sorted by distance ascending (Close Hospital first)
assert(
  result.groupedServices.hospitals[0].name === "Close Hospital" &&
  result.groupedServices.hospitals[1].name === "Far Hospital",
  "Hospitals are sorted by distance ascending"
);

// Test 9: Handling facilities with missing coordinates
const facilitiesWithoutCoords = [
  { name: "Unmapped Clinic", type: "Hospital", address: "Unknown Rd" }
];
const noCoordResult = processEmergencyFacilities(facilitiesWithoutCoords, 19.0760, 72.8777);
assert(
  noCoordResult.groupedServices.hospitals[0].distanceKm === null &&
  noCoordResult.groupedServices.hospitals[0].distanceFormatted === "Distance unavailable",
  "Facilities without coordinates handle distance gracefully"
);

// Test 10: Demo provenance tag is preserved
assert(
  result.groupedServices.hospitals[0].isDemo === true &&
  result.groupedServices.hospitals[0].source.includes("Demo Data"),
  "Demo provenance tag and source label are correctly assigned"
);

console.log(`\nResults: ${passedCount}/${passedCount + failedCount} emergency tests passed.\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
