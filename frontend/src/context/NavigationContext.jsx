import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  // Normalize initial pathname
  const getInitialPath = () => {
    if (typeof window === "undefined") return "/";
    const path = window.location.pathname.toLowerCase();
    if (["/dashboard", "/risk-map", "/risk-analysis", "/offline-safe-map", "/emergency", "/alerts"].includes(path)) {
      return path;
    }
    // Check hash fallback (e.g., #/offline-safe-map)
    if (window.location.hash) {
      const hashPath = window.location.hash.replace(/^#\/?/, "/").toLowerCase();
      if (["/dashboard", "/risk-map", "/risk-analysis", "/offline-safe-map", "/emergency", "/alerts"].includes(hashPath)) {
        return hashPath;
      }
    }
    return "/";
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath);

  // Synchronize on browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (["/", "/dashboard", "/risk-map", "/risk-analysis", "/offline-safe-map", "/emergency", "/alerts"].includes(path)) {
        setCurrentPath(path);
      } else if (window.location.hash) {
        const hashPath = window.location.hash.replace(/^#\/?/, "/").toLowerCase();
        setCurrentPath(hashPath || "/");
      } else {
        setCurrentPath("/");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path) => {
    if (!path) return;
    const normalized = path.toLowerCase();
    if (typeof window !== "undefined") {
      try {
        window.history.pushState({}, "", normalized);
      } catch {
        window.location.hash = normalized;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setCurrentPath(normalized);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPath, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
