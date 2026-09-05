import React from "react";
import { Crosshair, Layers, Navigation, Compass, MapPin } from "lucide-react";

export default function MapControls({
  onRecenter,
  location,
  showLegend,
  onToggleLegend,
  showZones,
  onToggleZones
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] p-3 flex flex-col justify-between">
      {/* Top Bar: Location HUD + Top Controls */}
      <div className="flex items-start justify-between gap-2">
        {/* Location & GPS HUD */}
        {location && (
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white rounded-lg px-3 py-2 shadow-lg max-w-[260px] sm:max-w-xs transition-all">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-white truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{location.name}, {location.country}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5 flex items-center space-x-2">
              <span>{location.latitude.toFixed(4)}°N</span>
              <span className="text-slate-500">•</span>
              <span>{location.longitude.toFixed(4)}°E</span>
            </div>
          </div>
        )}

        {/* Action Buttons: Recenter & Layers */}
        <div className="pointer-events-auto flex flex-col space-y-1.5 ml-auto">
          {/* Recenter Button */}
          <button
            onClick={onRecenter}
            className="p-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-emerald-700 rounded-lg shadow-md border border-slate-200 transition-colors flex items-center justify-center group"
            title="Recenter Map on Selected Location"
            aria-label="Recenter map"
          >
            <Crosshair className="w-4 h-4 text-slate-600 group-hover:text-emerald-600 group-hover:scale-110 transition-transform" />
          </button>

          {/* Zones Toggle Button */}
          {onToggleZones && (
            <button
              onClick={onToggleZones}
              className={`p-2 rounded-lg shadow-md border transition-colors flex items-center justify-center ${
                showZones
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title={showZones ? "Hide Hazard Zones" : "Show Hazard Zones"}
              aria-label="Toggle hazard zones"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Area: Controls / Status */}
      <div className="flex items-end justify-between gap-2">
        <div className="pointer-events-auto flex items-center space-x-1 text-[10px] text-slate-700 bg-white/90 backdrop-blur-xs px-2 py-1 rounded shadow-xs border border-slate-200">
          <Compass className="w-3 h-3 text-emerald-600" />
          <span className="font-medium">OpenStreetMap</span>
        </div>
      </div>
    </div>
  );
}
