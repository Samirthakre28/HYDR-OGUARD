# Implementation Plan: Step 7 AI-Powered Risk Explanation Layer

Implement a secure, explainable AI explanation service for TerraSafe AI that translates deterministic risk engine outputs into structured human-readable summaries, key drivers, safety actions, and warnings without altering or computing risk scores.

## Proposed Changes

---

### Backend Services & Configuration

#### [MODIFY] [backend/.env.example](file:///e:/PROJECTS/HACKHATHON/backend/.env.example)
- Add template variables:
  ```env
  AI_API_KEY=
  AI_MODEL=gemini-2.0-flash
  AI_API_URL=https://generativelanguage.googleapis.com/v1beta/models
  ```

#### [NEW] [backend/src/services/aiExplanation.service.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/aiExplanation.service.js)
- Strict prompt builder emphasizing read-only, non-predictive explanation.
- Universal HTTP-based AI caller supporting standard JSON response parsing with markdown fence stripping.
- Strict input validation function `validateAIInput(riskData)` ensuring non-null, numeric (0-100) scores and valid risk levels before invoking LLMs.
- Resilient error handling returning structured error objects without crashing the server.

#### [NEW] [backend/src/services/aiExplanation.test.js](file:///e:/PROJECTS/HACKHATHON/backend/src/services/aiExplanation.test.js)
- Test suite validating:
  - Validation rules (rejecting missing data, invalid scores, malformed structures).
  - Unconfigured API key behavior.
  - JSON parsing with markdown codeblock wrappers.
  - Safety recommendation matching.

#### [MODIFY] [backend/package.json](file:///e:/PROJECTS/HACKHATHON/backend/package.json)
- Update test script to run both `riskEngine.test.js` and `aiExplanation.test.js`.

---

### Backend Controllers & Routes

#### [MODIFY] [backend/src/controllers/risk.controller.js](file:///e:/PROJECTS/HACKHATHON/backend/src/controllers/risk.controller.js)
- Add `getRiskExplanation` controller for `POST /api/risk/explanation`.
- Validate input using `validateAIInput`.
- Call `generateRiskExplanation` and return structured explanation data or clean error response.

#### [MODIFY] [backend/src/routes/risk.routes.js](file:///e:/PROJECTS/HACKHATHON/backend/src/routes/risk.routes.js)
- Mount `POST /explanation` pointing to `getRiskExplanation`.

---

### Frontend Components & State

#### [MODIFY] [frontend/src/services/api.js](file:///e:/PROJECTS/HACKHATHON/frontend/src/services/api.js)
- Add `getRiskExplanation(riskData, signal)` supporting `AbortController`.

#### [NEW] [frontend/src/components/dashboard/AIRiskExplanation.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/components/dashboard/AIRiskExplanation.jsx)
- AI Risk Assessment panel displaying:
  - Header with Sparkles / Brain icon & AI badge
  - Situation Summary
  - Key Drivers list
  - Recommended Safety Actions checklist
  - Dynamic Warning Banner matching risk severity
  - Transparency disclaimer note
  - Polished loading skeleton and unconfigured/error fallback card

#### [MODIFY] [frontend/src/pages/Dashboard.jsx](file:///e:/PROJECTS/HACKHATHON/frontend/src/pages/Dashboard.jsx)
- Embed `AIRiskExplanation` into the dashboard grid layout.
- Coordinate state and request aborting on location change.

---

## Verification Plan

### Automated Tests
1. Run `npm test` in `backend/` to execute all unit tests.
2. Test `POST /api/risk/explanation` with valid risk data, malformed payloads (400), and unconfigured keys.
3. Test `GET /api/risk/:locationId` and existing endpoints for zero regression.

### Browser / Visual Verification
1. Run `npm run build` in `frontend/` to confirm zero build errors.
2. Inspect `http://localhost:5174/` using `browser_subagent`.
3. Verify `AIRiskExplanation` renders cleanly with loading state, transparency disclaimer, and location switching responsiveness.
