import React from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";

export default function DemoModeBanner({
  scenarios = [],
  selectedScenarioId,
  onSelectScenario,
  onRunScenario,
  onExitDemoMode,
  isLoading = false,
  error = null
}) {
  const currentScenario = scenarios.find((s) => s.scenarioId === selectedScenarioId) || scenarios[0];

  const getFocusBadge = (focus) => {
    switch (focus?.toUpperCase()) {
      case "FLOOD":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LANDSLIDE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "SEISMIC":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "MULTI_HAZARD":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "LOW":
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900/95 text-white rounded-2xl border border-purple-500/40 shadow-xl p-5 mb-6 backdrop-blur-md transition-all">
      {/* Top Bar: Demo Mode Branding & Exit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-500/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
            <FlaskConical className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-white tracking-wide">HydroGuard Demo Mode</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase tracking-wider">
                SYNTHETIC TEST DATA — NOT REAL-TIME DATA
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Isolated demonstration scenario pipeline — completely separated from real-time environmental sensors and live emergency alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={onExitDemoMode}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all hover:border-white/40 shadow-xs"
            title="Return to real-time live sensor pipeline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Live Mode</span>
          </button>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="mt-4">
        <div className="text-[11px] font-bold text-purple-200/90 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Select Deterministic Scenario:</span>
          <span className="text-[10px] text-purple-300/70 font-normal">
            Formula Invariant: calculateAllRisks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {scenarios.map((sc) => {
            const isSelected = sc.scenarioId === selectedScenarioId;
            return (
              <button
                key={sc.scenarioId}
                onClick={() => onSelectScenario(sc.scenarioId)}
                className={`p-2.5 rounded-xl text-left text-xs transition-all border ${
                  isSelected
                    ? "bg-purple-600/60 border-purple-300 text-white shadow-md ring-2 ring-purple-400/40"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-purple-100/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate text-[11px]">{sc.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getFocusBadge(sc.expectedHazardFocus)}`}>
                    {sc.expectedHazardFocus}
                  </span>
                </div>
                <div className="text-[10px] text-purple-200/70 truncate mt-1">
                  {sc.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Scenario Preview & Run Button */}
      {currentScenario && (
        <div className="mt-4 p-3.5 bg-black/30 border border-purple-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-purple-100">{currentScenario.name}</span>
              <span className="text-[10px] text-purple-300/70">• {currentScenario.description}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1 text-[10px] text-purple-200/80">
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">Rainfall:</span> {currentScenario.inputs?.rainfall}/100
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">River:</span> {currentScenario.inputs?.riverLevel}/100
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">Slope:</span> {currentScenario.inputs?.slope}/100
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">Elevation:</span> {currentScenario.inputs?.elevation}/100
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">Historical:</span> {currentScenario.inputs?.historicalRisk}/100
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded">
                <span className="text-purple-300/60">Seismic:</span> {currentScenario.inputs?.seismicActivity}/100
              </div>
            </div>
          </div>

          <button
            onClick={() => onRunScenario(currentScenario.scenarioId)}
            disabled={isLoading}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 shrink-0"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Evaluating Scenario..." : "Run Scenario"}</span>
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="mt-3 p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Provenance Disclaimer Footer */}
      <div className="mt-3 pt-2.5 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-purple-300/70 gap-2">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span><strong>Provenance:</strong> SYNTHETIC TEST DATA — NOT REAL-TIME DATA</span>
        </div>
        <div>
          Demo calculations do not trigger real browser notifications or mutate live location cache.
        </div>
      </div>
    </div>
  );
}
