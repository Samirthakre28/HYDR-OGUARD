/**
 * Unit Test Suite for HydroGuard Emergency Offline Pack & Storage (Step 15)
 */

import {
  saveOfflinePack,
  getOfflinePack,
  hasOfflinePack,
  getOfflinePackMetadata,
  listOfflinePacks,
  deleteOfflinePack,
  clearAllOfflinePacks,
  generatePredefinedSafetyRecommendations
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
console.log("  HydroGuard - Emergency Offline Pack Tests (Step 15)");
console.log("=======================================================\n");

// Clear any state before testing
clearAllOfflinePacks();

// Test 1: Predefined Safety Recommendations for Multi-Hazard Tiers
const sampleRisk = {
  flood: { level: "CRITICAL", score: 88 },
  landslide: { level: "HIGH", score: 72 },
  seismic: { level: "LOW", score: 15 }
};
const safetyRules = generatePredefinedSafetyRecommendations(sampleRisk);
assert(
  safetyRules.length === 3 &&
  safetyRules.some(r => r.hazard === "Flood" && r.level === "CRITICAL" && r.instruction.includes("Immediate Evacuation")) &&
  safetyRules.some(r => r.hazard === "Landslide" && r.level === "HIGH") &&
  safetyRules.some(r => r.hazard === "Seismic" && r.level === "LOW"),
  "Deterministic safety recommendations generated correctly for multi-hazard tiers"
);

// Test 2: Save Emergency Offline Pack for Mumbai
const mumbaiData = {
  location: { name: "Mumbai", country: "India", region: "Maharashtra", latitude: 19.0760, longitude: 72.8777 },
  risk: {
    overall: { score: 62, level: "HIGH" },
    flood: { score: 75, level: "HIGH" },
    landslide: { score: 30, level: "LOW" },
    seismic: { score: 20, level: "LOW" },
    calculatedAt: "2026-09-04T12:30:00.000Z"
  },
  weather: { weather: { temperature: 29, rainfall: 45.2 }, source: "Open-Meteo" },
  hydrology: { hydrology: { riverLevel: 4.8 }, source: "GloFAS" },
  seismic: { seismic: { activityScore: 18 }, source: "USGS" },
  emergencyServices: [
    { name: "KEM Memorial Hospital", type: "Hospital", latitude: 19.08, longitude: 72.88, phone: "+91 12345" }
  ],
  emergencyContacts: [
    { type: "ambulance", number: "108", label: "Ambulance" },
    { type: "police", number: "112", label: "Police" }
  ]
};

const savedPack = saveOfflinePack("mumbai-loc-1", mumbaiData);
assert(
  savedPack.schemaVersion === "1.0" &&
  savedPack.locationName === "Mumbai" &&
  savedPack.isOfflinePack === true &&
  savedPack.risk.overall.score === 62,
  "Emergency Offline Pack saved with schema version 1.0 and full telemetry"
);

// Test 3: Timestamp Preservation (Original calculatedAt preserved, not altered)
assert(
  savedPack.risk.calculatedAt === "2026-09-04T12:30:00.000Z",
  "Original risk calculation timestamp is preserved without fabricating new dates"
);

// Test 4: Retrieve Saved Pack for Location
const retrievedPack = getOfflinePack("mumbai-loc-1");
assert(
  retrievedPack !== null &&
  retrievedPack.locationId === "mumbai-loc-1" &&
  retrievedPack.emergencyContacts.length === 2 &&
  retrievedPack.emergencyServices.length === 1,
  "Offline pack retrieved successfully with all nested components"
);

// Test 5: Strict Location Isolation (Tokyo cannot retrieve Mumbai pack)
const tokyoPack = getOfflinePack("tokyo-loc-2");
assert(
  tokyoPack === null && hasOfflinePack("tokyo-loc-2") === false,
  "Strict location isolation: Tokyo cannot access Mumbai offline pack"
);

// Test 6: Save Second Pack for Tokyo and List Metadata
const tokyoData = {
  location: { name: "Tokyo", country: "Japan", region: "Kanto", latitude: 35.6762, longitude: 139.6503 },
  risk: { overall: { score: 45, level: "MODERATE" }, calculatedAt: "2026-09-04T12:45:00.000Z" }
};
saveOfflinePack("tokyo-loc-2", tokyoData);

const allPacks = listOfflinePacks();
assert(
  allPacks.length === 2 &&
  allPacks.some(p => p.locationId === "mumbai-loc-1") &&
  allPacks.some(p => p.locationId === "tokyo-loc-2"),
  "Multiple offline packs tracked in index list"
);

// Test 7: Delete Pack
const deleteSuccess = deleteOfflinePack("tokyo-loc-2");
assert(
  deleteSuccess === true &&
  hasOfflinePack("tokyo-loc-2") === false &&
  hasOfflinePack("mumbai-loc-1") === true,
  "Single pack deleted cleanly without affecting other location packs"
);

// Test 8: Missing locationId throws controlled error
let errorThrown = false;
try {
  saveOfflinePack(null, {});
} catch (e) {
  errorThrown = true;
}
assert(errorThrown === true, "Missing locationId safely rejects save operation");

// Clean up
clearAllOfflinePacks();
assert(listOfflinePacks().length === 0, "clearAllOfflinePacks clears all packs and index");

console.log(`\nResults: ${passedCount}/${passedCount + failedCount} offline pack tests passed.\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
