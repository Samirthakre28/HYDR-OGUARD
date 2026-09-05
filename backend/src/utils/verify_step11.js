import http from "http";
import mongoose from "mongoose";
import app from "../../server.js";

import { clearWeatherCache } from "../services/weather.service.js";
import { clearHydroCache } from "../services/hydrology.service.js";

async function runEndToEndVerification() {
  console.log("\n============================================================");
  console.log("  HydroGuard - End-to-End API Integration Verification (Step 11)");
  console.log("============================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = "http://localhost:5099";

  let total = 0;
  let passed = 0;

  async function testEndpoint(name, url, validateFn) {
    total++;
    try {
      const res = await fetch(`${baseUrl}${url}`);
      const json = await res.json();
      await validateFn(res, json);
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  try {
    // 1. Health
    await testEndpoint("GET /api/health", "/api/health", (res, json) => {
      if (!json.success || !json.message) throw new Error("Health check failed");
    });

    // 2. Locations
    let sampleLocationId = null;
    let sampleLocationName = null;
    await testEndpoint("GET /api/locations", "/api/locations", (res, json) => {
      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error("Failed to load locations");
      }
      sampleLocationId = json.data[0]._id;
      sampleLocationName = json.data[0].name;
    });

    // 3. Weather for valid location ID
    clearWeatherCache();
    await testEndpoint(`GET /api/weather/:locationId (${sampleLocationName})`, `/api/weather/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data || !json.data.weather) {
        throw new Error(`Weather endpoint failed: ${JSON.stringify(json)}`);
      }
      if (typeof json.data.weather.temperature !== "number") {
        throw new Error("Missing numerical temperature");
      }
      if (typeof json.data.weather.normalizedRainfall !== "number") {
        throw new Error("Missing numerical normalizedRainfall");
      }
      console.log(`    [Weather Observation] Location: ${json.data.locationName}, Temp: ${json.data.weather.temperature}°C, Rain: ${json.data.weather.rainfall}mm, Normalized: ${json.data.weather.normalizedRainfall}/100, Source: ${json.data.source}`);
    });

    // 4. Hydrology for valid location ID (Step 11)
    clearHydroCache();
    await testEndpoint(`GET /api/hydrology/:locationId (${sampleLocationName})`, `/api/hydrology/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data || !json.data.hydrology) {
        throw new Error(`Hydrology endpoint failed: ${JSON.stringify(json)}`);
      }
      if (typeof json.data.hydrology.riverLevel !== "number") {
        throw new Error("Missing numerical riverLevel");
      }
      if (typeof json.data.hydrology.normalizedRiverRisk !== "number") {
        throw new Error("Missing numerical normalizedRiverRisk");
      }
      console.log(`    [River Telemetry] Location: ${json.data.locationName}, Station: ${json.data.station?.name}, River Stage: ${json.data.hydrology.riverLevel}${json.data.hydrology.unit}, Risk: ${json.data.hydrology.normalizedRiverRisk}/100, Source: ${json.data.source}`);
    });

    // 5. Hydrology Cache Verification
    await testEndpoint(`GET /api/hydrology/:locationId (cache hit)`, `/api/hydrology/${sampleLocationId}`, (res, json) => {
      if (!json.success || json.data.cached !== true) {
        throw new Error("Expected hydrology response to be served from cache");
      }
      console.log(`    [Cache Check] Verified response was served from in-memory cache (cached: true)`);
    });

    // 6. Hydrology for non-existent location (404)
    await testEndpoint("GET /api/hydrology/nonexistent-location-xyz (404)", "/api/hydrology/nonexistent-location-xyz", (res, json) => {
      if (res.status !== 404 || json.success !== false) {
        throw new Error(`Expected 404 Not Found, received ${res.status}`);
      }
    });

    // 7. Risk calculation with live weather & live hydrology provenance
    await testEndpoint(`GET /api/risk/:locationId (with Live Weather & Hydrology Provenance)`, `/api/risk/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data?.risk) {
        throw new Error("Risk endpoint failed");
      }
      const risk = json.data.risk;
      if (!risk.dataSources) {
        throw new Error("Missing dataSources provenance mapping in risk output");
      }
      if (!risk.dataSources.rainfall || !risk.dataSources.riverLevel) {
        throw new Error("Incomplete dataSources fields");
      }
      console.log(`    [Risk & Provenance] Overall Score: ${risk.overall.score} (${risk.overall.level}), Rainfall: ${risk.dataSources.rainfall}, River: ${risk.dataSources.riverLevel}, DataFreshness: ${risk.dataFreshness}`);
    });

    // 8. Alerts endpoint
    await testEndpoint(`GET /api/alerts/:locationId`, `/api/alerts/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data) {
        throw new Error("Alerts endpoint failed");
      }
    });

    // 9. Emergency services endpoint
    await testEndpoint(`GET /api/emergency/:locationId`, `/api/emergency/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data?.services) {
        throw new Error("Emergency endpoint failed");
      }
      if (!Array.isArray(json.data.services) || json.data.services.length === 0) {
        throw new Error("Expected emergency facilities");
      }
      console.log(`    [Emergency Facilities] Loaded ${json.data.services.length} facilities (isDemo: ${json.data.isDemoData})`);
    });

    console.log(`\n============================================================`);
    console.log(`  Verification Summary: ${passed}/${total} Endpoints Verified Successfully!`);
    console.log(`============================================================\n`);
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(passed === total ? 0 : 1);
  }
}

runEndToEndVerification();
