import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Radio,
  Layers,
  CheckCircle2,
  HelpCircle,
  Database
} from "lucide-react";

export default function RiskConfidence({ confidence, isLoading = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const overall = confidence?.overall || "UNKNOWN";
  const flood = confidence?.flood || "UNKNOWN";
  const landslide = confidence?.landslide || "UNKNOWN";
  const seismic = confidence?.seismic || "UNKNOWN";
  const coverage = confidence?.sourceCoverage || "PARTIAL";
  const reasons = confidence?.reasons || [];

  const getConfidenceBadge = (level) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return {
          label: "High Reliability",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-800",
          dot: "bg-emerald-500",
          icon: ShieldCheck
        };
      case "MODERATE":
        return {
          label: "Moderate Reliability",
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          dot: "bg-amber-500",
          icon: ShieldCheck
        };
      case "LOW":
        return {
          label: "Low Reliability",
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-800",
          dot: "bg-rose-500",
          icon: ShieldAlert
        };
      case "UNKNOWN":
      default:
        return {
          label: "Unknown Reliability",
          bg: "bg-slate-50",
          border: "border-slate-200",
          text: "text-slate-700",
          dot: "bg-slate-400",
          icon: HelpCircle
        };
    }
  };

  const getCoverageBadge = (cov) => {
    switch (cov?.toUpperCase()) {
      case "FULL":
        return { label: "Full Live Coverage", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "PARTIAL":
        return { label: "Partial Live Feeds", bg: "bg-amber-50 text-amber-700 border-amber-200" };
      case "LIMITED":
        return { label: "Cached / Stored Baseline", bg: "bg-slate-100 text-slate-700 border-slate-200" };
      case "SYNTHETIC_DEMO":
        return { label: "Synthetic Demo Parameters", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "NONE":
      default:
        return { label: "No Live Feeds", bg: "bg-rose-50 text-rose-700 border-rose-200" };
    }
  };

  const getMiniHazardBadge = (lvl) => {
    switch (lvl?.toUpperCase()) {
      case "HIGH":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "MODERATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const badge = getConfidenceBadge(overall);
  const coverageBadge = getCoverageBadge(coverage);
  const Icon = badge.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-4 transition-all">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${badge.bg} ${badge.border} ${badge.text}`}>
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Assessment Confidence:
              </span>

              {/* Qualitative Overall Confidence Badge */}
              <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${badge.bg} ${badge.border} ${badge.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{overall}</span>
              </span>

              {/* Source Coverage Tag */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${coverageBadge.bg}`}>
                {coverageBadge.label}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Evaluated from data completeness, sensor freshness, and station provenance.
            </p>
          </div>
        </div>

        {/* Right: Sub-Hazard Badges + Expand Button */}
        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          <div className="hidden sm:flex items-center space-x-1.5 text-[10px] font-semibold">
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(flood)}`} title="Flood Data Confidence">
              Flood: {flood}
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(landslide)}`} title="Landslide Data Confidence">
              Landslide: {landslide}
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(seismic)}`} title="Seismic Data Confidence">
              Seismic: {seismic}
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Toggle Confidence Reasons"
          >
            <span>{isExpanded ? "Hide Details" : "Why?"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Accordion: Human-readable Reasons List */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-fadeIn">
          {/* Mobile sub-hazard badges */}
          <div className="flex sm:hidden flex-wrap gap-1 text-[10px] font-semibold pb-1">
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(flood)}`}>Flood: {flood}</span>
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(landslide)}`}>Landslide: {landslide}</span>
            <span className={`px-1.5 py-0.5 rounded border ${getMiniHazardBadge(seismic)}`}>Seismic: {seismic}</span>
          </div>

          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Evidence & Reliability Assessment:
          </div>

          <ul className="space-y-1.5 text-xs text-slate-600">
            {reasons.length > 0 ? (
              reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start space-x-2">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Evaluating data availability across upstream sensors...</span>
              </li>
            )}
          </ul>

          <div className="pt-2 border-t border-slate-100 flex items-start space-x-1.5 text-[10px] text-slate-400">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Confidence indicates input data completeness and freshness. It does not scale the risk score and is not a scientific probability of disaster occurrence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
