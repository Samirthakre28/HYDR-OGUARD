import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Building2,
  HardDrive,
  CheckCircle2,
  LifeBuoy,
  FileText,
  Activity,
  Flame,
  Droplets,
  Mountain
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
        setContactsError(contactsRes.reason?.message || "Could not retrieve emergency numbers.");
      }

      if (emergencyRes.status === "fulfilled" && emergencyRes.value?.success) {
        setEmergencyData(emergencyRes.value.data);
      } else {
        setEmergencyError(emergencyRes.reason?.message || "Could not retrieve nearby facilities.");
      }
    } finally {
      setIsLoadingContacts(false);
      setIsLoadingEmergency(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      const locId = selectedLocation.id || selectedLocation._id || selectedLocation.name.toLowerCase();
      fetchEmergencyData(locId);
    }
  }, [selectedLocation, fetchEmergencyData]);

  const handleRefresh = () => {
    if (selectedLocation) {
      const locId = selectedLocation.id || selectedLocation._id || selectedLocation.name.toLowerCase();
      fetchEmergencyData(locId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Banner: Immediate Danger Callout */}
      <div className="bg-rose-600 text-white px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0 animate-bounce" />
            <span className="text-xs sm:text-sm font-bold">
              IN IMMEDIATE DANGER? Immediately contact local emergency dispatch services or dial your regional SOS number.
            </span>
          </div>
          <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white">
            {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Global Registry"}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Assistance Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quick Contacts & Emergency Facilities
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified first-responder numbers, proximity-sorted facilities, and offline contingency packs.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-stretch sm:self-auto">
            <select
              value={selectedLocation?.id || ""}
              onChange={(e) => {
                const found = locations.find((l) => l.id === e.target.value);
                if (found) setSelectedLocation(found);
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500"
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
              className="min-h-[44px] min-w-[44px] p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 transition-colors shadow-2xs flex items-center justify-center shrink-0"
              title="Refresh emergency data"
              aria-label="Refresh emergency data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingContacts || isLoadingEmergency ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* 1. Quick Emergency Numbers Grid */}
        <section className="space-y-3">
          <QuickEmergencyContacts
            contactsData={contactsData}
            isLoading={isLoadingContacts}
            error={contactsError}
            locationName={selectedLocation?.name || ""}
            isEmergencyMode={riskData?.overall?.level === "CRITICAL" || riskData?.overall?.level === "HIGH"}
            onRefresh={handleRefresh}
          />
        </section>

        {/* 2. Proximity-Sorted Emergency Facilities */}
        <section className="space-y-3">
          <EmergencyHelpNearYou
            emergencyData={emergencyData}
            isLoading={isLoadingEmergency}
            error={emergencyError}
            locationName={selectedLocation?.name || ""}
            isEmergencyMode={riskData?.overall?.level === "CRITICAL" || riskData?.overall?.level === "HIGH"}
            onRefresh={handleRefresh}
          />
        </section>

        {/* 3. Safety Guidance Action Checklists */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Deterministic Safety & Preparedness Protocols</h2>
              <p className="text-xs text-slate-500">Standard operational procedures recommended by civil defense guidelines.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Flood Checklist */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="flex items-center space-x-2 text-blue-900 font-bold text-sm">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Flood Preparedness</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                <li>Move to higher ground immediately if water rises.</li>
                <li>Never walk or drive through flowing water or flooded roads.</li>
                <li>Turn off primary electricity and gas lines if advised.</li>
                <li>Keep drinking water in sealed, clean containers.</li>
              </ul>
            </div>

            {/* Landslide Checklist */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <Mountain className="w-4 h-4 text-amber-600" />
                <span>Landslide & Slope Safety</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                <li>Stay alert for unusual sounds like cracking trees or rolling boulders.</li>
                <li>Evacuate steep slope channels if torrential rain persists.</li>
                <li>Move out of the direct path of mudflows to higher stable ridges.</li>
                <li>Avoid river valleys and low-lying drainage paths.</li>
              </ul>
            </div>

            {/* Seismic Checklist */}
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 space-y-3">
              <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
                <Activity className="w-4 h-4 text-rose-600" />
                <span>Earthquake Shaking Protocol</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                <li><strong>DROP, COVER, and HOLD ON</strong> under sturdy furniture.</li>
                <li>Stay away from glass windows, exterior walls, and heavy fixtures.</li>
                <li>If outdoors, move to an open area away from power lines.</li>
                <li>Expect aftershocks; avoid damaged structural foundations.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Offline Emergency Pack Component */}
        <section className="space-y-3">
          <EmergencyOfflinePack
            location={selectedLocation}
            riskData={riskData}
            emergencyData={emergencyData}
            contactsData={contactsData}
            isOnline={isOnline}
          />
        </section>
      </main>
    </div>
  );
}
