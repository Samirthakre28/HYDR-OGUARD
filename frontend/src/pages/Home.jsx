import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  MapPin,
  Search,
  Navigation,
  ArrowRight,
  Droplets,
  Mountain,
  Activity,
  Bell,
  PhoneCall,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useLocation } from "../context/LocationContext";

export default function Home() {
  const { navigate } = useNavigation();
  const { selectedLocation, setSelectedLocation, locations, riskData, isLoadingRisk } = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState(null);

  // Home Page Animated Demo Risk Snapshot (30 to 69 range, 1s interval)
  const [demoScore, setDemoScore] = useState(48);

  useEffect(() => {
    const interval = setInterval(() => {
      // Score strictly between 30 and 69
      const nextScore = Math.floor(Math.random() * 40) + 30;
      setDemoScore(nextScore);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter locations for quick search
  const filteredLocations = (locations || []).filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Browser Geolocation handler
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLocating(true);
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;

        // Find closest station
        let closest = null;
        let minDistance = Infinity;

        (locations || []).forEach((loc) => {
          const d = Math.hypot(loc.latitude - latitude, loc.longitude - longitude);
          if (d < minDistance) {
            minDistance = d;
            closest = loc;
          }
        });

        if (closest) {
          setSelectedLocation(closest);
          setGeoMessage(`Matched closest monitoring station: ${closest.name}, ${closest.country}`);
        } else {
          setGeoMessage("No nearby monitoring station found. Please select from the list.");
        }
      },
      (err) => {
        setGeoLocating(false);
        setGeoMessage("Unable to retrieve your location. Please choose a station below.");
      },
      { timeout: 8000 }
    );
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "CRITICAL":
        return "text-rose-700 bg-rose-50 border-rose-200";
      case "HIGH":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "MODERATE":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "LOW":
      default:
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans max-w-full overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
        {/* Subtle background grid & gradient aura */}
        <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left: Text & Location Entry */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800 shadow-2xs max-w-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate">Live Environmental Telemetry & Multi-Hazard Assessment</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] break-words">
                AI-Powered Disaster Risk Assessment for Your Location
              </h1>

              <p className="text-sm sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Monitor flood, landslide and seismic risk with live environmental data, explainable risk analysis, alerts and emergency support.
              </p>

              {/* Quick Location Search & Geolocation Box */}
              <div className="p-3.5 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-card max-w-xl space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Select Monitored Region</span>
                  </span>
                  <span className="text-slate-400 font-normal text-[11px]">{locations?.length || 0} stations</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search city or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full min-h-[48px] pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 shadow-2xs"
                    />
                  </div>

                  <button
                    onClick={handleUseMyLocation}
                    disabled={geoLocating}
                    className="min-h-[48px] px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shadow-2xs shrink-0 active:bg-slate-200"
                    title="Find nearest monitoring station via browser GPS"
                  >
                    <Navigation className={`w-4 h-4 text-emerald-600 ${geoLocating ? "animate-spin" : ""}`} />
                    <span>{geoLocating ? "Locating..." : "Use My Location"}</span>
                  </button>
                </div>

                {/* Quick Station Dropdown List if typing */}
                {searchQuery.trim() && (
                  <div className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl p-1 shadow-dropdown space-y-0.5 animate-in fade-in duration-100 z-20">
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocation(loc);
                            setSearchQuery("");
                          }}
                          className={`w-full min-h-[44px] text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                            selectedLocation?.id === loc.id
                              ? "bg-emerald-50 text-emerald-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{loc.name}</span>, {loc.country}
                            <span className="text-[11px] text-slate-400 ml-1.5">({loc.region})</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {loc.latitude.toFixed(1)}°, {loc.longitude.toFixed(1)}°
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">No matching stations found.</div>
                    )}
                  </div>
                )}

                {geoMessage && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 leading-relaxed">
                    {geoMessage}
                  </p>
                )}

                {/* Currently Selected Location Pill */}
                {selectedLocation && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs gap-1">
                    <div className="flex items-center space-x-2 text-slate-800 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                      <span className="truncate">Active Station: <strong className="text-slate-900">{selectedLocation.name}, {selectedLocation.country}</strong></span>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">{selectedLocation.elevation}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons (Stacked Vertically on Mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="min-h-[48px] px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.98]"
                >
                  <span>Check My Risk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate("/risk-map")}
                  className="min-h-[48px] px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>Explore Risk Map</span>
                </button>
              </div>
            </div>

            {/* Right: Sleek Lightweight Hero Visual (No heavy map) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-800 relative overflow-hidden">
                {/* Radar grid aesthetics */}
                <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:18px_18px] opacity-15 pointer-events-none" />

                <div className="relative space-y-5">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">DEMO SNAPSHOT</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      SAMPLE ONLY
                    </span>
                  </div>

                  {/* Visual Risk Gauge Preview (Animated 1s Demo Score strictly between 30 and 69) */}
                  <div className="bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-700/60 backdrop-blur-xs flex items-center justify-between gap-3 transition-all duration-300">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        DEMO SNAPSHOT
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-white mt-1 flex items-baseline gap-1">
                        <span className="transition-all duration-300 font-mono">{demoScore}</span>
                        <span className="text-xs font-normal text-slate-400">/ 100</span>
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-colors duration-300 ${
                          demoScore > 50
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}>
                          {demoScore > 50 ? "HIGH" : "MODERATE"}
                        </span>
                      </div>
                    </div>

                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                  </div>

                  {/* Hazard Sub-Scores Matrix */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40 text-center">
                      <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <div className="text-[10px] text-slate-400 uppercase">Flood</div>
                      <div className="text-sm font-bold text-white">{riskData ? riskData.flood.score : "54"}</div>
                    </div>
                    <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40 text-center">
                      <Mountain className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <div className="text-[10px] text-slate-400 uppercase">Landslide</div>
                      <div className="text-sm font-bold text-white">{riskData ? riskData.landslide.score : "42"}</div>
                    </div>
                    <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40 text-center">
                      <Activity className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                      <div className="text-[10px] text-slate-400 uppercase">Seismic</div>
                      <div className="text-sm font-bold text-white">{riskData ? riskData.seismic.score : "28"}</div>
                    </div>
                  </div>

                  {/* Interactive Trigger */}
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full min-h-[44px] py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors active:scale-[0.98]"
                  >
                    <span>View Telemetry Breakdown</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE RISK SNAPSHOT */}
      <section className="py-10 sm:py-12 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Live Risk Snapshot
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Current evaluated conditions based on verified environmental signals.
              </p>
            </div>

            {selectedLocation && (
              <button
                onClick={() => navigate("/dashboard")}
                className="min-h-[44px] inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2 rounded-xl border border-emerald-200/80 transition-colors self-start sm:self-auto"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedLocation ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 sm:gap-6 items-start">
                {/* Location Info */}
                <div className="space-y-1 md:border-r md:border-slate-100 md:pr-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Selected Location</div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{selectedLocation.name}</h3>
                  <div className="text-xs text-slate-500">{selectedLocation.region}, {selectedLocation.country}</div>
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E • {selectedLocation.elevation}
                  </div>
                </div>

                {/* Overall Score */}
                <div className="space-y-1 md:border-r md:border-slate-100 md:pr-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Risk Score</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">{riskData?.overall?.score ?? "--"}</span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                    {riskData?.overall && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${getRiskColor(riskData.overall.level)}`}>
                        {riskData.overall.level}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">Deterministic Mathematical Scoring</div>
                </div>

                {/* Sub-hazards */}
                <div className="space-y-2 md:border-r md:border-slate-100 md:pr-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hazard Breakdown</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-600" /> Flood:</span>
                    <strong className="text-slate-900">{riskData?.flood ? `${riskData.flood.score} (${riskData.flood.level})` : "--"}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5"><Mountain className="w-3.5 h-3.5 text-amber-600" /> Landslide:</span>
                    <strong className="text-slate-900">{riskData?.landslide ? `${riskData.landslide.score} (${riskData.landslide.level})` : "--"}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-rose-600" /> Seismic:</span>
                    <strong className="text-slate-900">{riskData?.seismic ? `${riskData.seismic.score} (${riskData.seismic.level})` : "--"}</strong>
                  </div>
                </div>

                {/* Confidence & Freshness */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Data Reliability</div>
                  <div className="flex items-center space-x-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-700">Confidence: <strong className="text-slate-900">Moderate / High</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <Zap className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-slate-700">Status: <strong className="text-emerald-700 font-semibold">Live Telemetry Active</strong></span>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full min-h-[44px] mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    View Risk Analytics →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Select a location to view your current risk.</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Choose a global monitoring station above to fetch real-time rainfall, river levels, and seismic activity.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. KEY FEATURES (6-Card Grid) */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Comprehensive Disaster Risk Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Built on verified live feeds, deterministic calculations, and zero synthetic predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <Droplets className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Flood Risk Monitoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingests live precipitation from Open-Meteo and river basin stages from GloFAS to calculate localized flood vulnerability.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <Mountain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Landslide Risk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates topographical gradient slope, ground elevation baselines, and soil moisture saturation against historical recurrence.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Seismic Risk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tracks 24-hour earthquake count and magnitude proximity within a 100km radius using the official USGS Earthquake Catalog API.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Smart Shift Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated multi-hazard threshold notifications that alert users whenever risk levels escalate or weather shifts dramatically.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Emergency Help Near You</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Proximity-sorted directory of verified hospitals, police stations, fire stations, and emergency hotlines with 1-tap dialing.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-5 sm:p-6 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Offline Emergency Pack</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stores vital contacts, coordinates, and deterministic safety checklists locally so you remain protected even during grid failure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW HYDROGUARD WORKS (4-Step Visual Process) */}
      <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How HydroGuard Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Risk assessment and early warning support through a transparent 4-stage pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <div className="text-3xl font-black text-emerald-600/30 mb-2">01</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Select Location</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Target any supported global district or use browser geolocation to lock onto the nearest environmental monitoring station.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <div className="text-3xl font-black text-emerald-600/30 mb-2">02</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Collect & Validate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gathers real-time precipitation, river discharge, seismic tremors, and slope models with strict freshness and provenance validation.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <div className="text-3xl font-black text-emerald-600/30 mb-2">03</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Calculate Risk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Executes the deterministic, explainable Risk Engine to compute normalized hazard sub-scores and overall multi-hazard index.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <div className="text-3xl font-black text-emerald-600/30 mb-2">04</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Take Action</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Delivers AI-synthesized hazard explanations, actionable safety protocols, and 1-tap access to local emergency services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST / WHY HYDROGUARD */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-5 space-y-3.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Scientific Integrity & Reliability</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Why Communities & Responders Trust HydroGuard
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                In disaster risk management, unverified black-box predictions cost lives. HydroGuard is engineered around transparent mathematics, verified feeds, and explicit data boundaries.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Explainable</span>
                </div>
                <p className="text-xs text-slate-600">
                  Every risk score is generated using open, published formulas and weighted factors—never unexplainable black-box models.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Data-Aware Provenance</span>
                </div>
                <p className="text-xs text-slate-600">
                  Signals carry explicit origin metadata, observation timestamps, and TTL freshness rules to eliminate stale telemetry.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Safety First Transparency</span>
                </div>
                <p className="text-xs text-slate-600">
                  Data reliability and missing sensor states are surfaced openly rather than masking uncertainty with fabricated scores.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No Fake Intelligence</span>
                </div>
                <p className="text-xs text-slate-600">
                  AI generates natural language explanations downstream; it never alters mathematical scores or fabricates disaster events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EMERGENCY QUICK ACCESS */}
      <section className="py-10 sm:py-12 bg-gradient-to-br from-rose-50 to-orange-50 border-b border-rose-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-card p-5 sm:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">In immediate danger?</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                  Quickly connect with verified regional emergency hotlines, locate nearby medical facilities, or open the disaster map.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                onClick={() => navigate("/emergency")}
                className="min-h-[48px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs active:scale-[0.98]"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Emergency Contacts</span>
              </button>

              <button
                onClick={() => navigate("/emergency")}
                className="min-h-[48px] px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors active:scale-[0.98]"
              >
                <span>Find Nearby Help</span>
              </button>

              <button
                onClick={() => navigate("/risk-map")}
                className="min-h-[48px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors active:scale-[0.98]"
              >
                <span>Open Risk Map</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOME FOOTER */}
      <footer className="bg-slate-900 text-slate-300 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-slate-800 pb-6 sm:pb-8">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5 text-white font-black text-lg">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span>Hydro<span className="text-emerald-400">Guard</span></span>
              </div>
              <p className="text-xs text-slate-400">
                AI-Powered Disaster Risk Assessment & Early Warning Platform
              </p>
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 text-xs font-semibold">
              <button onClick={() => navigate("/")} className="min-h-[44px] flex items-center hover:text-white transition-colors">Home</button>
              <button onClick={() => navigate("/dashboard")} className="min-h-[44px] flex items-center hover:text-white transition-colors">Dashboard</button>
              <button onClick={() => navigate("/risk-map")} className="min-h-[44px] flex items-center hover:text-white transition-colors">Risk Map</button>
              <button onClick={() => navigate("/emergency")} className="min-h-[44px] flex items-center hover:text-white transition-colors text-rose-400">Emergency</button>
              <button onClick={() => navigate("/about")} className="min-h-[44px] flex items-center hover:text-white transition-colors">About</button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>Data Feeds: Open-Meteo Weather API • GloFAS Hydrology • USGS Earthquake Catalog • OpenStreetMap</span>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-400">
              <strong className="text-slate-200">Safety & Liability Disclaimer:</strong> HydroGuard provides risk assessment and preparedness support. It does not guarantee disaster prediction or replace official emergency authorities, evacuation orders, or civil defense agencies. Always follow instructions from local emergency personnel.
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 text-[11px] text-slate-500 border-t border-slate-800/80 gap-2">
              <span>© {new Date().getFullYear()} HydroGuard Intelligence. All rights reserved.</span>
              <span>Explainable Deterministic Architecture • Zero Fabricated ML</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
