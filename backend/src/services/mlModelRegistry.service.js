/**
 * HydroGuard - Future ML Model Registry
 *
 * NOTE: This is a safe architectural abstraction for model registry and lifecycle
 * management. HydroGuard does NOT currently deploy or run a production ML model.
 * The production risk calculation remains 100% deterministic and explainable.
 */

export const ML_STATUS = {
  NOT_DEPLOYED: "NOT_DEPLOYED",
  SHADOW: "SHADOW",
  CANDIDATE: "CANDIDATE",
  PRODUCTION: "PRODUCTION"
};

export const ALLOWED_HAZARDS = ["flood", "landslide", "seismic", "overall"];

/**
 * 12 Model Safety Gates required for any model to be promoted beyond NOT_DEPLOYED.
 */
export const SAFETY_GATES = [
  "VALID_MODEL_ARTIFACT",
  "VALID_MODEL_VERSION",
  "VALID_FEATURE_SCHEMA",
  "VERIFIED_TRAINING_DATASET",
  "TEMPORAL_HOLDOUT_EVALUATION",
  "MINIMUM_SAMPLE_SIZE",
  "ACCEPTABLE_RECALL",
  "ACCEPTABLE_FALSE_NEGATIVE_RATE",
  "NO_SEVERE_DATA_LEAKAGE",
  "REPRODUCIBLE_EVALUATION",
  "MODEL_METADATA_COMPLETE",
  "HUMAN_REVIEW_APPROVAL"
];

// In-memory model registry storage
const registry = new Map();
let activeModelKey = null;

/**
 * Generates registry composite key
 * @param {string} modelId
 * @param {string} version
 * @returns {string}
 */
function makeKey(modelId, version) {
  return `${modelId}@${version}`;
}

/**
 * Registers a model specification with metadata in the registry.
 * @param {Object} metadata
 * @returns {Object} Registered model record
 */
export function registerModel(metadata) {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("Model metadata must be a valid object.");
  }

  const { modelId, version, featureSchemaVersion, targetHazard, datasetVersion } = metadata;

  if (!modelId || typeof modelId !== "string" || !modelId.trim()) {
    throw new Error("Missing required field 'modelId'.");
  }

  if (!version || typeof version !== "string" || !version.trim()) {
    throw new Error("Missing required field 'version'.");
  }

  if (!featureSchemaVersion || typeof featureSchemaVersion !== "string") {
    throw new Error("Missing required field 'featureSchemaVersion'.");
  }

  if (!targetHazard || !ALLOWED_HAZARDS.includes(targetHazard)) {
    throw new Error(`Invalid targetHazard: '${targetHazard}'. Must be one of: ${ALLOWED_HAZARDS.join(", ")}`);
  }

  if (!datasetVersion || typeof datasetVersion !== "string") {
    throw new Error("Missing required field 'datasetVersion'.");
  }

  const key = makeKey(modelId.trim(), version.trim());

  const record = {
    modelId: modelId.trim(),
    version: version.trim(),
    status: metadata.status && Object.values(ML_STATUS).includes(metadata.status) ? metadata.status : ML_STATUS.NOT_DEPLOYED,
    featureSchemaVersion: featureSchemaVersion.trim(),
    targetHazard,
    datasetVersion: datasetVersion.trim(),
    description: metadata.description || "Future machine learning risk model placeholder",
    trainedAt: metadata.trainedAt || null,
    metrics: metadata.metrics || null,
    safetyGatesPassed: Array.isArray(metadata.safetyGatesPassed) ? [...metadata.safetyGatesPassed] : [],
    registeredAt: new Date().toISOString(),
    isSynthetic: Boolean(metadata.isSynthetic)
  };

  registry.set(key, record);
  return { ...record };
}

/**
 * Retrieves a registered model by ID and version.
 * @param {string} modelId
 * @param {string} version
 * @returns {Object|null}
 */
export function getModel(modelId, version) {
  if (!modelId || !version) return null;
  const key = makeKey(modelId.trim(), version.trim());
  const record = registry.get(key);
  return record ? { ...record } : null;
}

/**
 * Returns list of all registered models (sanitized metadata).
 * @returns {Array<Object>}
 */
export function listModels() {
  return Array.from(registry.values()).map((model) => ({
    modelId: model.modelId,
    version: model.version,
    status: model.status,
    featureSchemaVersion: model.featureSchemaVersion,
    targetHazard: model.targetHazard,
    datasetVersion: model.datasetVersion,
    description: model.description,
    trainedAt: model.trainedAt,
    metrics: model.metrics,
    registeredAt: model.registeredAt
  }));
}

/**
 * Returns currently active production or candidate model, or null if none active.
 * @returns {Object|null}
 */
export function getActiveModel() {
  if (!activeModelKey) return null;
  const record = registry.get(activeModelKey);
  return record ? { ...record } : null;
}

/**
 * Evaluates safety gates and promotes a model to target status.
 * @param {string} modelId
 * @param {string} version
 * @param {string} targetStatus - "SHADOW" | "CANDIDATE" | "PRODUCTION"
 * @param {Object} validationReport - Results of holdout evaluation and safety verification
 * @returns {{ success: boolean, status: string, passedGates: string[], failedGates: string[], message: string }}
 */
export function promoteModel(modelId, version, targetStatus, validationReport = {}) {
  const model = getModel(modelId, version);
  if (!model) {
    throw new Error(`Model '${modelId}@${version}' not found in registry.`);
  }

  if (!Object.values(ML_STATUS).includes(targetStatus)) {
    throw new Error(`Invalid target status: '${targetStatus}'.`);
  }

  // Check safety gates
  const passedGates = [];
  const failedGates = [];

  for (const gate of SAFETY_GATES) {
    if (validationReport[gate] === true) {
      passedGates.push(gate);
    } else {
      failedGates.push(gate);
    }
  }

  // All 12 safety gates must pass to reach PRODUCTION or CANDIDATE
  if (targetStatus === ML_STATUS.PRODUCTION || targetStatus === ML_STATUS.CANDIDATE) {
    if (failedGates.length > 0) {
      return {
        success: false,
        status: model.status,
        passedGates,
        failedGates,
        message: `Model promotion to ${targetStatus} rejected. Missing ${failedGates.length} safety gates: ${failedGates.join(", ")}`
      };
    }

    // Must not be a synthetic test model for production
    if (model.isSynthetic) {
      return {
        success: false,
        status: model.status,
        passedGates,
        failedGates: [...failedGates, "NON_SYNTHETIC_REQUIREMENT"],
        message: "Promotion rejected: Models trained on synthetic fixtures cannot be deployed to PRODUCTION."
      };
    }
  }

  // Update status in registry
  const key = makeKey(modelId, version);
  const updated = {
    ...registry.get(key),
    status: targetStatus,
    safetyGatesPassed: passedGates,
    promotedAt: new Date().toISOString()
  };

  registry.set(key, updated);

  if (targetStatus === ML_STATUS.PRODUCTION || targetStatus === ML_STATUS.CANDIDATE) {
    activeModelKey = key;
  }

  return {
    success: true,
    status: targetStatus,
    passedGates,
    failedGates: [],
    message: `Model '${modelId}@${version}' successfully promoted to ${targetStatus}.`
  };
}

/**
 * Resets the in-memory registry (used for isolated testing).
 */
export function resetRegistry() {
  registry.clear();
  activeModelKey = null;
}

export default {
  ML_STATUS,
  ALLOWED_HAZARDS,
  SAFETY_GATES,
  registerModel,
  getModel,
  listModels,
  getActiveModel,
  promoteModel,
  resetRegistry
};
