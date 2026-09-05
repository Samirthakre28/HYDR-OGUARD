/**
 * HydroGuard - Demo Mode Controller (Step 20)
 *
 * Handles API requests for deterministic demo scenarios and risk evaluation.
 */

import {
  getDemoScenarios,
  getDemoScenarioById,
  runDemoScenario
} from "../services/demoScenario.service.js";

/**
 * Get all available deterministic demo scenarios.
 * GET /api/demo/scenarios
 */
export async function getScenarios(req, res, next) {
  try {
    const scenarios = getDemoScenarios();
    return res.status(200).json({
      success: true,
      data: scenarios,
      count: scenarios.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific demo scenario by ID.
 * GET /api/demo/scenarios/:scenarioId
 */
export async function getScenario(req, res, next) {
  try {
    const { scenarioId } = req.params;
    const scenario = getDemoScenarioById(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: `Demo scenario '${scenarioId}' not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: scenario
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Run a demo scenario through the existing deterministic Risk Engine.
 * POST /api/demo/risk/:scenarioId
 */
export async function calculateDemoRisk(req, res, next) {
  try {
    const { scenarioId } = req.params;
    const result = runDemoScenario(scenarioId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || []
      });
    }
    next(error);
  }
}

export default {
  getScenarios,
  getScenario,
  calculateDemoRisk
};
