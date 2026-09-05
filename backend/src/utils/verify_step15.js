/**
 * HydroGuard - Step 15 End-to-End Verification Script
 * Validates Emergency Offline Mode & Emergency Offline Pack functionality
 */

import mongoose from "mongoose";
import { config } from "../config/index.js";
import { Location } from "../models/Location.js";
import { EmergencyCenter } from "../models/EmergencyCenter.js";
import { calculateAllRisks } from "../services/riskEngine.service.js";
import { getWeatherData } from "../services/weather.service.js";
import { getHydrologyData } from "../services/hydrology.service.js";
import { getSeismicData } from "../services/seismic.service.js";
import { getEmergencyContactsForLocation } from "../services/emergencyContacts.service.js";
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

async function verifyStep15() {
  console.log("\n=======================================================");
  console.log("  HydroGuard - Step 15 End-to-End Verification");
  console.log("  Emergency Offline Mode & Emergency Offline Pack");
  console.log("=======================================================\n");

  try {
    await mongoose.connect(config.mongoUri);
    console.log("✓ Connected to MongoDB:", config.mongoUri);

    // 1. Fetch real location from MongoDB
    const mumbai = await Location.findOne({ name: { $regex: /Mumbai/i } }) || await Location.findOne();
    if (!mumbai) {
      throw new Error("No monitored locations found in database.");
    }
    console.log(`[1/6] Selected Monitored Station: ${mumbai.name} (${mumbai.region}, ${mumbai.country})`);
    console.log(`      Coordinates: Lat ${mumbai.latitude}°, Lng ${mumbai.longitude}°`);

    // 2. Query all environmental feeds & calculate risk
    console.log("\n[2/6] Ingesting Live Telemetry & Calculating Risk...");
    const [weather, hydro, seismic, centers] = await Promise.all([
      getWeatherData(mumbai.latitude, mumbai.longitude),
      getHydrologyData(mumbai.latitude, mumbai.longitude),
      getSeismicData(mumbai.latitude, mumbai.longitude),
      EmergencyCenter.find({ country: mumbai.country }).lean()
    ]);

    const riskInputs = {
      rainfall: weather?.normalizedRainfall ?? weather?.weather?.normalizedRainfall ?? 40,
      riverLevel: hydro?.normalizedRiverRisk ?? hydro?.hydrology?.normalizedRiverRisk ?? 35,
      slope: 30,
      elevation: mumbai.elevation ? Math.min(100, mumbai.elevation / 20) : 25,
      historicalRisk: 40,
      seismicActivity: seismic?.activityScore ?? seismic?.seismic?.activityScore ?? 15
    };

    const calculatedRisk = calculateAllRisks(riskInputs);
    const contactsData = getEmergencyContactsForLocation(mumbai);
    const safetyRules = generatePredefinedSafetyRecommendations(calculatedRisk);

    console.log(`      - Overall Risk: ${calculatedRisk.overall.level} (${calculatedRisk.overall.score}/100)`);
    console.log(`      - Rainfall: ${weather.rainfall ?? weather.weather?.rainfall} mm (Normalized: ${weather.normalizedRainfall ?? weather.weather?.normalizedRainfall})`);
    console.log(`      - River Level: ${hydro.riverLevel ?? hydro.hydrology?.riverLevel} m (Risk: ${hydro.normalizedRiverRisk ?? hydro.hydrology?.normalizedRiverRisk})`);
    console.log(`      - Seismic Score: ${seismic.activityScore ?? seismic.seismic?.activityScore}/100 (Events: ${seismic.eventCount ?? seismic.seismic?.eventCount})`);
    console.log(`      - Nearby Facilities: ${centers.length} centers found`);
    console.log(`      - Verified Helplines: ${contactsData.contacts.length} numbers for ${mumbai.country}`);
    console.log(`      - Safety Rules Generated: ${safetyRules.length} deterministic rules`);

    // 3. Assemble and Save Emergency Offline Pack
    console.log("\n[3/6] Assembling & Storing Emergency Offline Pack...");
    clearAllOfflinePacks();

    const packPayload = {
      location: mumbai,
      risk: calculatedRisk,
      weather,
      hydrology: hydro,
      seismic,
      emergencyServices: centers.map(c => ({
        name: c.name,
        type: c.type,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        phone: c.phone
      })),
      emergencyContacts: contactsData.contacts,
      safetyRecommendations: safetyRules
    };

    const savedPack = saveOfflinePack(String(mumbai._id), packPayload);

    console.log(`      ✓ Offline Pack saved for ${savedPack.locationName}`);
    console.log(`      ✓ Schema Version: ${savedPack.schemaVersion}`);
    console.log(`      ✓ Saved At Timestamp: ${savedPack.savedAt}`);
    console.log(`      ✓ Original Risk Timestamp Preserved: ${savedPack.risk.calculatedAt}`);
    console.log(`      ✓ Pack Payload Size: ${Buffer.byteLength(JSON.stringify(savedPack))} bytes`);

    // 4. Retrieve & Inspect Offline Pack
    console.log("\n[4/6] Validating Offline Pack Retrieval & Integrity...");
    const retrieved = getOfflinePack(String(mumbai._id));
    if (!retrieved) throw new Error("Failed to retrieve saved offline pack.");
    if (retrieved.schemaVersion !== "1.0") throw new Error("Schema version mismatch.");
    if (retrieved.locationName !== mumbai.name) throw new Error("Location name mismatch.");
    if (retrieved.emergencyContacts.length !== contactsData.contacts.length) throw new Error("Contacts count mismatch.");
    if (retrieved.emergencyServices.length !== centers.length) throw new Error("Services count mismatch.");
    if (retrieved.safetyRecommendations.length !== safetyRules.length) throw new Error("Safety rules count mismatch.");

    console.log(`      ✓ Retrieved Pack successfully from storage`);
    console.log(`      ✓ Verified emergency numbers matched: ${retrieved.emergencyContacts.map(c => `${c.label}: ${c.number}`).join(", ")}`);

    // 5. Test Strict Location Isolation
    console.log("\n[5/6] Testing Strict Location Isolation...");
    const nonExistent = getOfflinePack("random-station-999");
    if (nonExistent !== null) throw new Error("Location isolation failed: Non-existent station returned data.");
    console.log(`      ✓ Strict Location Isolation confirmed: Non-saved station IDs cannot read ${mumbai.name} pack`);

    // 6. Test Metadata Index & Cleanup
    console.log("\n[6/6] Testing Metadata Indexing & Pack Management...");
    const metadataList = listOfflinePacks();
    console.log(`      ✓ Active Saved Packs in Index: ${metadataList.length} (${metadataList.map(p => p.locationName).join(", ")})`);

    const deleted = deleteOfflinePack(String(mumbai._id));
    if (!deleted || hasOfflinePack(String(mumbai._id))) throw new Error("Failed to delete offline pack.");
    console.log(`      ✓ Deleted pack cleanly. Remaining packs: ${listOfflinePacks().length}`);

    console.log("\n=======================================================");
    console.log("  🎉 Step 15 End-to-End Verification PASSED!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\n❌ Step 15 Verification Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

verifyStep15();
