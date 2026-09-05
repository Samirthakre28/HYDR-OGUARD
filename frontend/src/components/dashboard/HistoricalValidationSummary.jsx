import React, { useState, useEffect } from "react";
import {
  History,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileText
} from "lucide-react";
import { getBacktestSummary, runBacktest } from "../../services/api";

export default function HistoricalValidationSummary() {
  const [backtestData, setBacktestData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("metrics"); // 'metrics' | 'scenarios' | 'provenance'

  const fetchBacktestSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getBacktestSummary(true);
      if (response && response.success) {
        setBacktestData(response.data);
      } else {
        setError(response?.message || "Failed to retrieve backtesting benchmark summary.");
      }
    } catch (err) {
      setError(err?.message || "Error connecting to backtesting service.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBacktestSummary();
  }, []);

  const metrics = backtestData?.metrics;
  const confusionMatrix = backtestData?.confusionMatrix;
  const scenarios = backtestData?.scenarios || [];
  const datasetProvenance = backtestData?.datasetProvenance;
  const evaluationStatus = backtestData?.evaluationStatus;

  const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return `${(val * 100).toFixed(1)}%`;
  };

  const getDatasetBadge = (type) => {
    switch (type) {
      case "HISTORICAL_REAL_EVENT":
        return { label: "Verified Real Event", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "SYNTHETIC_TEST_FIXTURE":
        return { label: "Synthetic Test Fixture", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "BENCHMARK_SCENARIO":
        return { label: "Calibration Benchmark", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: type || "Synthetic", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getLevelBadge = (level) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW":
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
  };

  const getMatrixClassificationBadge = (classification) => {
    switch (classification) {
      case "TP":
        return { label: "True Positive", bg: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 };
      case "TN":
        return { label: "True Negative", bg: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle2 };
      case "FP":
        return { label: "False Positive", bg: "bg-amber-100 text-amber-800 border-amber-300", icon: AlertTriangle };
      case "FN":
        return { label: "False Negative", bg: "bg-rose-100 text-rose-800 border-rose-300", icon: XCircle };
      default:
        return { label: "Unlabeled", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: Info };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shadow-xs">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-800">Historical Validation & Backtesting</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Deterministic Engine v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated offline scenario backtesting against historical & synthetic disaster benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={fetchBacktestSummary}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            title="Re-run backtest suite against benchmark fixtures"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Evaluating..." : "Run Backtest"}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>{isExpanded ? "Collapse" : "Explore Details"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level Benchmark Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Scenarios Evaluated */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Scenarios</div>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {backtestData ? backtestData.totalScenarios : "—"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {backtestData?.labeledScenarios || 0} labeled / {backtestData?.unlabeledScenarios || 0} unlabeled
          </div>
        </div>

        {/* Engine Accuracy */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
          <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Accuracy</div>
          <div className="text-xl font-bold text-indigo-900 mt-1">
            {metrics?.accuracy !== null ? formatPercent(metrics?.accuracy) : "N/A"}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">
            {evaluationStatus === "EVALUATED" ? "Verified against test set" : "Sample size < 5"}
          </div>
        </div>

        {/* Engine Precision */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Precision (Elevated)</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">
            {metrics?.precision !== null ? formatPercent(metrics?.precision) : "N/A"}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            TP / (TP + FP)
          </div>
        </div>

        {/* Engine Recall (Sensitivity) */}
        <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
          <div className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">Recall / Sensitivity</div>
          <div className="text-xl font-bold text-purple-900 mt-1">
            {metrics?.recall !== null ? formatPercent(metrics?.recall) : "N/A"}
          </div>
          <div className="text-[10px] text-purple-600 mt-0.5">
            TP / (TP + FN)
          </div>
        </div>
      </div>

      {/* Insufficient Sample Size Warning if applicable */}
      {evaluationStatus === "INSUFFICIENT_SAMPLE" && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice on Statistical Metrics:</span> Labeled sample size is less than 5. Statistical metrics require sufficient labeled samples to avoid misleading conclusions.
          </div>
        </div>
      )}

      {/* Expanded Details Section */}
      {isExpanded && backtestData && (
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex space-x-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "metrics"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Confusion Matrix & Metrics
            </button>
            <button
              onClick={() => setActiveTab("scenarios")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "scenarios"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Scenario Breakdown ({scenarios.length})
            </button>
            <button
              onClick={() => setActiveTab("provenance")}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "provenance"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Dataset Provenance & Limits
            </button>
          </div>

          {/* TAB 1: Confusion Matrix & Detailed Metrics */}
          {activeTab === "metrics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Confusion Matrix Table */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Confusion Matrix (Threshold: Score ≥ 51)</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      Sample Size: {confusionMatrix?.sampleSize || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3 bg-emerald-100/70 border border-emerald-200 rounded-lg">
                      <div className="text-[10px] font-semibold text-emerald-800">True Positives (TP)</div>
                      <div className="text-lg font-bold text-emerald-900 mt-0.5">{confusionMatrix?.truePositives || 0}</div>
                      <div className="text-[9px] text-emerald-700">Actual Elevated &rarr; Predicted Elevated</div>
                    </div>
                    <div className="p-3 bg-amber-100/70 border border-amber-200 rounded-lg">
                      <div className="text-[10px] font-semibold text-amber-800">False Positives (FP)</div>
                      <div className="text-lg font-bold text-amber-900 mt-0.5">{confusionMatrix?.falsePositives || 0}</div>
                      <div className="text-[9px] text-amber-700">Actual Low &rarr; Predicted Elevated</div>
                    </div>
                    <div className="p-3 bg-rose-100/70 border border-rose-200 rounded-lg">
                      <div className="text-[10px] font-semibold text-rose-800">False Negatives (FN)</div>
                      <div className="text-lg font-bold text-rose-900 mt-0.5">{confusionMatrix?.falseNegatives || 0}</div>
                      <div className="text-[9px] text-rose-700">Actual Elevated &rarr; Predicted Low</div>
                    </div>
                    <div className="p-3 bg-blue-100/70 border border-blue-200 rounded-lg">
                      <div className="text-[10px] font-semibold text-blue-800">True Negatives (TN)</div>
                      <div className="text-lg font-bold text-blue-900 mt-0.5">{confusionMatrix?.trueNegatives || 0}</div>
                      <div className="text-[9px] text-blue-700">Actual Low &rarr; Predicted Low</div>
                    </div>
                  </div>
                </div>

                {/* Metric Summary Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">Performance Metrics</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Accuracy:</span>
                        <span className="font-bold text-slate-800">{formatPercent(metrics?.accuracy)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Precision:</span>
                        <span className="font-bold text-slate-800">{formatPercent(metrics?.precision)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">Recall / Sensitivity:</span>
                        <span className="font-bold text-slate-800">{formatPercent(metrics?.recall)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">F1-Score:</span>
                        <span className="font-bold text-slate-800">{formatPercent(metrics?.f1Score)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    Execution time: {backtestData.executionTimeMs}ms • Batch timestamp: {new Date(backtestData.evaluatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Scenario Breakdown */}
          {activeTab === "scenarios" && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {scenarios.map((sc, idx) => {
                const matrixBadge = getMatrixClassificationBadge(sc.matrixClassification);
                const MatrixIcon = matrixBadge.icon;
                const dTypeBadge = getDatasetBadge(sc.datasetType);
                return (
                  <div
                    key={sc.scenarioId || idx}
                    className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{sc.scenarioName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${dTypeBadge.bg}`}>
                          {dTypeBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${matrixBadge.bg}`}>
                          <MatrixIcon className="w-3 h-3" />
                          <span>{matrixBadge.label}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelBadge(sc.predictedRiskLevel)}`}>
                          {sc.predictedRiskLevel} ({sc.predictedRiskScore}/100)
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">{sc.description}</div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[10px] text-slate-500">
                      <div className="p-1 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400">Rainfall:</span> {sc.inputs?.rainfall ?? "—"} mm
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400">River:</span> {sc.inputs?.riverLevel ?? "—"} m
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400">Seismic:</span> {sc.inputs?.seismicActivity ?? "—"} g
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400">Slope:</span> {sc.inputs?.slope ?? "—"}°
                      </div>
                      <div className="p-1 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400">Elevation:</span> {sc.inputs?.elevation ?? "—"} m
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Ground Truth: {sc.groundTruthLabel || "UNLABELED"}</span>
                      <span>Location: {sc.locationName || `${sc.coordinates?.lat}, ${sc.coordinates?.lon}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Dataset Provenance & Limits */}
          {activeTab === "provenance" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Dataset Provenance & Scientific Guardrails</span>
              </div>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Important Scientific Validation Disclaimer</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Historical backtesting evaluates the deterministic rule engine against simulated edge-cases and benchmark scenarios. Backtesting metrics represent algorithmic alignment with defined hazard thresholds and do NOT guarantee real-world disaster prediction certainty.
                </p>
              </div>

              <div className="space-y-1.5 text-slate-600 text-xs">
                <div className="font-semibold text-slate-700">Dataset Sources:</div>
                <div className="pl-2 border-l-2 border-indigo-200 space-y-1">
                  <div><strong>Synthetic Test Fixtures:</strong> Deterministic synthetic meteorological & geophysical scenarios designed to test critical saturation, high-seismic, and baseline dry-season conditions.</div>
                  <div><strong>Risk Threshold:</strong> Standard elevated threshold is set at Overall Risk Score &ge; 51 (High / Critical).</div>
                  <div><strong>Metric Integrity:</strong> Zero-denominator divisions safely evaluate to null without fabricated confidence scores or ungrounded machine learning claims.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
