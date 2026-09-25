import React from "react";
import {
  CloudRain,
  TrendingUp,
  Compass,
  History,
  Activity,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers
} from "lucide-react";

export default function RiskFactors({ factors = [], isLoading }) {
  const getFactorIcon = (factorName) => {
    const name = (factorName || "").toLowerCase();
    if (name.includes("rainfall")) return CloudRain;
    if (name.includes("river") || name.includes("discharge")) return TrendingUp;
    if (name.includes("slope") || name.includes("terrain")) return Compass;
    if (name.includes("historical")) return History;
    if (name.includes("seismic")) return Activity;
    return AlertCircle;
  };

  const getSeverityBadge = (impact) => {
    switch (impact?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-600 text-white border-rose-700 shadow-xs";
      case "HIGH":
        return "bg-orange-600 text-white border-orange-700 shadow-xs";
      case "MODERATE":
        return "bg-amber-500 text-white border-amber-600 shadow-xs";
      case "LOW":
      default:
        return "bg-emerald-600 text-white border-emerald-700 shadow-xs";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-0.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Causal Risk Drivers</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Why is this risk score high?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contributing telemetry factors calculated by the HydroGuard deterministic engine.
            </p>
          </div>
          <div className="hidden sm:flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
            <span>{factors.length} Factor{factors.length === 1 ? "" : "s"} Identified</span>
          </div>
        </div>

        {/* Factors List / Empty State */}
        <div className="mt-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Evaluating risk drivers...
            </div>
          ) : factors.length > 0 ? (
            <div className="space-y-3">
              {factors.map((item, index) => {
                const Icon = getFactorIcon(item.factor);

                return (
                  <div
                    key={index}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-4 transition-all shadow-2xs"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs text-slate-700">
                        <Icon className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.factor}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                          {item.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Impact Severity Badge */}
                    <span
                      className={`shrink-0 px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase border ${getSeverityBadge(
                        item.impact
                      )}`}
                    >
                      {item.impact}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 px-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-3 text-xs text-emerald-900 mt-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <div className="font-bold">Baseline Telemetry Stable</div>
                <div className="text-emerald-800 text-[11px] mt-0.5">
                  All environmental and hydrological indicators are within normal non-hazardous thresholds.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
