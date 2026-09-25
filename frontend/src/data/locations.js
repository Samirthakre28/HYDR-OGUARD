/**
 * Preset Location Dataset for HydroGuard (India Only)
 * Coordinates and geographic metadata for monitored Indian regions.
 * Default selected location: Nashik, Maharashtra
 */

export const locations = [
  {
    id: "nashik-in",
    name: "Nashik",
    region: "Maharashtra",
    country: "India",
    latitude: 19.9975,
    longitude: 73.7898,
    elevation: "584 m",
    lastUpdated: "Just now",
    description: "Upper Godavari river basin with moderate terrain gradient and seasonal flood potential."
  },
  {
    id: "mumbai-in",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    elevation: "14 m",
    lastUpdated: "Just now",
    description: "Coastal metropolitan zone vulnerable to monsoon surges and high-tide urban flooding."
  },
  {
    id: "delhi-in",
    name: "New Delhi",
    region: "National Capital Region",
    country: "India",
    latitude: 28.6139,
    longitude: 77.2090,
    elevation: "216 m",
    lastUpdated: "10 mins ago",
    description: "Yamuna river floodplain with heavy urban density and seasonal inundation risks."
  },
  {
    id: "uttarkashi-in",
    name: "Uttarkashi",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.7268,
    longitude: 78.4354,
    elevation: "1,158 m",
    lastUpdated: "Just now",
    description: "High-relief Himalayan valley prone to cloudbursts, flash floods, and debris flows."
  },
  {
    id: "chamoli-in",
    name: "Chamoli",
    region: "Uttarakhand",
    country: "India",
    latitude: 30.4000,
    longitude: 79.3300,
    elevation: "1,550 m",
    lastUpdated: "15 mins ago",
    description: "Steep geological fault line zone with heightened seismic and glacial lake outburst hazards."
  }
];

export const defaultLocation = locations[0]; // Nashik, Maharashtra, India
