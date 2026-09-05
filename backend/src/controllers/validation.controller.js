/**
 * HydroGuard - Historical Validation & Backtesting Controller (Step 19)
 */

import {
  evaluateBacktestBatch,
  getSyntheticTestFixtures
} from "../services/historicalValidation.service.js";

export const MAX_BACKTEST_SCENARIOS = 50;

/**
 * @desc    Run historical backtest against an array of environmental scenarios
 * @route   POST /api/validation/backtest
 * @access  Public
 */
export const runBacktest = async (req, res, next) => {
  try {
    const { scenarios, includeSyntheticDefault = false, minSamples } = req.body || {};

    let targetScenarios = [];

    if (Array.isArray(scenarios) && scenarios.length > 0) {
      if (scenarios.length > MAX_BACKTEST_SCENARIOS) {
        return res.status(400).json({
          success: false,
          errorType: "BAD_REQUEST",
          message: `Scenario batch exceeds maximum limit of ${MAX_BACKTEST_SCENARIOS} scenarios per request to prevent resource exhaustion.`
        });
      }
      targetScenarios = scenarios;
    } else if (includeSyntheticDefault) {
      targetScenarios = getSyntheticTestFixtures();
    } else {
      return res.status(400).json({
        success: false,
        errorType: "BAD_REQUEST",
        message: "No scenarios provided. Submit an array of historical scenarios or pass includeSyntheticDefault: true for test fixtures."
      });
    }

    const report = evaluateBacktestBatch(targetScenarios, { minSamples });

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get summary of historical validation benchmarks and dataset status
 * @route   GET /api/validation/backtest/summary
 * @access  Public
 */
export const getBacktestSummary = async (req, res, next) => {
  try {
    const useSynthetic = req.query.includeSynthetic === "true";

    if (useSynthetic) {
      const syntheticScenarios = getSyntheticTestFixtures();
      const report = evaluateBacktestBatch(syntheticScenarios);

      return res.status(200).json({
        success: true,
        data: {
          ...report,
          datasetProvenance: "SYNTHETIC_TEST_FIXTURES",
          disclaimer: "Demonstration evaluation metrics computed on synthetic test fixtures only. Excluded from real-world performance claims."
        }
      });
    }

    // Default: Return honest status that no external verified historical dataset is currently mounted
    return res.status(200).json({
      success: true,
      data: {
        status: "OK",
        evaluationStatus: "NO_VERIFIED_HISTORICAL_DATA",
        sampleSize: 0,
        labeledSamples: 0,
        containsSyntheticData: false,
        hazards: {
          flood: { labeledSamples: 0, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0, precision: null, recall: null, f1: null },
          landslide: { labeledSamples: 0, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0, precision: null, recall: null, f1: null },
          seismic: { labeledSamples: 0, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0, precision: null, recall: null, f1: null },
          overall: { labeledSamples: 0, truePositives: 0, trueNegatives: 0, falsePositives: 0, falseNegatives: 0, precision: null, recall: null, f1: null }
        },
        limitations: [
          "No verified historical disaster dataset is currently mounted in the active database.",
          "Synthetic benchmark scenarios are available for validation testing via ?includeSynthetic=true.",
          "HydroGuard does not claim predictive certainty or disaster forecasting guarantees."
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  runBacktest,
  getBacktestSummary
};
