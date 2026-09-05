import React from "react";
import {
  PhoneCall,
  Cross,
  Shield,
  Flame,
  Radio,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Globe2,
  Info,
  Loader2,
  Phone
} from "lucide-react";

const DEFAULT_FALLBACK_CONTACTS = [
  {
    type: "ambulance",
    label: "Ambulance / Medical (102)",
    number: "102",
    description: "Emergency Medical Dispatch & Triage Response",
    verified: true,
    source: "Ministry of Health",
    isConfigured: true
  },
  {
    type: "police",
    label: "Police Emergency (100)",
    number: "100",
    altNumber: "112",
    description: "Police Control Room & Rapid Action Patrol",
    verified: true,
    source: "National Police Headquarters",
    isConfigured: true
  },
  {
    type: "fireRescue",
    label: "Fire & Rescue (101)",
    number: "101",
    description: "Fire Brigade & Water Disaster Rescue Service",
    verified: true,
    source: "Fire & Rescue Department",
    isConfigured: true
  },
  {
    type: "disasterHelpline",
    label: "Disaster Helpline (1149)",
    number: "1149",
    description: "National Disaster Risk Reduction & Crisis Management Center",
    verified: true,
    source: "Disaster Management Authority",
    isConfigured: true
  }
];

export default function QuickEmergencyContacts({
  contactsData = null,
  isLoading = false,
  error = null,
  locationName = "",
  isEmergencyMode = false,
  onRefresh
}) {
  const rawContacts = contactsData?.contacts || [];
  const contacts = rawContacts.length > 0 ? rawContacts : DEFAULT_FALLBACK_CONTACTS;
  const country = contactsData?.country || "National";
  const source = contactsData?.source || "Official National Emergency Registry";
  const isConfigured = contactsData?.isConfigured ?? true;

  const getContactMeta = (type) => {
    switch (type) {
      case "ambulance":
        return {
          icon: Cross,
          iconColor: "text-rose-600",
          iconBg: "bg-rose-50 border-rose-200",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
          badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
          categoryLabel: "Ambulance"
        };
      case "police":
        return {
          icon: Shield,
          iconColor: "text-blue-600",
          iconBg: "bg-blue-50 border-blue-200",
          btnColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
          categoryLabel: "Police"
        };
      case "fireRescue":
        return {
          icon: Flame,
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50 border-amber-200",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs",
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
          categoryLabel: "Fire & Rescue"
        };
      case "disasterHelpline":
      default:
        return {
          icon: Radio,
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-200",
          btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          categoryLabel: "Disaster Helpline"
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
        {/* Emergency Mode Urgent Banner */}
        {isEmergencyMode && (
          <div className="mb-4 -mt-2 -mx-2 p-3 bg-red-600 text-white rounded-lg flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-white shrink-0 animate-bounce" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Emergency Hotline Access Active
              </span>
            </div>
            <span className="text-[11px] font-medium opacity-90 hidden sm:inline-block">
              One-tap direct dial to emergency response dispatch
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isEmergencyMode
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-rose-50 border-rose-100 text-rose-600"
              }`}
            >
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Quick Emergency Contacts
                </h3>
                {isConfigured && country && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified ({country})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant one-tap national emergency dispatch for {locationName || "this region"}.
              </p>
            </div>
          </div>

          {/* Refresh / Country Label */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Emergency Contacts"
                aria-label="Refresh Emergency Contacts"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-rose-600" : ""}`} />
              </button>
            )}
            <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{country || "National"} Directory</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4">
          {/* Loading State */}
          {isLoading && contacts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-600">
                Loading emergency directory...
              </div>
              <p className="text-[11px] text-slate-400">
                Resolving national hotlines for {locationName || "selected region"}...
              </p>
            </div>
          ) : error && contacts.length === 0 ? (
            /* Error State */
            <div className="py-8 px-4 rounded-xl bg-red-50/70 border border-red-200 text-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-red-900">
                Emergency contacts are temporarily unavailable.
              </div>
              <p className="text-[11px] text-red-700 mt-1 max-w-md mx-auto">
                {error || "Could not retrieve national contacts from server."}
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Directory</span>
                </button>
              )}
            </div>
          ) : contacts.length === 0 ? (
            /* Empty State */
            <div className="py-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <PhoneCall className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                No verified emergency contacts are available for this location.
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                HydroGuard only displays strictly verified official government emergency numbers. Please dial your local universal emergency dispatch directly.
              </p>
            </div>
          ) : (
            /* 2x2 Grid of Emergency Contacts */
            <>
              {error && contacts.length > 0 && (
                <div className="mb-3.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Live emergency contact directory unreachable. Showing cached verified contacts.</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {contacts.map((contact, index) => {
                const meta = getContactMeta(contact.type);
                const Icon = meta.icon;
                const cleanNumber = (contact.number || "").replace(/[^0-9+]/g, "");
                const telHref = cleanNumber ? `tel:${cleanNumber}` : null;

                return (
                  <div
                    key={contact.type || index}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Top Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.iconBg}`}
                          >
                            <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                              {contact.label}
                            </h4>
                            <span
                              className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${meta.badgeColor}`}
                            >
                              {meta.categoryLabel}
                            </span>
                          </div>
                        </div>

                        {/* Verified Pill */}
                        {contact.verified && (
                          <span
                            className="shrink-0 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Verified Official Emergency Number"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      {/* Number Callout & Description */}
                      <div className="mt-3 flex items-baseline justify-between">
                        <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                          {contact.number}
                        </div>
                        {contact.altNumber && (
                          <span className="text-[11px] font-medium text-slate-500 font-mono">
                            Alt: {contact.altNumber}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {contact.description}
                      </p>
                    </div>

                    {/* One-Tap Call Action Button (>=52px Touch Standard) */}
                    <div className="pt-1">
                      {telHref ? (
                        <a
                          href={telHref}
                          className={`w-full min-h-[52px] inline-flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl text-sm font-extrabold tracking-wide transition-all ${meta.btnColor} text-center active:scale-[0.98] shadow-xs`}
                          aria-label={`Call ${contact.label} at ${contact.number}`}
                        >
                          <Phone className="w-4 h-4 shrink-0 animate-pulse" />
                          <span>CALL {contact.number}</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full min-h-[52px] inline-flex items-center justify-center space-x-2 py-3 px-4 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                        >
                          <Phone className="w-4 h-4 shrink-0 text-slate-400" />
                          <span>Emergency number unavailable</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Footer / Safety Provenance Note */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-start space-x-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            Directory numbers are resolved from official government emergency frameworks for {country || "the monitored region"}.
          </p>
        </div>
        <span className="font-semibold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
          Source: {source}
        </span>
      </div>
    </div>
  );
}
