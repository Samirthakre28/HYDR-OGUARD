import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { config } from "./src/config/index.js";
import { connectDB } from "./src/config/database.js";
import apiRoutes from "./src/routes/index.js";
import { notFoundHandler, errorHandler } from "./src/middleware/errorHandler.js";
import { securityHeaders } from "./src/middleware/securityHeaders.js";
import { standardLimiter, sensitiveActionsLimiter } from "./src/middleware/rateLimiter.js";
import { inputSanitizer } from "./src/middleware/inputSanitizer.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port || 5000;

// 1. Disable Express X-Powered-By Banner
app.disable("x-powered-by");

// 2. Defensive HTTP Security Headers (Step 21)
app.use(securityHeaders);

// 3. Hardened CORS Configuration
const allowedOriginsSet = new Set([
  config.clientUrl,
  ...(config.allowedOrigins || [])
].filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, mobile, or tool requests with no origin header
      if (!origin) {
        return callback(null, true);
      }

      const isDev = config.nodeEnv !== "production";
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if ((isDev && isLocalhost) || allowedOriginsSet.has(origin)) {
        callback(null, true);
      } else {
        const corsErr = new Error(`CORS policy violation: Origin '${origin}' is not authorized.`);
        corsErr.name = "CorsError";
        corsErr.statusCode = 403;
        callback(corsErr);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
    maxAge: 86400
  })
);

// 4. Request Body Size Limits (1MB ceiling to prevent memory denial of service)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 5. Input Sanitizer & NoSQL Injection Protection
app.use(inputSanitizer);

// 6. Sliding-Window Rate Limiting
app.use("/api/risk/calculate", sensitiveActionsLimiter);
app.use("/api/risk/explanation", sensitiveActionsLimiter);
app.use("/api/validation/backtest", sensitiveActionsLimiter);
app.use("/api", standardLimiter);

// Root welcome route
app.get("/", (req, res) => {
  res.json({
    name: "HydroGuard Backend API",
    version: "1.0.0",
    status: "active",
    healthCheck: "/api/health",
    documentation: {
      locations: "/api/locations",
      risk: "/api/risk/:locationId",
      calculate: "/api/risk/calculate"
    }
  });
});

// Mount API Routes under /api
app.use("/api", apiRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB and start HTTP server
async function startServer() {
  try {
    // Establish database connection
    await connectDB();

    app.listen(PORT, () => {
      console.log(`[HydroGuard] Server is running on port ${PORT} in ${config.nodeEnv} mode`);
      console.log(`[HydroGuard] Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`[HydroGuard] Locations endpoint: http://localhost:${PORT}/api/locations`);
    });
  } catch (error) {
    console.error(`[HydroGuard] Fatal startup error: ${error.message}`);
    process.exit(1);
  }
}

startServer();

export default app;
