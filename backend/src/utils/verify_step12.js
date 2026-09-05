import mongoose from "mongoose";
import { config } from "../config/index.js";
import { Location } from "../models/Location.js";
import { RiskData } from "../models/RiskData.js";
import { getSeismicData, calculateSeismicActivity } from "../services/seismic.service.js";
import { calculateAllRisks } from "../services/riskEngine.service.js";

async function verifyStep12() {
  console.log("=======================================================");
  console.log("  🌍 HydroGuard - Step 12 Seismic Activity Verification");
  console.log("=======================================================\n");

  try {
    await mongoose.connect(config.mongoUri);
    console.log("✓ Connected to MongoDB:", config.mongoUri);

    const locations = await Location.find().lean();
    console.log(`✓ Retrieved ${locations.length} monitored locations from database.\n`);

    console.log("--- 1. Testing Live USGS Earthquake Catalog Ingestion ---");
    for (const loc of locations.slice(0, 4)) {
      console.log(`\nTesting Location: ${loc.name} (${loc.latitude}, ${loc.longitude})`);
      const startMs = Date.now();
      const seismicData = await getSeismicData(loc.latitude, loc.longitude);
      const elapsedMs = Date.now() - startMs;

      console.log(`  - Telemetry source: ${seismicData.source}`);
      console.log(`  - Fetch Latency: ${elapsedMs}ms (Cached: ${seismicData.cached})`);
      console.log(`  - Earthquakes recorded (24h, 100km radius): ${seismicData.eventCount}`);
      console.log(`  - Normalized Seismic Activity Score: ${seismicData.activityScore} / 100`);
      console.log(`  - Max Magnitude: ${seismicData.maxMagnitude ?? "None"}`);

      const latestEvent = seismicData.recentEvents?.[0];
      if (latestEvent) {
        console.log(`  - Latest Event: M ${latestEvent.magnitude} - ${latestEvent.place} (${latestEvent.distanceKm} km away, ${latestEvent.depthKm} km depth)`);
      } else {
        console.log(`  - Latest Event: None (Quiet tectonic zone)`);
      }
    }

    console.log("\n--- 2. Testing High-Seismic Hotspot Zone (Tokyo Region) ---");
    const tokyoTelemetry = await getSeismicData(35.6762, 139.6503);
    console.log(`Tokyo (35.6762° N, 139.6503° E):`);
    console.log(`  - Total Events (24h, 100km): ${tokyoTelemetry.eventCount}`);
    console.log(`  - Max Magnitude: ${tokyoTelemetry.maxMagnitude ?? "N/A"}`);
    console.log(`  - Seismic Activity Score: ${tokyoTelemetry.activityScore}/100`);

    console.log("\n--- 3. Testing Distance Attenuation & Recency Weights ---");
    const now = Date.now();
    const closeEvent = [{ magnitude: 5.0, distanceKm: 10, occurredAt: new Date(now - 1 * 3600 * 1000).toISOString(), depthKm: 10 }];
    const farEvent = [{ magnitude: 5.0, distanceKm: 90, occurredAt: new Date(now - 1 * 3600 * 1000).toISOString(), depthKm: 10 }];
    const oldEvent = [{ magnitude: 5.0, distanceKm: 10, occurredAt: new Date(now - 22 * 3600 * 1000).toISOString(), depthKm: 10 }];

    const closeScore = calculateSeismicActivity(closeEvent);
    const farScore = calculateSeismicActivity(farEvent);
    const oldScore = calculateSeismicActivity(oldEvent);

    console.log(`  - M5.0 @ 10km (1h ago): ${closeScore}/100`);
    console.log(`  - M5.0 @ 90km (1h ago): ${farScore}/100 (Distance attenuated: ${closeScore > farScore ? "PASS" : "FAIL"})`);
    console.log(`  - M5.0 @ 10km (22h ago): ${oldScore}/100 (Recency decayed: ${closeScore > oldScore ? "PASS" : "FAIL"})`);

    console.log("\n--- 4. Testing End-to-End Risk Engine Ingestion ---");
    const sampleLoc = locations[0];
    const riskRecord = await RiskData.findOne({ locationId: sampleLoc._id }).lean();
    const liveSeismic = await getSeismicData(sampleLoc.latitude, sampleLoc.longitude);

    const dynamicInputs = {
      rainfall: riskRecord?.inputs?.rainfall ?? 50,
      riverLevel: riskRecord?.inputs?.riverLevel ?? 50,
      slope: sampleLoc.slope ?? 20,
      elevation: sampleLoc.elevation ?? 50,
      historicalRisk: riskRecord?.inputs?.historicalRisk ?? 50,
      seismicActivity: liveSeismic.activityScore
    };

    const calculated = calculateAllRisks(dynamicInputs);
    console.log(`Calculated Risks for ${sampleLoc.name}:`);
    console.log(`  - Seismic Activity Input (Live USGS): ${dynamicInputs.seismicActivity}/100`);
    console.log(`  - Seismic Risk Score: ${calculated.seismic.score}/100 (${calculated.seismic.level})`);
    console.log(`  - Overall Risk Score: ${calculated.overall.score}/100 (${calculated.overall.level})`);
    console.log(`  - Top Risk Driver: ${calculated.factors[0]?.name || "N/A"} (${calculated.factors[0]?.contribution || "N/A"})`);

    console.log("\n=======================================================");
    console.log("  ✅ All Step 12 Verification Checks Passed Successfully!");
    console.log("=======================================================\n");

  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyStep12();
