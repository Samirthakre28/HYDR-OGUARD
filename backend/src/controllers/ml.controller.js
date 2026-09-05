/**
 * HydroGuard - Future ML Architecture Controller
 *
 * Provides safe, read-only informational endpoints about future ML capabilities.
 * Does NOT expose internal secrets, file paths, or fake predictions.
 */

import { getModelStatus, getModelMetadata, FEATURE_SCHEMA } from "../services/mlRiskModel.service.js";
import { listModels } from "../services/mlModelRegistry.service.js";

/**
 * GET /api/ml/status
 * Returns current status of ML subsystem, active model information, and engine mode.
 */
export function getStatus(req, res, next) {
  try {
    const status = getModelStatus();
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ml/schema
 * Returns the formal feature input contract schema for future ML models.
 */
export function getFeatureSchema(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: FEATURE_SCHEMA
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ml/models
 * Returns the list of registered models in the registry (sanitized).
 */
export function getModels(req, res, next) {
  try {
    const models = listModels();
    return res.status(200).json({
      success: true,
      count: models.length,
      data: models
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getStatus,
  getFeatureSchema,
  getModels
};
