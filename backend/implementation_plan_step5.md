# Implementation Plan: Step 5 Explainable Disaster Risk Calculation Engine

Implement a deterministic, explainable mathematical disaster risk calculation engine on the Node.js/Express backend, exposing `POST /api/risk/calculate` with input validation, weighted multi-hazard modeling, and causal factor explanations.

## Proposed Changes

---

### Backend Services & Models

#### [NEW] [backend/src/services/riskEngine.service.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/riskEngine.service.js)
- Core risk calculation service with pure, exported functions:
  - `validateRiskInput(input)`: Validates required numeric ranges `[0, 100]`.
  - `calculateFloodRisk(input)`: Weighted sum (`rainfall * 0.40 + riverLevel * 0.30 + elevation * 0.10 + historicalRisk * 0.20`).
  - `calculateLandslideRisk(input)`: Weighted sum (`rainfall * 0.30 + slope * 0.35 + historicalRisk * 0.20 + elevation * 0.15`).
  - `calculateSeismicRisk(input)`: Weighted sum (`seismicActivity * 0.60 + historicalRisk * 0.40`).
  - `calculateOverallRisk(risks)`: Weighted sum (`floodRisk * 0.40 + landslideRisk * 0.35 + seismicRisk * 0.25`).
  - `getRiskLevel(score)`: Maps scores to `LOW` (0-25), `MODERATE` (26-50), `HIGH` (51-75), `CRITICAL` (76-100).
  - `extractContributingFactors(input)`: Generates structured, explainable causal drivers based on input values.
  - `calculateAllRisks(input)`: Aggregates all hazard sub-scores, overall score, and contributing factors.

#### [NEW] [backend/src/services/riskEngine.test.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/riskEngine.test.js)
- Standalone test suite verifying:
  - Test 1: Low inputs (all ~10-20) -> Low overall & hazard risks.
  - Test 2: High flood conditions -> Elevated flood risk.
  - Test 3: High landslide conditions -> Elevated landslide risk.
  - Test 4: High seismic conditions -> Elevated seismic risk.
  - Test 5: Input validation & boundary checks (0, 100, negatives, >100, non-numeric).

---

### Backend Controllers & Routes

#### [MODIFY] [backend/src/controllers/risk.controller.js](file:///e:/PROJECTS/HACKHATHON/backend/src/controllers/risk.controller.js)
- Add `calculateRisk` controller for `POST /api/risk/calculate`.
- Validate request body using `validateRiskInput`.
- Return 400 with structured validation errors if invalid.
- Return 200 with calculated risk data if valid.
- Preserve existing `getRiskByLocationId` controller.

#### [MODIFY] [backend/src/routes/risk.routes.js](file:///e:/PROJECTS/HACKHATHON/backend/src/routes/risk.routes.js)
- Mount `POST /calculate` pointing to `calculateRisk`.
- Preserve `GET /:locationId`.

#### [MODIFY] [backend/package.json](file:///e:/PROJECTS/HACKHATHON/backend/package.json)
- Add `"test": "node src/services/riskEngine.test.js"`.

---

### Frontend API Client

#### [MODIFY] [frontend/src/services/api.js](file:///e:/PROJECTS/HACKHATHON/frontend/src/services/api.js)
- Export `calculateRisk(inputPayload)` method to call `POST /risk/calculate`.

---

## Verification Plan

### Automated Tests
1. Run `npm test` in `backend/` to execute `riskEngine.test.js`.
2. Test `POST http://localhost:5000/api/risk/calculate` with valid data, boundary data (0, 100), and invalid inputs via HTTP scripts.
3. Test existing endpoints `GET /api/health`, `GET /api/locations`, `GET /api/risk/:locationId` to verify zero regression.
4. Run `npm run build` in `frontend/` to confirm zero compilation errors.
