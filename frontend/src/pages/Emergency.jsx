import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  RefreshCw,
  ShieldCheck,
  LifeBuoy,
  Wifi,
  WifiOff,
  Info,
  Clock,
  CheckCircle2,
  Droplets,
  ShieldAlert,
  Flame,
  FileText
} from "lucide-react";
import QuickEmergencyContacts from "../components/dashboard/QuickEmergencyContacts";
import EmergencyHelpNearYou from "../components/dashboard/EmergencyHelpNearYou";
import EmergencyOfflinePack from "../components/dashboard/EmergencyOfflinePack";
import { useLocation } from "../context/LocationContext";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { getEmergencyServices, getQuickEmergencyContacts } from "../services/api";

export default function Emergency() {
  const { isOnline } = useOnlineStatus();
  const { selectedLocation, locations, setSelectedLocation, riskData } = useLocation();

  const [contactsData, setContactsData] = useState(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState(null);

  const [emergencyData, setEmergencyData] = useState(null);
  const [isLoadingEmergency, setIsLoadingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState(null);

  const fetchEmergencyData = useCallback(async (locId) => {
    if (!locId) return;

    setIsLoadingContacts(true);
    setIsLoadingEmergency(true);
    setContactsError(null);
    setEmergencyError(null);

    try {
      const [contactsRes, emergencyRes] = await Promise.allSettled([
        getQuickEmergencyContacts(locId),
        getEmergencyServices(locId)
      ]);

      if (contactsRes.status === "fulfilled" && contactsRes.value?.success) {
        setContactsData(contactsRes.value.data);
      } else {
        setContactsError(contactsRes.reason?.message || "Emergency information unavailable.");
      }

      if (emergencyRes.status === "fulfilled" && emergencyRes.value?.success) {
        setEmergencyData(emergencyRes.value.data);
      } else {
        setEmergencyError(emergencyRes.reason?.message || "Emergency information unavailable.");
      }
    } finally {
      setIsLoadingContacts(false);
      setIsLoadingEmergency(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      const locId = selectedLocation.id || selectedLocation._id || selectedLocation.name?.toLowerCase();
      fetchEmergencyData(locId);
    }
  }, [selectedLocation, fetchEmergencyData]);

  const handleRefresh = () => {
    if (selectedLocation) {
      const locId = selectedLocation.id || selectedLocation._id || selectedLocation.name?.toLowerCase();
      fetchEmergencyData(locId);
    }
  };

  const isEmergencyActive =
    riskData?.overall?.level === "CRITICAL" || riskData?.overall?.level === "HIGH";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Urgent Callout (High Priority Red Action) */}
      <div className="bg-red-600 text-white px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-200 shrink-0 animate-bounce" />
            <span className="text-xs sm:text-sm font-bold">
              IN IMMEDIATE DANGER? Dial regional emergency dispatch services immediately.
            </span>
          </div>
          <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white shrink-0">
            {selectedLocation ? `📍 Monitored Region: ${selectedLocation.name}` : "Global Monitoring"}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* 1. EMERGENCY HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-red-600 font-extrabold text-xs uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Response Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
              EMERGENCY ASSISTANCE
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Quick access to emergency contacts, nearby support and flood safety guidance.
            </p>

            {/* Selected Location & Status Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {selectedLocation ? `📍 Selected Location: ${selectedLocation.name}` : "Location unavailable"}
                </span>
              </div>

              <div
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>● Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>● Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Location Picker & Refresh Action */}
          <div className="flex items-center space-x-2.5 self-stretch md:self-auto">
            <select
              value={selectedLocation?.id || ""}
              onChange={(e) => {
                const found = locations.find((l) => l.id === e.target.value);
                if (found) setSelectedLocation(found);
              }}
              className="flex-1 md:flex-initial min-h-[44px] px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              aria-label="Select location"
            >
              {(locations || []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}, {loc.country}
                </option>
              ))}
            </select>

            <button
              onClick={handleRefresh}
              disabled={isLoadingContacts || isLoadingEmergency}
              className="min-h-[44px] min-w-[44px] p-2.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition-colors shadow-2xs flex items-center justify-center shrink-0 focus:ring-2 focus:ring-emerald-500"
              title="Refresh emergency data"
              aria-label="Refresh emergency data"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isLoadingContacts || isLoadingEmergency ? "animate-spin text-emerald-600" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT (DESKTOP) / SINGLE-COLUMN (MOBILE) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT COLUMN: 2. NEED HELP? & 3. EMERGENCY CONTACTS */}
          <div className="space-y-6">
            <QuickEmergencyContacts
              contactsData={contactsData}
              isLoading={isLoadingContacts}
              error={contactsError}
              locationName={selectedLocation?.name || ""}
              isEmergencyMode={isEmergencyActive}
              onRefresh={handleRefresh}
            />
          </div>

          {/* RIGHT COLUMN: 4. WHAT SHOULD I DO? & 5. NEARBY HELP */}
          <div className="space-y-6">
            {/* 4. WHAT TO DO NOW */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                    WHAT SHOULD I DO?
                  </h2>
                  <p className="text-xs text-slate-500">
                    Immediate action steps based on regional hazard guidelines.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="text-base font-black text-red-600 font-mono shrink-0">01</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                    Move away from flood-prone areas when instructed.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="text-base font-black text-red-600 font-mono shrink-0">02</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                    Follow official local emergency instructions.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="text-base font-black text-red-600 font-mono shrink-0">03</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                    Avoid walking or driving through floodwater.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="text-base font-black text-red-600 font-mono shrink-0">04</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-0.5">
                    Keep essential medicines, documents and communication devices ready.
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="pt-2 text-[11px] text-slate-500 italic bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>These are safety recommendations, NOT official evacuation orders.</span>
              </div>
            </section>

            {/* 5. NEARBY HELP */}
            <EmergencyHelpNearYou
              emergencyData={emergencyData}
              isLoading={isLoadingEmergency}
              error={emergencyError}
              locationName={selectedLocation?.name || ""}
              isEmergencyMode={isEmergencyActive}
              onRefresh={handleRefresh}
              isOffline={!isOnline}
            />
          </div>
        </div>

        {/* FULL-WIDTH LOWER SECTIONS */}

        {/* 6. FLOOD SAFETY GUIDE */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                FLOOD SAFETY GUIDE
              </h2>
              <p className="text-xs text-slate-500">
                Essential safety protocols for before, during, and after flood events.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BEFORE A FLOOD */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>BEFORE A FLOOD</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Keep emergency contacts accessible</li>
                <li>Prepare essential medicines and documents</li>
                <li>Monitor official warnings</li>
              </ul>
            </div>

            {/* DURING A FLOOD */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>DURING A FLOOD</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Follow official instructions</li>
                <li>Move to safer areas when instructed</li>
                <li>Avoid floodwater</li>
                <li>Do not attempt to cross flooded roads</li>
              </ul>
            </div>

            {/* AFTER A FLOOD */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>AFTER A FLOOD</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Avoid unstable structures</li>
                <li>Avoid contaminated floodwater</li>
                <li>Wait for official clearance before returning</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. OFFLINE EMERGENCY PACK */}
        <section>
          <EmergencyOfflinePack
            location={selectedLocation}
            riskData={riskData}
            emergencyServices={emergencyData?.services || []}
            emergencyContacts={contactsData?.contacts || []}
            isOnline={isOnline}
          />
        </section>

        {/* 8. OFFICIAL GUIDANCE */}
        <section className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 text-xs text-slate-600">
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
              FOLLOW OFFICIAL INSTRUCTIONS
            </h3>
            <p className="leading-relaxed">
              HydroGuard provides decision-support information. During an emergency, always follow instructions from authorized local authorities and emergency services.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

