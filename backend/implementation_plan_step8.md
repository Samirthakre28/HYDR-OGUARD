# Implementation Plan: Step 8 Smart Alerts + Emergency Services

Implement a real-time risk alert decision engine, alert deduplication & history tracking, demo emergency services directory, dynamic alert banners, and opt-in browser notifications for TerraSafe AI.

## Proposed Changes

---

### Backend Models & Services

#### [NEW] [backend/src/models/Alert.js](file:///e:/PROJECTS/HACKHATHON/backend/src/models/Alert.js)
- Mongoose schema tracking alert history:
  - `locationId` (ObjectId ref `Location`, required, indexed)
  - `severity` (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`, required)
  - `title` (String, required)
  - `message` (String, required)
  - `hazardTypes` ([String])
  - `acknowledged` (Boolean, default `false`)
  - `createdAt` (Date, default `Date.now`, indexed)

#### [NEW] [backend/src/models/EmergencyCenter.js](file:///e:/PROJECTS/HACKHATHON/backend/src/models/EmergencyCenter.js)
- Mongoose schema for emergency facilities:
  - `name` (String, required)
  - `type` (`Hospital`, `Shelter`, `Police`, `Fire Station`, required)
  - `locationId` (ObjectId ref `Location`, required, indexed)
  - `address` (String, required)
  - `latitude` (Number), `longitude` (Number)
  - `phone` (String, safe demo contact)
  - `availability` (String)
  - `isDemo` (Boolean, default `true`)

#### [NEW] [backend/src/services/alert.service.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/alert.service.js)
- Deterministic alert generator based on authoritative risk engine results:
  - `generateRiskAlert(riskData, location)`
  - Identifies elevated hazards (Flood, Landslide, Seismic).
  - Deduplicates database writes: prevents creating duplicate alerts for the same location, severity, and hazard combination within 15 minutes.
  - `getAlertHistoryForLocation(locationId, limit = 20)`

#### [NEW] [backend/src/services/alert.test.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/alert.test.js)
- Unit test suite testing:
  - Alert severity mapping for LOW, MODERATE, HIGH, CRITICAL.
  - Multi-hazard tagging.
  - 15-minute deduplication logic.

---

### Backend Controllers, Routes & Seed Updates

#### [NEW] [backend/src/controllers/alert.controller.js](file:///e:/PROJECTS/HACKHATHON/backend/src/controllers/alert.controller.js)
- `getCurrentAlert`: `GET /api/alerts/:locationId`
- `getAlertHistory`: `GET /api/alerts/:locationId/history`

#### [NEW] [backend/src/controllers/emergency.controller.js](file:///e:/PROJECTS/HACKHATHON/backend/src/controllers/emergency.controller.js)
- `getEmergencyServices`: `GET /api/emergency/:locationId`

#### [NEW] [backend/src/routes/alert.routes.js](file:///e:/PROJECTS/HACKHATHON/backend/src/routes/alert.routes.js)
#### [NEW] [backend/src/routes/emergency.routes.js](file:///e:/PROJECTS/HACKHATHON/backend/src/routes/emergency.routes.js)
#### [MODIFY] [backend/src/routes/index.js](file:///e:/PROJECTS/HACKHATHON/backend/src/routes/index.js)
- Mount `/alerts` and `/emergency` routes.

#### [MODIFY] [backend/src/utils/seed.js](file:///e:/PROJECTS/HACKHATHON/backend/src/utils/seed.js)
- Seed emergency centers for all 8 stations with `isDemo: true`.
- Seed initial baseline alerts in MongoDB.

#### [MODIFY] [backend/package.json](file:///e:/PROJECTS/HACKHATHON/backend/package.json)
- Include `alert.test.js` in `npm test`.

---

### Frontend Components & Services

#### [MODIFY] [frontend/src/services/api.js](file:///e:/PROJECTS/HACKHATHON/frontend/src/services/api.js)
- Add `getCurrentAlert(locationId, signal)`, `getAlertHistory(locationId, signal)`, `getEmergencyServices(locationId, signal)`.

#### [NEW] [frontend/src/components/dashboard/RiskAlertBanner.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/components/dashboard/RiskAlertBanner.jsx)
- Prominent advisory / warning / critical alert banner with hazard chips and opt-in browser notification button.

#### [MODIFY] [frontend/src/components/dashboard/EmergencyServices.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/components/dashboard/EmergencyServices.jsx)
- Connect to backend emergency services API with `isDemoData` badge and dynamic list.

#### [MODIFY] [frontend/src/components/dashboard/RecentAlerts.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/components/dashboard/RecentAlerts.jsx)
- Connect to backend alert history API displaying timestamps, hazard types, and empty states.

#### [MODIFY] [frontend/src/pages/Dashboard.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/pages/Dashboard.jsx)
- Integrate `RiskAlertBanner` and wire live alert/emergency data with `AbortController`.

---

## Verification Plan

### Automated Tests
1. Run `npm test` in `backend/` (Risk Engine + AI Layer + Alert Service).
2. Test API endpoints:
   - `GET /api/alerts/:locationId`
   - `GET /api/alerts/:locationId/history`
   - `GET /api/emergency/:locationId`
3. Run `npm run build` in `frontend/`.

### Browser Verification
1. Test stations across all risk levels:
   - London (LOW) -> No alarming banner.
   - Nashik (MODERATE) -> Monitoring Advisory banner.
   - Mumbai (HIGH) -> High Risk banner with Flood tag.
   - Chamoli (CRITICAL) -> Critical Risk banner with Flood, Landslide, Seismic tags.
2. Verify emergency services and recent alerts update per station.
3. Test opt-in browser notifications.
