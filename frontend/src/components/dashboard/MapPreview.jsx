import React, { useState } from "react";
import {
  Map as MapIcon,
  Maximize2,
  MapPin,
  Compass
} from "lucide-react";
import RiskMap from "../map/RiskMap";
import FullscreenMapModal from "../map/FullscreenMapModal";
import { useLocation } from "../../context/LocationContext";
import { useNavigation } from "../../context/NavigationContext";

export default function MapPreview({ isOffline = false, savedFacilities = [] }) {
  const { selectedLocation } = useLocation();
  const { navigate } = useNavigation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden flex flex-col h-full justify-between">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Risk Map {isOffline && <span className="text-xs font-normal text-amber-600">(Offline)</span>}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedLocation
                  ? `${selectedLocation.name} (${selectedLocation.latitude.toFixed(2)}°N, ${selectedLocation.longitude.toFixed(2)}°E)`
                  : "Geospatial Hazard Visualization"}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/risk-map")}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            aria-label="Open full risk map"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Open Full Risk Map →</span>
          </button>
        </div>

        {/* Live / Offline Interactive Leaflet Map Container */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-center">
          <RiskMap
            className="h-[300px] sm:h-[340px] lg:h-[360px] w-full"
            showLegendOverlay={true}
            interactive={true}
            isOffline={isOffline}
            savedFacilities={savedFacilities}
          />
        </div>

        {/* Map Legend Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center space-x-1 font-semibold text-slate-700">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hazard Radii:</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>High Risk</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Moderate</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Safe Buffer</span>
            </span>
          </div>
        </div>
      </div>

      {/* Full-Screen Interactive GIS Modal */}
      <FullscreenMapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        savedFacilities={savedFacilities}
      />
    </>
  );
}
