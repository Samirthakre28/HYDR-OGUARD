import React from "react";
import {
  PhoneCall,
  Shield,
  Flame,
  Radio,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Globe2,
  Info,
  Loader2,
  Phone,
  Ambulance,
  ShieldAlert,
  Siren
} from "lucide-react";

const DEFAULT_FALLBACK_CONTACTS = [
  {
    type: "ambulance",
    label: "AMBULANCE",
    number: "102",
    description: "Medical emergency assistance & triage dispatch",
    verified: true,
    source: "Ministry of Health",
    isConfigured: true
  },
  {
    type: "police",
    label: "POLICE",
    number: "100",
    altNumber: "112",
    description: "Police emergency assistance & rapid patrol",
    verified: true,
    source: "National Police Headquarters",
    isConfigured: true
  },
  {
    type: "fireRescue",
    label: "FIRE & RESCUE",
    number: "101",
    description: "Fire and rescue services & flood extraction",
    verified: true,
    source: "Fire & Rescue Department",
    isConfigured: true
  },
  {
    type: "disasterHelpline",
    label: "DISASTER HELPLINE",
    number: "1149",
    description: "National disaster risk reduction & helpline",
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
  const source = contactsData?.source || "Official Emergency Management Registry";
  const isConfigured = contactsData?.isConfigured ?? true;

  const getContactMeta = (type, label = "") => {
    const l = (label || type || "").toLowerCase();
    if (l.includes("ambulance") || type === "ambulance") {
      return {
        icon: Ambulance,
        iconColor: "text-rose-600",
        iconBg: "bg-rose-100/70 border-rose-200 text-rose-700",
        btnColor: "bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-200 text-white",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        categoryLabel: "AMBULANCE"
      };
    }
    if (l.includes("police") || type === "police") {
      return {
        icon: ShieldAlert,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100/70 border-blue-200 text-blue-700",
        btnColor: "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 text-white",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        categoryLabel: "POLICE"
      };
    }
    if (l.includes("fire") || type === "fireRescue") {
      return {
        icon: Flame,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-100/70 border-amber-200 text-amber-700",
        btnColor: "bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 text-white",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        categoryLabel: "FIRE & RESCUE"
      };
    }
    return {
      icon: Radio,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100/70 border-emerald-200 text-emerald-700",
      btnColor: "bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 text-white",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      categoryLabel: "HELPLINE"
    };
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        isEmergencyMode
          ? "border-red-400 ring-2 ring-red-500/20 shadow-lg"
          : "border-slate-200/90 shadow-sm"
      } p-5 sm:p-6 space-y-5`}
    >
      {/* 2. EMERGENCY ACTION SECTION: NEED HELP? Callout Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <Siren className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                NEED HELP?
              </h2>
              <p className="text-xs text-slate-300">
                Immediate dispatch helplines for {locationName || "this location"}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            High Priority Response
          </span>
        </div>

        {/* Quick Dial Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {contacts.slice(0, 4).map((contact, idx) => {
            const meta = getContactMeta(contact.type, contact.label);
            const Icon = meta.icon;
            const cleanNumber = (contact.number || "").replace(/[^0-9+]/g, "");
            const telHref = cleanNumber ? `tel:${cleanNumber}` : null;

            return telHref ? (
              <a
                key={idx}
                href={telHref}
                className="min-h-[44px] flex items-center justify-center space-x-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white transition-all text-center shrink-0"
                aria-label={`Direct call ${contact.label} at ${contact.number}`}
              >
                <Icon className={`w-4 h-4 ${meta.iconColor} shrink-0`} />
                <span className="truncate">{contact.label.split(" ")[0]} ({contact.number})</span>
              </a>
            ) : (
              <div
                key={idx}
                className="min-h-[44px] flex items-center justify-center space-x-2 px-3 py-2.5 bg-slate-800/50 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 text-center"
              >
                <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{contact.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. EMERGENCY CONTACTS SECTION */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  EMERGENCY CONTACTS
                </h3>
                {isConfigured && country && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified ({country})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official emergency numbers & one-tap direct dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Refresh emergency contacts"
                aria-label="Refresh emergency contacts"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-rose-600" : ""}`} />
              </button>
            )}
            <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-xl flex items-center space-x-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{country || "National"} Directory</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4">
          {isLoading && contacts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-600">
                Loading emergency information...
              </div>
            </div>
          ) : error && contacts.length === 0 ? (
            <div className="py-8 px-4 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
              <div className="text-xs font-bold text-red-900">
                Emergency information unavailable.
              </div>
              <p className="text-[11px] text-red-700 max-w-md mx-auto">
                {error || "Could not retrieve emergency contacts."}
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-2 inline-flex items-center space-x-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm min-h-[44px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Directory</span>
                </button>
              )}
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <PhoneCall className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                Emergency information unavailable.
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                No verified emergency contacts found for this location. Dial regional SOS dispatch directly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {contacts.map((contact, index) => {
                const meta = getContactMeta(contact.type, contact.label);
                const Icon = meta.icon;
                const cleanNumber = (contact.number || "").replace(/[^0-9+]/g, "");
                const telHref = cleanNumber ? `tel:${cleanNumber}` : null;

                return (
                  <div
                    key={contact.type || index}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* Top Info */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.iconBg}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 leading-tight uppercase tracking-wider truncate">
                              {contact.label}
                            </h4>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {contact.source || "Official Registry"}
                            </span>
                          </div>
                        </div>

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
                          <span className="text-[11px] font-semibold text-slate-500 font-mono">
                            Alt: {contact.altNumber}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                        {contact.description}
                      </p>
                    </div>

                    {/* CALL Button (>=52px Touch Standard) */}
                    <div className="pt-1">
                      {telHref ? (
                        <a
                          href={telHref}
                          className={`w-full min-h-[52px] inline-flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl text-sm font-extrabold tracking-wide transition-all ${meta.btnColor} text-center shadow-xs active:scale-[0.98]`}
                          aria-label={`Call ${contact.label} at ${contact.number}`}
                        >
                          <Phone className="w-4 h-4 shrink-0 animate-pulse" />
                          <span>Call Now ({contact.number})</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full min-h-[52px] inline-flex items-center justify-center space-x-2 py-3 px-4 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                        >
                          <Phone className="w-4 h-4 shrink-0 text-slate-400" />
                          <span>Number Unavailable</span>
                        </button>
                      )}
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

