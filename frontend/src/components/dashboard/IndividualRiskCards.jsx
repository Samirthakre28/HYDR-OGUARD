import React from "react";
import { Waves, MountainSnow, Activity } from "lucide-react";

export default function IndividualRiskCards({ flood, landslide, seismic, isLoading }) {
  const hazards = [
    {
      id: "flood",
      title: "Flood Risk",
      score: flood?.score ?? 0,
      level: flood?.level || "LOW",
      icon: Waves,
      summary: flood?.score >= 70
        ? "Heavy precipitation and surface water surge elevate localized flood vulnerability."
        : flood?.score >= 30
        ? "Moderate surface runoff and drainage pressure detected in monitored basin."
        : "Hydrological conditions within baseline safe operational limits."
    },
    {
      id: "landslide",
      title: "Landslide Risk",
      score: landslide?.score ?? 0,
      level: landslide?.level || "LOW",
      icon: MountainSnow,
      summary: landslide?.score >= 70
        ? "High slope gradient combined with soil saturation elevates slope failure potential."
        : landslide?.score >= 30
        ? "Moderate terrain slope requiring routine slope stability observation."
        : "Low slope gradient and stable geologic profile."
    },
    {
      id: "seismic",
      title: "Seismic Risk",
      score: seismic?.score ?? 0,
      level: seismic?.level || "LOW",
      icon: Activity,
      summary: seismic?.score >= 70
        ? "Heightened tectonic crustal micro-tremor and historical recurrence rate."
        : seismic?.score >= 30
        ? "Moderate background tectonic indicator profile."
        : "Low baseline seismic vulnerability recorded."
    }
  ];

  const getBadgeStyle = (level) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200/80",
          bar: "bg-rose-600",
          iconBg: "bg-rose-50 text-rose-600 border-rose-100"
        };
      case "HIGH":
        return {
          badge: "bg-orange-50 text-orange-700 border-orange-200/80",
          bar: "bg-orange-500",
          iconBg: "bg-orange-50 text-orange-600 border-orange-100"
        };
      case "MODERATE":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200/80",
          bar: "bg-amber-500",
          iconBg: "bg-amber-50 text-amber-600 border-amber-100"
        };
      case "LOW":
      default:
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          bar: "bg-emerald-500",
          iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100"
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {hazards.map((hazard) => {
        const Icon = hazard.icon;
        const styles = getBadgeStyle(hazard.level);

        return (
          <div
            key={hazard.id}
            className={`bg-white rounded-xl border border-slate-200/90 shadow-card p-5 hover:shadow-card-hover transition-all flex flex-col justify-between ${
              isLoading ? "opacity-60 animate-pulse" : ""
            }`}
          >
            {/* Top Row: Icon + Level Badge */}
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-lg border flex items-center justify-center shadow-xs ${styles.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${styles.badge}`}
              >
                {hazard.level}
              </span>
            </div>

            {/* Middle: Title & Score */}
            <div className="my-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {hazard.title}
              </h4>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {hazard.score}
                </span>
                <span className="text-xs font-medium text-slate-400">/ 100</span>
                <span className="text-[11px] font-medium text-slate-500 ml-auto">
                  Engine Evaluated
                </span>
              </div>

              {/* Progress Bar Indicator */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${hazard.score}%` }}
                />
              </div>
            </div>

            {/* Bottom Summary */}
            <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 line-clamp-2">
              {hazard.summary}
            </p>
          </div>
        );
      })}
    </div>
  );
}
