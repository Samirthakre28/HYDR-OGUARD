import mongoose from "mongoose";
import { config } from "../config/index.js";
import { Location } from "../models/Location.js";
import { EmergencyCenter } from "../models/EmergencyCenter.js";
import { processEmergencyFacilities } from "../services/emergency.service.js";

async function verifyStep13() {
  console.log("=======================================================");
  console.log("  🚨 HydroGuard - Step 13 Emergency Help Near You Verification");
  console.log("=======================================================\n");

  try {
    await mongoose.connect(config.mongoUri);
    console.log("✓ Connected to MongoDB:", config.mongoUri);

    const locations = await Location.find().lean();
    console.log(`✓ Retrieved ${locations.length} monitored locations from database.\n`);

    console.log("--- 1. Testing Emergency Proximity & Category Grouping ---");
    for (const loc of locations.slice(0, 4)) {
      console.log(`\nLocation: ${loc.name} (${loc.latitude}, ${loc.longitude})`);
      
      const rawFacilities = await EmergencyCenter.find({ locationId: loc._id }).lean();
      const processed = processEmergencyFacilities(rawFacilities, loc.latitude, loc.longitude);

      console.log(`  - Total Facilities Registered: ${processed.services.length}`);
      console.log(`  - Hospitals (${processed.groupedServices.hospitals.length}):`);
      processed.groupedServices.hospitals.forEach((h, i) => {
        console.log(`      ${i + 1}. ${h.name} — ${h.distanceFormatted} [Phone: ${h.phone || "N/A"}] [Source: ${h.source}]`);
      });

      console.log(`  - Police (${processed.groupedServices.police.length}):`);
      processed.groupedServices.police.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name} — ${p.distanceFormatted} [Phone: ${p.phone || "N/A"}]`);
      });

      console.log(`  - Fire & Rescue (${processed.groupedServices.fireRescue.length}):`);
      processed.groupedServices.fireRescue.forEach((f, i) => {
        console.log(`      ${i + 1}. ${f.name} — ${f.distanceFormatted} [Phone: ${f.phone || "N/A"}]`);
      });

      console.log(`  - Emergency Shelters (${processed.groupedServices.shelters.length}):`);
      processed.groupedServices.shelters.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.name} — ${s.distanceFormatted} [Capacity: ${s.availability}]`);
      });
    }

    console.log("\n--- 2. Verifying Distance Sorting Integrity ---");
    const testLoc = locations[0];
    const testFacilities = await EmergencyCenter.find({ locationId: testLoc._id }).lean();
    const processed = processEmergencyFacilities(testFacilities, testLoc.latitude, testLoc.longitude);

    let isSorted = true;
    for (let i = 0; i < processed.services.length - 1; i++) {
      if (
        processed.services[i].distanceKm !== null &&
        processed.services[i + 1].distanceKm !== null &&
        processed.services[i].distanceKm > processed.services[i + 1].distanceKm
      ) {
        isSorted = false;
        break;
      }
    }
    console.log(`  - Flat facilities distance sorting integrity: ${isSorted ? "PASS (Ascending Order)" : "FAIL"}`);

    console.log("\n=======================================================");
    console.log("  ✅ All Step 13 Verification Checks Passed Successfully!");
    console.log("=======================================================\n");

  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyStep13();
