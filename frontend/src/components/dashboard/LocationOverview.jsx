import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  Mountain,
  Globe,
  RefreshCw,
  Radio,
  Sparkles
} from "lucide-react";
import { useLocation } from "../../context/LocationContext";
import { formatTimeAgo } from "../../utils/timeAgo";

export default function LocationOverview({
  onOpenLocationSelector,
  lastUpdated,
  isRefreshing,
  onRefresh,
  isLive = true,
  isOffline = false
}) {
  const { selectedLocation, locations, setSelectedLocation } = useLocation();
  const hasLocation = Boolean(selectedLocation);

  // Client-side timer tick every 10 seconds to update relative time string cleanly
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNextLocation = () => {
    if (onOpenLocationSelector) {
      onOpenLocationSelector();
      return;
    }
    const currIdx = locations.findIndex((l) => l.id === selectedLocation?.id);
    const nextIdx = (currIdx + 1) % locations.length;
    setSelectedLocation(locations[nextIdx]);
  };

  const formattedRelativeTime = formatTimeAgo(lastUpdated);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Location Details or Empty State */}
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
            isOffline ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
          }`}>
            <MapPin className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                isOffline
                  ? "text-amber-800 bg-amber-50 border-amber-200"
                  : "text-emerald-700 bg-emerald-50 border-emerald-200/60"
              }`}>
                {isOffline ? "Offline Station" : "Current Location"}
              </span>

              {/* Real-Time Telemetry / Offline Status Badge */}
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                isOffline
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200/80 text-slate-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isOffline
                    ? "bg-amber-500 animate-pulse"
                    : isLive
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                }`} />
                <span className="font-semibold">
                  {isOffline ? "Emergency Offline Pack" : isLive ? "Live Environmental Data" : "Fallback Baseline"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  {isOffline ? `Saved snapshot` : `Updated ${formattedRelativeTime}`}
                </span>
              </span>
            </div>

            {hasLocation ? (
              <>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span>{selectedLocation.name}</span>
                  <span className="text-slate-400 text-sm font-normal">
                    ({selectedLocation.region}, {selectedLocation.country})
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1 font-mono font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                  </span>
                  <span className="flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-slate-400" />
                    Elevation: <strong className="text-slate-700 font-semibold">{selectedLocation.elevation !== undefined ? `${selectedLocation.elevation} m` : "N/A"}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    {selectedLocation.country}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-1">
                <h2 className="text-lg font-bold text-slate-800">
                  Select a location to analyze disaster risk
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a monitored zone from the list or search a district to load environmental telemetry.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions (Refresh Risk Data + Switch Station) */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-start lg:self-center shrink-0 w-full sm:w-auto">
          {/* Visible Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-60 shadow-2xs active:scale-[0.98]"
            title="Fetch latest real-time weather and calculate fresh risk scores"
            aria-label="Refresh risk data"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing Risk..." : "Refresh Risk Data"}</span>
          </button>

          {/* Switch Station Button */}
          <button
            onClick={handleNextLocation}
            className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs active:scale-[0.98]"
            title="Cycle to next station or open selector"
            aria-label="Switch station"
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Switch Station</span>
          </button>
        </div>
      </div>
    </div>
  );
}
