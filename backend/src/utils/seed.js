import mongoose from "mongoose";
import { config } from "../config/index.js";
import { Location } from "../models/Location.js";
import { RiskData } from "../models/RiskData.js";
import { Alert } from "../models/Alert.js";
import { EmergencyCenter } from "../models/EmergencyCenter.js";
import { calculateAllRisks } from "../services/riskEngine.service.js";

/**
 * Seed script for HydroGuard
 * Populates MongoDB with demo locations, risk data, emergency centers, and historical alerts.
 */

const demoLocations = [
  {
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    elevation: 14,
    inputs: {
      rainfall: 92,
      riverLevel: 85,
      slope: 15,
      elevation: 20,
      historicalRisk: 80,
      seismicActivity: 25
    },
    emergencyFacilities: [
      { name: "KEM Memorial Hospital (Demo)", type: "Hospital", address: "Parel, Mumbai", phone: "+91 (555) 019-2834", availability: "64 ICU Beds Available" },
      { name: "South Mumbai Cyclone Shelter (Demo)", type: "Shelter", address: "Colaba Coastal Zone", phone: "+91 (555) 019-4411", availability: "Capacity: 600 Evacuees" },
      { name: "Mumbai Central Police Precinct (Demo)", type: "Police", address: "Sector 1, Fort, Mumbai", phone: "+91 (555) 019-9922", availability: "Disaster Response Unit Ready" },
      { name: "Marine Lines Fire Depot (Demo)", type: "Fire Station", address: "Marine Drive, Mumbai", phone: "+91 (555) 019-7733", availability: "5 High-Water Rescue Teams" }
    ]
  },
  {
    name: "Nashik",
    region: "Maharashtra",
    country: "India",
    latitude: 19.9975,
    longitude: 73.7898,
    elevation: 584,
    inputs: {
      rainfall: 55,
      riverLevel: 45,
      slope: 35,
      elevation: 40,
      historicalRisk: 40,
      seismicActivity: 20
    },
    emergencyFacilities: [
      { name: "District Civil Hospital (Demo)", type: "Hospital", address: "Trimbak Road, Nashik", phone: "+91 (555) 019-3344", availability: "38 Beds Available" },
      { name: "Godavari Community Shelter (Demo)", type: "Shelter", address: "Panchavati, Nashik", phone: "+91 (555) 019-5566", availability: "Capacity: 350 People" },
      { name: "Panchavati Police Station (Demo)", type: "Police", address: "Sector 3, Nashik", phone: "+91 (555) 019-7788", availability: "On Alert" },
      { name: "Nashik City Fire Brigade (Demo)", type: "Fire Station", address: "MG Road, Nashik", phone: "+91 (555) 019-1122", availability: "3 Response Crews on Standby" }
    ]
  },
  {
    name: "New Delhi",
    region: "National Capital Region",
    country: "India",
    latitude: 28.6139,
    longitude: 77.2090,
    elevation: 216,
    inputs: {
      rainfall: 60,
      riverLevel: 68,
      slope: 12,
      elevation: 25,
      historicalRisk: 62,
      seismicActivity: 52
    },
    emergencyFacilities: [
      { name: "AIIMS Apex Trauma Center (Demo)", type: "Hospital", address: "Ring Road, New Delhi", phone: "+91 (555) 019-1001", availability: "Emergency Triage Active" },
      { name: "Yamuna Flood Relief Center (Demo)", type: "Shelter", address: "East Delhi Basin", phone: "+91 (555) 019-2002", availability: "Capacity: 800 People" },
      { name: "Delhi Police Disaster Cell (Demo)", type: "Police", address: "ITO, New Delhi", phone: "+91 (555) 019-3003", availability: "Rapid Action Unit Active" },
      { name: "Connaught Place Fire Station (Demo)", type: "Fire Station", address: "Outer Circle, New Delhi", phone: "+91 (555) 019-4004", availability: "6 Heavy Rescue Units" }
    ]
  },
  {
    name: "Uttarkashi",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.7268,
    longitude: 78.4354,
    elevation: 1158,
    inputs: {
      rainfall: 88,
      riverLevel: 75,
      slope: 88,
      elevation: 85,
      historicalRisk: 86,
      seismicActivity: 70
    },
    emergencyFacilities: [
      { name: "Uttarkashi District Hospital (Demo)", type: "Hospital", address: "Gangotri Road, Uttarkashi", phone: "+91 (555) 019-5001", availability: "Mountain Rescue Medical Unit" },
      { name: "Himalayan Emergency Shelter (Demo)", type: "Shelter", address: "Upper Valley, Uttarkashi", phone: "+91 (555) 019-5002", availability: "Capacity: 450 Evacuees" },
      { name: "SDRF Disaster Outpost (Demo)", type: "Police", address: "Sector 2, Uttarkashi", phone: "+91 (555) 019-5003", availability: "High-Altitude Team On Duty" },
      { name: "Uttarkashi Fire & Alpine Rescue (Demo)", type: "Fire Station", address: "Main Bazaar, Uttarkashi", phone: "+91 (555) 019-5004", availability: "4 Alpine Emergency Teams" }
    ]
  },
  {
    name: "Chamoli",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.4000,
    longitude: 79.3300,
    elevation: 1550,
    inputs: {
      rainfall: 82,
      riverLevel: 65,
      slope: 92,
      elevation: 90,
      historicalRisk: 84,
      seismicActivity: 78
    },
    emergencyFacilities: [
      { name: "Chamoli Alpine Base Hospital (Demo)", type: "Hospital", address: "Gopeshwar, Chamoli", phone: "+91 (555) 019-6001", availability: "Trauma Wing Active" },
      { name: "Gopeshwar Community Relief Shelter (Demo)", type: "Shelter", address: "Gopeshwar High Ground", phone: "+91 (555) 019-6002", availability: "Capacity: 500 People" },
      { name: "Chamoli Mountain Police HQ (Demo)", type: "Police", address: "Sector 1, Gopeshwar", phone: "+91 (555) 019-6003", availability: "Landslide Monitoring Patrol" },
      { name: "Chamoli Disaster Response Depot (Demo)", type: "Fire Station", address: "Valley Route, Chamoli", phone: "+91 (555) 019-6004", availability: "Heavy Earthmoving Equipment Ready" }
    ]
  }
];

async function seedDatabase() {
  try {
    console.log("[HydroGuard Seed] Connecting to MongoDB...");
    const connUri = config.mongoUri;
    await mongoose.connect(connUri);
    console.log(`[HydroGuard Seed] Connected to database: ${mongoose.connection.name}`);

    // Clear existing demo records
    console.log("[HydroGuard Seed] Clearing existing collections (Location, RiskData, Alert, EmergencyCenter)...");
    await Location.deleteMany({});
    await RiskData.deleteMany({});
    await Alert.deleteMany({});
    await EmergencyCenter.deleteMany({});

    console.log("[HydroGuard Seed] Inserting locations, risks, emergency centers, and alerts...");
    let locationCount = 0;
    let emergencyCount = 0;
    let alertCount = 0;

    for (const item of demoLocations) {
      const { inputs, emergencyFacilities, ...locationData } = item;

      // 1. Create Location record
      const createdLocation = await Location.create(locationData);
      locationCount++;

      // 2. Compute exact risks using the Step 5 engine
      const calculated = calculateAllRisks(inputs);

      // 3. Create RiskData record
      await RiskData.create({
        locationId: createdLocation._id,
        rainfall: inputs.rainfall,
        riverLevel: inputs.riverLevel,
        slope: inputs.slope,
        elevation: inputs.elevation,
        historicalRisk: inputs.historicalRisk,
        seismicActivity: inputs.seismicActivity,
        floodRisk: calculated.flood.score,
        landslideRisk: calculated.landslide.score,
        seismicRisk: calculated.seismic.score,
        overallRisk: calculated.overall.score,
        updatedAt: new Date()
      });

      // 4. Create Demo Emergency Centers
      if (Array.isArray(emergencyFacilities)) {
        for (const fac of emergencyFacilities) {
          await EmergencyCenter.create({
            locationId: createdLocation._id,
            name: fac.name,
            type: fac.type,
            address: fac.address,
            phone: fac.phone,
            availability: fac.availability,
            latitude: createdLocation.latitude + (Math.random() - 0.5) * 0.05,
            longitude: createdLocation.longitude + (Math.random() - 0.5) * 0.05,
            isDemo: true
          });
          emergencyCount++;
        }
      }

      // 5. Seed historical alert if risk is elevated (MODERATE, HIGH, or CRITICAL)
      if (calculated.overall.level !== "LOW") {
        const hazardTypes = [];
        if (calculated.flood.score >= 51) hazardTypes.push("Flood");
        if (calculated.landslide.score >= 51) hazardTypes.push("Landslide");
        if (calculated.seismic.score >= 51) hazardTypes.push("Seismic");

        await Alert.create({
          locationId: createdLocation._id,
          severity: calculated.overall.level,
          title: calculated.overall.level === "CRITICAL" ? "Critical Multi-Hazard Alert" : "Elevated Risk Advisory",
          message: `${calculated.overall.level} risk assessment detected for ${createdLocation.name}. ${hazardTypes.length > 0 ? `Elevated indicators: ${hazardTypes.join(", ")}.` : ""}`,
          hazardTypes,
          createdAt: new Date(Date.now() - 35 * 60 * 1000) // 35 mins ago
        });
        alertCount++;
      }

      console.log(`  ✓ Seeded ${createdLocation.name}, ${createdLocation.country} [Risk: ${calculated.overall.score}/100 - ${calculated.overall.level}] with 4 emergency facilities`);
    }

    console.log(`\n[HydroGuard Seed] Seeding complete!`);
    console.log(`  - Locations: ${locationCount}`);
    console.log(`  - Emergency Facilities: ${emergencyCount}`);
    console.log(`  - Initial Alerts: ${alertCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[HydroGuard Seed] Error seeding database: ${error.message}`);
    process.exit(1);
  }
}

seedDatabase();
