/**
 * Mock data structured for HydroGuard Dashboard
 * Prepared for clean replacement with backend API responses in future steps.
 */

export const mockLocations = [
  {
    id: "loc-1",
    name: "Uttarkashi District, Himalayan Foothills",
    region: "Uttarakhand, India",
    coordinates: "30.7268° N, 78.4354° E",
    elevation: "1,158 m",
    lastUpdated: "Just now"
  },
  {
    id: "loc-2",
    name: "Chamoli Valley",
    region: "Uttarakhand, India",
    coordinates: "30.4000° N, 79.3300° E",
    elevation: "1,550 m",
    lastUpdated: "5 mins ago"
  },
  {
    id: "loc-3",
    name: "Rishikesh Basin",
    region: "Uttarakhand, India",
    coordinates: "30.0869° N, 78.2676° E",
    elevation: "372 m",
    lastUpdated: "12 mins ago"
  }
];

export const mockOverallRisk = {
  score: 72,
  maxScore: 100,
  level: "HIGH",
  trend: "+8% in last 24h",
  description: "Risk assessment based on environmental, geographic, and historical indicators.",
  factorsElevatedCount: 4,
  highHazardsCount: 2
};

export const mockIndividualRisks = [
  {
    id: "flood",
    title: "Flood Risk",
    score: 78,
    maxScore: 100,
    level: "HIGH",
    trend: "+12%",
    statusColor: "rose",
    iconName: "Waves",
    summary: "Monsoon surge exceeding warning baseline by 1.8m."
  },
  {
    id: "landslide",
    title: "Landslide Risk",
    score: 61,
    maxScore: 100,
    level: "HIGH",
    trend: "+5%",
    statusColor: "amber",
    iconName: "MountainSnow",
    summary: "Saturated topsoil on steep >38° gradient slopes."
  },
  {
    id: "seismic",
    title: "Seismic Risk",
    score: 24,
    maxScore: 100,
    level: "LOW",
    trend: "Stable",
    statusColor: "emerald",
    iconName: "Activity",
    summary: "Background micro-tremor baseline within normal limits."
  }
];

export const mockRiskFactors = [
  {
    id: "factor-1",
    name: "Heavy Rainfall",
    description: "Precipitation rate of 64mm/hr recorded over the past 6 hours.",
    severity: "Critical",
    severityLevel: "high",
    iconName: "CloudRain",
    metric: "64 mm/hr"
  },
  {
    id: "factor-2",
    name: "Rising River Level",
    description: "Main waterway channel discharge is 1.8m above flood stage.",
    severity: "High",
    severityLevel: "high",
    iconName: "TrendingUp",
    metric: "+1.8 m"
  },
  {
    id: "factor-3",
    name: "Steep Terrain",
    description: "Average incline of 42° combined with reduced soil cohesion.",
    severity: "Elevated",
    severityLevel: "moderate",
    iconName: "Compass",
    metric: "42° Incline"
  },
  {
    id: "factor-4",
    name: "Historical Disaster Frequency",
    description: "High incidence recurrence rate during late monsoon cycles.",
    severity: "Moderate",
    severityLevel: "moderate",
    iconName: "History",
    metric: "3 Events / 5y"
  }
];

export const mockEmergencyServices = [
  {
    id: "es-1",
    name: "District General Hospital",
    type: "Hospital",
    distance: "1.2 km",
    status: "Operational",
    availableBeds: "42 Beds Available",
    phone: "+91 (555) 019-2834",
    iconName: "Cross"
  },
  {
    id: "es-2",
    name: "Central Community Shelter",
    type: "Shelter",
    distance: "2.8 km",
    status: "Ready",
    availableBeds: "Capacity: 350 People",
    phone: "+91 (555) 019-4411",
    iconName: "Home"
  },
  {
    id: "es-3",
    name: "Sector 4 Police Station",
    type: "Police Station",
    distance: "3.4 km",
    status: "On Alert",
    availableBeds: "Disaster Response Unit",
    phone: "+91 (555) 019-9922",
    iconName: "Shield"
  },
  {
    id: "es-4",
    name: "Valley Fire & Rescue Depot",
    type: "Fire Station",
    distance: "4.1 km",
    status: "Standby",
    availableBeds: "4 Rapid Response Teams",
    phone: "+91 (555) 019-7733",
    iconName: "Flame"
  }
];

export const mockAlerts = [
  {
    id: "alert-1",
    level: "HIGH RISK",
    severityType: "high",
    title: "Flood risk increased",
    description: "Heavy rainfall has increased localized flood risk. Water level at bridge sensor B-12 approaching danger mark.",
    timestamp: "14 minutes ago",
    badgeColor: "rose"
  },
  {
    id: "alert-2",
    level: "MODERATE RISK",
    severityType: "moderate",
    title: "Slope stability warning",
    description: "Saturated soil telemetry on Highway 108 bypass indicates heightened risk of minor debris fall.",
    timestamp: "1 hour ago",
    badgeColor: "amber"
  },
  {
    id: "alert-3",
    level: "INFORMATIONAL",
    severityType: "low",
    title: "Seismic monitoring active",
    description: "Regional seismic stations reporting normal baseline crustal stability across the valley basin.",
    timestamp: "3 hours ago",
    badgeColor: "emerald"
  }
];

export const navigationItems = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard", active: true },
  { id: "risk-map", label: "Risk Map", icon: "Map", active: false },
  { id: "alerts", label: "Alerts", icon: "Bell", count: 3, active: false },
  { id: "emergency-centers", label: "Emergency Centers", icon: "Building2", active: false },
  { id: "history", label: "History", icon: "History", active: false },
  { id: "settings", label: "Settings", icon: "Settings", active: false }
];
