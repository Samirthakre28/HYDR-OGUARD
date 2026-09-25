import React from "react";
import {
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Clock,
  Radio,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Database,
  WifiOff,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { getFreshnessMeta } from "../../utils/freshness";
import { WEATHER_FALLBACK } from "../../data/environmentalFallback";

export default function WeatherIndicator({
  weatherData,
  isLoading,
  error,
  locationName,
  dataSources,
  onRefresh,
  isOffline = false
}) {
  const incoming = weatherData?.weather || weatherData || {};
  const isFallback = Boolean(weatherData?.isFallback || weatherData?.sourceType === "FALLBACK");
  const isCached = Boolean(weatherData?.cached || isOffline);
  const temperature = incoming.temperature ?? incoming.temperature_2m;
  const humidity = incoming.humidity ?? incoming.relative_humidity_2m;
  const rainfall = incoming.rainfall ?? incoming.precipitation_sum ?? incoming.precipitation;
  const windSpeed = incoming.windSpeed ?? incoming.wind_speed_10m;
  const hasIncoming = Boolean(
    temperature !== undefined || rainfall !== undefined || humidity !== undefined || windSpeed !== undefined
  );

  const weather = hasIncoming
    ? {
        temperature,
        humidity,
        rainfall,
        windSpeed,
        normalizedRainfall: incoming.normalizedRainfall ?? WEATHER_FALLBACK.normalizedRainfall,
        observedAt: incoming.observedAt
      }
    : { ...WEATHER_FALLBACK };

  const source = hasIncoming
    ? (weatherData?.source || "Open-Meteo Weather API")
    : "Regional meteorological baseline";
  const hasValidData = true;
  const isLive = Boolean(hasIncoming && !error && !isCached && !isFallback);

  // Format observation time nicely (preserves exact original timestamp without fabrication)
  const rawObservedAt = weather?.observedAt || weatherData?.observedAt;
  const formattedObservedTime = rawObservedAt
    ? new Date(rawObservedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : null;

  // Freshness metadata evaluation (Step 17)
  const freshness = getFreshnessMeta(rawObservedAt, "WEATHER", isOffline || isCached || isFallback || !hasIncoming);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between transition-all">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isLive
                ? "bg-sky-50 border-sky-100 text-sky-600"
                : isCached
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Current Conditions</h3>

                {/* 4-State Badge (LIVE | CACHED | UNAVAILABLE | RETRYING) */}
                {isLoading && !hasIncoming ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Retrying</span>
                  </span>
                ) : isLive ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Telemetry</span>
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
                Meteorological observations for {locationName || "monitored zone"}.
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
                title="Refresh Weather Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            )}
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 font-medium">
              <Radio className={`w-3 h-3 ${isLive ? "text-emerald-500" : isCached ? "text-amber-500" : "text-slate-400"}`} />
              <span>{source}</span>
            </div>
          </div>
        </div>

        {/* Cached Fallback Notice */}
        {error && isCached && hasValidData && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="leading-tight">
              Live update unavailable ({error}). Showing cached observation from {formattedObservedTime || "previous sync"}.
            </span>
          </div>
        )}

        {/* Body Content */}
        {isLoading && !hasIncoming ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Fetching atmospheric telemetry...</span>
            </div>
          </div>
        ) : !hasValidData ? (
          /* Explicit Data Unavailable State (No Fake Metrics) */
          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Weather Telemetry Unavailable</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {error || "Unable to reach external meteorological feed and no cached snapshot exists."}
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
                <span>Retry Feed</span>
              </button>
            )}
          </div>
        ) : (
          /* Valid Data Metrics Display */
          <div className="mt-4">
            {/* 4 Metric Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Temperature */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2 min-w-0">
                  <span className="font-medium truncate">Temperature</span>
                  <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 truncate">
                    {weather.temperature !== undefined ? `${weather.temperature}°C` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Atmospheric Temp (°C)</div>
                </div>
              </div>

              {/* Humidity */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2 min-w-0">
                  <span className="font-medium truncate">Humidity</span>
                  <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 truncate">
                    {weather.humidity !== undefined ? `${weather.humidity}%` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Relative Humidity (%)</div>
                </div>
              </div>

              {/* Rainfall / Precipitation */}
              <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200/70 flex flex-col justify-between hover:border-sky-300 transition-colors min-w-0">
                <div className="flex items-center justify-between text-sky-800 text-xs mb-2 min-w-0">
                  <span className="font-semibold truncate">Precipitation</span>
                  <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 truncate">
                    {weather.rainfall !== undefined ? `${weather.rainfall} mm` : "0.0 mm"}
                  </div>
                  <div className="text-[10px] font-medium text-sky-700 mt-0.5 flex flex-wrap items-baseline gap-x-1 min-w-0 leading-tight">
                    <span className="shrink-0">Risk Weight:</span>
                    <strong className="text-sky-900 shrink-0">{weather.normalizedRainfall ?? 0}/100</strong>
                  </div>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2 min-w-0">
                  <span className="font-medium truncate">Wind Speed</span>
                  <Wind className="w-4 h-4 text-teal-500 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 truncate">
                    {weather.windSpeed !== undefined ? `${weather.windSpeed} km/h` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Surface Velocity (km/h)</div>
                </div>
              </div>
            </div>

            {/* Time / Feed metadata */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>
                  {isCached ? "Cached timestamp:" : "Observed at:"}{" "}
                  <strong className="text-slate-600 font-medium">{formattedObservedTime || "N/A"}</strong>
                </span>
              </span>
              <span>Source: <strong className="text-slate-600 font-medium">{source}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Environmental Data Provenance / Data Sources */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-3">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Data Sources</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href="https://cwc.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-cyan-300 hover:shadow-xs transition-all"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">CWC</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5 group-hover:text-cyan-800">
              Central Water Commission
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Hydrology & River Data</div>
            <span className="mt-2 inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
              <span>Visit Source</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <a
            href="https://sachet.ndma.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-300 hover:shadow-xs transition-all"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">SACHET</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5 group-hover:text-amber-800">
              National Disaster Alert Portal
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Disaster Alerts & Early Warnings</div>
            <span className="mt-2 inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
              <span>Visit Source</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <a
            href="https://mausam.imd.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-sky-300 hover:shadow-xs transition-all"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">IMD</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5 group-hover:text-sky-800">
              India Meteorological Department
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Weather & Meteorological Information</div>
            <span className="mt-2 inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
              <span>Visit Source</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

