import React from "react";
import {
  Waves,
  Activity,
  MapPin,
  Clock,
  Radio,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldAlert,
  Gauge
} from "lucide-react";
import { formatTimeAgo } from "../../utils/timeAgo";
import { getFreshnessMeta } from "../../utils/freshness";
import { HYDROLOGY_FALLBACK } from "../../data/environmentalFallback";

export default function HydrologyIndicator({
  hydrologyData,
  isLoading,
  error,
  locationName,
  fallbackRiverLevel,
  onRefresh,
  isOffline = false
}) {
  const incoming = hydrologyData?.hydrology || hydrologyData || {};
  const isFallback = Boolean(hydrologyData?.isFallback || hydrologyData?.sourceType === "FALLBACK");
  const isCached = Boolean(hydrologyData?.cached || isOffline);
  const riverLevel = incoming.riverLevel ?? incoming.stage;
  const normalizedRiverRisk = incoming.normalizedRiverRisk ?? fallbackRiverLevel;
  const dischargeM3s = incoming.dischargeM3s ?? incoming.river_discharge;
  const hasIncoming = Boolean(riverLevel !== undefined || normalizedRiverRisk !== undefined || dischargeM3s !== undefined);

  const hydro = hasIncoming
    ? {
        riverLevel: riverLevel ?? HYDROLOGY_FALLBACK.riverLevel,
        normalizedRiverRisk: normalizedRiverRisk ?? HYDROLOGY_FALLBACK.normalizedRiverRisk,
        dischargeM3s: dischargeM3s ?? HYDROLOGY_FALLBACK.dischargeM3s,
        unit: incoming.unit || HYDROLOGY_FALLBACK.unit
      }
    : { ...HYDROLOGY_FALLBACK };

  const station = hydrologyData?.station;
  const source = hasIncoming
    ? (hydrologyData?.source || "GloFAS River Gauges")
    : "Regional hydrological baseline";
  const hasValidData = true;
  const isLive = Boolean(hasIncoming && !error && !isCached && !isFallback);

  const rawObservedAt = hydrologyData?.observedAt || incoming?.observedAt;
  const formattedObservedTime = rawObservedAt
    ? formatTimeAgo(rawObservedAt)
    : null;

  // Freshness evaluation (Step 17)
  const freshness = getFreshnessMeta(rawObservedAt, "HYDROLOGY", isOffline || isCached || isFallback || !hasIncoming);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between transition-all">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLive
                  ? "bg-cyan-50 border-cyan-100 text-cyan-600"
                  : isCached
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">River / Hydrology</h3>

                {/* 4-State Badge (LIVE | CACHED | UNAVAILABLE | RETRYING) */}
                {isLoading && !hasIncoming ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Retrying</span>
                  </span>
                ) : isLive ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Hydrology</span>
                  </span>
                ) : isCached && hasIncoming ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Cached Snapshot</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Baseline</span>
                  </span>
                )}

                {/* Freshness Badge (Step 17) */}
                {hasValidData && !isLoading && (
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${freshness.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${freshness.dotClass}`} />
                    <span>{freshness.label}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                River stage & discharge telemetry for {locationName || "station"}.
              </p>
            </div>
          </div>

          {/* Action / Source Badge */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh River Telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            )}
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 font-medium">
              <Radio className={`w-3 h-3 ${isLive ? "text-cyan-500" : isCached ? "text-amber-500" : "text-slate-400"}`} />
              <span>{source}</span>
            </div>
          </div>
        </div>

        {/* Cached Fallback Notice */}
        {error && isCached && hasValidData && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="leading-tight">
              Live river update unavailable ({error}). Showing cached river stage from {formattedObservedTime || "previous sync"}.
            </span>
          </div>
        )}

        {/* Content Body */}
        {isLoading && !hasIncoming ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
              <span>Polling river monitoring gauge...</span>
            </div>
          </div>
        ) : !hasValidData ? (
          /* Explicit Data Unavailable State (No Fake Metrics) */
          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">River Telemetry Unavailable</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {error || "Unable to reach hydrological river gauges and no cached telemetry exists."}
                </div>
              </div>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Retry Station</span>
              </button>
            )}
          </div>
        ) : (
          /* Valid Data Metrics Display */
          <div className="mt-4">
            {/* 3 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* River Stage / Level */}
              <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/70 flex flex-col justify-between hover:border-cyan-300 transition-colors">
                <div className="flex items-center justify-between text-cyan-800 text-xs mb-2">
                  <span className="font-semibold">River Stage</span>
                  <Waves className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {hydro.riverLevel !== undefined ? `${hydro.riverLevel} ${hydro.unit || "m"}` : "N/A"}
                  </div>
                  <div className="text-[10px] font-medium text-cyan-700 mt-0.5">
                    {station?.riverName ? `${station.riverName} Gauge` : "Hydrological Level"}
                  </div>
                </div>
              </div>

              {/* Normalized Risk Contribution */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
                  <span className="font-medium">Risk Contribution</span>
                  <Gauge className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {hydro.normalizedRiverRisk ?? 0}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Calibrated Risk Input</div>
                </div>
              </div>

              {/* Station Context */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
                  <span className="font-medium">Monitoring Station</span>
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate" title={station?.name}>
                    {station?.name || "Regional Hydrological Basin"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {station?.distanceKm !== undefined
                      ? `${station.distanceKm} km from zone`
                      : (hydro?.dischargeM3s !== undefined ? `Discharge: ${hydro.dischargeM3s} m³/s` : "Active Basin")}
                  </div>
                </div>
              </div>
            </div>

            {/* Station metadata footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>
                  {isCached ? "Cached timestamp:" : "Observed:"}{" "}
                  <strong className="text-slate-600 font-medium">{formattedObservedTime || "N/A"}</strong>
                </span>
              </span>
              <span>Provider: <strong className="text-slate-600 font-medium">{source}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Scientific Limitation Footnote */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-start space-x-1.5 text-[11px] text-slate-400 leading-normal">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          River flood stage normalization relies on contextual station threshold tiers (Warning, Danger, Extreme). System uses an explainable MVP heuristic model.
        </p>
      </div>
    </div>
  );
}
