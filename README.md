# HYDROGUARD
### AI-Powered Flash Flood Risk Assessment & Decision Support System

HydroGuard is a software-based decision-support platform designed to assess flash flood risk for monitored catchments in hilly and coastal regions. It synthesizes multi-source environmental signals—including precipitation, river telemetry, terrain gradient, and seismic indicators—into a unified workflow to compute localized, explainable risk assessments. By transforming raw environmental data into clear, actionable guidance, HydroGuard assists emergency response teams and communities in making timely risk-informed decisions.

---

## Problem Statement

* **PS ID:** 26192
* **Title:** Flash Flood Prediction System for Hilly Regions using Multi-Source Data Theme
* **Organization:** Ministry of Home Affairs
* **Department:** National Disaster Response Force (NDRF), DM Division
* **Category:** Software
* **Theme:** Disaster Management

### Problem Description
1. **Rapid Event Onset:** Flash floods in complex mountain and river valley catchments can develop within minutes or hours, leaving extremely short windows for emergency preparation and evacuation.
2. **Fragmented Data Ecosystems:** Critical indicators—such as precipitation rates, river gauge levels, slope gradients, elevation, and historical flood indices—are distributed across separate systems and agencies.
3. **Variable Local Coverage:** In remote, high-altitude, or under-instrumented regions, real-time monitoring infrastructure and network bandwidth may be limited.
4. **Information Gap:** Raw meteorological feeds and sensor values are often difficult for non-technical responders or citizens to interpret quickly during an unfolding crisis.

---

## 2. Our Idea

HydroGuard is an integrated decision-support system that consolidates relevant environmental data into a single operational workflow. It applies risk assessment algorithms to evaluate multi-factor flood vulnerability for targeted locations and river basins.

### Key Outputs Delivered by HydroGuard:
* **Estimated Risk Level:** Categorized threat levels (**LOW**, **MODERATE**, **HIGH**, **CRITICAL**).
* **Contributing Risk Factors:** Clear breakdown of rainfall, river stage, terrain slope, and seismic indicators driving the score.
* **Data Source & Freshness Metadata:** Transparency regarding provider origins and observation timestamps.
* **Data-Quality & Uncertainty Awareness:** Explicit indicators when live telemetry is unavailable or aging.
* **Recommended Safety Actions:** Situation-specific safety guidance tailored to the assessed risk level.
* **Emergency Assistance Directory:** Direct access to regional shelters, hospitals, police, and fire rescue units.

> **Important:** HydroGuard is designed to complement existing official warning systems, not replace them.

---

## 3. How HydroGuard Works

```text
Multi-Source Data
       ↓
Data Processing & Validation
       ↓
Feature Engineering
       ↓
ML / Risk Assessment Engine
       ↓
Risk Level + Contributing Factors
       ↓
Decision Support
       ↓
Recommended Actions
```

### Workflow Stages:
1. **Multi-Source Data Ingestion:** Fetches real-time precipitation (Open-Meteo), river telemetry (GloFAS), seismic events (USGS catalog), and regional terrain baselines.
2. **Data Processing & Validation:** Sanitizes raw API payloads, enforces rate limits, validates coordinate bounds, and evaluates signal freshness against predefined thresholds.
3. **Feature Engineering:** Normalizes heterogeneous environmental measurements into standardized 0–100 sub-risk indices.
4. **ML / Risk Assessment Engine:** Computes a composite hazard index using weighted multi-criteria algorithms and historical baseline thresholds.
5. **Explainable Risk & Data Quality:** Deconstructs the overall risk score into individual factor contributions while flagging telemetry status (Live, Cached, or Fallback).
6. **Decision Support & Recommended Actions:** Maps threat levels to automated safety advisories and emergency response contacts.

---

## 4. Data Considered

The HydroGuard concept and prototype evaluate several key environmental metrics:

* **Rainfall (Precipitation):** Hourly precipitation rates, cumulative rainfall volume, and rainfall intensity.
* **River Level & Hydrology:** River stage height, discharge rates ($m^3/s$), and gauge threshold tiers (Warning, Danger, Extreme).
* **Elevation & Topography:** Absolute altitude above sea level and regional catchment elevation profile.
* **Slope & Terrain Gradient:** Surface incline angle influencing runoff velocity and landslide susceptibility.
* **Soil & Moisture Conditions:** Antecedent soil saturation and moisture retention capacities *(conceptual / planned for direct satellite ingestion)*.
* **Historical Flood Baseline:** Past disaster frequencies, historical inundation zones, and regional vulnerability indices.
* **Seismic Activity:** Nearby earthquake events ($M \ge 2.5$) and ground motion acceleration influencing slope stability.

*Note: Live automated feeds are currently connected for weather, river gauge, and seismic networks; soil moisture and high-density rain gauge sensors represent planned expansions.*

---

## 5. Risk Assessment

HydroGuard evaluates flood vulnerability for defined locations and monitoring stations:

* **Risk Categorization:** Output is classified into four operational tiers:
  * 🟢 **LOW (0–25):** Normal baseline conditions; standard vigilance.
  * 🟡 **MODERATE (26–50):** Elevated environmental activity; advisory monitoring.
  * 🟠 **HIGH (51–75):** Heightened flood/landslide risk; community precautions recommended.
  * 🔴 **CRITICAL (76–100):** Severe threat thresholds breached; emergency action advisories.
* **Threshold Validation:** Risk boundaries are aligned against historical backtesting fixtures and regional baseline data.
* **Model Nature:** The computed risk index represents an **indicative scientific estimate**, not a deterministic prediction of guaranteed flooding.

---

## 6. Explainable Risk

Rather than presenting an uninterpretable "black-box" risk number, HydroGuard deconstructs the assessment into explainable components:

* **Individual Factor Contributions:** Highlights specific drivers such as excessive recent rainfall, steep terrain slope, or high river stage.
* **Transparent Multipliers:** Displays how sub-indices aggregate into the composite risk score.
* **Interpretation Scope:** Contributing factors are provided to assist human interpretation and contextual awareness, not as mathematical proof of causation.

---

## 7. Decision Support

HydroGuard translates raw risk metrics into structured operational recommendations:

* **Actionable Guidance:**
  * Monitor local environmental trends and weather advisories.
  * Prepare emergency supplies and verify evacuation routes.
  * Avoid low-lying riverbanks, culverts, and landslide-prone mountain slopes.
  * Contact nearby emergency shelters or relief facilities if conditions deteriorate.
* **Authority Alignment:** Official disaster management agencies (NDRF, SDMA, District Administration, IMD, CWC) remain solely responsible for issuing legal evacuation orders and official public warnings.

---

## 8. Application Features

The HydroGuard web application prototype provides the following functional modules:

* **Startup Welcome Screen:** Clean 2.5-second brand startup overlay with smooth auto-transition to the application.
* **Interactive Risk Dashboard:** Centralized dashboard displaying the overall risk score, risk level badge, current weather/hydrology/seismic cards, and AI risk explanation.
* **Geospatial Risk Map:** Interactive Leaflet map displaying multi-tier risk perimeters around stations, hazard overlays (Flood, Landslide, Seismic), and mapped emergency facilities.
* **Risk Analysis & Validation:** Dedicated backtesting hub to evaluate model outputs against historical disaster fixtures and synthetic benchmarks.
* **Alerts & Feedback Hub:** System alert log displaying active advisories alongside a user feedback form for validating alert accuracy.
* **Emergency Support Hub:** Quick emergency contact cards and searchable database of nearby shelters, hospitals, police, and fire stations.
* **Emergency Offline Pack:** One-click offline snapshot download saving essential local telemetry, emergency contacts, and guidance to browser `localStorage` for network blackout resilience.
* **AI Guide Assistant:** Interactive natural-language assistant providing deterministic Q&A guidance without external LLM hallucinations.
* **India-Focused Station Monitoring:** Presets for key Indian monitoring stations including **Nashik** *(Default)*, **Mumbai**, **New Delhi**, **Uttarkashi**, and **Chamoli**.

---

## 9. What Makes HydroGuard Different

* **Multi-Source Consolidation:** Integrates weather, hydrological, terrain, and seismic inputs into a single dashboard.
* **Local Station Focus:** Delivers targeted risk insights for specific catchments rather than broad state-level summaries.
* **Transparent Explainability:** Clearly displays sub-index weights and data sources driving the risk level.
* **Data Quality Awareness:** Explicitly distinguishes between Live API telemetry, Cached data, and Fallback baselines.
* **Offline Resilience:** Enables emergency responders to access saved telemetry offline during network outages.
* **Complementary Design:** Built to operate seamlessly alongside existing government forecasting infrastructure.

---

## 10. Current Prototype

### Implemented Features
* React 18 + Vite single-page web interface with responsive Tailwind styling.
* Node.js + Express backend REST API architecture with MongoDB models.
* Real-time API integration with Open-Meteo (Precipitation) and USGS (Seismic Catalog).
* GloFAS/river gauge threshold normalization and deterministic fallback service.
* Deterministic multi-hazard risk engine with 3-hour background refresh interval.
* Leaflet interactive map with custom hazard perimeters and emergency facility markers.
* Browser-persistent Emergency Offline Pack system.
* Natural language AI Guide assistant.
* India station presets: Nashik, Mumbai, New Delhi, Uttarkashi, Chamoli.

### Planned / Future Scope
* Direct API integration with Central Water Commission (CWC) & India Meteorological Department (IMD) feeds.
* Ingestion of satellite-derived soil moisture datasets (e.g., SMAP / Sentinel).
* High-density IoT water-level sensor telemetry over LoRaWAN / Satellite links.
* Machine Learning model fine-tuning (e.g., Random Forest / XGBoost) trained on expanded historical flood datasets.
* Automated SMS / WhatsApp emergency broadcast integrations.
* User authentication and role-based access control for disaster officials.

---

## 11. Technology Stack

### Frontend
* **Core:** React 18, JavaScript (ES6+)
* **Build Tool:** Vite 6
* **Styling:** Vanilla CSS, Tailwind CSS (Design Tokens & Glassmorphism)
* **Icons:** Lucide React
* **Mapping:** Leaflet, React-Leaflet, OpenStreetMap tiles

### Backend
* **Runtime:** Node.js (v18+)
* **Framework:** Express.js
* **Database:** MongoDB with Mongoose ODM
* **Security & Reliability:** Express Rate Limit, Custom Input Sanitizer, Security Headers Middleware

---

## 12. System Architecture

```text
Data Sources (Open-Meteo, GloFAS, USGS, Regional Baselines)
                          ↓
               Backend Ingestion Layer
                          ↓
          Data Processing & Freshness Validation
                          ↓
             Feature Normalization (0-100)
                          ↓
           Deterministic Risk Engine Service
                          ↓
            Explainability & Quality Tagging
                          ↓
              REST API Endpoints (/api/*)
                          ↓
          HydroGuard Single Page Application
                          ↓
   Dashboard | Risk Map | Emergency Hub | Offline Pack
```

---

## 13. Limitations

* **Telemetry Availability:** Real-time data relies on public API availability and regional sensor density.
* **Coverage Gaps:** Certain remote catchments may lack high-resolution hydrological river gauges.
* **Satellite Granularity:** Satellite precipitation and soil moisture feeds can exhibit temporal latency or coarse spatial resolution.
* **Historical Data Gaps:** Unlabeled historical flood events in specific valleys can limit backtesting completeness.
* **Complex Hydraulics:** Local urban drainage blockages or sudden landslide-dam breaches require specialized local modeling beyond macro environmental metrics.
* **Non-Binding Nature:** Risk scores are advisory decision-support estimates and do not constitute official administrative evacuation orders.

---

## 14. Future Scope

* **Catchment Expansion:** Expanding telemetry coverage across additional river basins in Himalayan and Western Ghats states.
* **IoT Sensor Networks:** Deploying low-cost ultrasonic water level sensors along vulnerable tributaries.
* **Ensemble ML Forecasting:** Training physics-informed Machine Learning models on multi-year historical flood records.
* **Official Gateway Integration:** Establishing authorized data pipelines with state disaster management authorities (SDMAs).

---

## 15. Important Disclaimer

> **HydroGuard is a prototype decision-support system. Its risk estimates depend on data availability, data quality, model selection and historical validation. It is not a replacement for official government warnings, forecasts or evacuation instructions.**

---

## 16. Project Structure

```text
HydroGuard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js             # Environment & configuration mapping
│   │   │   └── database.js          # MongoDB connection module
│   │   ├── controllers/             # REST API controllers
│   │   │   ├── alert.controller.js
│   │   │   ├── demo.controller.js
│   │   │   ├── emergency.controller.js
│   │   │   ├── health.controller.js
│   │   │   ├── hydrology.controller.js
│   │   │   ├── location.controller.js
│   │   │   ├── risk.controller.js
│   │   │   ├── seismic.controller.js
│   │   │   ├── validation.controller.js
│   │   │   └── weather.controller.js
│   │   ├── middleware/              # Security, rate limiting & error handling
│   │   ├── models/                  # Mongoose schemas (Location, RiskData, Alert, EmergencyCenter)
│   │   ├── routes/                  # Express route definitions
│   │   ├── services/                # Risk engine, telemetry services & validation tools
│   │   └── utils/
│   │       └── seed.js              # Database seeding script
│   ├── package.json                 # Backend dependencies & test scripts
│   └── server.js                    # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/           # Dashboard analytics & indicator cards
│   │   │   ├── layout/              # Sidebar, Header, WelcomeScreen & AI Guide
│   │   │   └── map/                 # Leaflet map modal & perimeters
│   │   ├── context/                 # Location & Navigation Context providers
│   │   ├── data/                    # Preset locations & fallback telemetry
│   │   ├── pages/                   # SPA page views (Home, Dashboard, RiskMap, Emergency, Alerts, RiskAnalysis)
│   │   ├── services/                # API client & offline storage service
│   │   ├── App.jsx                  # Root shell
│   │   ├── index.css                # Global styles & design tokens
│   │   └── main.jsx                 # Entry point
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite configuration
└── README.md                        # Documentation & setup guide
```

---

## 17. Getting Started

### Prerequisites
* **Node.js**: v18 or higher
* **npm**: v9 or higher
* **MongoDB**: v6 or higher (running locally on `mongodb://localhost:27017` or MongoDB Atlas URI)

### 1. Backend Installation & Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create environment variables file (`backend/.env`):
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/terrasafe-ai
   ```
4. Seed the database with Indian locations & demo data:
   ```bash
   npm run seed
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```
   *The server runs on [http://localhost:5000](http://localhost:5000).*

### 2. Frontend Installation & Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web application will open at [http://localhost:5173](http://localhost:5173).*

---

## 18. Demo & Resources

* [Live Demo](ADD_LINK)
* [Project Video](ADD_LINK)
* [Project Report](ADD_LINK)

---

## 19. Team

* **HydroGuard Development Team** — Disaster Management & Software Solution for PS ID 26192 (NDRF / Ministry of Home Affairs).
