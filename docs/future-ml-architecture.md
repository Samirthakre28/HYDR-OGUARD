# HydroGuard — Future ML Architecture & Scientific Model Boundary

> [!IMPORTANT]
> **Authoritative Statement on Machine Learning:**
> **HydroGuard does not currently use a production ML model. The current risk score is generated exclusively by the deterministic, explainable Risk Engine.**
> HydroGuard makes no claims that "ML predicts earthquakes", that "AI predicts exactly when a disaster will happen", or that any disaster score is "100% accurate or scientifically proven".

---

## 1. Current Deterministic Production Engine

The core production scoring system in HydroGuard is a transparent, deterministic mathematical MVP engine. It computes localized hazard sub-scores and aggregated multi-hazard risk scores via transparent weighted combinations of normalized environmental and physical inputs (range 0–100):

* **Flood Risk:** $\text{Rainfall} \times 40\% + \text{River Level} \times 30\% + \text{Elevation} \times 10\% + \text{Historical Risk} \times 20\%$
* **Landslide Risk:** $\text{Rainfall} \times 30\% + \text{Slope} \times 35\% + \text{Historical Risk} \times 20\% + \text{Elevation} \times 15\%$
* **Seismic Risk:** $\text{Seismic Activity} \times 60\% + \text{Historical Recurrence} \times 40\%$
* **Overall Risk:** $\text{Flood Risk} \times 40\% + \text{Landslide Risk} \times 35\% + \text{Seismic Risk} \times 25\%$

This engine is authoritative, fully explainable, unit-tested, and operates with zero runtime dependency on external ML frameworks.

---

## 2. Future Machine Learning Boundary & Decision Policy

To accommodate future scientific research without compromising operational reliability, HydroGuard enforces a strict architectural boundary between the deterministic engine and prospective ML models:

```
                  ┌──────────────────────────────────────────────┐
                  │          Validated Input Telemetry           │
                  │ (Live Weather, GloFAS River, USGS, Terrain)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │  Deterministic Engine   │                 │     Future ML Model     │
      │  (Authoritative MVP)    │                 │ (Shadow / Research Only)│
      └────────────┬────────────┘                 └────────────┬────────────┘
                   │                                           │
                   │ [Authoritative Score]                     │ [Experimental Output]
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │  Comparison / Shadow Layer    │
                         │   (Delta Logging & Metrics)   │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │        Decision Policy        │
                         │ (Authoritative: Deterministic)│
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │  Downstream AI Explanation    │
                         │    & Emergency Recommendations│
                         └───────────────────────────────┘
```

### Policy Invariant
* **Decision Policy for MVP:** Always evaluates to the **Deterministic Engine**.
* Future ML models operate strictly in **Research / Shadow Mode** and cannot alter or override user-facing risk scores or emergency alerts until they pass all 12 Model Safety Gates and receive explicit human/scientific certification.

---

## 3. Normalized Model Input Contract

All future ML models must consume signals adhering strictly to the documented JSON contract. Signals must originate from legitimate sensor providers or geospatial databases without synthetic fabrication.

```json
{
  "schemaVersion": "1.0.0",
  "location": {
    "locationId": "loc-tokyo-001",
    "latitude": 35.6762,
    "longitude": 139.6503
  },
  "signals": {
    "rainfall": {
      "value": 45.2,
      "normalizedValue": 58,
      "unit": "mm",
      "source": "weather/open-meteo",
      "observedAt": "2026-09-04T12:00:00.000Z"
    },
    "riverLevel": {
      "value": 4.1,
      "normalizedValue": 62,
      "unit": "m",
      "source": "hydrology/glofas-open-meteo",
      "observedAt": "2026-09-04T12:00:00.000Z"
    },
    "slope": {
      "value": 18.5,
      "normalizedValue": 45,
      "unit": "degrees",
      "source": "geographic/terrain-elevation",
      "observedAt": "2026-09-04T00:00:00.000Z"
    },
    "elevation": {
      "value": 12.0,
      "normalizedValue": 30,
      "unit": "m",
      "source": "geographic/terrain-elevation",
      "observedAt": "2026-09-04T00:00:00.000Z"
    },
    "historicalRisk": {
      "value": 65,
      "normalizedValue": 65,
      "unit": "score",
      "source": "historical/disaster-catalog",
      "observedAt": "2026-09-01T00:00:00.000Z"
    },
    "seismicActivity": {
      "value": 20,
      "normalizedValue": 20,
      "unit": "normalized",
      "source": "seismic/usgs-catalog",
      "observedAt": "2026-09-04T12:00:00.000Z"
    }
  },
  "generatedAt": "2026-09-04T12:05:00.000Z"
}
```

---

## 4. Feature Contract & Schema

| Feature Name | Source | Unit | Normalization Formula | Expected Range | Max TTL | Missing Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rainfall_normalized` | Open-Meteo API | mm/hr | Min-Max (0–100mm/hr) | `[0, 100]` | 15 min | Flag `UNAVAILABLE` & Reject |
| `river_level_normalized` | GloFAS / Flood API | meters | Threshold Tier Mapping | `[0, 100]` | 15 min | Flag `UNAVAILABLE` & Reject |
| `slope_normalized` | Digital Elevation Model | degrees | Incline Angle Mapping | `[0, 100]` | 24 hours | Flag `UNAVAILABLE` & Reject |
| `elevation_normalized` | Digital Elevation Model | meters | Sea Level Inversion | `[0, 100]` | 24 hours | Flag `UNAVAILABLE` & Reject |
| `historical_risk_normalized` | EM-DAT / Local Records | score | Disaster Count Recurrence | `[0, 100]` | 7 days | Flag `UNAVAILABLE` & Reject |
| `seismic_activity_normalized` | USGS Earthquake API | count/mag | Magnitude-Proximity Index | `[0, 100]` | 15 min | Flag `UNAVAILABLE` & Reject |

---

## 5. Training Dataset Contract & Provenance

Future training datasets must be compiled from verified historical records and validated environmental archives.

### Training Record Schema
```json
{
  "datasetVersion": "v1.0-verified-historical",
  "recordId": "rec-2023-shimla-001",
  "locationId": "loc-shimla-001",
  "observedAt": "2023-08-14T06:00:00.000Z",
  "features": {
    "rainfall_normalized": 88,
    "river_level_normalized": 82,
    "slope_normalized": 85,
    "elevation_normalized": 70,
    "historical_risk_normalized": 75,
    "seismic_activity_normalized": 10
  },
  "label": {
    "hazard": "landslide",
    "occurred": true,
    "severity": "CRITICAL",
    "source": "Disaster Management Authority Post-Event Report (Ref: DMA-2023-882)",
    "verifiedAt": "2023-08-20T10:00:00.000Z"
  },
  "provenanceType": "VERIFIED_HISTORICAL_DATA"
}
```

### Strict Provenance Separation
* `VERIFIED_HISTORICAL_DATA`: Real-world sensor logs paired with verified post-disaster government reports.
* `SYNTHETIC_TEST_FIXTURE`: Step 19 backtesting scenarios used exclusively for deterministic unit and integration test verification.
* **Prohibition:** Synthetic fixtures must NEVER be fed into an ML training set or labeled as verified historical ground truth.

---

## 6. Data Leakage Protection & Temporal Splitting

To prevent overfitting and false validation optimism, future ML model training and evaluation must adhere to the following rules:

1. **Strict Temporal Splitting:** Train, validation, and test sets must be split chronologically (e.g., Train: 2010–2022, Validation: 2023, Test: 2024–2025). Random K-Fold cross-validation is prohibited as it causes future observations to leak into past predictions.
2. **Event Isolation:** Multi-station telemetry from the same disaster event must never be split across both training and test sets.
3. **No Post-Event Features:** Signals recorded after the onset of a disaster (such as post-flood river surge or emergency dispatch count) cannot be used as predictor features.
4. **No Self-Derived Labels:** Risk Engine output scores must never be used as training labels for an ML model. Ground truth must come from verified real-world occurrence records.

---

## 7. Model Versioning & Registry Abstraction

The Model Registry (`backend/src/services/mlModelRegistry.service.js`) manages model metadata and lifecycle states:

```
[ NOT_DEPLOYED ] ──(Safety Gates Passed)──> [ SHADOW ] ──(Candidate Eval)──> [ CANDIDATE ] ──(Human Review)──> [ PRODUCTION ]
```

### Metadata Specification
```json
{
  "modelId": "hydroguard-flood-xgboost",
  "version": "1.0.0-rc1",
  "status": "NOT_DEPLOYED",
  "targetHazard": "flood",
  "featureSchemaVersion": "1.0.0",
  "datasetVersion": "glofas-historical-v2.1",
  "trainedAt": "2026-06-01T00:00:00.000Z",
  "metrics": {
    "precision": 0.84,
    "recall": 0.92,
    "f1Score": 0.88,
    "prAuc": 0.91,
    "falseNegativeRate": 0.08
  },
  "safetyGatesPassed": []
}
```

---

## 8. Safety-Critical Evaluation Metrics

In disaster early warning, **Recall and False-Negative Rate are safety-critical**:
* A **False Positive** (false alarm) causes inconvenience and temporary resource deployment.
* A **False Negative** (missed disaster) risks catastrophic loss of human life and infrastructure.

Required Evaluation Suite:
* **Recall (Sensitivity):** $\frac{\text{TP}}{\text{TP} + \text{FN}} \ge \text{Safety Threshold}$
* **False Negative Rate:** $\frac{\text{FN}}{\text{TP} + \text{FN}}$ (must be strictly minimized)
* **Precision & F1-Score:** To maintain warning credibility and prevent alert fatigue.
* **PR-AUC (Precision-Recall Area Under Curve):** Evaluated over highly imbalanced disaster datasets.
* **Reliability / Calibration Curves:** Ensuring predicted probabilities reflect true empirical occurrence rates.

---

## 9. The 12 Model Safety Gates

Before any registered model can be promoted to `CANDIDATE` or `PRODUCTION`, it must satisfy all 12 gates:

1. `VALID_MODEL_ARTIFACT`: Checksum-verified model weights and serialization files.
2. `VALID_MODEL_VERSION`: Semantic versioning mapped to training code commits.
3. `VALID_FEATURE_SCHEMA`: 100% compliance with `FEATURE_SCHEMA` v1.0.0.
4. `VERIFIED_TRAINING_DATASET`: Ground-truth datasets sourced from certified authorities.
5. `TEMPORAL_HOLDOUT_EVALUATION`: Tested on completely unseen future chronological holdouts.
6. `MINIMUM_SAMPLE_SIZE`: Validated against statistically significant sample size ($N \ge 1,000$).
7. `ACCEPTABLE_RECALL`: Disaster recall meets safety-critical thresholds.
8. `ACCEPTABLE_FALSE_NEGATIVE_RATE`: False-negative rate verified below risk tolerance.
9. `NO_SEVERE_DATA_LEAKAGE`: Audit confirmation of temporal and feature independence.
10. `REPRODUCIBLE_EVALUATION`: Automated CI/CD pipeline reproduces identical metrics.
11. `MODEL_METADATA_COMPLETE`: Provenance, training hyper-parameters, and data lineage documented.
12. `HUMAN_REVIEW_APPROVAL`: Formal sign-off by geotechnical and hydrological subject matter experts.

---

## 10. Shadow Mode Operation

In future shadow mode (`ML_MODE=shadow`):
* The deterministic engine continues serving live users and driving alerts.
* The ML predictor runs asynchronously in the background.
* Telemetry, deterministic score, ML prediction, and performance deltas are logged for scientific review.
* ML output is completely decoupled from user UI and cannot trigger emergency alarms.

---

## 11. Fail-Safe Fallback Guarantees

If any of the following occur during an ML evaluation:
* Model service unreachable or timeout (>500ms)
* Missing or malformed input signal
* Stale environmental telemetry (exceeded TTL)
* Model output schema validation failure
* Probability outside $[0.0, 1.0]$

**Fallback Rule:** The system immediately and gracefully defaults to the **Deterministic Risk Engine**. No synthetic score or random fallback value is ever fabricated.

---

## 12. Downstream AI Explanation Boundary

The AI explanation layer (LLM summary generator) is positioned strictly downstream of scoring:
* AI generates natural-language synthesis of validated telemetry and deterministic contributing drivers.
* AI **never** trains ML models, **never** alters risk calculations, and **never** predicts future disasters independently.

---

## 13. API & Configuration

* `GET /api/ml/status` — Returns ML readiness, mode (`disabled`), and active model status.
* `GET /api/ml/schema` — Returns the formal Feature Contract schema.
* `GET /api/ml/models` — Lists registered models in the model registry.
* Environment: `ML_MODE=disabled`, `ML_MODEL_ID=`, `ML_MODEL_VERSION=`.

---

## 14. What Is NOT Implemented Today (Honest Transparency)

* **No ML weights are trained or bundled.**
* **No deep learning or tree-based models are loaded.**
* **No synthetic ML scores or mock probabilities are generated.**
* **All production risk evaluations remain 100% deterministic.**
