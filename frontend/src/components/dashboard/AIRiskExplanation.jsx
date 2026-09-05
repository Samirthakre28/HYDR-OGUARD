import React from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  Loader2,
  KeyRound,
  Layers,
  Cpu
} from "lucide-react";

export default function AIRiskExplanation({
  explanation,
  isLoading,
  error,
  isConfigured = true,
  riskLevel = "LOW",
  locationName = "",
  onRetry
}) {
  const isDeterministic = explanation?.source?.includes("Deterministic");

  const getWarningBannerStyle = (level) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return {
          container: "bg-rose-50 border-rose-200 text-rose-900",
          icon: "text-rose-600",
          badge: "bg-rose-600 text-white"
        };
      case "HIGH":
        return {
          container: "bg-orange-50 border-orange-200 text-orange-900",
          icon: "text-orange-600",
          badge: "bg-orange-600 text-white"
        };
      case "MODERATE":
        return {
          container: "bg-amber-50 border-amber-200 text-amber-900",
          icon: "text-amber-600",
          badge: "bg-amber-600 text-white"
        };
      case "LOW":
      default:
        return {
          container: "bg-emerald-50 border-emerald-200 text-emerald-900",
          icon: "text-emerald-600",
          badge: "bg-emerald-600 text-white"
        };
    }
  };

  const bannerStyles = getWarningBannerStyle(riskLevel);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between relative overflow-hidden transition-all">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-xs ${
              isDeterministic ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-100 text-emerald-600"
            }`}>
              {isDeterministic ? <Cpu className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isDeterministic ? "Deterministic Safety Protocol" : "AI Risk Assessment"}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isDeterministic
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                }`}>
                  {isDeterministic ? "Rules Engine" : "AI Assistant"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isDeterministic
                  ? `Standard civil defense safety guidance for ${locationName || "monitored zone"}.`
                  : `Natural language intelligence generated from deterministic risk metrics ${locationName ? `for ${locationName}` : ""}.`}
              </p>
            </div>
          </div>

          {/* Engine badge */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 self-start sm:self-auto">
            <span className={`w-2 h-2 mr-1.5 rounded-full ${isDeterministic ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            {isDeterministic ? "Deterministic Engine" : isConfigured ? "LLM Layer" : "Offline Rules"}
          </span>
        </div>

        {/* Content Body */}
        <div className="mt-4">
          {isLoading && !explanation ? (
            /* Loading Skeleton */
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>Generating natural language assessment...</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded-md w-full animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded-md w-5/6 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded-md w-4/6 animate-pulse"></div>
              </div>
            </div>
          ) : isConfigured === false || (error && !explanation) ? (
            /* Graceful Unavailable State (Phase 5) */
            <div className="py-5 px-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-start space-x-3">
                <KeyRound className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800">
                    {isConfigured === false ? "AI Provider Unconfigured" : "AI Explanation Temporarily Unavailable"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {error || "Live natural language synthesis is unreachable. Risk calculations and deterministic hazard scores remain fully authoritative."}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Mathematical risk engine is active and unaffected.</span>
                    </p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded transition-colors"
                      >
                        Retry AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : explanation ? (
            /* Full Rendered Explanation */
            <div className="space-y-5">
              {/* 1. Warning Banner */}
              {explanation.warning && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start space-x-3 shadow-xs ${bannerStyles.container}`}
                >
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${bannerStyles.icon}`} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide">
                      Advisory Notice
                    </div>
                    <div className="text-xs font-medium mt-0.5 leading-relaxed">
                      {explanation.warning}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Situation Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Situation Summary</span>
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {explanation.summary}
                </p>
              </div>

              {/* 3. Key Drivers */}
              {((explanation.keyDrivers && explanation.keyDrivers.length > 0) || (explanation.keyHazards && explanation.keyHazards.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isDeterministic ? "Key Hazards" : "Key Risk Drivers"}</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(explanation.keyDrivers || explanation.keyHazards || []).map((driver, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                        {driver}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Recommended Safety Actions */}
              {((explanation.recommendedActions && explanation.recommendedActions.length > 0) || (explanation.safetyAdvice && explanation.safetyAdvice.length > 0)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recommended Safety Actions</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(explanation.recommendedActions || explanation.safetyAdvice || []).map((action, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start space-x-2.5 text-xs text-slate-700"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer: Transparency & Disclaimer Note */}
      <div className="pt-4 mt-5 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-slate-400 leading-normal">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          {isDeterministic
            ? "Deterministic safety guidance generated from rule-based thresholds. No LLM hallucination risk."
            : "Natural language assessments are generated from calculated risk indicators. Risk scores are determined authoritatively by the deterministic risk engine."}
        </p>
      </div>
    </div>
  );
}
