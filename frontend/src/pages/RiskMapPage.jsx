import React, { useState, useEffect } from "react";
import {
  Map as MapIcon,
  MapPin,
  Layers,
  ShieldAlert,
  Droplets,
  Mountain,
  Activity,
  Compass,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  Info,
  ShieldCheck,
  Maximize2
} from "lucide-react";
import RiskMap from "../components/map/RiskMap";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
import { getEmergencyServices } from "../services/api";
import { buildEmergencyFacilitiesFallback } from "../data/environmentalFallback";

export default function RiskMapPage() {
  const { navigate } = useNavigation();
  const {
    selectedLocation,
    setSelectedLocation,
    locations,
    riskData,
    isLoadingRisk,
    refreshRisk,
    triggerRecenter
  } = useLocation();

  const [activeLayer, setActiveLayer] = useState("overall"); // "overall" | "flood" | "landslide" | "seismic"
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(true);
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedLocation) return undefined;

    const fallbackFacilities = buildEmergencyFacilitiesFallback(selectedLocation);
    setFacilities(fallbackFacilities);

    async function fetchEmergencyFacilities() {
      const locId = selectedLocation._id || selectedLocation.id;
      try {
        const res = await getEmergencyServices(locId);
        if (isMounted && res?.success && res.data) {
          const next = res.data.services || res.data;
          if (Array.isArray(next) && next.length > 0) {
            setFacilities(next);
          } else {
            setFacilities(fallbackFacilities);
          }
        } else if (isMounted) {
          setFacilities(fallbackFacilities);
        }
      } catch (err) {
        console.warn("[RiskMapPage] Could not fetch emergency services:", err.message);
        if (isMounted) {
          setFacilities(fallbackFacilities);
        }
      }
    }
    fetchEmergencyFacilities();
    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  const filteredLocations = (locations || []).filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshRisk();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW":
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans max-w-full overflow-x-hidden">
      {/* Top Map Page Control Bar */}
      <div className="bg-white border-b border-slate-200/90 px-3.5 sm:px-6 lg:px-8 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Title & Location */}
          <div className="flex items-center justify-between sm:justify-start space-x-2.5 min-w-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MapIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                  Risk Map
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Select Location"}
                </p>
              </div>
            </div>

            {/* Mobile Recenter Button */}
            <button
              onClick={triggerRecenter}
              className="sm:hidden min-h-[44px] px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              aria-label="Recenter on location"
            >
              <Compass className="w-4 h-4" />
              <span>Center</span>
            </button>
          </div>

          {/* Location Selector & Refresh */}
          <div className="flex items-center gap-2">
            {/* Location Selector Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="w-full sm:w-auto min-h-[44px] flex items-center justify-between space-x-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                aria-expanded={isSearchOpen}
                aria-label="Select location station"
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {selectedLocation ? selectedLocation.name : "Select Station"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {isSearchOpen && (
                <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-dropdown border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search station or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {filteredLocations.map((loc) => {
                      const isSelected = selectedLocation?.id === loc.id;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocation(loc);
                            setIsSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-900 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{loc.name}</span>, {loc.country}
                            <div className="text-[10px] text-slate-400">{loc.region}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoadingRisk}
              className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-colors shadow-2xs flex items-center justify-center shrink-0"
              title="Refresh telemetry"
              aria-label="Refresh risk telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoadingRisk ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Hazard Layer Filter Pills (Horizontal Scrollable, min 44px touch height) */}
        <div className="max-w-7xl mx-auto pt-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1 hidden sm:inline">
            Layers:
          </span>
          <button
            onClick={() => setActiveLayer("overall")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
              activeLayer === "overall"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Hazards</span>
          </button>
          <button
            onClick={() => setActiveLayer("flood")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
              activeLayer === "flood"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Flood Layer</span>
          </button>
          <button
            onClick={() => setActiveLayer("landslide")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
              activeLayer === "landslide"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Landslide Layer</span>
          </button>
          <button
            onClick={() => setActiveLayer("seismic")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
              activeLayer === "seismic"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Seismic Layer</span>
          </button>
        </div>
      </div>

      {/* Main Map Content: Desktop 2-Column, Mobile Map Priority with Expandable Bottom Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Left / Main: GIS Map Canvas */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden flex flex-col">
            <div className="hidden sm:flex p-3.5 border-b border-slate-100 items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Active Layer: <strong className="text-slate-900 capitalize">{activeLayer} Risk Overlay</strong></span>
              </div>
              <button
                onClick={triggerRecenter}
                className="min-h-[36px] text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Recenter on Station
              </button>
            </div>

            <div className="p-1 sm:p-2 flex-1">
              <RiskMap
                className="h-[360px] sm:h-[480px] lg:h-[580px] w-full rounded-xl"
                showLegendOverlay={true}
                interactive={true}
                defaultZoom={11}
                savedFacilities={facilities}
                activeLayer={activeLayer}
              />
            </div>

            {/* Legend & Disclaimer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3 text-[11px] overflow-x-auto no-scrollbar w-full sm:w-auto">
                <span className="flex items-center space-x-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>0–25 Low</span></span>
                <span className="flex items-center space-x-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span><span>26–50 Moderate</span></span>
                <span className="flex items-center space-x-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>51–75 High</span></span>
                <span className="flex items-center space-x-1 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>76–100 Critical</span></span>
              </div>
              <div className="text-[10px] text-slate-400">
                Risk zones are visualization aids, not official evacuation borders.
              </div>
            </div>
          </div>

          {/* Right: Location & Risk Analytics Card (Expandable on Mobile) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 sm:p-5 space-y-4">
              {/* Mobile Header / Expand Toggle */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Station Overview</div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 truncate">
                    {selectedLocation ? selectedLocation.name : "No Location"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedLocation ? `${selectedLocation.region}, ${selectedLocation.country}` : ""}
                  </p>
                </div>

                {/* Mobile Collapsible Toggle */}
                <button
                  onClick={() => setMobilePanelExpanded(!mobilePanelExpanded)}
                  className="lg:hidden min-h-[44px] px-3 py-1.5 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200"
                >
                  <span>{mobilePanelExpanded ? "Hide" : "Details"}</span>
                  {mobilePanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {mobilePanelExpanded && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Overall Score */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Multi-Hazard Index</div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                        {riskData?.overall?.score ?? "--"}
                        <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
                      </div>
                    </div>
                    {riskData?.overall && (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getRiskBadge(riskData.overall.level)}`}>
                        {riskData.overall.level}
                      </span>
                    )}
                  </div>

                  {/* Hazard Breakdown */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Hazard Ratings</div>

                    <div className="p-2.5 sm:p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold">Flood Risk</span>
                      </div>
                      <strong className="text-slate-900 font-bold">
                        {riskData?.flood ? `${riskData.flood.score} (${riskData.flood.level})` : "--"}
                      </strong>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Mountain className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">Landslide Risk</span>
                      </div>
                      <strong className="text-slate-900 font-bold">
                        {riskData?.landslide ? `${riskData.landslide.score} (${riskData.landslide.level})` : "--"}
                      </strong>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Activity className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-semibold">Seismic Risk</span>
                      </div>
                      <strong className="text-slate-900 font-bold">
                        {riskData?.seismic ? `${riskData.seismic.score} (${riskData.seismic.level})` : "--"}
                      </strong>
                    </div>
                  </div>

                  {/* Reliability Indicator */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Data Status:</span>
                    </span>
                    <span className="font-semibold text-slate-800">Live Telemetry Active</span>
                  </div>

                  {/* Action Buttons (>=44px touch targets) */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs active:scale-[0.98]"
                    >
                      <span>Open Full Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => navigate("/emergency")}
                      className="w-full min-h-[44px] py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors active:scale-[0.98]"
                    >
                      <PhoneCall className="w-4 h-4 text-rose-600" />
                      <span>Emergency Assistance</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
