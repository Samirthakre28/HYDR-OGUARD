import React from "react";
import {
  CloudRain,
  TrendingUp,
  Compass,
  History,
  Activity,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function RiskFactors({ factors = [], isLoading }) {
  const getFactorIcon = (factorName) => {
    const name = (factorName || "").toLowerCase();
    if (name.includes("rainfall")) return CloudRain;
    if (name.includes("river")) return TrendingUp;
    if (name.includes("slope") || name.includes("terrain")) return Compass;
    if (name.includes("historical")) return History;
    if (name.includes("seismic")) return Activity;
    return AlertCircle;
  };

  const getSeverityBadge = (impact) => {
    switch (impact?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200/80";
      case "MODERATE":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "LOW":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Why is the risk elevated?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Explainable causal drivers identified by the HydroGuard risk calculation engine.
            </p>
          </div>
          <div className="hidden sm:flex items-center text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
            <span>{factors.length} Active Driver{factors.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* Factors List / Empty State */}
        <div className="mt-3">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Analyzing environmental drivers...
            </div>
          ) : factors.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {factors.map((item, index) => {
                const Icon = getFactorIcon(item.factor);

                return (
                  <div
                    key={index}
                    className="py-3.5 first:pt-1 last:pb-0 flex items-start justify-between gap-4 group"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-200/60 transition-colors">
                        <Icon className="w-4 h-4 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {item.factor}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Impact Severity Badge */}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${getSeverityBadge(
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
            <div className="py-6 px-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center space-x-3 text-xs text-emerald-800 mt-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold">Normal Baseline Indicators</div>
                <div className="text-emerald-700/90 text-[11px] mt-0.5">
                  All monitored environmental and geophysical parameters for this station are currently within safe baseline ranges.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
