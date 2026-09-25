import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { locations as fallbackLocations, defaultLocation } from "../data/locations";
import { getLocations, getRiskData, calculateRisk } from "../services/api";
import { RISK_ENGINE_FALLBACK_INPUTS } from "../data/environmentalFallback";

const LocationContext = createContext(null);
const STORAGE_KEY = "hydroguard_selected_location";

// Get initial selected location: 1. Previously saved location from localStorage (validated), 2. Default location (Nashik, India)
function getInitialSelectedLocation() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          const matched = fallbackLocations.find(
            (l) => l.id === parsed.id || l.name.toLowerCase() === parsed.name.toLowerCase()
          );
          if (matched) return matched;
        }
      }
    } catch (err) {
      console.warn("[HydroGuard] Could not read saved location from localStorage:", err.message);
    }
  }
  return defaultLocation; // Nashik, Maharashtra, India
}

export function LocationProvider({ children }) {
  const [locations, setLocations] = useState(fallbackLocations);
  const [selectedLocation, setSelectedLocationState] = useState(getInitialSelectedLocation);
  const [riskData, setRiskData] = useState(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState(null);
  const [recenterCount, setRecenterCount] = useState(0);
  const liveRiskRequestRef = useRef(0);

  // Wrapper to set and persist selected location
  const setSelectedLocation = useCallback((locationOrFn) => {
    setSelectedLocationState((prev) => {
      const next = typeof locationOrFn === "function" ? locationOrFn(prev) : locationOrFn;
      if (next && typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn("[HydroGuard] Could not persist location:", e.message);
        }
      }
      return next;
    });
  }, []);

  // 1. Fetch available locations from backend API on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchLocations() {
      try {
        const response = await getLocations();
        if (isMounted && response?.success && Array.isArray(response.data) && response.data.length > 0) {
          const mergedLocations = response.data.map((backendLoc) => {
            const fallback = fallbackLocations.find(
              (f) => f.name.toLowerCase() === backendLoc.name.toLowerCase()
            );
            return {
              ...fallback,
              ...backendLoc,
              id: backendLoc._id || backendLoc.id || fallback?.id,
              elevation: backendLoc.elevation !== undefined ? `${backendLoc.elevation} m` : fallback?.elevation || "0 m"
            };
          });

          setLocations(mergedLocations);

          setSelectedLocationState((prev) => {
            const matched = mergedLocations.find(
              (l) => l.name.toLowerCase() === prev?.name?.toLowerCase()
            );
            return matched || mergedLocations[0];
          });
        }
      } catch (err) {
        console.warn("[HydroGuard] Could not fetch locations from backend, using preset stations:", err.message);
      }
    }

    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch real calculated risk data whenever selectedLocation changes
  const fetchRiskForLocation = useCallback(async (loc, signal) => {
    if (!loc) return null;

    const requestId = ++liveRiskRequestRef.current;
    setIsLoadingRisk(true);
    setRiskError(null);

    const lookupId = loc._id || loc.id || loc.name.toLowerCase();

    try {
      const fallbackCalc = calculateRisk(RISK_ENGINE_FALLBACK_INPUTS)
        .then((calculated) => {
          if (requestId !== liveRiskRequestRef.current) return;
          if (calculated?.success && calculated.data) {
            setRiskData((prev) => prev || calculated.data);
          }
        })
        .catch(() => {});

      const response = await getRiskData(lookupId, signal);
      if (requestId !== liveRiskRequestRef.current) return null;

      if (response?.success && response.data?.risk) {
        setRiskData(response.data.risk);
        setRiskError(null);
        await fallbackCalc;
        return response.data.risk;
      }

      throw new Error("Invalid risk data format returned by server.");
    } catch (err) {
      if (err.name === "AbortError") return null;
      if (requestId !== liveRiskRequestRef.current) return null;
      console.error(`[HydroGuard] Failed to fetch risk data for ${loc.name}:`, err.message);
      setRiskError(err.message || "Failed to load risk telemetry from server.");
      try {
        const calculated = await calculateRisk(RISK_ENGINE_FALLBACK_INPUTS);
        if (requestId === liveRiskRequestRef.current && calculated?.success && calculated.data) {
          setRiskData((prev) => prev || calculated.data);
          return calculated.data;
        }
      } catch (_) {
        /* keep existing riskData */
      }
      return null;
    } finally {
      if (requestId === liveRiskRequestRef.current) {
        setIsLoadingRisk(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (selectedLocation) {
      fetchRiskForLocation(selectedLocation, controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [selectedLocation, fetchRiskForLocation]);

  const selectLocationById = useCallback((id) => {
    const found = locations.find((l) => (l._id || l.id) === id);
    if (found) {
      setSelectedLocation(found);
    }
  }, [locations]);

  const triggerRecenter = useCallback(() => {
    setRecenterCount((prev) => prev + 1);
  }, []);

  const refreshRisk = useCallback((signal) => {
    if (selectedLocation) {
      return fetchRiskForLocation(selectedLocation, signal);
    }
    return Promise.resolve(null);
  }, [selectedLocation, fetchRiskForLocation]);


  const value = {
    selectedLocation,
    setSelectedLocation,
    selectLocationById,
    locations,
    riskData,
    isLoadingRisk,
    riskError,
    refreshRisk,
    recenterCount,
    triggerRecenter
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
