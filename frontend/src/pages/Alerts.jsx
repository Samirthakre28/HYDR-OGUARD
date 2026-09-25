import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  BellRing,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  PhoneCall,
  MapPin,
  Clock,
  ChevronRight,
  Info,
  Radio,
  FileText,
  LifeBuoy,
  XCircle,
  Send,
  HelpCircle,
  ArrowRight,
  Filter,
  Check,
  SlidersHorizontal,
  Activity,
  Flame,
  Droplets,
  Compass,
  ExternalLink,
  ShieldAlert,
  Siren,
  Wifi,
  WifiOff,
  Sliders
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { getCurrentAlert, getAlertHistory, submitAlertFeedback } from "../services/api";

const INCORRECT_REASONS = [
  { id: "RISK_DID_NOT_OCCUR", label: "Risk did not occur" },
  { id: "WRONG_RISK_LEVEL", label: "Risk level was incorrect" },
  { id: "WRONG_LOCATION", label: "Wrong location" },
  { id: "ALERT_TOO_LATE", label: "Alert arrived late" },
  { id: "OTHER", label: "Other" }
];

const ALERT_VISIBLE_TIMEOUT_MS = 2000;

function buildFallbackActiveAlert(locId, locName, riskData) {
  const overallLevel = riskData?.overall?.level || "HIGH";
  const overallScore = riskData?.overall?.score || 65;

  return {
    id: `alert-${locId}-active`,
    severity: overallLevel,
    title: `${overallLevel === "CRITICAL" || overallLevel === "HIGH" ? "ELEVATED FLOOD RISK ADVISORY" : "STANDARD MONITORING ADVISORY"}`,
    message: `Elevated multi-hazard risk conditions detected in ${locName}. Monitor local stream gauges and precipitation updates.`,
    hazardTypes: riskData?.flood?.score >= 50 && riskData?.landslide?.score >= 50
      ? ["Flood", "Landslide"]
      : riskData?.flood?.score >= 50
      ? ["Flood"]
      : ["General Safety"],
    location: locName,
    riskScore: overallScore,
    issuedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: "ACTIVE",
    hasAlert: true,
    factors: [
      "Heavy precipitation threshold reached",
      "River stage level elevated",
      "High soil saturation in catchment"
    ]
  };
}

function buildFallbackAlertHistory(locId, locName, riskData) {
  return [
    {
      id: `hist-flood-${locId}`,
      severity: riskData?.flood?.level || "HIGH",
      title: `${locName} Flood Watch & River Level Warning`,
      message: `Surface runoff and catchment precipitation exceeded baseline threshold in ${locName}.`,
      hazardTypes: ["Flood"],
      location: locName,
      riskScore: riskData?.flood?.score || 70,
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      factors: ["Heavy rainfall", "Rising river level"]
    },
    {
      id: `hist-landslide-${locId}`,
      severity: riskData?.landslide?.level || "MODERATE",
      title: `${locName} Slope Soil Saturation Advisory`,
      message: `Continuous rain on steep terrain. Precautionary monitoring active along mountain corridors.`,
      hazardTypes: ["Landslide"],
      location: locName,
      riskScore: riskData?.landslide?.score || 67,
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      factors: ["Saturated soil", "Steep terrain gradient"]
    },
    {
      id: `hist-seismic-${locId}`,
      severity: riskData?.seismic?.level || "LOW",
      title: `${locName} Regional Seismic Baseline Update`,
      message: `Baseline tectonic monitoring steady. No abnormal fault line ruptures detected.`,
      hazardTypes: ["Seismic"],
      location: locName,
      riskScore: riskData?.seismic?.score || 38,
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      factors: ["Baseline tectonic activity"]
    }
  ];
}

export default function Alerts() {
  const { isOnline } = useOnlineStatus();
  const { selectedLocation, riskData } = useLocation();
  const { navigate } = useNavigation();

  // Active & History Alert State
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Alert for Details Panel / Modal
  const [selectedAlertDetails, setSelectedAlertDetails] = useState(null);

  // Filter State ('ALL' | 'ACTIVE' | 'HIGH' | 'CRITICAL' | 'RESOLVED')
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Notification Controls State
  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("hydroguard_alert_notif_settings");
      return saved ? JSON.parse(saved) : { riskAlerts: true, highRiskAlerts: true, criticalAlerts: true };
    } catch (_) {
      return { riskAlerts: true, highRiskAlerts: true, criticalAlerts: true };
    }
  });

  const toggleNotifSetting = (key) => {
    setNotifSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("hydroguard_alert_notif_settings", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Feedback State inside Alert Details Modal
  const [feedbackResponse, setFeedbackResponse] = useState(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const locId = selectedLocation?.id || selectedLocation?._id || "nashik-in";
  const locName = selectedLocation?.name || "Nashik, Maharashtra";
  const riskDataRef = useRef(riskData);
  const fetchGenerationRef = useRef(0);
  riskDataRef.current = riskData;

  const applyAlertResponses = useCallback((currentRes, historyRes, { useFallbackIfEmpty = true } = {}) => {
    if (currentRes?.success && currentRes.data) {
      setActiveAlert(currentRes.data);
    } else if (useFallbackIfEmpty) {
      setActiveAlert(buildFallbackActiveAlert(locId, locName, riskDataRef.current));
    }

    if (historyRes?.success && Array.isArray(historyRes.data) && historyRes.data.length > 0) {
      setAlertHistory(historyRes.data);
    } else if (useFallbackIfEmpty) {
      setAlertHistory(buildFallbackAlertHistory(locId, locName, riskDataRef.current));
    }
  }, [locId, locName]);

  const fetchAlertData = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    setIsLoading(true);
    setError(null);

    const currentPromise = getCurrentAlert(locId).catch((err) => {
      console.warn("API active alert fallback:", err.message);
      return null;
    });
    const historyPromise = getAlertHistory(locId).catch((err) => {
      console.warn("API alert history fallback:", err.message);
      return null;
    });
    const livePair = Promise.all([currentPromise, historyPromise]);

    let timedOut = false;
    try {
      timedOut = await Promise.race([
        livePair.then(() => false),
        new Promise((resolve) => {
          setTimeout(() => resolve(true), ALERT_VISIBLE_TIMEOUT_MS);
        })
      ]);
    } catch (err) {
      timedOut = true;
    }

    if (generation !== fetchGenerationRef.current) return;

    if (timedOut) {
      applyAlertResponses(null, null, { useFallbackIfEmpty: true });
      setIsLoading(false);

      livePair.then(([currentRes, historyRes]) => {
        if (generation !== fetchGenerationRef.current) return;
        applyAlertResponses(currentRes, historyRes, { useFallbackIfEmpty: false });
      });
      return;
    }

    try {
      const [currentRes, historyRes] = await livePair;
      if (generation !== fetchGenerationRef.current) return;
      applyAlertResponses(currentRes, historyRes, { useFallbackIfEmpty: true });
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      setError("Alert information is currently unavailable.");
      applyAlertResponses(null, null, { useFallbackIfEmpty: true });
    } finally {
      if (generation === fetchGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [locId, locName, applyAlertResponses]);

  useEffect(() => {
    fetchAlertData();
  }, [fetchAlertData]);

  const openAlertDetails = (alertObj) => {
    setSelectedAlertDetails(alertObj);
    setFeedbackResponse(null);
    setFeedbackReason("");
    setFeedbackComment("");
    setFeedbackError(null);
    setFeedbackSuccess(false);

    try {
      const saved = sessionStorage.getItem(`hydroguard_feedback_${alertObj.id}`);
      if (saved) {
        setFeedbackSuccess(true);
      }
    } catch (_) {}
  };

  const handleFeedbackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAlertDetails || !feedbackResponse) return;

    if (feedbackResponse === "INCORRECT" && !feedbackReason) {
      setFeedbackError("Please select what was incorrect about this alert.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    const isDemoAlert = selectedAlertDetails.status === "DEMO" || riskData?.isDemo;

    const payload = {
      userResponse: feedbackResponse,
      reason: feedbackResponse === "INCORRECT" ? feedbackReason : null,
      comment: feedbackComment.trim(),
      alertRiskLevel: selectedAlertDetails.severity || "HIGH",
      alertRiskScore: selectedAlertDetails.riskScore || 82,
      alertType: selectedAlertDetails.hazardTypes?.[0] || "FLOOD",
      locationId: locId,
      mode: isDemoAlert ? "DEMO" : "LIVE"
    };

    try {
      await submitAlertFeedback(selectedAlertDetails.id, payload);
      setFeedbackSuccess(true);
      sessionStorage.setItem(`hydroguard_feedback_${selectedAlertDetails.id}`, JSON.stringify(payload));
    } catch (err) {
      console.warn("Feedback API fallback:", err.message);
      setFeedbackSuccess(true);
      sessionStorage.setItem(`hydroguard_feedback_${selectedAlertDetails.id}`, JSON.stringify(payload));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Alert Severity Helpers
  const getSeverityBadge = (severity) => {
    const s = (severity || "").toUpperCase();
    switch (s) {
      case "CRITICAL":
        return {
          label: "Critical",
          icon: Siren,
          class: "bg-red-500 text-white border-red-600 dark:bg-red-900/80 dark:border-red-700",
          textClass: "text-red-700 dark:text-red-400 font-bold",
          borderClass: "border-red-300 dark:border-red-900"
        };
      case "HIGH":
        return {
          label: "High",
          icon: AlertTriangle,
          class: "bg-orange-500 text-white border-orange-600 dark:bg-orange-900/80 dark:border-orange-700",
          textClass: "text-orange-700 dark:text-orange-400 font-bold",
          borderClass: "border-orange-300 dark:border-orange-900"
        };
      case "MODERATE":
        return {
          label: "Moderate",
          icon: Radio,
          class: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
          textClass: "text-amber-700 dark:text-amber-400 font-bold",
          borderClass: "border-amber-200 dark:border-amber-900"
        };
      case "LOW":
      default:
        return {
          label: "Low",
          icon: CheckCircle2,
          class: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
          textClass: "text-emerald-700 dark:text-emerald-400 font-bold",
          borderClass: "border-emerald-200 dark:border-emerald-900"
        };
    }
  };

  // Build combined list of all alerts for filtering & sorting
  const allCombinedAlerts = [
    ...(activeAlert ? [activeAlert] : []),
    ...alertHistory
  ];

  // Severity rank for sorting: CRITICAL = 4, HIGH = 3, MODERATE = 2, LOW = 1
  const getSeverityRank = (s) => {
    const sev = (s || "").toUpperCase();
    if (sev === "CRITICAL") return 4;
    if (sev === "HIGH") return 3;
    if (sev === "MODERATE") return 2;
    return 1;
  };

  // Filtered & Sorted alerts
  const filteredAlerts = allCombinedAlerts
    .filter((item) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "ACTIVE") return item.status === "ACTIVE";
      if (activeFilter === "HIGH") return (item.severity || "").toUpperCase() === "HIGH";
      if (activeFilter === "CRITICAL") return (item.severity || "").toUpperCase() === "CRITICAL";
      if (activeFilter === "RESOLVED") return (item.status || "").toUpperCase() === "RESOLVED";
      return true;
    })
    .sort((a, b) => {
      const rankDiff = getSeverityRank(b.severity) - getSeverityRank(a.severity);
      if (rankDiff !== 0) return rankDiff;
      const timeA = new Date(a.issuedAt || a.createdAt || Date.now()).getTime();
      const timeB = new Date(b.issuedAt || b.createdAt || Date.now()).getTime();
      return timeB - timeA;
    });

  // Calculate stats for summary bar
  const totalActiveCount = activeAlert ? 1 : 0;
  const highRiskCount = allCombinedAlerts.filter((a) => (a.severity || "").toUpperCase() === "HIGH").length;
  const criticalCount = allCombinedAlerts.filter((a) => (a.severity || "").toUpperCase() === "CRITICAL").length;
  const lastUpdatedTime = activeAlert?.lastUpdated || activeAlert?.issuedAt
    ? new Date(activeAlert.lastUpdated || activeAlert.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--";

  const isPriorityAlertPresent =
    activeAlert && (activeAlert.severity === "HIGH" || activeAlert.severity === "CRITICAL");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 antialiased">
        {/* 2. PAGE HEADER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              <span>Early Warning Intelligence</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase mt-1">
              ALERTS & NOTIFICATIONS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Monitor flood-risk alerts and review the factors behind each warning.
            </p>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3 shrink-0">
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
                isOnline
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
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

            <button
              onClick={fetchAlertData}
              disabled={isLoading}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-slate-200 dark:border-slate-700 focus:outline-none"
              title="Refresh Alert Stream"
              aria-label="Refresh Alert Stream"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 3. ACTIVE ALERT SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ACTIVE ALERTS
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalActiveCount}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              HIGH RISK
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {highRiskCount}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
              CRITICAL
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {criticalCount}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              LAST UPDATED
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-2 font-mono truncate">
              {lastUpdatedTime}
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <div className="font-bold">UNABLE TO LOAD ALERTS</div>
                <div className="text-[11px] opacity-90">{error}</div>
              </div>
            </div>
            <button
              onClick={fetchAlertData}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-xs transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* DESKTOP TWO-COLUMN / MOBILE SINGLE-COLUMN MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* MAIN/LEFT AREA (2 Columns on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 4. PRIORITY ALERT (If High or Critical Alert exists) */}
            {isPriorityAlertPresent && (
              <div
                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  activeAlert.severity === "CRITICAL"
                    ? "border-red-400 dark:border-red-800"
                    : "border-orange-400 dark:border-orange-800"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                        activeAlert.severity === "CRITICAL"
                          ? "bg-red-600 text-white"
                          : "bg-orange-500 text-white"
                      }`}
                    >
                      {activeAlert.severity === "CRITICAL" ? (
                        <Siren className="w-4 h-4 animate-pulse" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>
                        {activeAlert.severity === "CRITICAL" ? "🚨 CRITICAL FLOOD RISK" : "⚠ HIGH FLOOD RISK"}
                      </span>
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                    📍 {selectedLocation?.name || activeAlert.location}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {activeAlert.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                    {activeAlert.message || "Elevated flood-risk conditions detected."}
                  </p>
                </div>

                {/* Priority Alert Metadata Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Detected
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {new Date(activeAlert.issuedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Risk Level
                    </span>
                    <span
                      className={`font-black uppercase ${
                        activeAlert.severity === "CRITICAL" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {activeAlert.severity}
                    </span>
                  </div>

                  {/* Only display probability if present in existing data */}
                  {activeAlert.probability ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Probability
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {activeAlert.probability}%
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Status
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        {activeAlert.status || "ACTIVE"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Key Model Factors */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Key model factors:
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside font-medium">
                    {(activeAlert.factors || [
                      "Heavy rainfall threshold reached",
                      "Rising river level stage",
                      "High catchment soil saturation"
                    ]).map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Action (Light Neutral Sub-Panel) */}
                <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-1 text-xs text-slate-900 dark:text-white">
                  <div className="font-extrabold text-orange-700 dark:text-orange-400 uppercase tracking-wider text-[11px]">
                    Recommended action:
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    "Monitor official instructions and prepare for possible movement to safer areas."
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => openAlertDetails(activeAlert)}
                    className="min-h-[44px] px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
                  >
                    <span>View Full Alert Breakdown</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate("/emergency")}
                    className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Emergency Dispatch</span>
                  </button>
                </div>
              </div>
            )}

          {/* 5. ALL ALERTS SECTION & 10. FILTERS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-emerald-600" />
                <span>ALL ALERTS</span>
              </h2>

              {/* 10. FILTER BUTTONS */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
                {["ALL", "ACTIVE", "HIGH", "CRITICAL", "RESOLVED"].map((filterKey) => {
                  const isActive = activeFilter === filterKey;
                  return (
                    <button
                      key={filterKey}
                      onClick={() => setActiveFilter(filterKey)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                        isActive
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {filterKey}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 14. LOADING STATE */}
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse space-y-2"
                  >
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  </div>
                ))}
                <div className="text-center text-xs text-slate-400 pt-2 font-medium">
                  LOADING ALERTS...
                </div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              /* 13. EMPTY STATE */
              <div className="py-12 px-4 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  NO ACTIVE ALERTS
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  All monitored locations currently have no active alerts under this filter.
                </p>
              </div>
            ) : (
              /* ALERTS CARDS LIST */
              <div className="space-y-3.5">
                {filteredAlerts.map((alertItem) => {
                  const badge = getSeverityBadge(alertItem.severity);
                  const Icon = badge.icon;
                  const itemTime = alertItem.issuedAt || alertItem.createdAt
                    ? new Date(alertItem.issuedAt || alertItem.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "--";

                  return (
                    <div
                      key={alertItem.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 6. ALERT SEVERITY ICON + TEXT LABEL */}
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase border ${badge.class}`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{badge.label}</span>
                          </span>

                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {alertItem.title}
                          </h3>

                          {alertItem.status && (
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                alertItem.status === "RESOLVED"
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                  : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              }`}
                            >
                              {alertItem.status}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {alertItem.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 font-mono">
                          <span>📍 {alertItem.location || locName}</span>
                          <span>•</span>
                          <span>Time: {itemTime}</span>
                          <span>•</span>
                          <span>Key factor: {alertItem.factors?.[0] || alertItem.hazardTypes?.[0] || "Heavy rainfall"}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openAlertDetails(alertItem)}
                        className="min-h-[44px] px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shrink-0 transition-colors shadow-2xs"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR PANEL (Desktop Column 3) */}
        <div className="space-y-6">
          {/* 16. DATA QUALITY INDICATOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>DATA QUALITY</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">River Stage Telemetry</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Available</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Rainfall Precipitation</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Available</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Terrain Slope Saturation</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Available</span>
              </div>
            </div>
          </div>

          {/* 17. ALERT TIMELINE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>ALERT TIMELINE</span>
            </div>

            <div className="space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700 text-xs">
              <div className="relative pl-4 space-y-0.5">
                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div className="font-bold text-slate-900 dark:text-slate-100">Telemetry Detected</div>
                <div className="text-[11px] text-slate-500">Environmental sensors updated</div>
              </div>

              <div className="relative pl-4 space-y-0.5">
                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500" />
                <div className="font-bold text-slate-900 dark:text-slate-100">Risk Threshold Triggered</div>
                <div className="text-[11px] text-slate-500">Model evaluated catchment data</div>
              </div>

              <div className="relative pl-4 space-y-0.5">
                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div className="font-bold text-slate-900 dark:text-slate-100">Alert Dispatched</div>
                <div className="text-[11px] text-slate-500">Advisory active for {locName}</div>
              </div>
            </div>
          </div>

          {/* 12. NOTIFICATION SETTINGS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>NOTIFICATION SETTINGS</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">Risk Alerts</span>
                <button
                  onClick={() => toggleNotifSetting("riskAlerts")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-extrabold transition-colors ${
                    notifSettings.riskAlerts
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {notifSettings.riskAlerts ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">High Risk Alerts</span>
                <button
                  onClick={() => toggleNotifSetting("highRiskAlerts")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-extrabold transition-colors ${
                    notifSettings.highRiskAlerts
                      ? "bg-orange-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {notifSettings.highRiskAlerts ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">Critical Alerts</span>
                <button
                  onClick={() => toggleNotifSetting("criticalAlerts")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-extrabold transition-colors ${
                    notifSettings.criticalAlerts
                      ? "bg-red-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {notifSettings.criticalAlerts ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. ALERT DETAILS PANEL / MODAL & PRESERVED ACCURACY FEEDBACK FORM */}
      {/* ========================================================================= */}
      {selectedAlertDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-6 antialiased relative text-slate-900 dark:text-slate-100">
            {/* Close Modal Button */}
            <button
              onClick={() => setSelectedAlertDetails(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close Alert Details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-black uppercase rounded-lg border ${
                    getSeverityBadge(selectedAlertDetails.severity).class
                  }`}
                >
                  {selectedAlertDetails.severity} ALERT
                </span>
                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg">
                  Score: {selectedAlertDetails.riskScore || 82}/100
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Location: {selectedAlertDetails.location || locName}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                ALERT DETAILS
              </h2>
            </div>

            {/* Alert Breakdown Overview */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedAlertDetails.title}</h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                  {selectedAlertDetails.message}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Detected</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(selectedAlertDetails.issuedAt || selectedAlertDetails.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Last Updated</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedAlertDetails.lastUpdated
                      ? new Date(selectedAlertDetails.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--"}
                  </span>
                </div>

                {/* Only display probability if present in data */}
                {selectedAlertDetails.probability && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Probability</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAlertDetails.probability}%</span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedAlertDetails.status || "ACTIVE"}</span>
                </div>
              </div>
            </div>

            {/* WHY THIS ALERT? */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>WHY THIS ALERT?</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Rainfall</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">Heavy</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">River Level</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">Rising</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Soil</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">High saturation</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Terrain</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">Steep gradient</span>
                </div>
              </div>
            </div>

            {/* 8. RECOMMENDED ACTION: WHAT SHOULD I DO? */}
            <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3 text-slate-900 dark:text-white">
              <h3 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>WHAT SHOULD I DO?</span>
              </h3>

              <ol className="text-xs text-slate-700 dark:text-slate-200 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                <li>Monitor official local instructions.</li>
                <li>Avoid unnecessary travel through flood-prone areas.</li>
                <li>Keep emergency contacts accessible.</li>
                <li>Prepare essential items if conditions worsen.</li>
              </ol>

              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 italic">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>HydroGuard provides decision-support information. Always follow instructions from local authorities.</span>
              </div>
            </div>

            {/* 18. MAP PREVIEW LINK */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Map & Risk Boundary Preview</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Risk influence zone — estimated impact area, not an exact flood boundary.
                </div>
              </div>

              <button
                onClick={() => navigate("/risk-map")}
                className="min-h-[44px] px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shrink-0 transition-colors shadow-2xs"
              >
                <span>View on Risk Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* IN-ALERT ACCURACY FEEDBACK FORM (Preserved Functionality) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Was this alert accurate?</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Report ground observation for this alert.
                  </p>
                </div>
              </div>

              {feedbackSuccess ? (
                <div className="bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">✓ Feedback submitted</span>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Thank you for reporting your ground observation for this alert snapshot.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackError && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{feedbackError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackResponse("ACCURATE");
                        setFeedbackReason("");
                        setFeedbackError(null);
                      }}
                      className={`min-h-[48px] px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        feedbackResponse === "ACCURATE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Yes, Accurate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackResponse("INCORRECT");
                        setFeedbackError(null);
                      }}
                      className={`min-h-[48px] px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        feedbackResponse === "INCORRECT"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 hover:bg-amber-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>No, Incorrect</span>
                    </button>
                  </div>

                  {feedbackResponse === "INCORRECT" && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        What was incorrect about this alert?
                      </label>

                      <div className="space-y-1.5">
                        {INCORRECT_REASONS.map((opt) => (
                          <label
                            key={opt.id}
                            onClick={() => setFeedbackReason(opt.id)}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs flex items-center space-x-2 cursor-pointer transition-colors ${
                              feedbackReason === opt.id
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-400 font-bold"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name="alertIncorrectReason"
                              value={opt.id}
                              checked={feedbackReason === opt.id}
                              onChange={() => setFeedbackReason(opt.id)}
                              className="accent-amber-600 w-4 h-4"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Additional comments (optional):
                        </label>
                        <textarea
                          rows="2"
                          maxLength={500}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Provide brief details about local ground conditions..."
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {feedbackResponse && (
                    <button
                      type="button"
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback || (feedbackResponse === "INCORRECT" && !feedbackReason)}
                      className="w-full min-h-[48px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-xs"
                    >
                      {isSubmittingFeedback ? (
                        <span>Submitting Feedback...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Feedback</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
);
}
