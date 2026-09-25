import React, { useState, useEffect, useRef, useCallback } from "react";
import LocationOverview from "../components/dashboard/LocationOverview";
import RiskAlertBanner from "../components/dashboard/RiskAlertBanner";
import RiskChangeBanner from "../components/dashboard/RiskChangeBanner";
import WeatherIndicator from "../components/dashboard/WeatherIndicator";
import HydrologyIndicator from "../components/dashboard/HydrologyIndicator";
import SeismicIndicator from "../components/dashboard/SeismicIndicator";
import OverallRiskCard from "../components/dashboard/OverallRiskCard";
import RiskConfidence from "../components/dashboard/RiskConfidence";
import IndividualRiskCards from "../components/dashboard/IndividualRiskCards";
import RiskFactors from "../components/dashboard/RiskFactors";
import AIRiskExplanation from "../components/dashboard/AIRiskExplanation";
import MapPreview from "../components/dashboard/MapPreview";
import QuickEmergencyContacts from "../components/dashboard/QuickEmergencyContacts";
import EmergencyHelpNearYou from "../components/dashboard/EmergencyHelpNearYou";
import EmergencyOfflinePack from "../components/dashboard/EmergencyOfflinePack";
import RecentAlerts from "../components/dashboard/RecentAlerts";
import HistoricalValidationSummary from "../components/dashboard/HistoricalValidationSummary";
import DemoModeBanner from "../components/dashboard/DemoModeBanner";
import AlertFeedbackForm from "../components/dashboard/AlertFeedbackForm";

import { useLocation } from "../context/LocationContext";
import useOnlineStatus from "../hooks/useOnlineStatus";
import {
  getOfflinePack,
  generatePredefinedSafetyRecommendations
} from "../services/offlineStorage";
import {
  getRiskExplanation,
  getCurrentAlert,
  getAlertHistory,
  getEmergencyServices,
  getQuickEmergencyContacts,
  getWeatherData,
  getHydrologyData,
  getSeismicData,
  getRiskData,
  getDemoScenarios,
  runDemoRisk
} from "../services/api";
import {
  buildHydrologyFallbackPayload,
  buildSeismicFallbackPayload,
  buildWeatherFallbackPayload
} from "../data/environmentalFallback";
import { detectRiskChange } from "../utils/riskChangeDetector";
import { AlertTriangle, RefreshCw, WifiOff, HardDrive, FlaskConical, Radio } from "lucide-react";

// Configurable Auto-Refresh Interval (3 hours)
export const RISK_REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;

export default function Dashboard() {
  const { isOnline } = useOnlineStatus();

  const {
    selectedLocation,
    riskData: contextRiskData,
    isLoadingRisk: isContextLoadingRisk,
    riskError: contextRiskError,
    refreshRisk: refreshContextRisk
  } = useLocation();

  // Local state for active calculated risk telemetry & fallback management
  const [activeRiskData, setActiveRiskData] = useState(contextRiskData);
  const [activeRiskError, setActiveRiskError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  // Stored Offline Pack state for the currently selected location
  const [offlinePack, setOfflinePack] = useState(null);

  // Risk Shift Detection State (Step 10)
  const [riskChangeEvent, setRiskChangeEvent] = useState(null);
  const previousRiskRef = useRef(null);
  const activeLocationIdRef = useRef(null);

  // AI Explanation State
  const [aiExplanation, setAiExplanation] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [isAIConfigured, setIsAIConfigured] = useState(true);
  const aiAbortRef = useRef(null);

  // Smart Alerts & Emergency Services State (Steps 13 & 14)
  const [currentAlert, setCurrentAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [emergencyData, setEmergencyData] = useState(null);
  const [isLoadingEmergency, setIsLoadingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState(null);
  const [contactsData, setContactsData] = useState(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState(null);

  // Live Weather Telemetry State (Step 9)
  const [weatherData, setWeatherData] = useState(() => buildWeatherFallbackPayload("pending").data);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // Live Hydrological Telemetry State (Step 11)
  const [hydrologyData, setHydrologyData] = useState(() => buildHydrologyFallbackPayload("pending").data);
  const [isLoadingHydrology, setIsLoadingHydrology] = useState(false);
  const [hydrologyError, setHydrologyError] = useState(null);

  // Live Seismic Activity State (Step 12)
  const [seismicData, setSeismicData] = useState(() => buildSeismicFallbackPayload("pending").data);
  const [isLoadingSeismic, setIsLoadingSeismic] = useState(false);
  const [seismicError, setSeismicError] = useState(null);

  // Deterministic Demo Mode State (Step 20)
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoScenarios, setDemoScenarios] = useState([]);
  const [selectedDemoScenarioId, setSelectedDemoScenarioId] = useState("demo-flood-001");
  const [demoRiskData, setDemoRiskData] = useState(null);
  const [demoAlert, setDemoAlert] = useState(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState(null);

  // Browser Notification State
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const lastNotifiedAlertRef = useRef(null);

  const abortControllerRef = useRef(null);

  // Synchronize initial context risk if local state is null
  useEffect(() => {
    if (contextRiskData && !activeRiskData) {
      setActiveRiskData(contextRiskData);
    }
  }, [contextRiskData, activeRiskData]);

  // Load offline pack snapshot when location changes or connection toggles
  useEffect(() => {
    if (!selectedLocation) {
      setOfflinePack(null);
      return;
    }
    const locId = selectedLocation._id || selectedLocation.id;
    const pack = getOfflinePack(locId);
    setOfflinePack(pack);
  }, [selectedLocation, isOnline]);

  // Load deterministic demo scenario catalog on mount
  useEffect(() => {
    let isMounted = true;
    async function loadScenarios() {
      try {
        const res = await getDemoScenarios();
        if (isMounted && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setDemoScenarios(res.data);
        }
      } catch (err) {
        console.warn("[HydroGuard] Could not load demo scenarios:", err.message);
      }
    }
    loadScenarios();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Fetch AI explanation for a given risk data payload
  const fetchAIExplanation = useCallback(async (riskPayload, locName, signal) => {
    if (!riskPayload) {
      setAiExplanation(null);
      return;
    }

    if (!isOnline) {
      // In offline mode, do not attempt LLM call; use deterministic recommendations
      const rules = generatePredefinedSafetyRecommendations(riskPayload);
      setAiExplanation({
        summary: `Offline safety rules active for ${locName || "monitored zone"}. Overall Risk: ${riskPayload.overall?.level || "MONITORED"}. Follow local civil defense guidance.`,
        keyHazards: rules.map(r => `${r.hazard} (${r.level}): ${r.action}`),
        safetyAdvice: rules.map(r => r.instruction),
        source: "Deterministic Offline Rules Engine"
      });
      setIsLoadingAI(false);
      return;
    }

    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
    }

    const controller = new AbortController();
    aiAbortRef.current = controller;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await getRiskExplanation(riskPayload, signal || controller.signal);

      if (response?.success && response.data) {
        setAiExplanation(response.data);
        setIsAIConfigured(true);
      } else if (response && response.isConfigured === false) {
        setIsAIConfigured(false);
        setAiError(response.message || "AI API Key not configured.");
        setAiExplanation(null);
      } else {
        setAiError(response?.message || "AI explanation service unavailable.");
        setAiExplanation(null);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[HydroGuard] AI Explanation notice:", err.message);
      setAiError("Could not retrieve AI summary.");
    } finally {
      setIsLoadingAI(false);
    }
  }, [isOnline]);

  // 2. Master Unified Telemetry Refresh Orchestrator (Steps 9, 10, 11, 12, 13, 14, 15)
  const executeRefresh = useCallback(async (loc, { isManual = false } = {}) => {
    if (!loc) return;
    const locId = loc._id || loc.id;
    activeLocationIdRef.current = locId;

    // In offline mode, do not execute network fetch
    if (!isOnline) {
      const pack = getOfflinePack(locId);
      setOfflinePack(pack);
      if (pack?.risk) {
        setActiveRiskData(pack.risk);
        setLastUpdated(new Date(pack.savedAt).getTime());
        fetchAIExplanation(pack.risk, loc.name);
      }
      return;
    }

    // Prevent duplicate simultaneous requests
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    if (!weatherData) setIsLoadingWeather(true);
    if (!hydrologyData) setIsLoadingHydrology(true);
    if (!seismicData) setIsLoadingSeismic(true);
    if (!emergencyData) setIsLoadingEmergency(true);
    if (!contactsData) setIsLoadingContacts(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Parallel execution of live environmental and hazard feeds
      const [weatherRes, hydroRes, seismicRes, riskRes, alertRes, historyRes, emergencyRes, contactsRes] = await Promise.allSettled([
        getWeatherData(locId, controller.signal),
        getHydrologyData(locId, controller.signal),
        getSeismicData(locId, controller.signal),
        getRiskData(locId, controller.signal),
        getCurrentAlert(locId, controller.signal),
        getAlertHistory(locId, controller.signal),
        getEmergencyServices(locId, controller.signal),
        getQuickEmergencyContacts(locId, controller.signal)
      ]);

      // Stale response protection
      if (activeLocationIdRef.current !== locId) return;

      // 1. Update Weather state — keep existing/fallback visible if live feed fails
      if (weatherRes.status === "fulfilled" && weatherRes.value?.success) {
        setWeatherData(weatherRes.value.data);
        setWeatherError(null);
      } else if (weatherRes.status === "rejected" && weatherRes.reason?.name === "AbortError") {
        // Keep currently visible weather values
      } else {
        setWeatherError(
          weatherRes.status === "fulfilled"
            ? (weatherRes.value?.message || "Live weather temporarily unavailable.")
            : (weatherRes.reason?.message || "Live weather temporarily unavailable.")
        );
        setWeatherData((prev) => prev || buildWeatherFallbackPayload(locId).data);
      }

      // 2. Update Hydrology state (Step 11)
      if (hydroRes.status === "fulfilled" && hydroRes.value?.success) {
        setHydrologyData(hydroRes.value.data);
        setHydrologyError(null);
      } else if (hydroRes.status === "rejected" && hydroRes.reason?.name === "AbortError") {
        // Keep currently visible hydrology values
      } else {
        setHydrologyError(
          hydroRes.status === "fulfilled"
            ? (hydroRes.value?.message || "Live river station unavailable.")
            : (hydroRes.reason?.message || "Live river station unavailable.")
        );
        setHydrologyData((prev) => prev || buildHydrologyFallbackPayload(locId).data);
      }

      // 3. Update Seismic state (Step 12)
      if (seismicRes.status === "fulfilled" && seismicRes.value?.success) {
        setSeismicData(seismicRes.value.data);
        setSeismicError(null);
      } else if (seismicRes.status === "rejected" && seismicRes.reason?.name === "AbortError") {
        // Keep currently visible seismic values
      } else {
        setSeismicError(
          seismicRes.status === "fulfilled"
            ? (seismicRes.value?.message || "Live seismic telemetry unavailable.")
            : (seismicRes.reason?.message || "Live seismic telemetry unavailable.")
        );
        setSeismicData((prev) => prev || buildSeismicFallbackPayload(locId).data);
      }

      // 4. Update Risk calculation state & Detect meaningful changes
      if (riskRes.status === "fulfilled" && riskRes.value?.success && riskRes.value.data?.risk) {
        const freshRisk = riskRes.value.data.risk;
        setActiveRiskData(freshRisk);
        setActiveRiskError(null);
        setLastUpdated(freshRisk.calculatedAt ? new Date(freshRisk.calculatedAt).getTime() : Date.now());

        // Detect meaningful risk changes (>= 5 delta or level shift)
        if (previousRiskRef.current) {
          const change = detectRiskChange(previousRiskRef.current, freshRisk, loc.name);
          if (change && change.hasMeaningfulChange) {
            setRiskChangeEvent(change);

            // Trigger browser notification on escalation if permitted
            if (
              notificationPermission === "granted" &&
              change.isSeverityIncrease &&
              lastNotifiedAlertRef.current !== `${locId}-${change.currentLevel}-${change.scoreDiff}`
            ) {
              lastNotifiedAlertRef.current = `${locId}-${change.currentLevel}-${change.scoreDiff}`;
              try {
                new Notification("HydroGuard Risk Level Shift", {
                  body: `${change.title}: ${change.message}`,
                  tag: `hydroguard-shift-${locId}`
                });
              } catch (e) {
                console.warn("Browser notification failed:", e.message);
              }
            }

            // Refresh AI Explanation on meaningful risk change
            fetchAIExplanation(freshRisk, loc.name);
          }
        } else {
          // Initial station load
          fetchAIExplanation(freshRisk, loc.name);
        }

        previousRiskRef.current = freshRisk;
      } else if (riskRes.status === "rejected" && riskRes.reason?.name !== "AbortError") {
        setActiveRiskError(riskRes.reason?.message || "Unable to refresh live risk data. Showing most recent available data.");
      }

      // 5. Update Alerts state
      if (alertRes.status === "fulfilled" && alertRes.value?.success) {
        const alert = alertRes.value.data;
        setCurrentAlert(alert);

        if (
          notificationPermission === "granted" &&
          (alert.severity === "HIGH" || alert.severity === "CRITICAL") &&
          lastNotifiedAlertRef.current !== `${locId}-${alert.severity}`
        ) {
          lastNotifiedAlertRef.current = `${locId}-${alert.severity}`;
          try {
            new Notification("HydroGuard Emergency Alert", {
              body: `${alert.severity} RISK detected for ${loc.name}: ${alert.message}`,
              tag: `hydroguard-${locId}`
            });
          } catch (e) {
            console.warn("Browser notification failed:", e.message);
          }
        }
      }

      if (historyRes.status === "fulfilled" && historyRes.value?.success) {
        setAlertHistory(historyRes.value.data || []);
      }

      // 6. Update Emergency Facilities state (Step 13)
      if (emergencyRes.status === "fulfilled" && emergencyRes.value?.success) {
        setEmergencyData(emergencyRes.value.data);
        setEmergencyError(null);
      } else if (emergencyRes.status === "fulfilled" && !emergencyRes.value?.success) {
        setEmergencyError(emergencyRes.value?.message || "Emergency services temporarily unavailable.");
      } else if (emergencyRes.status === "rejected" && emergencyRes.reason?.name !== "AbortError") {
        setEmergencyError(emergencyRes.reason?.message || "Emergency services temporarily unavailable.");
      }

      // 7. Update Quick Emergency Contacts (Step 14)
      if (contactsRes.status === "fulfilled" && contactsRes.value?.success) {
        setContactsData(contactsRes.value.data);
        setContactsError(null);
      } else if (contactsRes.status === "fulfilled" && !contactsRes.value?.success) {
        setContactsError(contactsRes.value?.message || "Emergency contacts temporarily unavailable.");
      } else if (contactsRes.status === "rejected" && contactsRes.reason?.name !== "AbortError") {
        setContactsError(contactsRes.reason?.message || "Emergency contacts temporarily unavailable.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[HydroGuard] Refresh telemetry notice:", err.message);
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      setIsLoadingWeather(false);
      setIsLoadingHydrology(false);
      setIsLoadingSeismic(false);
      setIsLoadingEmergency(false);
      setIsLoadingContacts(false);
    }
  }, [isOnline, notificationPermission, fetchAIExplanation]);

  // 3. Recurring 3-Hour Auto-Refresh Interval & Location Switching Hook
  useEffect(() => {
    if (!selectedLocation) return;

    const locId = selectedLocation._id || selectedLocation.id;

    // When switching location: clear previous reference so we don't compare across different cities
    if (activeLocationIdRef.current !== locId) {
      previousRiskRef.current = null;
      setRiskChangeEvent(null);
      setWeatherData(buildWeatherFallbackPayload(locId).data);
      setHydrologyData(buildHydrologyFallbackPayload(locId).data);
      setSeismicData(buildSeismicFallbackPayload(locId).data);
      setWeatherError(null);
      setHydrologyError(null);
      setSeismicError(null);
      setEmergencyData(null);
      setEmergencyError(null);
      setContactsData(null);
      setContactsError(null);
    }

    // Execute initial fetch for the selected location
    executeRefresh(selectedLocation);

    // Set recurring 3-hour interval timer only when online
    if (isOnline) {
      const intervalId = setInterval(() => {
        executeRefresh(selectedLocation, { isAuto: true });
      }, RISK_REFRESH_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        if (aiAbortRef.current) {
          aiAbortRef.current.abort();
        }
      };
    }
  }, [selectedLocation, isOnline, executeRefresh]);

  // 4. Manual Refresh Action
  const handleManualRefresh = useCallback(() => {
    if (selectedLocation && !isDemoMode) {
      executeRefresh(selectedLocation, { isManual: true });
    }
  }, [selectedLocation, isDemoMode, executeRefresh]);

  // 5. User-initiated browser notification permission request
  const handleEnableNotifications = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted" && currentAlert && (currentAlert.severity === "HIGH" || currentAlert.severity === "CRITICAL") && !isDemoMode) {
          new Notification("HydroGuard Alerts Enabled", {
            body: `Live disaster-risk alerts enabled for ${selectedLocation?.name || "monitored stations"}.`
          });
        }
      } catch (err) {
        console.warn("Could not request notification permission:", err.message);
      }
    }
  }, [currentAlert, selectedLocation, isDemoMode]);

  // 6. Deterministic Demo Mode Handlers (Step 20)
  const handleRunDemoScenario = useCallback(async (scenarioId) => {
    const targetId = scenarioId || selectedDemoScenarioId;
    setIsLoadingDemo(true);
    setDemoError(null);
    try {
      const res = await runDemoRisk(targetId);
      if (res?.success && res.data) {
        setDemoRiskData(res.data);
        setDemoAlert(res.data.alert);
        setSelectedDemoScenarioId(targetId);
        // Trigger explainable AI summary for the demo scenario
        fetchAIExplanation(res.data.risk, `Demo: ${res.data.scenario?.name || "Scenario"}`);
      } else {
        setDemoError(res?.message || "Failed to execute demo scenario.");
      }
    } catch (err) {
      setDemoError(err?.message || "Error running demo scenario.");
    } finally {
      setIsLoadingDemo(false);
    }
  }, [selectedDemoScenarioId, fetchAIExplanation]);

  const handleEnterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    handleRunDemoScenario(selectedDemoScenarioId);
  }, [selectedDemoScenarioId, handleRunDemoScenario]);

  const handleExitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoRiskData(null);
    setDemoAlert(null);
    setDemoError(null);
    // Restore AI summary for active live location
    if (activeRiskData || contextRiskData) {
      fetchAIExplanation(activeRiskData || contextRiskData, selectedLocation?.name);
    }
  }, [activeRiskData, contextRiskData, selectedLocation, fetchAIExplanation]);

  // Effective Telemetry Computation (Handling Demo Mode & Offline Pack Fallback)
  const displayRiskData = isDemoMode && demoRiskData
    ? demoRiskData.risk
    : (!isOnline && offlinePack?.risk
      ? offlinePack.risk
      : (activeRiskData || contextRiskData));

  const displayConfidence = isDemoMode && demoRiskData
    ? demoRiskData.confidence
    : displayRiskData?.confidence;

  const displayAlert = isDemoMode
    ? demoAlert
    : currentAlert;

  const displayWeatherData = isDemoMode && demoRiskData
    ? {
        weather: {
          precipitation_sum: Number((demoRiskData.risk.inputs.rainfall * 2.5).toFixed(1)),
          temperature_2m: 24.5,
          weather_code: demoRiskData.risk.inputs.rainfall > 50 ? 65 : 1,
          wind_speed_10m: 12.0
        },
        source: "Synthetic Demo Parameters",
        cached: false,
        isDemo: true
      }
    : (!isOnline && offlinePack?.weather
      ? { weather: offlinePack.weather, source: `${offlinePack.weather.source || "Meteorological Registry"} (Offline Pack)`, cached: true }
      : weatherData);

  const displayHydrologyData = isDemoMode && demoRiskData
    ? {
        hydrology: {
          river_discharge: Number((demoRiskData.risk.inputs.riverLevel * 15).toFixed(1)),
          stage: Number((demoRiskData.risk.inputs.riverLevel / 10).toFixed(2)),
          threshold_status: demoRiskData.risk.inputs.riverLevel > 70 ? "CRITICAL" : demoRiskData.risk.inputs.riverLevel > 40 ? "ELEVATED" : "NORMAL"
        },
        station: { name: "Synthetic Gauge Station", distance_km: 0 },
        source: "Synthetic Demo Parameters",
        cached: false,
        isDemo: true
      }
    : (!isOnline && offlinePack?.hydrology
      ? { hydrology: offlinePack.hydrology, station: offlinePack.hydrology.station, source: `${offlinePack.hydrology.source || "Gauge Registry"} (Offline Pack)`, cached: true }
      : hydrologyData);

  const displaySeismicData = isDemoMode && demoRiskData
    ? {
        seismic: {
          peak_ground_acceleration: Number((demoRiskData.risk.inputs.seismicActivity / 100).toFixed(2)),
          magnitude_max: Number((demoRiskData.risk.inputs.seismicActivity / 12).toFixed(1)),
          events_24h: demoRiskData.risk.inputs.seismicActivity > 50 ? 4 : 0
        },
        recentEarthquakes: [],
        source: "Synthetic Demo Parameters",
        cached: false,
        isDemo: true
      }
    : (!isOnline && offlinePack?.seismic
      ? { seismic: offlinePack.seismic, recentEarthquakes: offlinePack.seismic.recentEarthquakes, source: `${offlinePack.seismic.source || "USGS"} (Offline Pack)`, cached: true }
      : seismicData);

  const displayEmergencyData = !isOnline && offlinePack?.emergencyServices
    ? { services: offlinePack.emergencyServices, source: "Offline Pack (Verified GPS)" }
    : emergencyData;

  const displayContactsData = !isOnline && offlinePack?.emergencyContacts
    ? { contacts: offlinePack.emergencyContacts, country: offlinePack.country || selectedLocation?.country }
    : contactsData;

  const isLiveRainfall = !isDemoMode && isOnline && (displayRiskData?.dataSources?.rainfall === "weather_api" || Boolean(weatherData && !weatherError));
  const isLiveRiver = !isDemoMode && isOnline && (displayRiskData?.dataSources?.riverLevel === "hydrology_api" || Boolean(hydrologyData && !hydrologyError));
  const isLiveSeismic = !isDemoMode && isOnline && (displayRiskData?.dataSources?.seismicActivity === "seismic_api" || Boolean(seismicData && !seismicError));
  const isLiveTelemetry = isOnline && (isLiveRainfall || isLiveRiver || isLiveSeismic);

  return (
    <div className="space-y-6">
      {/* 0. Top Mode Selector Bar (Live vs Demo Mode) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operating Mode:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-extrabold flex items-center space-x-1.5 ${
            isDemoMode
              ? "bg-purple-100 text-purple-800 border border-purple-300"
              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? "bg-purple-600" : "bg-emerald-500 animate-pulse"}`} />
            <span>{isDemoMode ? "Deterministic Demo Mode" : "Real-Time Live Telemetry"}</span>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => isDemoMode && handleExitDemoMode()}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
              !isDemoMode
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Mode</span>
          </button>
          <button
            onClick={() => !isDemoMode && handleEnterDemoMode()}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isDemoMode
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-700 hover:text-purple-900"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Demo Mode</span>
          </button>
        </div>
      </div>

      {/* 0B. Deterministic Demo Mode Banner (Step 20) */}
      {isDemoMode && (
        <DemoModeBanner
          scenarios={demoScenarios}
          selectedScenarioId={selectedDemoScenarioId}
          onSelectScenario={(scId) => handleRunDemoScenario(scId)}
          onRunScenario={(scId) => handleRunDemoScenario(scId)}
          onExitDemoMode={handleExitDemoMode}
          isLoading={isLoadingDemo}
          error={demoError}
        />
      )}

      {/* 0C. Top-Level Emergency Offline Mode Banner (Step 15) */}
      {!isOnline && !isDemoMode && (
        <div className="p-4 rounded-xl bg-amber-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fade-in border border-amber-600">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-600/80 border border-white/25 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>EMERGENCY OFFLINE MODE ACTIVE</span>
                <span className="text-[10px] uppercase bg-black/25 px-2 py-0.5 rounded font-mono">No Connection</span>
              </div>
              <div className="text-xs text-amber-50 mt-0.5 leading-relaxed">
                {offlinePack
                  ? `Displaying cached Emergency Offline Pack for ${selectedLocation?.name || "current station"} (Saved: ${new Date(offlinePack.savedAt).toLocaleTimeString()}). Live updates paused.`
                  : `No offline pack found for ${selectedLocation?.name || "this station"}. Reconnect to internet to download telemetry.`}
              </div>
            </div>
          </div>

          {offlinePack && (
            <div className="text-xs bg-amber-700/70 text-amber-50 px-3 py-1.5 rounded-lg border border-white/20 self-start sm:self-auto shrink-0 font-medium flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Offline Pack Loaded</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Location Overview Card (with Live/Offline Telemetry Status & Refresh Button) */}
      <LocationOverview
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing || isLoadingDemo}
        onRefresh={handleManualRefresh}
        isLive={isLiveTelemetry}
        isOffline={!isOnline}
      />

      {/* 2. Meaningful Risk Shift Alert Banner (Step 10) */}
      {!isDemoMode && (
        <RiskChangeBanner
          changeEvent={riskChangeEvent}
          onDismiss={() => setRiskChangeEvent(null)}
        />
      )}

      {/* 3. Real-Time Smart Risk Alert Banner */}
      <RiskAlertBanner
        alert={displayAlert}
        onEnableNotifications={handleEnableNotifications}
        notificationPermission={notificationPermission}
      />

      {/* Alert Accuracy Feedback System */}
      <AlertFeedbackForm
        alertId={displayAlert?.id || `alert-${selectedLocation?.id || "global"}-${displayRiskData?.overall?.level || "NORMAL"}`}
        locationId={selectedLocation?.id || selectedLocation?._id || "mumbai-in"}
        alertRiskLevel={displayRiskData?.overall?.level || "HIGH"}
        alertRiskScore={displayRiskData?.overall?.score || 82}
        alertType={displayAlert?.hazardTypes?.[0] || "FLOOD"}
        isDemo={isDemoMode}
      />

      {/* 4. Real-Time Environmental Observations Grid (Weather + Hydrology + Seismic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <WeatherIndicator
          weatherData={displayWeatherData}
          isLoading={isLoadingWeather}
          error={weatherError}
          locationName={selectedLocation?.name}
          dataSources={displayRiskData?.dataSources}
          onRefresh={isOnline ? handleManualRefresh : null}
          isOffline={!isOnline}
        />
        <HydrologyIndicator
          hydrologyData={displayHydrologyData}
          isLoading={isLoadingHydrology}
          error={hydrologyError}
          locationName={selectedLocation?.name}
          fallbackRiverLevel={displayRiskData?.inputs?.riverLevel}
          onRefresh={isOnline ? handleManualRefresh : null}
          isOffline={!isOnline}
        />
        <SeismicIndicator
          seismicData={displaySeismicData}
          isLoading={isLoadingSeismic}
          error={seismicError}
          locationName={selectedLocation?.name}
          fallbackSeismicActivity={displayRiskData?.inputs?.seismicActivity}
          onRefresh={isOnline ? handleManualRefresh : null}
          isOffline={!isOnline}
        />
      </div>

      {/* Non-blocking API Connection Notice (with Retry) - Only when online */}
      {isOnline && (activeRiskError || contextRiskError) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Unable to refresh live risk data from backend</div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                {activeRiskError || contextRiskError || "Showing the most recent available telemetry."}
              </div>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 5. Top Analytics Grid: Backend Risk Engine Telemetry + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real Overall Risk + 3 Real Hazard Cards (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <OverallRiskCard
            overall={displayRiskData?.overall}
            isLoading={isRefreshing && !displayRiskData}
            locationName={selectedLocation?.name}
          />

          {/* Assessment Reliability & Confidence Indicator (Step 18 & 20) */}
          <RiskConfidence
            confidence={displayConfidence}
            isLoading={isRefreshing && !displayRiskData}
          />

          <IndividualRiskCards
            flood={displayRiskData?.flood}
            landslide={displayRiskData?.landslide}
            seismic={displayRiskData?.seismic}
            isLoading={isRefreshing && !displayRiskData}
          />
        </div>

        {/* Right Column: Live / Offline Interactive Risk Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <MapPreview
            isOffline={!isOnline}
            savedFacilities={displayEmergencyData?.services || displayEmergencyData || []}
          />
        </div>
      </div>

      {/* 6. AI-Powered Risk Explanation Layer */}
      <div>
        <AIRiskExplanation
          explanation={aiExplanation}
          isLoading={isLoadingAI}
          error={aiError}
          isConfigured={isAIConfigured}
          riskLevel={displayRiskData?.overall?.level || "LOW"}
          locationName={selectedLocation?.name}
          onRetry={() => fetchAIExplanation(displayRiskData, selectedLocation?.name)}
        />
      </div>

      {/* 7. Emergency Response, Offline Pack & Assistance Suite (Steps 13, 14 & 15) */}
      <div className="space-y-6">
        {/* Emergency Offline Pack Manager (Step 15) */}
        <EmergencyOfflinePack
          location={selectedLocation}
          riskData={displayRiskData}
          weatherData={displayWeatherData}
          hydrologyData={displayHydrologyData}
          seismicData={displaySeismicData}
          emergencyServices={displayEmergencyData?.services || displayEmergencyData || []}
          emergencyContacts={displayContactsData?.contacts || displayContactsData || []}
          isOnline={isOnline}
          onPackSaved={(saved) => setOfflinePack(saved)}
          onPackDeleted={() => setOfflinePack(null)}
        />

        {/* Quick Contacts & Emergency Help Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Emergency Contacts (One-Tap Direct Dial) */}
          <div className="lg:col-span-6 flex flex-col">
            <QuickEmergencyContacts
              contactsData={displayContactsData}
              isLoading={isLoadingContacts}
              error={contactsError}
              locationName={selectedLocation?.name}
              isEmergencyMode={displayRiskData?.overall?.level === "HIGH" || displayRiskData?.overall?.level === "CRITICAL"}
              onRefresh={isOnline ? handleManualRefresh : null}
              isOffline={!isOnline}
            />
          </div>

          {/* Emergency Help Near You (Proximity Facilities & Navigation) */}
          <div className="lg:col-span-6 flex flex-col">
            <EmergencyHelpNearYou
              emergencyData={displayEmergencyData}
              isLoading={isLoadingEmergency}
              error={emergencyError}
              locationName={selectedLocation?.name}
              isEmergencyMode={displayRiskData?.overall?.level === "HIGH" || displayRiskData?.overall?.level === "CRITICAL"}
              onRefresh={isOnline ? handleManualRefresh : null}
              isOffline={!isOnline}
            />
          </div>
        </div>
      </div>

      {/* 8. Deep Dive Grid: Explainable Risk Drivers from Engine */}
      <div>
        <RiskFactors
          factors={displayRiskData?.factors || []}
          isLoading={isRefreshing && !displayRiskData}
        />
      </div>

      {/* 9. Recent Alerts History Section */}
      <div>
        <RecentAlerts
          alerts={alertHistory}
          isLoading={isLoadingAlerts}
          locationName={selectedLocation?.name}
        />
      </div>

      {/* 10. Historical Validation & Backtesting Benchmark (Step 19) */}
      <div>
        <HistoricalValidationSummary />
      </div>
    </div>
  );
}
