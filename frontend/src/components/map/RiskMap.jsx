import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapControls from "./MapControls";
import MapLegend from "./MapLegend";
import { useLocation } from "../../context/LocationContext";
import { buildEmergencyFacilitiesFallback } from "../../data/environmentalFallback";

// Create custom high-visibility DivIcon for selected location marker
function createLocationMarker(locationName) {
  return L.divIcon({
    className: "hydroguard-location-marker terrasafe-location-marker",
    html: `
      <div class="relative flex items-center justify-center w-9 h-9">
        <span class="absolute w-9 h-9 rounded-full bg-rose-500/40 animate-ping"></span>
        <span class="absolute w-7 h-7 rounded-full bg-rose-500/60"></span>
        <div class="relative w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

// Create custom high-visibility DivIcon for emergency facilities (Hospital, Police, Fire, Shelter)
function createFacilityMarker(type) {
  let bgColor = "bg-indigo-600";
  let symbol = "📍";

  if (type === "Hospital") {
    bgColor = "bg-rose-600";
    symbol = "🏥";
  } else if (type === "Police") {
    bgColor = "bg-blue-600";
    symbol = "🛡️";
  } else if (type === "Fire" || type === "Fire Station" || type === "Fire & Rescue" || (type && type.includes("Fire"))) {
    bgColor = "bg-amber-600";
    symbol = "🚒";
  } else if (type === "Shelter" || type === "Evacuation Shelter" || (type && type.includes("Shelter"))) {
    bgColor = "bg-emerald-600";
    symbol = "⛺";
  }

  const cleanType = (type || "facility").toLowerCase().replace(/[^a-z0-9]/g, "-");

  return L.divIcon({
    className: `hydroguard-facility-marker-${cleanType} terrasafe-facility-marker-${cleanType}`,
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <div class="relative w-7 h-7 rounded-full ${bgColor} border-2 border-white shadow-md flex items-center justify-center text-xs">
          <span>${symbol}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

// Controller component to handle map movements and resize events
function MapController({ location, recenterCount, zoomLevel = 11 }) {
  const map = useMap();

  // Invalidate map size on mount/resize to prevent grey tile gaps
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  // Smoothly fly to selected location when coordinates or recenterCount change
  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      map.flyTo([location.latitude, location.longitude], zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [location?.latitude, location?.longitude, recenterCount, map, zoomLevel]);

  return null;
}

export default function RiskMap({
  className = "h-[340px] sm:h-[380px] w-full",
  showLegendOverlay = true,
  interactive = true,
  defaultZoom = 11,
  isOffline = false,
  savedFacilities = [],
  activeLayer = "overall"
}) {
  const { selectedLocation, triggerRecenter, recenterCount, riskData } = useLocation();
  const [showZones, setShowZones] = useState(true);

  const customMarker = useMemo(() => {
    return createLocationMarker(selectedLocation?.name);
  }, [selectedLocation?.name]);

  const fallbackFacilities = useMemo(
    () => (selectedLocation ? buildEmergencyFacilitiesFallback(selectedLocation) : []),
    [selectedLocation]
  );

  if (!selectedLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
        Select a location to initialize Risk Map
      </div>
    );
  }

  const centerPos = [selectedLocation.latitude, selectedLocation.longitude];

  // Robustly extract facility array whether passed as flat array or API response object
  const rawFacilityArray = Array.isArray(savedFacilities)
    ? savedFacilities
    : (savedFacilities?.services || savedFacilities?.data?.services || savedFacilities?.data || []);

  const sourcedFacilities = (rawFacilityArray || []).length > 0 ? rawFacilityArray : fallbackFacilities;

  const validFacilities = (sourcedFacilities || [])
    .map((f) => {
      const lat = Number(f.latitude ?? f.lat ?? f.coordinates?.latitude ?? f.coordinates?.lat);
      const lng = Number(f.longitude ?? f.lng ?? f.coordinates?.longitude ?? f.coordinates?.lng);
      return {
        ...f,
        latitude: lat,
        longitude: lng
      };
    })
    .filter((f) => !isNaN(f.latitude) && !isNaN(f.longitude) && f.latitude !== 0 && f.longitude !== 0);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200/90 shadow-inner ${className}`}>
      {/* Offline Mode Indicator Badge */}
      {isOffline && (
        <div className="absolute top-3 left-3 z-[1000] bg-amber-500/90 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-md flex items-center space-x-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span>OFFLINE MAP (Saved GPS Coordinates)</span>
        </div>
      )}

      {/* Interactive Leaflet Map */}
      <MapContainer
        center={centerPos}
        zoom={defaultZoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={false}
        className="w-full h-full z-0 bg-slate-100"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          location={selectedLocation}
          recenterCount={recenterCount}
          zoomLevel={defaultZoom}
        />

        {/* Modeled hazard visualization (not official government boundaries) */}
        {showZones && (
          <>
            {/* Outer: Low Risk Buffer Zone */}
            <Circle
              center={centerPos}
              radius={10000}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 0.07,
                weight: 1.5,
                dashArray: "4, 4"
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-emerald-700 block">Low Risk Perimeter (10 km)</strong>
                  <span className="text-slate-500">Modeled visualization. Not an official government hazard boundary.</span>
                </div>
              </Popup>
            </Circle>

            {/* Middle: Moderate Risk Zone */}
            <Circle
              center={centerPos}
              radius={5500}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.12,
                weight: 2
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-amber-700 block">Moderate Advisory Zone (5.5 km)</strong>
                  <span className="text-slate-500">Modeled visualization. Not an official government hazard boundary.</span>
                </div>
              </Popup>
            </Circle>

            {/* Inner: High Risk Zone */}
            <Circle
              center={centerPos}
              radius={2400}
              pathOptions={{
                color: "#f43f5e",
                fillColor: "#f43f5e",
                fillOpacity: 0.22,
                weight: 2.5
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-rose-700 block">High Hazard Warning (2.4 km)</strong>
                  <span className="text-slate-500">Modeled visualization. Not an official government hazard boundary.</span>
                </div>
              </Popup>
            </Circle>

            {/* Core: Critical Danger Center */}
            <Circle
              center={centerPos}
              radius={900}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#dc2626",
                fillOpacity: 0.35,
                weight: 3
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-red-700 block">Critical Hazard Epicenter (900 m)</strong>
                  <span className="text-slate-500">Modeled visualization. Not an official government hazard boundary.</span>
                </div>
              </Popup>
            </Circle>
          </>
        )}

        {/* Selected Location Marker */}
        <Marker position={centerPos} icon={customMarker}>
          <Popup className="hydroguard-custom-popup terrasafe-custom-popup">
            <div className="p-1 text-xs">
              <div className="font-bold text-slate-900 text-sm">{selectedLocation.name}</div>
              <div className="text-slate-500 text-[11px] mb-1.5">{selectedLocation.region}, {selectedLocation.country}</div>
              <div className="bg-slate-50 p-1.5 rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                Lat: {selectedLocation.latitude.toFixed(4)}° | Long: {selectedLocation.longitude.toFixed(4)}°
              </div>
              {riskData?.overall && (
                <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-700">
                  <div><strong>Overall:</strong> {riskData.overall.score} ({riskData.overall.level})</div>
                  {riskData.flood && <div><strong>Flood:</strong> {riskData.flood.score} ({riskData.flood.level})</div>}
                  {riskData.landslide && <div><strong>Landslide:</strong> {riskData.landslide.score} ({riskData.landslide.level})</div>}
                  {riskData.seismic && <div><strong>Seismic:</strong> {riskData.seismic.score} ({riskData.seismic.level})</div>}
                  <div className="text-slate-400">Layer: {activeLayer} · Risk Engine</div>
                </div>
              )}
              <div className="mt-1.5 inline-flex items-center text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {isOffline ? "Saved Offline Station" : "Active Analysis Node"}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Emergency Facility Markers (Saved GPS Coordinates) */}
        {validFacilities.map((fac, idx) => {
          const typeStr = fac.type || "Hospital";
          const symbol = typeStr === "Hospital" ? "🏥" : typeStr === "Police" ? "🛡️" : typeStr.includes("Fire") ? "🚒" : "⛺";
          const isDemo = fac.isDemo || fac.source?.includes("Demo") || fac.source?.includes("Simulation");
          const hasPhone = Boolean(fac.phone && String(fac.phone).trim().length > 2);
          const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`;

          return (
            <Marker
              key={`fac-${idx}-${fac.name || idx}`}
              position={[fac.latitude, fac.longitude]}
              icon={createFacilityMarker(typeStr)}
            >
              <Popup className="hydroguard-facility-popup terrasafe-facility-popup">
                <div className="p-1.5 text-xs min-w-[180px] max-w-[240px] space-y-1.5">
                  <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-1">
                    <div>
                      <div className="font-bold text-slate-900 text-xs leading-snug flex items-center gap-1">
                        <span>{symbol}</span>
                        <span>{fac.name}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">{typeStr}</div>
                    </div>
                    {isDemo && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Fallback Facility
                      </span>
                    )}
                  </div>

                  <div className="text-slate-600 text-[11px] leading-tight">
                    {fac.address || fac.region || "Address unavailable"}
                  </div>

                  {fac.distanceFormatted && (
                    <div className="text-[10px] text-slate-600">
                      Distance: <strong className="text-slate-800">{fac.distanceFormatted}</strong>
                    </div>
                  )}

                  <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    {hasPhone && (
                      <a
                        href={`tel:${String(fac.phone).replace(/[^0-9+]/g, "")}`}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold transition-colors"
                      >
                        <span>📞 Call</span>
                      </a>
                    )}
                    <a
                      href={navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold transition-colors shadow-2xs"
                    >
                      <span>📍 Navigate</span>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating HUD Controls */}
      <MapControls
        location={selectedLocation}
        onRecenter={triggerRecenter}
        showZones={showZones}
        onToggleZones={() => setShowZones(!showZones)}
      />

      {/* Embedded Compact Legend Overlay */}
      {showLegendOverlay && (
        <div className="absolute bottom-3 right-3 z-[1000] pointer-events-auto max-w-[200px] hidden sm:block">
          <MapLegend compact={true} />
        </div>
      )}
    </div>
  );
}
