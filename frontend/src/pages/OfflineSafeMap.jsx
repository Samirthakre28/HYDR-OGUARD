import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LifeBuoy,
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
  Trash2,
  MapPin,
  Compass,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Hospital,
  Flame,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  ArrowRight,
  Info,
  Maximize2,
  Check,
  Search,
  ExternalLink,
  Target
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
import {
  saveOfflineSafeMap,
  getOfflineSafeMap,
  hasOfflineSafeMap,
  deleteOfflineSafeMap,
  listOfflineSafeMaps,
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  getCompassDirection,
  formatDistance,
  findNearestShelter,
  calculateOfflineGuidance,
  isDataStale
} from "../services/offlineStorage";
import { getEmergencyServices } from "../services/api";
import { formatTimeAgo } from "../utils/timeAgo";

// Custom Leaflet DivIcon for User GPS Location
function createUserGpsMarker() {
  return L.divIcon({
    className: "hydroguard-user-gps-marker",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></span>
        <span class="absolute w-6 h-6 rounded-full bg-blue-500/60"></span>
        <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

// Custom Leaflet DivIcon for Saved Shelters
function createShelterMarker(isDemo = false, isNearest = false) {
  const bgClass = isNearest
    ? "bg-emerald-600 ring-4 ring-emerald-300 animate-bounce"
    : isDemo
      ? "bg-amber-600"
      : "bg-emerald-700";

  return L.divIcon({
    className: `hydroguard-shelter-marker ${isNearest ? "nearest-shelter" : ""}`,
    html: `
      <div class="relative flex items-center justify-center w-9 h-9">
        <div class="w-8 h-8 rounded-xl ${bgClass} border-2 border-white shadow-lg flex items-center justify-center text-white text-sm">
          <span>⛺</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

// Custom Leaflet DivIcon for Emergency Facilities
function createFacilityMarker(type) {
  let symbol = "📍";
  let bgClass = "bg-indigo-600";

  if (type === "Hospital") {
    symbol = "🏥";
    bgClass = "bg-rose-600";
  } else if (type === "Police") {
    symbol = "🛡️";
    bgClass = "bg-blue-600";
  } else if (type === "Fire Station" || type === "Fire") {
    symbol = "🚒";
    bgClass = "bg-amber-600";
  }

  return L.divIcon({
    className: "hydroguard-offline-facility-marker",
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <div class="w-7 h-7 rounded-full ${bgClass} border-2 border-white shadow-md flex items-center justify-center text-xs text-white">
          <span>${symbol}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

// Controller component to handle map pan/zoom
function SafeMapController({ targetPosition, zoomLevel = 13, recenterTrigger = 0 }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (targetPosition && Array.isArray(targetPosition) && targetPosition[0] && targetPosition[1]) {
      map.flyTo(targetPosition, zoomLevel, {
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [targetPosition, zoomLevel, recenterTrigger, map]);

  return null;
}

export default function OfflineSafeMap() {
  const { selectedLocation, setSelectedLocation, locations, riskData } = useLocation();
  const { navigate } = useNavigation();

  // Network & Offline Status
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [simulateOffline, setSimulateOffline] = useState(false);

  // GPS Geolocation State
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle"); // "idle" | "locating" | "success" | "denied" | "unavailable"
  const [gpsErrorMsg, setGpsErrorMsg] = useState(null);

  // Saved Safe Map Data
  const locationId = selectedLocation?._id || selectedLocation?.id;
  const [savedMap, setSavedMap] = useState(null);
  const [downloadedAreas, setDownloadedAreas] = useState([]);

  // Preparation & Download State
  const [downloadRadius, setDownloadRadius] = useState(10); // 5, 10, 25 km
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusMsg, setDownloadStatusMsg] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Active Guidance & Selection
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [activeGuidance, setActiveGuidance] = useState(null);
  const [mapTargetPos, setMapTargetPos] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [recenterCount, setRecenterCount] = useState(0);

  // Delete Confirmation Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Effective online state (considers manual demo toggle)
  const effectiveOnline = isOnline && !simulateOffline;

  // Load Saved Safe Map for current location
  const reloadSavedMap = useCallback(() => {
    if (!locationId) {
      setSavedMap(null);
      return;
    }
    const pkg = getOfflineSafeMap(locationId);
    setSavedMap(pkg);
    setDownloadedAreas(listOfflineSafeMaps());
  }, [locationId]);

  useEffect(() => {
    reloadSavedMap();
  }, [reloadSavedMap]);

  // Track Device GPS Location
  const requestGpsLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unavailable");
      setGpsErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setGpsStatus("locating");
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString()
        };
        setGpsLocation(coords);
        setGpsStatus("success");
      },
      (err) => {
        setGpsStatus(err.code === 1 ? "denied" : "unavailable");
        if (err.code === 1) {
          setGpsErrorMsg("Location permission denied. You can still view downloaded shelters.");
        } else {
          setGpsErrorMsg("Location unavailable. Showing saved map center.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, []);

  // Auto-request GPS on mount
  useEffect(() => {
    requestGpsLocation();
  }, [requestGpsLocation]);

  // Handle Download / Preparation of Offline Area
  const handleDownloadArea = async () => {
    if (!locationId || !selectedLocation) return;

    setIsDownloading(true);
    setDownloadProgress(10);
    setDownloadStatusMsg("Connecting to emergency registry...");

    try {
      // Step 1: Fetch live verified emergency services from API if available
      let emergencyFacilities = [];
      let verifiedShelters = [];

      try {
        setDownloadProgress(35);
        setDownloadStatusMsg("Retrieving verified shelters and safe facilities...");
        const res = await getEmergencyServices(locationId);
        if (res?.data?.services) {
          const rawServices = res.data.services;
          // Filter shelters vs other emergency facilities
          rawServices.forEach((svc) => {
            const hasCoords = typeof svc.latitude === "number" && typeof svc.longitude === "number";
            if (!hasCoords) return;

            if (svc.type === "Shelter") {
              verifiedShelters.push({
                id: svc.id || svc._id,
                name: svc.name,
                type: "Emergency Shelter",
                latitude: svc.latitude,
                longitude: svc.longitude,
                address: svc.address || "Shelter address registered",
                capacity: svc.capacity || "Designated Multi-Hazard Capacity",
                contact: svc.phone || null,
                source: svc.isDemo ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION" : (svc.source || "Official Disaster Management Directorate"),
                verified: !svc.isDemo,
                isDemo: Boolean(svc.isDemo),
                lastUpdated: svc.updatedAt || new Date().toISOString()
              });
            } else {
              emergencyFacilities.push({
                id: svc.id || svc._id,
                name: svc.name,
                type: svc.type || "Hospital",
                latitude: svc.latitude,
                longitude: svc.longitude,
                address: svc.address || "Address available",
                phone: svc.phone || null,
                source: svc.isDemo ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION" : (svc.source || "Civil Protection Registry"),
                isDemo: Boolean(svc.isDemo),
                lastUpdated: svc.updatedAt || new Date().toISOString()
              });
            }
          });
        }
      } catch (fetchErr) {
        console.warn("Could not fetch remote services, using local defaults if available:", fetchErr);
      }

      setDownloadProgress(70);
      setDownloadStatusMsg("Compiling geometric perimeter & navigation vectors...");
      await new Promise((resolve) => setTimeout(resolve, 350));

      setDownloadProgress(90);
      setDownloadStatusMsg("Saving offline safe map package to local storage...");

      const payload = {
        locationId,
        locationName: selectedLocation.name,
        country: selectedLocation.country,
        region: selectedLocation.region,
        center: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        },
        radiusKm: downloadRadius,
        shelters: verifiedShelters,
        emergencyFacilities,
        risk: riskData
      };

      const saved = saveOfflineSafeMap(locationId, payload);
      setSavedMap(saved);
      setDownloadedAreas(listOfflineSafeMaps());
      setDownloadProgress(100);
      setDownloadStatusMsg("Offline area successfully prepared!");
      setSaveSuccessMsg(`Offline Safe Map for ${selectedLocation.name} (${downloadRadius} km) is ready for offline use.`);

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadStatusMsg("");
      }, 1000);

      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Failed to download offline map:", err);
      setIsDownloading(false);
      setDownloadStatusMsg("Download failed. Please check connection and retry.");
    }
  };

  // Handle Delete Downloaded Safe Map
  const handleDeleteArea = (idToDelete) => {
    deleteOfflineSafeMap(idToDelete);
    if (idToDelete === locationId) {
      setSavedMap(null);
      setSelectedShelter(null);
      setActiveGuidance(null);
    }
    setDownloadedAreas(listOfflineSafeMaps());
    setDeleteConfirmId(null);
  };

  // Determine Active Shelters & Facilities to Render
  const activeShelters = useMemo(() => {
    return savedMap?.shelters || [];
  }, [savedMap]);

  const activeFacilities = useMemo(() => {
    return savedMap?.emergencyFacilities || [];
  }, [savedMap]);

  // Current Origin Coordinates for Distance/Bearing (GPS location if available, otherwise location center)
  const currentOrigin = useMemo(() => {
    if (gpsLocation?.latitude && gpsLocation?.longitude) {
      return { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude, isGps: true };
    }
    if (savedMap?.center?.latitude && savedMap?.center?.longitude) {
      return { latitude: savedMap.center.latitude, longitude: savedMap.center.longitude, isGps: false };
    }
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      return { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude, isGps: false };
    }
    return null;
  }, [gpsLocation, savedMap, selectedLocation]);

  // Nearest Shelter Calculation
  const nearestShelterResult = useMemo(() => {
    if (!currentOrigin || activeShelters.length === 0) return null;
    return findNearestShelter(currentOrigin.latitude, currentOrigin.longitude, activeShelters);
  }, [currentOrigin, activeShelters]);

  // Start Offline Guidance toward a target shelter
  const handleStartGuidance = (shelter) => {
    if (!currentOrigin || !shelter) return;
    const guidance = calculateOfflineGuidance(
      currentOrigin.latitude,
      currentOrigin.longitude,
      shelter.latitude,
      shelter.longitude
    );
    setActiveGuidance({
      ...guidance,
      targetShelter: shelter
    });
    setSelectedShelter(shelter);

    // Center map between origin and destination
    const midLat = (currentOrigin.latitude + shelter.latitude) / 2;
    const midLon = (currentOrigin.longitude + shelter.longitude) / 2;
    setMapTargetPos([midLat, midLon]);
    setMapZoom(13);
    setRecenterCount((prev) => prev + 1);
  };

  // Stop Guidance
  const handleStopGuidance = () => {
    setActiveGuidance(null);
  };

  // View Shelter on Map
  const handleViewShelterOnMap = (shelter) => {
    setSelectedShelter(shelter);
    setMapTargetPos([shelter.latitude, shelter.longitude]);
    setMapZoom(14);
    setRecenterCount((prev) => prev + 1);
  };

  // Recenter on Location Center
  const handleRecenterCenter = () => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      setMapTargetPos([selectedLocation.latitude, selectedLocation.longitude]);
      setMapZoom(12);
      setRecenterCount((prev) => prev + 1);
    }
  };

  // Recenter on GPS
  const handleRecenterGps = () => {
    if (gpsLocation?.latitude && gpsLocation?.longitude) {
      setMapTargetPos([gpsLocation.latitude, gpsLocation.longitude]);
      setMapZoom(14);
      setRecenterCount((prev) => prev + 1);
    } else {
      requestGpsLocation();
    }
  };

  // Check if saved data is stale
  const isMapStale = savedMap?.downloadedAt ? isDataStale(savedMap.downloadedAt, 24) : false;

  const defaultCenter = [
    selectedLocation?.latitude || 19.076,
    selectedLocation?.longitude || 72.8777
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans max-w-full overflow-x-hidden">
      {/* Top Banner & Mode Bar */}
      <div className="bg-white border-b border-slate-200/90 px-3.5 sm:px-6 lg:px-8 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Title & Status */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              effectiveOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-500/10 text-amber-700 border-amber-300"
            }`}>
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                  Offline Safe Map
                </h1>
                {/* Mode Pill Badge */}
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  effectiveOnline
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}>
                  {effectiveOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" />
                      <span>Online Preparation</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-700" />
                      <span>HYDROGUARD OFFLINE MODE</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Find saved safe locations even when the internet is unavailable.
              </p>
            </div>
          </div>

          {/* Location Station & Simulation Toggle */}
          <div className="flex items-center gap-2">
            {/* Station Selector */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedLocation?.id || ""}
                onChange={(e) => {
                  const found = (locations || []).find((l) => l.id === e.target.value);
                  if (found) {
                    setSelectedLocation(found);
                    setSelectedShelter(null);
                    setActiveGuidance(null);
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Select Monitoring Station"
              >
                {(locations || []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}, {loc.country}
                  </option>
                ))}
              </select>
            </div>

            {/* Offline Simulation Toggle for Testing */}
            <button
              onClick={() => setSimulateOffline(!simulateOffline)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center space-x-1.5 shrink-0 ${
                simulateOffline
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Toggle simulated offline state"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{simulateOffline ? "Simulating Offline" : "Simulate Offline"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Offline Mode Alert Banner */}
      {!effectiveOnline && (
        <div className="bg-amber-500/10 border-b border-amber-300 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold tracking-wide uppercase text-amber-950 block sm:inline mr-2">
                  HYDROGUARD OFFLINE MODE:
                </span>
                <span>Using your downloaded map and previously saved shelter information. Live feeds paused.</span>
                {savedMap && (
                  <div className="text-[11px] text-amber-800 mt-1 flex flex-wrap items-center gap-3">
                    <span>Downloaded Area: <strong>{savedMap.locationName} ({savedMap.radiusKm} km radius)</strong></span>
                    <span>•</span>
                    <span>Saved Shelters: <strong>{savedMap.shelters?.length || 0}</strong></span>
                    <span>•</span>
                    <span>Last Saved: <strong>{formatTimeAgo(savedMap.downloadedAt)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {isMapStale && (
              <div className="shrink-0 bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-400/60 font-semibold text-[11px] text-amber-900 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <span>Saved data &gt;24h old. Verify locally.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unsaved Location Warning (if offline and no map downloaded) */}
      {!effectiveOnline && !savedMap && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-start space-x-3 text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-rose-950">
                No offline map has been downloaded for {selectedLocation?.name || "this area"}.
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                Connect to the internet to prepare and download an offline safe map package. To maintain life-safety integrity, no fake shelters are rendered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-emerald-900 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Top Grid: Nearest Safe Location & Offline Preparation Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Left / Top (Lg: 8 cols): Safe Map View & HUD */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden flex flex-col">
            {/* Map Header Controls */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800 truncate">
                  {selectedLocation?.name} Safe Radius Map
                </span>
                {savedMap && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                    {savedMap.radiusKm} km saved
                  </span>
                )}
              </div>

              {/* Action Buttons: Recenter on Center & Recenter on GPS */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={handleRecenterCenter}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Recenter map to station center"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Center</span>
                </button>

                <button
                  onClick={handleRecenterGps}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Recenter map to current GPS location"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Your GPS</span>
                </button>
              </div>
            </div>

            {/* Offline Guidance Active Banner on Map */}
            {activeGuidance && (
              <div className="bg-emerald-700 text-white px-3.5 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                  <span className="font-bold">Active Guidance:</span>
                  <span className="underline">{activeGuidance.targetShelter?.name}</span>
                  <span>•</span>
                  <span><strong>{activeGuidance.distanceFormatted}</strong> {activeGuidance.bearingCardinal} ({activeGuidance.bearingDegrees}°)</span>
                </div>
                <button
                  onClick={handleStopGuidance}
                  className="text-[11px] bg-emerald-800 hover:bg-emerald-900 px-2.5 py-1 rounded font-bold transition-colors"
                >
                  Clear Guidance
                </button>
              </div>
            )}

            {/* Map Canvas */}
            <div className="relative p-1 bg-slate-100 h-[360px] sm:h-[460px] lg:h-[520px] w-full">
              <MapContainer
                center={defaultCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                className="w-full h-full rounded-xl z-0"
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />

                <SafeMapController
                  targetPosition={mapTargetPos || defaultCenter}
                  zoomLevel={mapZoom}
                  recenterTrigger={recenterCount}
                />

                {/* Downloaded Area Perimeter Circle */}
                {selectedLocation && (
                  <Circle
                    center={[selectedLocation.latitude, selectedLocation.longitude]}
                    radius={(savedMap?.radiusKm || downloadRadius) * 1000}
                    pathOptions={{
                      color: "#059669",
                      fillColor: "#059669",
                      fillOpacity: 0.06,
                      weight: 2,
                      dashArray: "6, 6"
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1">
                        <strong className="text-emerald-800 block">Offline Coverage Area</strong>
                        <span>{savedMap?.radiusKm || downloadRadius} km safety radius around {selectedLocation.name}</span>
                      </div>
                    </Popup>
                  </Circle>
                )}

                {/* User GPS Pin */}
                {gpsLocation?.latitude && gpsLocation?.longitude && (
                  <Marker
                    position={[gpsLocation.latitude, gpsLocation.longitude]}
                    icon={createUserGpsMarker()}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="text-blue-700 block font-bold">Your Location</strong>
                        <span className="text-slate-500 text-[11px]">Acquired via device GPS</span>
                        <div className="mt-1 font-mono text-[10px] text-slate-600">
                          {gpsLocation.latitude.toFixed(4)}°, {gpsLocation.longitude.toFixed(4)}°
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Saved Shelters */}
                {activeShelters.map((shelter) => {
                  const isNearest = nearestShelterResult?.shelter?.id === shelter.id;
                  return (
                    <Marker
                      key={`shelter-${shelter.id}`}
                      position={[shelter.latitude, shelter.longitude]}
                      icon={createShelterMarker(shelter.isDemo, isNearest)}
                      eventHandlers={{
                        click: () => setSelectedShelter(shelter)
                      }}
                    >
                      <Popup>
                        <div className="p-1 text-xs min-w-[180px]">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
                            <span>⛺</span>
                            <span>{shelter.name}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{shelter.address}</div>
                          {shelter.capacity && (
                            <div className="text-[11px] text-slate-600 mt-1">
                              Capacity: <strong>{shelter.capacity}</strong>
                            </div>
                          )}
                          <div className="mt-1 text-[10px] text-emerald-700 font-semibold">
                            {shelter.isDemo ? "DEMO DATA — NOT A REAL SHELTER" : "Verified Safe Shelter"}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex gap-1">
                            <button
                              onClick={() => handleStartGuidance(shelter)}
                              className="w-full min-h-[32px] bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold py-1 px-2"
                            >
                              Start Guidance
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Saved Emergency Facilities */}
                {activeFacilities.map((fac) => (
                  <Marker
                    key={`fac-${fac.id}`}
                    position={[fac.latitude, fac.longitude]}
                    icon={createFacilityMarker(fac.type)}
                  >
                    <Popup>
                      <div className="p-1 text-xs min-w-[160px]">
                        <div className="font-bold text-slate-900 text-sm">{fac.name}</div>
                        <div className="text-slate-500 text-[11px]">{fac.type} • {fac.address}</div>
                        {fac.phone && (
                          <div className="mt-1 font-mono text-[11px] text-emerald-700">
                            📞 {fac.phone}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Straight-line guidance polyline vector */}
                {activeGuidance?.straightLineCoordinates && (
                  <Polyline
                    positions={activeGuidance.straightLineCoordinates}
                    pathOptions={{
                      color: "#059669",
                      weight: 4,
                      dashArray: "8, 8",
                      opacity: 0.9
                    }}
                  />
                )}
              </MapContainer>

              {/* Floating Guidance Disclaimer on Map */}
              {activeGuidance && (
                <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-md z-[1000] bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700">
                  <div className="font-bold flex items-center space-x-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Straight-Line Bearing Guidance</span>
                  </div>
                  <p className="mt-0.5 text-slate-300 leading-tight">
                    Offline guidance is based on saved coordinates and may not represent actual roads. Navigate with caution.
                  </p>
                </div>
              )}
            </div>

            {/* Map Footer: GPS Telemetry & Status */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>
                  GPS Status:{" "}
                  <strong className={gpsStatus === "success" ? "text-blue-700" : "text-amber-700"}>
                    {gpsStatus === "success"
                      ? "Acquired (Live Position Active)"
                      : gpsStatus === "locating"
                        ? "Acquiring coordinates..."
                        : gpsStatus === "denied"
                          ? "Permission Denied"
                          : "Unavailable"}
                  </strong>
                </span>
              </div>

              {gpsErrorMsg && (
                <span className="text-[11px] text-slate-500 italic truncate max-w-xs">
                  {gpsErrorMsg}
                </span>
              )}
            </div>
          </div>

          {/* Right (Lg: 4 cols): Nearest Safe Shelter Card & Preparation Module */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Nearest Saved Safe Location Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Nearest Saved Safe Location
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Life Safety
                </span>
              </div>

              {nearestShelterResult ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-900 leading-tight">
                      {nearestShelterResult.shelter.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {nearestShelterResult.shelter.address}
                    </div>
                  </div>

                  {/* Distance & Bearing Stat Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</div>
                      <div className="text-base font-black text-emerald-700 mt-0.5">
                        {nearestShelterResult.distanceFormatted}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direction / Bearing</div>
                      <div className="text-base font-black text-slate-800 mt-0.5">
                        {nearestShelterResult.bearingCardinal} • {nearestShelterResult.bearingDegrees}°
                      </div>
                    </div>
                  </div>

                  {/* Provenance Badge */}
                  <div className="text-[11px] p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-600 space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Verification Status:</span>
                      <span className={nearestShelterResult.shelter.isDemo ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
                        {nearestShelterResult.shelter.isDemo ? "DEMO DATA" : "Verified Shelter"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Source: {nearestShelterResult.shelter.source}
                    </div>
                  </div>

                  {/* Action Buttons (>=48px emergency touch targets) */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleStartGuidance(nearestShelterResult.shelter)}
                      className="w-full min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs active:scale-98"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Start Offline Guidance</span>
                    </button>

                    <button
                      onClick={() => handleViewShelterOnMap(nearestShelterResult.shelter)}
                      className="w-full min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors active:scale-98"
                    >
                      <Compass className="w-4 h-4 text-slate-600" />
                      <span>View on Map</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center space-y-1">
                  <div className="font-bold text-slate-700">No verified shelters available for this area.</div>
                  <p className="text-[11px]">
                    {effectiveOnline
                      ? "Download the offline area package to retrieve available emergency facilities."
                      : "No verified shelter data was saved for this downloaded perimeter."}
                  </p>
                </div>
              )}
            </div>

            {/* 2. Online Preparation & Download Area Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Prepare Offline Area
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  v1.0 Cache
                </span>
              </div>

              {effectiveOnline ? (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Download geographic map data and verified emergency relief shelters for <strong>{selectedLocation?.name}</strong> before heading into areas with unstable internet.
                  </p>

                  {/* Radius Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Coverage Radius
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 25].map((rad) => (
                        <button
                          key={rad}
                          onClick={() => setDownloadRadius(rad)}
                          className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-colors border flex flex-col items-center justify-center ${
                            downloadRadius === rad
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{rad} km</span>
                          <span className="text-[9px] font-normal text-slate-400">~{(rad * 0.25 + 0.8).toFixed(1)} MB</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Download Progress Bar */}
                  {isDownloading && (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                        <span>{downloadStatusMsg}</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300 ease-out"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadArea}
                    disabled={isDownloading || !locationId}
                    className="w-full min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs active:scale-98"
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>
                      {isDownloading
                        ? "Downloading Area..."
                        : savedMap
                          ? `Update Offline Area (${downloadRadius} km)`
                          : `Download Offline Area (${downloadRadius} km)`}
                    </span>
                  </button>

                  {savedMap && (
                    <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                      <span>Saved: <strong>{formatTimeAgo(savedMap.downloadedAt)}</strong></span>
                      <span className="text-emerald-700 font-semibold">{savedMap.shelters?.length || 0} shelters cached</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5">
                    <WifiOff className="w-4 h-4 text-amber-700" />
                    <span>Preparation Paused (Offline)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    New areas cannot be downloaded while disconnected. Connect to the internet to download additional safe maps.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Shelter Bottom Sheet / Details Panel (When shelter marker is tapped) */}
        {selectedShelter && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⛺</span>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {selectedShelter.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedShelter.address}</p>
              </div>

              <button
                onClick={() => setSelectedShelter(null)}
                className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors"
                aria-label="Close shelter details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coordinates</div>
                <div className="font-mono text-slate-800 font-bold mt-0.5">
                  {selectedShelter.latitude.toFixed(4)}°, {selectedShelter.longitude.toFixed(4)}°
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity & Type</div>
                <div className="text-slate-800 font-bold mt-0.5">
                  {selectedShelter.capacity || "Designated Safe Ground"} ({selectedShelter.type})
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Telephone</div>
                <div className="text-emerald-700 font-mono font-bold mt-0.5">
                  {selectedShelter.contact ? (
                    <a href={`tel:${selectedShelter.contact.replace(/[^0-9+]/g, "")}`} className="underline">
                      📞 {selectedShelter.contact}
                    </a>
                  ) : (
                    "Available via Local Police"
                  )}
                </div>
              </div>
            </div>

            {/* Provenance & Disclaimer Alert */}
            <div className={`p-3 rounded-xl text-xs border ${
              selectedShelter.isDemo
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <div className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Provenance: {selectedShelter.source}</span>
              </div>
              <div className="text-[11px] mt-0.5 opacity-90">
                {selectedShelter.isDemo
                  ? "DEMO DATA — NOT A VERIFIED EMERGENCY LOCATION. Used strictly for evaluation."
                  : "Verified relief shelter record saved from official civil protection registry."}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleStartGuidance(selectedShelter)}
                className="flex-1 min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Offline Guidance to this Shelter</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Downloaded Areas Management Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Downloaded Offline Areas</h2>
              <p className="text-xs text-slate-500">
                Manage safe map packages stored in your device's browser memory.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {downloadedAreas.length} Saved Package{downloadedAreas.length !== 1 ? "s" : ""}
            </span>
          </div>

          {downloadedAreas.length > 0 ? (
            <div className="space-y-2.5">
              {downloadedAreas.map((area) => (
                <div
                  key={area.locationId}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{area.locationName}</span>
                      <span className="text-[11px] font-semibold text-slate-500">({area.country})</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {area.radiusKm} km radius
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Downloaded: <strong>{formatTimeAgo(area.downloadedAt)}</strong></span>
                      <span>•</span>
                      <span>Shelters: <strong>{area.sheltersCount}</strong></span>
                      <span>•</span>
                      <span>Size: <strong>~{(area.estimatedStorageSizeBytes / (1024 * 1024)).toFixed(2)} MB</strong></span>
                      {area.isStale && (
                        <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded text-[10px]">
                          Stale (&gt;24h)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const targetLoc = (locations || []).find((l) => l.id === area.locationId);
                        if (targetLoc) setSelectedLocation(targetLoc);
                        if (effectiveOnline) handleDownloadArea();
                      }}
                      disabled={!effectiveOnline}
                      className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      title="Refresh this area package"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                      <span>Update</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(area.locationId)}
                      className="min-h-[44px] min-w-[44px] p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors"
                      title="Delete offline map package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              No offline safe maps have been downloaded yet. Select a location above and download a safe area.
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-slate-900 text-base">Delete Offline Map?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will remove the downloaded map coordinates and saved shelter records from your device. You will need an internet connection to download it again.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteArea(deleteConfirmId)}
                  className="flex-1 min-h-[44px] py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
