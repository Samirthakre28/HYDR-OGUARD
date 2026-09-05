import React, { useState, useEffect, useCallback } from "react";
import {
  HardDrive,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Phone,
  Hospital,
  Shield,
  Flame,
  Tent,
  Layers,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Radio
} from "lucide-react";
import {
  saveOfflinePack,
  getOfflinePack,
  hasOfflinePack,
  deleteOfflinePack,
  getOfflinePackMetadata,
  generatePredefinedSafetyRecommendations
} from "../../services/offlineStorage";
import { formatTimeAgo } from "../../utils/timeAgo";

export default function EmergencyOfflinePack({
  location,
  riskData,
  weatherData,
  hydrologyData,
  seismicData,
  emergencyServices,
  emergencyContacts,
  isOnline = true,
  onPackSaved,
  onPackDeleted
}) {
  const [pack, setPack] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSafetyRules, setShowSafetyRules] = useState(false);

  const locationId = location?._id || location?.id;

  // Load offline pack on location change or when online status toggles
  const reloadPack = useCallback(() => {
    if (!locationId) {
      setPack(null);
      return;
    }
    const loaded = getOfflinePack(locationId);
    setPack(loaded);
  }, [locationId]);

  useEffect(() => {
    reloadPack();
  }, [reloadPack]);

  // Handle Save / Update Emergency Pack
  const handleSavePack = async () => {
    if (!locationId) return;

    setIsSaving(true);
    try {
      const payload = {
        location,
        risk: riskData,
        weather: weatherData,
        hydrology: hydrologyData,
        seismic: seismicData,
        emergencyServices: emergencyServices || [],
        emergencyContacts: emergencyContacts || [],
        safetyRecommendations: generatePredefinedSafetyRecommendations(riskData)
      };

      const saved = saveOfflinePack(locationId, payload);
      setPack(saved);
      setSaveSuccessMsg("Emergency Offline Pack successfully saved to local storage!");
      if (onPackSaved) onPackSaved(saved);

      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to save emergency pack:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Offline Pack
  const handleDeletePack = () => {
    if (!locationId) return;
    deleteOfflinePack(locationId);
    setPack(null);
    if (onPackDeleted) onPackDeleted(locationId);
  };

  const isPackAvailable = Boolean(pack);
  const savedSafetyRules = pack?.safetyRecommendations || generatePredefinedSafetyRecommendations(riskData);

  return (
    <div className={`rounded-xl border transition-all ${
      !isOnline
        ? "bg-amber-500/5 border-amber-300 shadow-md"
        : isPackAvailable
          ? "bg-white border-slate-200/90 shadow-card"
          : "bg-white border-slate-200/90 shadow-card"
    } p-5 sm:p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start space-x-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            !isOnline
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : isPackAvailable
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
          }`}>
            <HardDrive className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {isOnline ? "HydroGuard Emergency Offline Pack" : "HydroGuard Emergency Offline Mode"}
              </h3>
              {/* Online / Offline Status Badge */}
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-600" />
                    <span>Online Ready</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-700" />
                    <span>Offline Active</span>
                  </>
                )}
              </span>

              {/* Pack Saved Status Badge */}
              {isPackAvailable && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Saved locally</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              {location?.name
                ? `Browser-persistent life-safety pack for ${location.name}. Accessible with zero network connection.`
                : "Save critical emergency contacts, shelter coordinates, and deterministic safety rules."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSavePack}
            disabled={isSaving || !locationId}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-98 disabled:opacity-50 ${
              isPackAvailable
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            title={isPackAvailable ? "Update offline snapshot with fresh telemetry" : "Download and store offline emergency pack"}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isPackAvailable ? (
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving Pack..." : isPackAvailable ? "Update Offline Pack" : "Save Offline Pack"}</span>
          </button>

          {isPackAvailable && (
            <button
              onClick={handleDeletePack}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
              title="Delete offline pack for this location"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="mt-3.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Offline Alert Notice */}
      {!isOnline && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <div className="font-bold">Operating in Emergency Offline Mode</div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              Network connection is unavailable. Displaying locally stored emergency pack data saved at{" "}
              <strong>{pack ? new Date(pack.savedAt).toLocaleTimeString() : "N/A"}</strong>. Live telemetry updates are paused.
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Location Warning (if offline and no pack stored) */}
      {!isOnline && !isPackAvailable && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">No Offline Pack Saved for {location?.name || "This Location"}</div>
            <div className="text-[11px] text-rose-700 mt-1 leading-relaxed">
              An Emergency Offline Pack was not previously downloaded for this station before network loss. To prevent dangerous inaccuracies, no fake telemetry is simulated. Reconnect to download the verified pack.
            </div>
          </div>
        </div>
      )}

      {/* Pack Snapshot Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Risk Status */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Risk Snapshot</span>
            <Shield className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {pack?.risk?.overall?.level || (riskData?.overall?.level ?? "Not Saved")}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Score: {pack?.risk?.overall?.score ?? (riskData?.overall?.score ?? "N/A")} / 100
          </div>
        </div>

        {/* Verified Contacts */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Helplines</span>
            <Phone className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {pack ? `${(pack.emergencyContacts || []).length} Verified` : `${(emergencyContacts || []).length} Available`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            One-tap direct dial
          </div>
        </div>

        {/* Nearby Facilities */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Facilities</span>
            <Hospital className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {pack ? `${(pack.emergencyServices || []).length} Stored` : `${(emergencyServices || []).length} Ready`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            GPS coordinates cached
          </div>
        </div>

        {/* Safety Guidelines */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Safety Rules</span>
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {savedSafetyRules.length} Hazard Rules
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Deterministic logic
          </div>
        </div>
      </div>

      {/* Metadata & Timestamp Row */}
      {isPackAvailable && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Saved: <strong className="text-slate-700">{formatTimeAgo(pack.savedAt)}</strong></span>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-600">v{pack.schemaVersion || "1.0"}</span>
          </div>

          <button
            onClick={() => setShowSafetyRules(!showSafetyRules)}
            className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
          >
            <span>{showSafetyRules ? "Hide Safety Rules" : "View Deterministic Safety Rules"}</span>
            {showSafetyRules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Collapsible Deterministic Safety Recommendations */}
      {showSafetyRules && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
          <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Predefined Multi-Hazard Safety Protocols (Offline Safe)</span>
          </div>

          <div className="space-y-2">
            {savedSafetyRules.map((rule, idx) => {
              const badgeColor =
                rule.level === "CRITICAL"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : rule.level === "HIGH"
                    ? "bg-orange-50 border-orange-200 text-orange-800"
                    : rule.level === "MODERATE"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800";

              return (
                <div key={idx} className={`p-3 rounded-lg border text-xs ${badgeColor}`}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>{rule.hazard} Hazard: {rule.action}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/70">
                      {rule.level}
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed opacity-90">
                    {rule.instruction}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
