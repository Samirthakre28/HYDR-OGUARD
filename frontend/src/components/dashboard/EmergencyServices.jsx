import React from "react";
import {
  Building2,
  Cross,
  Home,
  Shield,
  Flame,
  Phone,
  Navigation,
  Loader2,
  Info
} from "lucide-react";

export default function EmergencyServices({
  services = [],
  isLoading = false,
  isDemoData = true,
  locationName = ""
}) {
  const getServiceIcon = (type) => {
    switch (type) {
      case "Hospital":
        return Cross;
      case "Shelter":
        return Home;
      case "Police":
        return Shield;
      case "Fire Station":
        return Flame;
      default:
        return Building2;
    }
  };

  const getStatusBadge = (availability) => {
    const text = (availability || "").toLowerCase();
    if (text.includes("available") || text.includes("operational") || text.includes("active") || text.includes("ready")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (text.includes("alert") || text.includes("standby") || text.includes("unit")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  Nearby Emergency Services
                </h3>
                {isDemoData && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Demo Data
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Response units and critical infrastructure registered for {locationName || "this location"}.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            {services.length} Facilities Active
          </span>
        </div>

        {/* Content */}
        <div className="mt-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              <span>Locating nearby emergency services...</span>
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {services.map((service, index) => {
                const Icon = getServiceIcon(service.type);

                return (
                  <div
                    key={service._id || service.id || index}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 group shadow-2xs"
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                            {service.name}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-500 block mt-0.5 truncate">
                            {service.type} • <span className="text-slate-700">{service.address}</span>
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          service.availability
                        )}`}
                      >
                        {service.availability?.split(" ")[0] || "Active"}
                      </span>
                    </div>

                    {/* Contact & Availability snippet */}
                    <div className="text-[11px] text-slate-600 bg-white/90 p-2 rounded-md border border-slate-200/70 flex items-center justify-between">
                      <span className="truncate pr-2 font-medium">{service.availability}</span>
                      <span className="text-slate-500 font-mono text-[10px] shrink-0">{service.phone}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-0.5">
                      <button
                        onClick={() => alert(`[Demo Mode] Simulated navigation to: ${service.name} (${service.address})`)}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                      >
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        <span>Navigate</span>
                      </button>
                      <button
                        onClick={() => alert(`[Demo Mode] Calling emergency contact: ${service.phone}`)}
                        className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors shadow-2xs"
                        title={`Simulated call: ${service.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No emergency facilities found for this region.
            </div>
          )}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center space-x-1.5 text-[10px] text-slate-400">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Demo facility data for simulation. Official authorities remain the emergency dispatch source.</span>
      </div>
    </div>
  );
}
