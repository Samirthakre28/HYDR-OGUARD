import React from "react";
import { Info, TrendingUp, ShieldAlert, Loader2 } from "lucide-react";

export default function OverallRiskCard({ overall, isLoading, locationName }) {
  const score = overall?.score ?? 0;
  const level = overall?.level || "LOW";
  const maxScore = 100;
  const description = "Risk assessment computed by HydroGuard engine using localized environmental, geographic, and historical indicators.";

  // Calculate SVG circular progress values
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / maxScore) * circumference;

  // Determine color theme based on risk level
  const getLevelBadgeStyles = (lvl) => {
    switch (lvl?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/20";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200/80 ring-1 ring-orange-500/20";
      case "MODERATE":
        return "bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/20";
      case "LOW":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/20";
    }
  };

  const getRingColor = (lvl) => {
    switch (lvl?.toUpperCase()) {
      case "CRITICAL":
        return "#e11d48"; // rose-600
      case "HIGH":
        return "#f97316"; // orange-500
      case "MODERATE":
        return "#f59e0b"; // amber-500
      case "LOW":
      default:
        return "#10b981"; // emerald-500
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between relative overflow-hidden transition-all">
      {/* Loading Overlay State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg shadow-md border border-slate-200">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Calculating Risk Engine Telemetry...</span>
          </div>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-slate-700" />
          <h3 className="text-base font-bold text-slate-900">Overall Risk</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border transition-colors ${getLevelBadgeStyles(
            level
          )}`}
        >
          {level}
        </span>
      </div>

      {/* Center Section: Ring Gauge + Score readout */}
      <div className="my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Score Numbers */}
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-baseline justify-center sm:justify-start space-x-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-slate-900">
              {score}
            </span>
            <span className="text-lg font-semibold text-slate-400">/ {maxScore}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start space-x-1 text-xs font-medium text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Backend Engine Validated</span>
          </div>
          <p className="text-xs font-medium text-slate-500 pt-1">
            Aggregated Threat Index {locationName ? `for ${locationName}` : ""}
          </p>
        </div>

        {/* Circular Ring Gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background Ring Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="text-slate-100"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Active Progress Ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={getRingColor(level)}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Inner Gauge Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-slate-900">{score}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Severity
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Description */}
      <div className="pt-4 border-t border-slate-100 flex items-start space-x-2 text-xs text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>{description}</p>
      </div>
    </div>
  );
}
