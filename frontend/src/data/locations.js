/**
 * Preset Location Dataset for HydroGuard
 * Coordinates and geographic metadata for demo/analysis regions.
 */

export const locations = [
  {
    id: "kathmandu-np",
    name: "Kathmandu",
    region: "Bagmati Province",
    country: "Nepal",
    latitude: 27.7172,
    longitude: 85.3240,
    elevation: "1,400 m",
    lastUpdated: "Just now",
    description: "Kathmandu Valley basin surrounded by Himalayan mountain terrain, susceptible to river flooding and seismic activity."
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
    id: "nashik-in",
    name: "Nashik",
    region: "Maharashtra",
    country: "India",
    latitude: 19.9975,
    longitude: 73.7898,
    elevation: "584 m",
    lastUpdated: "4 mins ago",
    description: "Upper Godavari river basin with moderate terrain gradient and seasonal flood potential."
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
  },
  {
    id: "london-uk",
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    elevation: "35 m",
    lastUpdated: "1 hour ago",
    description: "Thames tidal estuary zone protected by marine barrier infrastructure."
  },
  {
    id: "tokyo-jp",
    name: "Tokyo",
    region: "Kanto",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    elevation: "40 m",
    lastUpdated: "25 mins ago",
    description: "Complex coastal plain in active seismic subduction zone with advanced tsunami barriers."
  },
  {
    id: "new-york-us",
    name: "New York",
    region: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.0060,
    elevation: "10 m",
    lastUpdated: "45 mins ago",
    description: "Atlantic coastal harbor with low-lying borough vulnerability during tropical storm surges."
  }
];

export const defaultLocation = locations[0]; // Kathmandu, Nepal
