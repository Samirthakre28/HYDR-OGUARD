import React from "react";
import {
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Bell,
  BellRing,
  Info,
  Layers,
  ChevronRight
} from "lucide-react";

export default function RiskAlertBanner({
  alert,
  onEnableNotifications,
  notificationPermission
}) {
  if (!alert) return null;

  const { severity, title, message, hazardTypes = [], location, hasAlert } = alert;

  // LOW severity calm banner
  if (severity === "LOW" || !hasAlert) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {title || "Normal Baseline"}
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Safe Status
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              {message || "No active emergency alerts for this station."}
            </p>
          </div>
        </div>

        {/* Notification toggle */}
        {notificationPermission !== "granted" && onEnableNotifications && (
          <button
            onClick={onEnableNotifications}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Enable Browser Alerts</span>
          </button>
        )}
      </div>
    );
  }

  // MODERATE severity advisory banner
  if (severity === "MODERATE") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {title}
              </span>
              <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase">
                Advisory Watch
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {notificationPermission !== "granted" && onEnableNotifications && (
          <button
            onClick={onEnableNotifications}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Enable Alerts</span>
          </button>
        )}
      </div>
    );
  }

  // HIGH & CRITICAL severity warning banners
  const isCritical = severity === "CRITICAL";

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all ${
        isCritical
          ? "bg-rose-600 text-white border-rose-700 ring-2 ring-rose-500/30"
          : "bg-orange-500 text-white border-orange-600 ring-2 ring-orange-400/30"
      }`}
    >
      <div className="flex items-start space-x-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isCritical ? "bg-rose-700 text-white" : "bg-orange-600 text-white"
          }`}
        >
          {isCritical ? (
            <AlertOctagon className="w-5 h-5 animate-pulse" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs">
              {severity} ALERT
            </span>
            <span className="text-sm font-bold truncate">
              {title} — {location}
            </span>
          </div>

          <p className="text-xs text-white/95 mt-1 leading-relaxed">
            {message}
          </p>

          {/* Elevated Hazard Tags */}
          {hazardTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-semibold text-white/80 mr-1">
                Elevated Hazards:
              </span>
              {hazardTypes.map((hazard) => (
                <span
                  key={hazard}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-900 shadow-xs"
                >
                  {hazard}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions: Notification Opt-in */}
      <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
        {notificationPermission === "granted" ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-semibold backdrop-blur-xs">
            <BellRing className="w-3.5 h-3.5 text-emerald-300" />
            <span>Alerts Active</span>
          </div>
        ) : (
          onEnableNotifications && (
            <button
              onClick={onEnableNotifications}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-md"
            >
              <Bell className="w-3.5 h-3.5 text-rose-600" />
              <span>Enable Browser Alerts</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
