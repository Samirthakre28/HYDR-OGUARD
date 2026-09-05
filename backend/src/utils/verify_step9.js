import http from "http";
import mongoose from "mongoose";
import app from "../../server.js";

import { clearWeatherCache, getWeatherCacheStats } from "../services/weather.service.js";


async function runEndToEndVerification() {
  console.log("\n============================================================");
  console.log("  HydroGuard - End-to-End API Integration Verification");
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
    await testEndpoint("GET /api/locations", "/api/locations", (res, json) => {
      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error("Failed to load locations");
      }
      sampleLocationId = json.data[0]._id;
    });

    // 3. Weather for valid location ID
    clearWeatherCache();
    await testEndpoint(`GET /api/weather/:locationId (valid ObjectId: ${sampleLocationId})`, `/api/weather/${sampleLocationId}`, (res, json) => {
      if (!json.success || !json.data || !json.data.weather) {
        throw new Error(`Weather endpoint failed: ${JSON.stringify(json)}`);
      }
      if (typeof json.data.weather.temperature !== "number") {
        throw new Error("Missing numerical temperature");
      }
      if (typeof json.data.weather.normalizedRainfall !== "number") {
        throw new Error("Missing numerical normalizedRainfall");
      }
      console.log(`    [Observation] Location: ${json.data.locationName}, Temp: ${json.data.weather.temperature}°C, Rain: ${json.data.weather.rainfall}mm, Normalized: ${json.data.weather.normalizedRainfall}/100, Source: ${json.data.source}`);
    });

    // 4. Weather Cache Verification
    await testEndpoint(`GET /api/weather/:locationId (cache hit)`, `/api/weather/${sampleLocationId}`, (res, json) => {
      if (!json.success || json.data.cached !== true) {
        throw new Error("Expected weather response to be served from cache");
      }
      console.log(`    [Cache Check] Verified response was served from in-memory cache (cached: true)`);
    });

    // 5. Weather by name identifier
    await testEndpoint("GET /api/weather/tokyo", "/api/weather/tokyo", (res, json) => {
      if (!json.success || !json.data || json.data.locationName.toLowerCase() !== "tokyo") {
        throw new Error("Failed to resolve weather by location name");
      }
    });

    // 6. Weather for non-existent location (404)
    await testEndpoint("GET /api/weather/nonexistent-location-xyz (404)", "/api/weather/nonexistent-location-xyz", (res, json) => {
      if (res.status !== 404 || json.success !== false) {
        throw new Error(`Expected 404 Not Found, received ${res.status}`);
      }
    });

    // 7. Risk calculation with live weather & data provenance
    await testEndpoint(`GET /api/risk/:locationId (with Data Provenance)`, `/api/risk/${sampleLocationId}`, (res, json) => {
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
      console.log(`    [Risk & Provenance] Overall Score: ${risk.overall.score} (${risk.overall.level}), Rainfall Source: ${risk.dataSources.rainfall}, River: ${risk.dataSources.riverLevel}`);
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
      console.log(`    [Emergency Facilities] Loaded ${json.data.services.length} emergency facilities (isDemo: ${json.data.isDemoData})`);
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
