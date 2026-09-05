/**
 * Unit Test Suite for HydroGuard Quick Emergency Contacts Service (Step 14)
 */

import {
  getEmergencyContactsForLocation,
  normalizeCountryKey,
  VERIFIED_EMERGENCY_DIRECTORIES
} from "./emergencyContacts.service.js";

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
console.log("  HydroGuard - Quick Emergency Contacts Tests (Step 14)");
console.log("=======================================================\n");

// Test 1: India country resolution returns 4 verified categories
const indiaRes = getEmergencyContactsForLocation({ country: "India", region: "Maharashtra", name: "Mumbai" });
assert(
  indiaRes.isConfigured === true &&
  indiaRes.contacts.length === 4 &&
  indiaRes.contacts.some(c => c.type === "ambulance" && c.number === "108") &&
  indiaRes.contacts.some(c => c.type === "police" && (c.number === "112" || c.number === "100")) &&
  indiaRes.contacts.some(c => c.type === "fireRescue" && c.number === "101") &&
  indiaRes.contacts.some(c => c.type === "disasterHelpline" && c.number === "1078"),
  "India resolves verified Ambulance (108), Police (112), Fire (101), and Disaster (1078)"
);

// Test 2: Japan country resolution returns 110, 119, 171
const japanRes = getEmergencyContactsForLocation({ country: "Japan", region: "Kanto", name: "Tokyo" });
assert(
  japanRes.isConfigured === true &&
  japanRes.contacts.some(c => c.type === "police" && c.number === "110") &&
  japanRes.contacts.some(c => c.type === "fireRescue" && c.number === "119") &&
  japanRes.contacts.some(c => c.type === "disasterHelpline" && c.number === "171"),
  "Japan resolves verified Police (110), Fire/Ambulance (119), and Disaster Message Dial (171)"
);

// Test 3: United Kingdom country resolution returns 999 and 111
const ukRes = getEmergencyContactsForLocation({ country: "United Kingdom", region: "Greater London", name: "London" });
assert(
  ukRes.isConfigured === true &&
  ukRes.contacts.some(c => c.type === "ambulance" && c.number === "999") &&
  ukRes.contacts.some(c => c.type === "disasterHelpline" && c.number === "111"),
  "United Kingdom resolves 999 universal emergency and 111 NHS urgent helpline"
);

// Test 4: United States country resolution returns 911 and FEMA
const usRes = getEmergencyContactsForLocation({ country: "United States", region: "New York", name: "New York" });
assert(
  usRes.isConfigured === true &&
  usRes.contacts.some(c => c.type === "police" && c.number === "911") &&
  usRes.contacts.some(c => c.type === "disasterHelpline" && c.number === "1-800-621-3362"),
  "United States resolves 911 emergency services and FEMA Disaster Helpline"
);

// Test 5: Country alias resolution (e.g. USA, UK, IND, BHARAT)
assert(normalizeCountryKey("USA") === "united states", "USA alias resolves to united states");
assert(normalizeCountryKey("UK") === "united kingdom", "UK alias resolves to united kingdom");
assert(normalizeCountryKey("IND") === "india", "IND alias resolves to india");

// Test 6: Case-insensitivity & whitespace trimming
const trimmedRes = getEmergencyContactsForLocation({ country: "  jApAn  " });
assert(trimmedRes.isConfigured === true && trimmedRes.country === "Japan", "Case-insensitive and trimmed country names resolve correctly");

// Test 7: Unsupported country returns safe empty list without fake fallback numbers
const unknownRes = getEmergencyContactsForLocation({ country: "Atlantis Island" });
assert(
  unknownRes.isConfigured === false &&
  Array.isArray(unknownRes.contacts) &&
  unknownRes.contacts.length === 0,
  "Unsupported country safely returns empty contacts list (no fake/invented numbers)"
);

// Test 8: Null / undefined / empty location parameter handled safely
const nullRes = getEmergencyContactsForLocation(null);
assert(
  nullRes.isConfigured === false &&
  Array.isArray(nullRes.contacts) &&
  nullRes.contacts.length === 0,
  "Null location object handled safely without throwing error"
);

// Test 9: Data safety & verification provenance flags
const sampleContact = indiaRes.contacts[0];
assert(
  sampleContact.verified === true &&
  typeof sampleContact.source === "string" &&
  sampleContact.source.length > 0 &&
  sampleContact.isConfigured === true,
  "Contact exposes genuine verification flag and source attribution"
);

console.log(`\nResults: ${passedCount}/${passedCount + failedCount} emergency contact tests passed.\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
