import React from "react";
import { AlertTriangle, Bell, Clock, ShieldCheck, Loader2 } from "lucide-react";

export default function RecentAlerts({ alerts = [], isLoading = false, locationName = "" }) {
  const getBadgeColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return {
          card: "border-l-4 border-l-rose-600 bg-rose-50/30",
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          icon: "text-rose-600"
        };
      case "HIGH":
        return {
          card: "border-l-4 border-l-orange-500 bg-orange-50/30",
          badge: "bg-orange-50 text-orange-700 border-orange-200",
          icon: "text-orange-600"
        };
      case "MODERATE":
        return {
          card: "border-l-4 border-l-amber-500 bg-amber-50/30",
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          icon: "text-amber-600"
        };
      case "LOW":
      default:
        return {
          card: "border-l-4 border-l-emerald-500 bg-emerald-50/30",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: "text-emerald-600"
        };
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Risk Alerts Log
            </h3>
            <p className="text-xs text-slate-500">
              Historical automated advisory notices logged for {locationName || "this station"}.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
          {alerts.length} Logged
        </span>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3 mt-4">
        {isLoading ? (
          <div className="py-8 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Loading alert history...</span>
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert, index) => {
            const styles = getBadgeColor(alert.severity);

            return (
              <div
                key={alert._id || alert.id || index}
                className={`p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all ${styles.card}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles.badge}`}
                    >
                      {alert.severity}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {alert.title}
                    </h4>
                  </div>

                  <div className="flex items-center text-[11px] text-slate-400 gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(alert.createdAt || alert.timestamp)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {alert.message || alert.description}
                </p>

                {alert.hazardTypes && alert.hazardTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {alert.hazardTypes.map((hazard) => (
                      <span
                        key={hazard}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {hazard}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-6 px-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center space-x-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-800">No recent elevated-risk alerts</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                No high or critical risk thresholds have been triggered for this station recently.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
