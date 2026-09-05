import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/terrasafe-ai",
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gemini-2.0-flash",
  aiApiUrl: process.env.AI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models",
  // External Weather Integration (Step 9)
  weatherApiKey: process.env.WEATHER_API_KEY || "",
  weatherApiUrl: process.env.WEATHER_API_URL || "https://api.open-meteo.com/v1/forecast",
  weatherCacheTtlMs: parseInt(process.env.WEATHER_CACHE_TTL_MS || "300000", 10), // Default 5 minutes
  // Hydrological / River Integration (Step 11)
  hydroApiKey: process.env.HYDRO_API_KEY || "",
  hydroApiUrl: process.env.HYDRO_API_URL || "https://flood-api.open-meteo.com/v1/flood",
  hydroCacheTtlMs: parseInt(process.env.HYDRO_CACHE_TTL_MS || "300000", 10), // Default 5 minutes
  // Seismic Activity Integration (Step 12)
  seismicApiUrl: process.env.SEISMIC_API_URL || "https://earthquake.usgs.gov/fdsnws/event/1/query",
  seismicRadiusKm: parseInt(process.env.SEISMIC_RADIUS_KM || "100", 10), // 100 km radius
  seismicLookbackHours: parseInt(process.env.SEISMIC_LOOKBACK_HOURS || "24", 10), // 24 hours lookback
  seismicCacheTtlMs: parseInt(process.env.SEISMIC_CACHE_TTL_MS || "300000", 10), // Default 5 minutes
  // Deterministic Demo Mode (Step 20)
  demoMode: process.env.DEMO_MODE === "true", // Default: false
  // Security & Hardening Configuration (Step 21)
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "300", 10), // 300 req/window
  rateLimitSensitiveMax: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || "60", 10), // 60 req/window for AI/heavy calculations
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Future ML Architecture Configuration (Step 22)
  mlMode: process.env.ML_MODE || "disabled", // "disabled" | "shadow" | "candidate" | "production"
  mlModelId: process.env.ML_MODEL_ID || "",
  mlModelVersion: process.env.ML_MODEL_VERSION || ""
};

export default config;



