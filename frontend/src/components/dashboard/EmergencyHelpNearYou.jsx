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
  MapPin,
  Compass,
  Hospital,
  ShieldAlert,
  House
} from "lucide-react";

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

  const isDemoData = emergencyData?.isDemoData ?? false;
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
          icon: Hospital,
          badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
          iconBg: "bg-rose-50 border-rose-200 text-rose-600",
          label: "Hospital"
        };
      case "Police":
        return {
          icon: ShieldAlert,
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
          iconBg: "bg-blue-50 border-blue-200 text-blue-600",
          label: "Police"
        };
      case "Fire Station":
      case "Fire & Rescue":
        return {
          icon: Flame,
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
          iconBg: "bg-amber-50 border-amber-200 text-amber-600",
          label: "Fire & Rescue"
        };
      case "Shelter":
        return {
          icon: House,
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
          label: "Shelter"
        };
      default:
        return {
          icon: MapPin,
          badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
          iconBg: "bg-slate-50 border-slate-200 text-slate-600",
          label: type || "Facility"
        };
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition-all ${
        isEmergencyMode
          ? "border-emerald-300 ring-2 ring-emerald-500/20"
          : "border-slate-200/90"
      } p-5 sm:p-6 space-y-4 flex flex-col justify-between h-full`}
    >
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Hospital className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  NEARBY HELP
                </h3>
                {isCached ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                    Cached
                  </span>
                ) : services.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nearby shelters, hospitals, police and fire stations for {locationName || "this region"}.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Refresh nearby resources"
                aria-label="Refresh nearby resources"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            )}
            <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-xl">
              {services.length} Resources
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        {services.length > 0 && (
          <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "All", icon: Building2, count: counts.all },
              { id: "hospitals", label: "Hospitals", icon: Hospital, count: counts.hospitals },
              { id: "shelters", label: "Shelters", icon: House, count: counts.shelters },
              { id: "police", label: "Police", icon: ShieldAlert, count: counts.police },
              { id: "fireRescue", label: "Fire & Rescue", icon: Flame, count: counts.fireRescue }
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-[44px] inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isActive ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="mt-4">
          {isLoading && services.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-600">
                Loading emergency information...
              </div>
            </div>
          ) : error && services.length === 0 ? (
            <div className="py-8 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                NO VERIFIED NEARBY RESOURCES
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Nearby emergency resources are currently unavailable.
              </p>
            </div>
          ) : displayServices.length === 0 ? (
            <div className="py-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                NO VERIFIED NEARBY RESOURCES
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Nearby emergency resources are currently unavailable.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name + " " + (service.address || locationName))}`;

                const hasPhone = Boolean(service.phone && service.phone.trim().length > 3);
                const telUrl = hasPhone ? `tel:${service.phone.replace(/[^0-9+]/g, "")}` : null;

                return (
                  <div
                    key={service.id || service._id || index}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={service.name}>
                              {service.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate" title={service.address || service.region}>
                              {service.address || `${service.region || "District"}, ${service.country || "National"}`}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${config.badgeColor}`}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-1 text-slate-600 font-semibold text-[11px]">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{service.distanceFormatted || "Proximity available"}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {telUrl && (
                          <a
                            href={telUrl}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                            title={`Call ${service.phone}`}
                            aria-label={`Call ${service.name}`}
                          >
                            <Phone className="w-4 h-4 text-emerald-600" />
                          </a>
                        )}

                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                          title="View on Map"
                          aria-label={`View ${service.name} on Map`}
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          <span>View on Map</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

