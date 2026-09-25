import React from "react";
import { Info, TrendingUp, ShieldAlert, Loader2, Clock, MapPin } from "lucide-react";

export default function OverallRiskCard({ overall, isLoading, locationName }) {
  const score = overall?.score ?? 0;
  const level = overall?.level || "LOW";
  const maxScore = 100;
  const description = "Risk score calculated by HydroGuard engine using live environmental telemetry, terrain analysis, and historical indicators.";

  // Calculate SVG circular progress values
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / maxScore) * circumference;

  // Determine semantic color theme based on risk level
  const getLevelBadgeStyles = (lvl) => {
    switch (lvl?.toUpperCase()) {
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

  const getRingColor = (lvl) => {
    switch (lvl?.toUpperCase()) {
      case "CRITICAL":
        return "#e11d48"; // rose-600
      case "HIGH":
        return "#ea580c"; // orange-600
      case "MODERATE":
        return "#f59e0b"; // amber-500
      case "LOW":
      default:
        return "#059669"; // emerald-600
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between relative overflow-hidden transition-all">
      {/* Loading Overlay State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Calculating Telemetry...</span>
          </div>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">Overall Disaster Risk</h3>
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{locationName || "Monitored Zone"}</span>
            </span>
          </div>
        </div>
        <span
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase border transition-colors ${getLevelBadgeStyles(
            level
          )}`}
        >
          {level} RISK
        </span>
      </div>

      {/* Center Section: Score readout + Ring Gauge */}
      <div className="my-5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/70 p-5 rounded-xl border border-slate-100">
        {/* Score Readout */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Hazard Index</div>
          <div className="flex items-baseline justify-center sm:justify-start space-x-1.5">
            <span className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">
              {score}%
            </span>
            <span className="text-base font-bold text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs font-semibold text-emerald-700 pt-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Engine Verified Score</span>
          </div>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="text-slate-200/80"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
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

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900">{score}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Probability
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Description */}
      <div className="pt-3 border-t border-slate-100 flex items-start space-x-2 text-xs text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>{description}</p>
      </div>
    </div>
  );
}
