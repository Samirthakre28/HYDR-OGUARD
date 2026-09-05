import React from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Sparkles
} from "lucide-react";
import { formatTimeAgo } from "../../utils/timeAgo";

export default function RiskChangeBanner({ changeEvent, onDismiss }) {
  if (!changeEvent) return null;

  const {
    isSeverityIncrease,
    isLevelShift,
    previousLevel,
    currentLevel,
    scoreDiff,
    title,
    message,
    timestamp
  } = changeEvent;

  const formattedTime = formatTimeAgo(timestamp);

  // Determine styling based on severity direction
  const isEscalation = isSeverityIncrease;

  const containerStyles = isEscalation
    ? "bg-rose-50 border-rose-200/90 text-rose-950 shadow-sm"
    : "bg-emerald-50 border-emerald-200/90 text-emerald-950 shadow-sm";

  const badgeStyles = isEscalation
    ? "bg-rose-100 text-rose-800 border-rose-300/80"
    : "bg-emerald-100 text-emerald-800 border-emerald-300/80";

  const iconColor = isEscalation ? "text-rose-600" : "text-emerald-600";

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all animate-fadeIn ${containerStyles}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon & Message */}
        <div className="flex items-start space-x-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border ${
            isEscalation ? "border-rose-200 shadow-xs" : "border-emerald-200 shadow-xs"
          }`}>
            {isEscalation ? (
              <TrendingUp className={`w-5 h-5 ${iconColor}`} />
            ) : (
              <TrendingDown className={`w-5 h-5 ${iconColor}`} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                {title}
              </span>
              {isLevelShift && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeStyles}`}>
                  {previousLevel} → {currentLevel}
                </span>
              )}
              {scoreDiff !== 0 && (
                <span className="text-[11px] font-mono font-semibold opacity-80">
                  ({scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts)
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm mt-1 font-medium leading-relaxed">
              {message}
            </p>

            <div className="flex items-center space-x-1.5 text-[11px] opacity-70 mt-1.5">
              <Clock className="w-3 h-3" />
              <span>Telemetry refreshed {formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Right: Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
