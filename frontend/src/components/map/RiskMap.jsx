import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapControls from "./MapControls";
import MapLegend from "./MapLegend";
import { useLocation } from "../../context/LocationContext";
import { buildEmergencyFacilitiesFallback } from "../../data/environmentalFallback";

// Helper function to map risk level to single clean risk influence zone styling
function getZoneStyle(level) {
  switch (level?.toUpperCase()) {
    case "CRITICAL":
      return {
        color: "#dc2626",        // red border
        fillColor: "#e11d48",    // red/pink fill
        fillOpacity: 0.38,
        weight: 2.5,
        radius: 6500,
        label: "Critical Risk Influence Zone"
      };
    case "HIGH":
      return {
        color: "#ea580c",        // orange border
        fillColor: "#ea580c",    // orange fill
        fillOpacity: 0.28,
        weight: 2,
        radius: 4800,
        label: "High Risk Influence Zone"
      };
    case "MODERATE":
      return {
        color: "#d97706",        // amber border
        fillColor: "#f59e0b",    // yellow/amber fill
        fillOpacity: 0.18,
        weight: 1.5,
        radius: 3500,
        label: "Moderate Advisory Influence Zone"
      };
    case "LOW":
    default:
      return {
        color: "#059669",        // green border
        fillColor: "#10b981",    // subtle green fill
        fillOpacity: 0.10,
        weight: 1.5,
        radius: 2500,
        label: "Low Threat Influence Zone"
      };
  }
}

// Create custom compact station marker icon (colored by risk level)
function createLocationMarker(locationName, level = "HIGH") {
  let badgeBg = "bg-orange-600";
  if (level === "CRITICAL") badgeBg = "bg-rose-600";
  else if (level === "MODERATE") badgeBg = "bg-amber-500";
  else if (level === "LOW") badgeBg = "bg-emerald-600";

  return L.divIcon({
    className: "hydroguard-location-marker",
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <div class="relative w-7 h-7 rounded-full ${badgeBg} border-2 border-white shadow-md flex items-center justify-center text-white">
          <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

// Create custom compact marker icon for emergency facilities
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
    className: `hydroguard-facility-marker-${cleanType}`,
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <div class="relative w-7 h-7 rounded-full ${bgColor} border-2 border-white shadow-md flex items-center justify-center text-xs">
          <span>${symbol}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

// Controller component to handle map movements and resize events
function MapController({ location, recenterCount, zoomLevel = 11 }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

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

  // Compute effective risk level & score dynamically for activeLayer
  const effectiveRiskLevel = useMemo(() => {
    if (!riskData) return selectedLocation?.defaultRisk || "MODERATE";
    if (activeLayer === "flood") return riskData.flood?.level || riskData.overall?.level || "HIGH";
    if (activeLayer === "landslide") return riskData.landslide?.level || riskData.overall?.level || "MODERATE";
    if (activeLayer === "seismic") return riskData.seismic?.level || riskData.overall?.level || "LOW";
    return riskData.overall?.level || "HIGH";
  }, [riskData, activeLayer, selectedLocation]);

  const effectiveRiskScore = useMemo(() => {
    if (!riskData) return 50;
    if (activeLayer === "flood") return riskData.flood?.score ?? riskData.overall?.score ?? 70;
    if (activeLayer === "landslide") return riskData.landslide?.score ?? riskData.overall?.score ?? 60;
    if (activeLayer === "seismic") return riskData.seismic?.score ?? riskData.overall?.score ?? 30;
    return riskData.overall?.score ?? 78;
  }, [riskData, activeLayer]);

  const zoneStyle = useMemo(() => {
    return getZoneStyle(effectiveRiskLevel);
  }, [effectiveRiskLevel]);

  const customMarker = useMemo(() => {
    return createLocationMarker(selectedLocation?.name, effectiveRiskLevel);
  }, [selectedLocation?.name, effectiveRiskLevel]);

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

  // Extract valid facilities array
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

        {/* ONE Single Clean Risk Influence Zone Circle */}
        {showZones && (
          <Circle
            center={centerPos}
            radius={zoneStyle.radius}
            pathOptions={{
              color: zoneStyle.color,
              fillColor: zoneStyle.fillColor,
              fillOpacity: zoneStyle.fillOpacity,
              weight: zoneStyle.weight
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900 leading-tight">
                  {selectedLocation.name} — {zoneStyle.label}
                </div>
                <div className="text-[11px] font-semibold text-slate-700">
                  Layer ({activeLayer.toUpperCase()}): <span className="font-bold">{effectiveRiskScore}% ({effectiveRiskLevel})</span>
                </div>
                <div className="text-[10px] text-slate-500 italic pt-0.5 border-t border-slate-100 leading-normal">
                  Risk influence zone — estimated impact area, not an exact flood boundary.
                </div>
              </div>
            </Popup>
          </Circle>
        )}

        {/* Selected Location Marker */}
        <Marker position={centerPos} icon={customMarker}>
          <Popup className="hydroguard-custom-popup">
            <div className="p-1 text-xs">
              <div className="font-bold text-slate-900 text-sm">{selectedLocation.name}</div>
              <div className="text-slate-500 text-[11px] mb-1.5">{selectedLocation.region}, {selectedLocation.country}</div>
              <div className="bg-slate-50 p-1.5 rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                Lat: {selectedLocation.latitude.toFixed(4)}° | Long: {selectedLocation.longitude.toFixed(4)}°
              </div>
              {riskData?.overall && (
                <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-700 font-medium">
                  <div><strong>Overall Risk:</strong> {riskData.overall.score}% ({riskData.overall.level})</div>
                  {riskData.flood && <div><strong>Flood Risk:</strong> {riskData.flood.score}% ({riskData.flood.level})</div>}
                  {riskData.landslide && <div><strong>Landslide Risk:</strong> {riskData.landslide.score}% ({riskData.landslide.level})</div>}
                  {riskData.seismic && <div><strong>Seismic Risk:</strong> {riskData.seismic.score}% ({riskData.seismic.level})</div>}
                  <div className="text-slate-400">Layer: {activeLayer.toUpperCase()} · Engine Computed</div>
                </div>
              )}
              <div className="mt-1.5 inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {isOffline ? "Saved Offline Station" : "Active Monitored Station"}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Emergency Facility Markers */}
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
              <Popup className="hydroguard-facility-popup">
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
                        Facility
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

      {/* Embedded Legend Overlay */}
      {showLegendOverlay && (
        <div className="absolute bottom-3 right-3 z-[1000] pointer-events-auto max-w-[220px] hidden sm:block">
          <MapLegend compact={true} />
        </div>
      )}
    </div>
  );
}
