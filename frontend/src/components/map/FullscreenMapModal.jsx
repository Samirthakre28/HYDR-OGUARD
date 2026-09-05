import React, { useEffect } from "react";
import { X, Maximize2, MapPin, Compass, ShieldAlert, Layers } from "lucide-react";
import RiskMap from "./RiskMap";
import MapLegend from "./MapLegend";
import { useLocation } from "../../context/LocationContext";

export default function FullscreenMapModal({ isOpen, onClose, savedFacilities = [] }) {
  const { selectedLocation } = useLocation();

  // Close on ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Interactive Risk & Hazard Map
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GIS Layer
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {selectedLocation
                  ? `${selectedLocation.name}, ${selectedLocation.region}, ${selectedLocation.country} • (${selectedLocation.latitude.toFixed(4)}°N, ${selectedLocation.longitude.toFixed(4)}°E)`
                  : "Geospatial telemetry visualization"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content: Full height map */}
        <div className="flex-1 relative flex flex-col md:flex-row min-h-0">
          {/* Main Map Viewport */}
          <div className="flex-1 relative min-h-0 h-full">
            <RiskMap
              className="w-full h-full rounded-none border-0"
              showLegendOverlay={false}
              interactive={true}
              defaultZoom={12}
              savedFacilities={savedFacilities}
            />
          </div>

          {/* Right Sidebar Details & Legend */}
          <div className="w-full md:w-80 bg-slate-50/90 border-t md:border-t-0 md:border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4">
              <MapLegend compact={false} />

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Geographic Telemetry</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Elevation:</span>
                    <span className="font-medium text-slate-800">{selectedLocation?.elevation || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Terrain:</span>
                    <span className="font-medium text-slate-800">{selectedLocation?.region || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Map Engine:</span>
                    <span className="font-mono text-[11px] text-slate-800">Leaflet 1.9 + OSM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                Close Full Map View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
