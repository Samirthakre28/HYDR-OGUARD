# HydroGuard — AI-Powered Disaster Risk Assessment & Early Warning

> **HydroGuard** is an AI-powered disaster risk assessment and early-warning platform. It computes localized, explainable multi-hazard risk indices (Flood, Landslide, Seismic) using live environmental data, scientific telemetry, and deterministic models.

---

## 📁 Project Structure

```text
HydroGuard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js             # Environment & configuration mapping
│   │   │   └── database.js          # MongoDB / Mongoose connection module
│   │   ├── controllers/
│   │   │   ├── demo.controller.js   # Deterministic demo scenario evaluator
│   │   │   ├── health.controller.js # Health check handler
│   │   │   ├── hydrology.controller.js # River & hydrology stage telemetry handler
│   │   │   ├── location.controller.js # Locations CRUD / fetch handlers
│   │   │   ├── ml.controller.js     # Future ML architecture metadata handler
│   │   │   ├── risk.controller.js   # Multi-hazard risk telemetry handler
│   │   │   ├── seismic.controller.js # USGS earthquake catalog telemetry handler
│   │   │   ├── validation.controller.js # Historical backtesting handler
│   │   │   └── weather.controller.js # Open-Meteo precipitation handler
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Global error handler with URI/secret sanitization
│   │   │   ├── inputSanitizer.js    # NoSQL injection protection & ReDoS escaping
│   │   │   ├── rateLimiter.js       # Sliding-window rate limiter
│   │   │   └── securityHeaders.js   # Defensive HTTP security headers
│   │   ├── models/
│   │   │   ├── Alert.js             # Smart alert schema & history
│   │   │   ├── EmergencyCenter.js   # Emergency relief & shelter facility schema
│   │   │   ├── Location.js          # Monitored station schema
│   │   │   └── RiskData.js          # Calculated risk & environmental metric schema
│   │   ├── routes/
│   │   │   ├── demo.routes.js       # Demo scenario routes (/api/demo)
│   │   │   ├── health.routes.js     # Health check route (/api/health)
│   │   │   ├── location.routes.js   # Location endpoints (/api/locations)
│   │   │   ├── ml.routes.js         # Future ML endpoints (/api/ml)
│   │   │   ├── risk.routes.js       # Risk telemetry endpoints (/api/risk)
│   │   │   ├── validation.routes.js # Backtesting endpoints (/api/validation)
│   │   │   └── index.js             # API route aggregator
│   │   ├── services/                # Business logic, engines, validators & telemetry clients
│   │   └── utils/
│   │       └── seed.js              # Database seeding script
│   ├── .env                         # Backend environment variables
│   ├── .env.example                 # Environment template
│   ├── package.json                 # Backend dependencies & 16-suite unit test runner
│   └── server.js                    # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── assets/                  # Static media & assets
│   │   ├── components/
│   │   │   ├── dashboard/           # Feature cards & analytics widgets
│   │   │   ├── layout/              # Left Vertical Sidebar & layout wrappers
│   │   │   └── map/                 # Leaflet RiskMap & overlay controls
│   │   ├── context/
│   │   │   ├── LocationContext.jsx  # Global location & station state
│   │   │   └── NavigationContext.jsx # Global SPA routing state
│   │   ├── data/
│   │   │   ├── locations.js         # Preset locations dataset
│   │   │   └── mockDashboardData.js # Structured fallback telemetry datasets
│   │   ├── pages/
│   │   │   ├── About.jsx            # Product science, safety & disclaimer page
│   │   │   ├── Dashboard.jsx        # Live telemetry & multi-hazard risk dashboard
│   │   │   ├── Emergency.jsx        # Emergency assistance & relief units hub
│   │   │   ├── Home.jsx             # Landing page & quick regional risk lookup
│   │   │   └── RiskMapPage.jsx      # Dedicated geospatial hazard map page
│   │   ├── services/
│   │   │   ├── api.js               # Resilient API client with timeout protection
│   │   │   └── offlineStorage.js    # Browser-persistent Emergency Offline Pack service
│   │   ├── utils/                   # Data validation, freshness & formatting utilities
│   │   ├── App.jsx                  # Root application shell
│   │   ├── index.css                # Global CSS & design system tokens
│   │   └── main.jsx                 # React DOM entry
│   ├── index.html                   # HTML entry point with HydroGuard metadata
│   ├── package.json                 # Frontend dependencies & Vite build scripts
│   └── vite.config.js               # Vite configuration
├── docs/                            # Architecture & feature documentation
├── .gitignore                       # Root gitignore
└── README.md                        # Project documentation & startup guide
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+
- **npm**: v9+
- **MongoDB**: v6+ (running on `mongodb://localhost:27017` or MongoDB Atlas URI)

---

### 1. Backend Setup & Database Seeding

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (defined in `backend/.env`):
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/terrasafe-ai
   ```
4. **Seed Database with Demo Locations & Risk Data**:
   ```bash
   npm run seed
   ```
5. **Run Backend Test Suite**:
   ```bash
   npm test
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server connects to MongoDB and starts on [http://localhost:5000](http://localhost:5000).*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (defined in `frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at [http://localhost:5173](http://localhost:5173).*

