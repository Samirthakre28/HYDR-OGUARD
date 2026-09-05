import React, { useState } from "react";
import {
  Building2,
  Cross,
  Shield,
  Flame,
  Home,
  Phone,
  Navigation,
  Loader2,
  Info,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Compass
} from "lucide-react";
import { formatTimeAgo } from "../../utils/timeAgo";

export default function EmergencyHelpNearYou({
  emergencyData = null,
  isLoading = false,
  error = null,
  locationName = "",
  isEmergencyMode = false,
  onRefresh,
  isOffline = false
}) {
  const [activeCategory, setActiveCategory] = useState("all");

  const services = emergencyData?.services || emergencyData || [];
  const grouped = emergencyData?.groupedServices || {
    hospitals: Array.isArray(services) ? services.filter((s) => s.type === "Hospital") : [],
    police: Array.isArray(services) ? services.filter((s) => s.type === "Police") : [],
    fireRescue: Array.isArray(services) ? services.filter((s) => s.type === "Fire Station" || s.type === "Fire & Rescue") : [],
    shelters: Array.isArray(services) ? services.filter((s) => s.type === "Shelter") : []
  };

  const isDemoData = emergencyData?.isDemoData ?? true;
  const isCached = Boolean(emergencyData?.cached || isOffline);

  // Category counts
  const counts = {
    all: services.length,
    hospitals: grouped.hospitals?.length || 0,
    police: grouped.police?.length || 0,
    fireRescue: grouped.fireRescue?.length || 0,
    shelters: grouped.shelters?.length || 0
  };

  // Filtered list
  const displayServices =
    activeCategory === "all"
      ? services
      : activeCategory === "hospitals"
      ? grouped.hospitals || []
      : activeCategory === "police"
      ? grouped.police || []
      : activeCategory === "fireRescue"
      ? grouped.fireRescue || []
      : grouped.shelters || [];

  const getServiceConfig = (type) => {
    switch (type) {
      case "Hospital":
        return {
          icon: Cross,
          badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
          iconBg: "bg-rose-50 border-rose-100 text-rose-600",
          label: "Hospital"
        };
      case "Police":
        return {
          icon: Shield,
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
          iconBg: "bg-blue-50 border-blue-100 text-blue-600",
          label: "Police"
        };
      case "Fire Station":
      case "Fire & Rescue":
        return {
          icon: Flame,
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
          iconBg: "bg-amber-50 border-amber-100 text-amber-600",
          label: "Fire & Rescue"
        };
      case "Shelter":
        return {
          icon: Home,
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600",
          label: "Emergency Shelter"
        };
      default:
        return {
          icon: Building2,
          badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
          iconBg: "bg-slate-50 border-slate-200 text-slate-600",
          label: type || "Facility"
        };
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border shadow-card transition-all ${
        isEmergencyMode
          ? "border-red-300 ring-2 ring-red-500/20"
          : "border-slate-200/90"
      } p-6 flex flex-col justify-between`}
    >
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isEmergencyMode
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Emergency Help Near You
                </h3>
                {isCached ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                    Cached Snapshot
                  </span>
                ) : isDemoData ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Demo Data
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified Registry
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proximity-sorted emergency response units & relief centers for {locationName || "this location"}.
              </p>
            </div>
          </div>

          {/* Action / Count Pill */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Emergency Facilities"
                aria-label="Refresh Emergency Facilities"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            )}
            <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              {services.length} Nearby {services.length === 1 ? "Unit" : "Units"}
            </span>
          </div>
        </div>

        {/* Category Navigation Tabs (>=44px touch targets) */}
        <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Facilities", icon: Building2, count: counts.all },
            { id: "hospitals", label: "Hospitals", icon: Cross, count: counts.hospitals },
            { id: "police", label: "Police", icon: Shield, count: counts.police },
            { id: "fireRescue", label: "Fire & Rescue", icon: Flame, count: counts.fireRescue },
            { id: "shelters", label: "Shelters", icon: Home, count: counts.shelters }
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[44px] inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="mt-4">
          {isLoading && services.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-600">
                Locating nearby emergency services...
              </div>
              <p className="text-[11px] text-slate-400">
                Calculating Haversine distances for {locationName}...
              </p>
            </div>
          ) : error && services.length === 0 ? (
            /* Error State (when no cached data exists) */
            <div className="py-8 px-4 rounded-xl bg-red-50/70 border border-red-200 text-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-red-900">
                Emergency services are temporarily unavailable.
              </div>
              <p className="text-[11px] text-red-700 mt-1 max-w-md mx-auto">
                {error || "Could not retrieve emergency directory from the server."}
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Facilities</span>
                </button>
              )}
            </div>
          ) : displayServices.length === 0 ? (
            /* Empty State */
            <div className="py-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                No nearby emergency services available.
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeCategory !== "all"
                  ? `No facilities found under the "${activeCategory}" category for this region.`
                  : "No emergency infrastructure registered in this coordinate radius."}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Try selecting another monitored station from the location switcher.
              </p>
            </div>
          ) : (
            /* Facility Cards Grid */
            <>
              {error && services.length > 0 && (
                <div className="mb-3.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Live emergency facility update unavailable. Showing cached facilities.</span>
                  </div>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayServices.map((service, index) => {
                  const config = getServiceConfig(service.type);
                  const Icon = config.icon;
                  const hasCoordinates =
                    service.latitude !== null &&
                    service.latitude !== undefined &&
                    service.longitude !== null &&
                    service.longitude !== undefined;

                  const navUrl = hasCoordinates
                    ? `https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}`
                    : null;

                  const hasPhone = Boolean(service.phone && service.phone.trim().length > 3);
                  const telUrl = hasPhone ? `tel:${service.phone.replace(/[^0-9+]/g, "")}` : null;

                  const formattedTime = service.updatedAt
                    ? formatTimeAgo(service.updatedAt)
                    : "Recently";

                  return (
                    <div
                      key={service.id || service._id || index}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                    >
                      {/* Facility Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate" title={service.name}>
                                {service.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate" title={service.address || service.region}>
                                {service.address || `${service.region || "District"}, ${service.country || "National"}`}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${config.badgeColor}`}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {/* Distance & Contact Info */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 text-slate-600 font-medium">
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{service.distanceFormatted || "Distance unavailable"}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {telUrl && (
                            <a
                              href={telUrl}
                              className="min-h-[44px] inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]"
                              title={`Call ${service.phone}`}
                              aria-label={`Call ${service.name} at ${service.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{service.phone}</span>
                            </a>
                          )}

                          {navUrl && (
                            <a
                              href={navUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs active:scale-[0.98]"
                              title="Navigate via Google Maps"
                              aria-label={`Navigate to ${service.name}`}
                            >
                              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Navigate</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer / Transparency Notice */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-start space-x-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            {isDemoData
              ? "Emergency centers shown are simulated demo infrastructure. In a real life-safety emergency, dial your local emergency services (e.g., 112 / 911 / 999)."
              : "Emergency registry data provided for disaster preparedness and rapid evacuation triage."}
          </p>
        </div>
        <span className="font-semibold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
          Source: {isDemoData ? "Demo Simulation" : "Official Dispatch"}
        </span>
      </div>
    </div>
  );
}
