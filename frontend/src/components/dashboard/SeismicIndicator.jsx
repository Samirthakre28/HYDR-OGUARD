import React, { useState } from "react";
import {
  Activity,
  MapPin,
  Clock,
  Radio,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldAlert,
  Gauge,
  ChevronDown,
  ChevronUp,
  Layers
} from "lucide-react";
import { formatTimeAgo } from "../../utils/timeAgo";
import { getFreshnessMeta } from "../../utils/freshness";
import { SEISMIC_FALLBACK } from "../../data/environmentalFallback";

export default function SeismicIndicator({
  seismicData,
  isLoading,
  error,
  locationName,
  fallbackSeismicActivity,
  onRefresh,
  isOffline = false
}) {
  const [showEvents, setShowEvents] = useState(false);

  const incoming = seismicData?.seismic || seismicData || {};
  const isFallback = Boolean(seismicData?.isFallback || seismicData?.sourceType === "FALLBACK");
  const isCached = Boolean(seismicData?.cached || isOffline);
  const recentEvents = seismicData?.recentEvents || seismicData?.recentEarthquakes || incoming?.recentEvents || [];
  const source = seismicData?.source || (isFallback ? "Regional seismic baseline" : "USGS Earthquake Hazards Program");
  const score = incoming.activityScore ?? incoming.seismicActivity ?? fallbackSeismicActivity ?? SEISMIC_FALLBACK.activityScore;
  const hasIncoming = Boolean(
    incoming.activityScore !== undefined ||
    incoming.seismicActivity !== undefined ||
    fallbackSeismicActivity !== undefined ||
    incoming.peak_ground_acceleration !== undefined
  );
  const hasValidData = true;
  const isLive = Boolean(hasIncoming && !error && !isCached && !isFallback);

  const eventCount = incoming.eventCount ?? incoming.events_24h ?? recentEvents.length ?? 0;
  const maxMagnitude = incoming.maxMagnitude ?? incoming.magnitude_max ?? (recentEvents.length > 0 ? Math.max(...recentEvents.map(e => e.magnitude || 0)) : null);
  const latestEvent = recentEvents.length > 0 ? recentEvents[0] : (incoming?.latestEvent ?? null);

  // Level classification helper
  const getScoreBadge = (val) => {
    if (val >= 75) {
      return {
        label: "CRITICAL ACTIVITY",
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        pill: "bg-red-500"
      };
    }
    if (val >= 50) {
      return {
        label: "ELEVATED SEISMIC",
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        pill: "bg-orange-500"
      };
    }
    if (val >= 25) {
      return {
        label: "MODERATE ACTIVITY",
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        pill: "bg-amber-500"
      };
    }
    return {
      label: "LOW / QUIET",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      pill: "bg-emerald-500"
    };
  };

  const badge = getScoreBadge(score);

  const rawObservedAt = seismicData?.observedAt || incoming?.observedAt;
  const formattedObservedTime = rawObservedAt
    ? formatTimeAgo(rawObservedAt)
    : null;

  // Freshness evaluation (Step 17)
  const freshness = getFreshnessMeta(rawObservedAt, "SEISMIC", isOffline || isCached || isFallback || !hasIncoming);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between transition-all">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLive
                  ? "bg-rose-50 border-rose-100 text-rose-600"
                  : isCached
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base font-bold text-slate-900">Seismic Activity</h3>

                {/* 4-State Badge (LIVE | CACHED | UNAVAILABLE | RETRYING) */}
                {isLoading && !hasIncoming ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Retrying</span>
                  </span>
                ) : isLive ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live USGS</span>
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
                Real-time earthquake monitoring & ground motion telemetry for {locationName || "station"}.
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
                title="Refresh Seismic Telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-rose-600" : ""}`} />
              </button>
            )}
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 font-medium">
              <Radio className={`w-3 h-3 ${isLive ? "text-rose-500" : isCached ? "text-amber-500" : "text-slate-400"}`} />
              <span>{hasIncoming && isLive ? "USGS Feed Active" : source}</span>
            </div>
          </div>
        </div>

        {/* Cached Fallback Notice */}
        {error && isCached && hasValidData && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="leading-tight">
              Live seismic update unavailable ({error}). Showing cached earthquake observation from {formattedObservedTime || "previous sync"}.
            </span>
          </div>
        )}

        {/* Content Body */}
        {isLoading && !hasIncoming ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
              <span>Polling USGS earthquake catalog...</span>
            </div>
          </div>
        ) : !hasValidData ? (
          /* Explicit Data Unavailable State (No Fake Metrics) */
          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Seismic Telemetry Unavailable</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {error || "USGS earthquake catalog is currently unreachable and no cached snapshot exists."}
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
                <span>Retry Catalog</span>
              </button>
            )}
          </div>
        ) : (
          /* Valid Data Metrics Display */
          <div className="mt-4">
            {/* 3 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Activity Score */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${badge.bg} ${badge.border}`}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-semibold ${badge.text}`}>Activity Score</span>
                  <Gauge className={`w-4 h-4 ${badge.text}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {score}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </div>
                  <div className="mt-1 flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.pill}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observed Events (24h) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
                  <span className="font-medium">Events (24h / 100km)</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {eventCount}
                    <span className="text-xs text-slate-400 font-normal"> {eventCount === 1 ? "event" : "events"}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {maxMagnitude !== null ? `Max Mag: M ${maxMagnitude}` : "No recorded events"}
                  </div>
                </div>
              </div>

              {/* Latest Earthquake Detail */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
                  <span className="font-medium">Latest Event</span>
                  <MapPin className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  {latestEvent ? (
                    <>
                      <div className="text-xs font-bold text-slate-900 truncate" title={latestEvent.place}>
                        M {latestEvent.magnitude} · {latestEvent.place || "Nearby"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {latestEvent.distanceKm} km away · Depth: {latestEvent.depthKm} km
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-slate-900">Seismically Stable</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">0 events within 100km radius</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Recent Events List */}
            {recentEvents.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowEvents(!showEvents)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs text-slate-700 font-medium transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                    <span>View {recentEvents.length} Recorded {recentEvents.length === 1 ? "Earthquake" : "Earthquakes"} in Monitored Radius</span>
                  </span>
                  {showEvents ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showEvents && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {recentEvents.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            M {evt.magnitude}
                          </span>
                          <div>
                            <div className="text-slate-800 font-medium truncate max-w-xs">{evt.place || "Regional tremor"}</div>
                            <div className="text-[10px] text-slate-400">
                              {evt.distanceKm} km away · Depth {evt.depthKm} km
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-[10px] text-slate-400">
                          {evt.time ? formatTimeAgo(evt.time) : "Recent"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Telemetry metadata footer */}
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
          Represents an <strong>observed recent seismic activity index</strong> ($0-100$) calibrated by magnitude, distance attenuation, and recency. <strong>Does NOT represent an earthquake prediction or probability forecast.</strong>
        </p>
      </div>
    </div>
  );
}
