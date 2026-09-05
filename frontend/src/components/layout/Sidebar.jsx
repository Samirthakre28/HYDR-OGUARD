import React, { useState, useRef, useEffect } from "react";
import {
  Home,
  LayoutDashboard,
  Map,
  PhoneCall,
  Info,
  ShieldAlert,
  Activity,
  X,
  MapPin,
  ChevronDown,
  AlertCircle,
  Radio,
  Check,
  ShieldCheck,
  LifeBuoy,
  Bell
} from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";
import { useLocation } from "../../context/LocationContext";

export default function Sidebar({ isOpen, onClose }) {
  const { currentPath, navigate } = useNavigation();
  const { selectedLocation, setSelectedLocation, locations } = useLocation();
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setLocationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    { label: "Home", path: "/", icon: Home, description: "Overview & quick entry" },
    { label: "Alerts", path: "/alerts", icon: Bell, description: "Active alerts & accuracy feedback" },
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, description: "Live risk analytics" },
    { label: "Risk Map", path: "/risk-map", icon: Map, description: "Geospatial hazard layers" },
    { label: "Risk Analysis", path: "/risk-analysis", icon: Activity, description: "Explainability & factor breakdown" },
    { label: "Offline Safe Map", path: "/offline-safe-map", icon: LifeBuoy, description: "Saved shelters & offline map" },
    { label: "Emergency", path: "/emergency", icon: PhoneCall, description: "Hotlines & relief units", isEmergency: true }
  ];

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Global Left Vertical Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:shrink-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {/* Top Brand Header */}
          <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button
              onClick={() => handleNavClick("/")}
              className="flex items-center space-x-3 text-left focus:outline-hidden group"
              aria-label="HydroGuard Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-extrabold tracking-tight text-slate-900 block leading-none">
                  Hydro<span className="text-emerald-600">Guard</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-1">
                  Disaster Intelligence
                </span>
              </div>
            </button>

            {/* Mobile Close Button (X) */}
            <button
              onClick={onClose}
              className="md:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Station Switcher (Inside Sidebar) */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50" ref={dropdownRef}>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 flex items-center justify-between">
              <span>Active Station</span>
              <span className="text-[10px] text-emerald-600 font-mono">Live Feeds</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                aria-expanded={locationDropdownOpen}
                aria-label="Switch monitoring station"
              >
                <div className="flex items-center space-x-2 truncate">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Select Station"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {locationDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-dropdown border border-slate-200 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="max-h-48 overflow-y-auto py-0.5 space-y-0.5">
                    {(locations || []).map((loc) => {
                      const isSelected = selectedLocation?.id === loc.id;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocation(loc);
                            setLocationDropdownOpen(false);
                          }}
                          className={`w-full min-h-[40px] text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-900 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="truncate">{loc.name}, {loc.country}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 sm:p-4 space-y-1.5 flex-1" aria-label="Main Navigation">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation Menu
            </div>

            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full min-h-[48px] flex items-center space-x-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left group ${
                    item.isEmergency
                      ? isActive
                        ? "bg-rose-600 text-white font-bold shadow-xs"
                        : "text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 font-bold"
                      : isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      item.isEmergency
                        ? isActive
                          ? "bg-rose-700 text-white"
                          : "bg-rose-100 text-rose-700"
                        : isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="leading-tight truncate flex items-center justify-between">
                      <span>{item.label}</span>
                      {isActive && (
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                          item.isEmergency ? "bg-rose-700 text-white" : "bg-emerald-200/80 text-emerald-900"
                        }`}>
                          Active
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-normal truncate mt-0.5 ${
                      item.isEmergency
                        ? isActive ? "text-rose-100" : "text-rose-600/80"
                        : isActive ? "text-emerald-700/80" : "text-slate-400"
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status & Engine Badge */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">Risk Engine</span>
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Deterministic</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% Explainable MVP</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
