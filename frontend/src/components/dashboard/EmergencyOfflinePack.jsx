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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  BookOpen,
  FileCheck
} from "lucide-react";
import {
  saveOfflinePack,
  getOfflinePack,
  deleteOfflinePack,
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
  const [showSafetyRules, setShowSafetyRules] = useState(false);

  const locationId = location?._id || location?.id;

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
      setSaveSuccessMsg("Offline emergency pack saved successfully.");
      if (onPackSaved) onPackSaved(saved);

      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to save emergency pack:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePack = () => {
    if (!locationId) return;
    deleteOfflinePack(locationId);
    setPack(null);
    if (onPackDeleted) onPackDeleted(locationId);
  };

  const isPackAvailable = Boolean(pack);
  const savedSafetyRules = pack?.safetyRecommendations || generatePredefinedSafetyRecommendations(riskData);

  return (
    <div
      className={`rounded-2xl border transition-all ${
        !isOnline
          ? "bg-amber-500/5 border-amber-300 shadow-md"
          : isPackAvailable
          ? "bg-white border-slate-200/90 shadow-sm"
          : "bg-white border-slate-200/90 shadow-sm"
      } p-5 sm:p-6 space-y-4`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              !isOnline
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : isPackAvailable
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <HardDrive className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                OFFLINE EMERGENCY PACK
              </h3>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isPackAvailable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : !isOnline
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isPackAvailable ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>AVAILABLE OFFLINE</span>
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-700" />
                    <span>LIVE DATA UNAVAILABLE</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-slate-500" />
                    <span>NOT SAVED YET</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Access emergency contacts, safety instructions, and procedures without cellular or network connection.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSavePack}
            disabled={isSaving || !locationId}
            className={`min-h-[44px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 disabled:opacity-50 ${
              isPackAvailable
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            title={isPackAvailable ? "Update stored emergency pack" : "Save emergency pack for offline use"}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isPackAvailable ? (
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isSaving ? "Saving Pack..." : isPackAvailable ? "Update Offline Pack" : "Save Offline Pack"}</span>
          </button>

          {isPackAvailable && (
            <button
              onClick={handleDeletePack}
              className="min-h-[44px] min-w-[44px] p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center"
              title="Delete stored offline pack"
              aria-label="Delete stored offline pack"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Offline Alert */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-3">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <div className="font-bold">Offline Mode Active</div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              Showing saved emergency information. Live network updates are paused.
            </div>
          </div>
        </div>
      )}

      {/* Checklist of stored items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Emergency Contacts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Flood Safety Instructions</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Emergency Procedures</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Saved Essential Info</span>
        </div>
      </div>

      {/* Timestamp & Toggle Safety Rules */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {isPackAvailable
              ? `Cached: ${formatTimeAgo(pack.savedAt)}`
              : "Live Data Active"}
          </span>
        </div>

        <button
          onClick={() => setShowSafetyRules(!showSafetyRules)}
          className="min-h-[44px] inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
        >
          <span>{showSafetyRules ? "Hide Offline Procedures" : "Open Offline Pack"}</span>
          {showSafetyRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Content */}
      {showSafetyRules && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Saved Emergency Safety Rules</span>
          </div>

          <div className="space-y-2">
            {savedSafetyRules.map((rule, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{rule.hazard} Hazard: {rule.action}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white border border-slate-200">
                    {rule.level}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {rule.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
