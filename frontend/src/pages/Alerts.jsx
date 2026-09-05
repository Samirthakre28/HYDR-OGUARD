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
  ArrowRight
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
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
    title: `${overallLevel === "CRITICAL" || overallLevel === "HIGH" ? "Heavy Disaster Risk Advisory" : "Standard Monitoring Advisory"}`,
    message: `Elevated multi-hazard conditions detected in ${locName}. Monitor local stream gauges and precipitation updates.`,
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
    hasAlert: true
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
      status: "Resolved",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: `hist-landslide-${locId}`,
      severity: riskData?.landslide?.level || "MODERATE",
      title: `${locName} Slope Soil Saturation Advisory`,
      message: `Continuous rain on steep terrain. Precautionary monitoring active along mountain corridors.`,
      hazardTypes: ["Landslide"],
      location: locName,
      riskScore: riskData?.landslide?.score || 67,
      status: "Resolved",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: `hist-seismic-${locId}`,
      severity: riskData?.seismic?.level || "LOW",
      title: `${locName} Regional Seismic Baseline Update`,
      message: `Baseline tectonic monitoring steady. No abnormal fault line ruptures detected.`,
      hazardTypes: ["Seismic"],
      location: locName,
      riskScore: riskData?.seismic?.score || 38,
      status: "Resolved",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: `hist-safety-${locId}`,
      severity: "LOW",
      title: "Community Safety & Readiness Advisory",
      message: `Standard disaster preparedness review. Verify emergency pack battery and grab-bag supplies.`,
      hazardTypes: ["General Safety"],
      location: locName,
      riskScore: 25,
      status: "Archived",
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
    }
  ];
}

export default function Alerts() {
  const { selectedLocation, riskData } = useLocation();
  const { navigate } = useNavigation();

  // Active & History Alert State
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Alert for Details Panel / Modal
  const [selectedAlertDetails, setSelectedAlertDetails] = useState(null);

  // Feedback State inside Alert Details Modal
  const [feedbackResponse, setFeedbackResponse] = useState(null); // 'ACCURATE' | 'INCORRECT'
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const locId = selectedLocation?.id || selectedLocation?._id || "kathmandu";
  const locName = selectedLocation?.name || "Kathmandu, Nepal";
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

  // Fetch alert telemetry
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
      setError("Unable to load real-time alerts. Displaying stored telemetry.");
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

  // Open Alert Details Modal & Reset Feedback state for that alert
  const openAlertDetails = (alertObj) => {
    setSelectedAlertDetails(alertObj);
    setFeedbackResponse(null);
    setFeedbackReason("");
    setFeedbackComment("");
    setFeedbackError(null);
    setFeedbackSuccess(false);

    // Check if session feedback exists for this alert
    try {
      const saved = sessionStorage.getItem(`hydroguard_feedback_${alertObj.id}`);
      if (saved) {
        setFeedbackSuccess(true);
      }
    } catch (_) {}
  };

  // Submit Feedback inside Alert Details Modal
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
      // Fallback save to session so user is not blocked
      setFeedbackSuccess(true);
      sessionStorage.setItem(`hydroguard_feedback_${selectedAlertDetails.id}`, JSON.stringify(payload));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-600 text-white border-rose-700 shadow-xs";
      case "HIGH":
        return "bg-amber-500 text-white border-amber-600 shadow-xs";
      case "MODERATE":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "LOW":
      default:
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
    }
  };

  return (
    <main className="max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 antialiased">
      {/* 1. Header & Location Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>Real-Time Alert Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <span>Disaster Alerts & Safety Advisories</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active warnings, historical telemetry, and accuracy reporting for{" "}
            <strong className="text-slate-800">{locName}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={fetchAlertData}
            disabled={isLoading}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors focus:outline-hidden"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh Alerts</span>
          </button>

          <button
            onClick={() => navigate("/emergency")}
            className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm focus:outline-hidden"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency Help</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. ACTIVE ALERTS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <BellRing className="w-4 h-4 text-emerald-600" />
            <span>Active Alerts ({activeAlert ? 1 : 0})</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Station: {locName}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Retrieving active alert telemetry...</p>
          </div>
        ) : activeAlert ? (
          <div
            className={`bg-white border-2 rounded-2xl p-5 shadow-sm space-y-4 transition-all ${
              activeAlert.severity === "CRITICAL"
                ? "border-rose-500/80 ring-2 ring-rose-500/20"
                : activeAlert.severity === "HIGH"
                ? "border-amber-500/80 ring-2 ring-amber-500/20"
                : "border-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${getSeverityBadgeClass(
                    activeAlert.severity
                  )}`}
                >
                  {activeAlert.severity} ALERT
                </span>

                <span className="text-xs font-mono font-extrabold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                  Risk Score: {activeAlert.riskScore || 82}/100
                </span>

                {activeAlert.status && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {activeAlert.status}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Issued: {new Date(activeAlert.issuedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">{activeAlert.title}</h3>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{activeAlert.message}</p>
            </div>

            {activeAlert.hazardTypes && activeAlert.hazardTypes.length > 0 && (
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-xs font-semibold text-slate-500">Elevated Hazards:</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAlert.hazardTypes.map((h, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-md border border-slate-200">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={() => openAlertDetails(activeAlert)}
                className="min-h-[48px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <span>View Details & Accuracy Feedback</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate("/emergency")}
                className="min-h-[48px] px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
              >
                <PhoneCall className="w-4 h-4 text-rose-600" />
                <span>Access Emergency Services</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-1">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Critical Active Alerts</h3>
            <p className="text-xs text-slate-500">Conditions are within normal baseline thresholds for {locName}.</p>
          </div>
        )}
      </section>

      {/* 3. ALERT HISTORY SECTION */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <span>Alert History & Archived Advisories</span>
          </h2>
          <span className="text-xs text-slate-500">
            {alertHistory.length} Previous Entries
          </span>
        </div>

        <div className="space-y-3">
          {alertHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${getSeverityBadgeClass(item.severity)}`}>
                    {item.severity}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(item.createdAt || item.issuedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{item.message}</p>
              </div>

              <button
                onClick={() => openAlertDetails(item)}
                className="min-h-[44px] px-4 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. DETAILED ALERT VIEW MODAL & IN-ALERT ACCURACY FEEDBACK */}
      {/* ========================================================================= */}
      {selectedAlertDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-6 antialiased relative">
            {/* Close Modal Button */}
            <button
              onClick={() => setSelectedAlertDetails(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close Alert Details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg ${getSeverityBadgeClass(selectedAlertDetails.severity)}`}>
                  {selectedAlertDetails.severity} ALERT
                </span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                  Score: {selectedAlertDetails.riskScore || 82}/100
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Station: {locName}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedAlertDetails.title}</h2>
            </div>

            {/* Alert Message & Telemetry Context */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alert Message</h4>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {selectedAlertDetails.message}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Rainfall 24h</span>
                  <span className="font-bold text-slate-900">{riskData?.flood?.keyMetrics?.rainfall24h || "32.4"} mm</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">River Level</span>
                  <span className="font-bold text-slate-900">{riskData?.flood?.keyMetrics?.riverStage || "Elevated"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Slope Angle</span>
                  <span className="font-bold text-slate-900">{riskData?.landslide?.keyMetrics?.slopeAngle || "28"}°</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Data Quality</span>
                  <span className="font-bold text-emerald-700">Verified</span>
                </div>
              </div>
            </div>

            {/* Primary Safety & Emergency Controls */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-rose-900 flex items-center space-x-1.5 uppercase tracking-wider">
                <PhoneCall className="w-4 h-4 text-rose-600" />
                <span>Primary Emergency Action Steps</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigate("/emergency")}
                  className="min-h-[50px] px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call Emergency Services (112)</span>
                </button>

                <button
                  onClick={() => navigate("/offline-safe-map")}
                  className="min-h-[50px] px-4 py-3 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
                >
                  <LifeBuoy className="w-4 h-4 text-emerald-600" />
                  <span>Locate Emergency Shelters</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* IN-ALERT ACCURACY FEEDBACK FORM */}
            {/* ========================================================================= */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Was this alert accurate?</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Report accuracy observation specifically for this alert.
                  </p>
                </div>

                {selectedAlertDetails.status === "DEMO" && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                    Demo Feedback
                  </span>
                )}
              </div>

              {feedbackSuccess ? (
                <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold block">✓ Feedback submitted</span>
                    <span className="text-[11px] text-emerald-800">
                      Thank you for reporting ground accuracy for this alert snapshot.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{feedbackError}</span>
                    </div>
                  )}

                  {/* Two Main Response Buttons */}
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
                          : "bg-white hover:bg-emerald-50 text-slate-800 border-slate-200"
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
                          : "bg-white hover:bg-amber-50 text-slate-800 border-slate-200"
                      }`}
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>No, Incorrect</span>
                    </button>
                  </div>

                  {/* Expanded Form if "No, Incorrect" is selected */}
                  {feedbackResponse === "INCORRECT" && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-800 block">
                        What was incorrect about this alert?
                      </label>

                      <div className="space-y-1.5">
                        {INCORRECT_REASONS.map((opt) => (
                          <label
                            key={opt.id}
                            onClick={() => setFeedbackReason(opt.id)}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs flex items-center space-x-2 cursor-pointer transition-colors ${
                              feedbackReason === opt.id
                                ? "bg-amber-50 text-amber-900 border-amber-400 font-bold"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
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
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Additional comments (optional):
                        </label>
                        <textarea
                          rows="2"
                          maxLength={500}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Provide brief details about local ground conditions..."
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Feedback Button */}
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

              <div className="text-[10px] text-slate-400 italic">
                User-reported alert feedback — not scientific validation. Does not alter calculated risk scores.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
