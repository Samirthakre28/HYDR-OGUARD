import React, { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  Home,
  LayoutDashboard,
  Map,
  PhoneCall,
  Info,
  Menu,
  X,
  MapPin,
  ChevronDown,
  Activity,
  AlertCircle,
  Bell
} from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";
import { useLocation } from "../../context/LocationContext";

export default function Navbar({ isDemoMode = false }) {
  const { currentPath, navigate } = useNavigation();
  const { selectedLocation, setSelectedLocation, locations } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setLocationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Home", path: "/", icon: Home },
    { label: "Alerts", path: "/alerts", icon: Bell },
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Risk Map", path: "/risk-map", icon: Map },
    { label: "Emergency", path: "/emergency", icon: PhoneCall, isEmergency: true }
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo & Name */}
            <button
              onClick={() => handleNavClick("/")}
              className="flex items-center space-x-2.5 sm:space-x-3 text-left focus:outline-hidden group min-w-0 shrink"
              aria-label="HydroGuard Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none flex items-center gap-1.5 whitespace-nowrap">
                  <span>Hydro<span className="text-emerald-600">Guard</span></span>
                  {isDemoMode && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md">
                      Demo
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase mt-0.5 whitespace-nowrap truncate">
                  Disaster Intelligence
                </div>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = currentPath === link.path;

                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      link.isEmergency
                        ? isActive
                          ? "bg-rose-600 text-white font-bold shadow-xs"
                          : "text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                        : isActive
                        ? "bg-emerald-50 text-emerald-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${link.isEmergency ? (isActive ? "text-white" : "text-rose-600") : (isActive ? "text-emerald-600" : "text-slate-400")}`} />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Area: Location Selector & Status */}
            <div className="hidden sm:flex items-center space-x-2.5 shrink-0">
              {/* Quick Location Dropdown */}
              <div className="relative" ref={locationDropdownRef}>
                <button
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                  className="min-h-[44px] flex items-center space-x-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                  aria-expanded={locationDropdownOpen}
                  aria-label="Select location"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="max-w-[120px] lg:max-w-[160px] truncate font-semibold text-slate-900">
                    {selectedLocation ? selectedLocation.name : "Select Location"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {locationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown border border-slate-200 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Switch Station Location
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                      {(locations || []).map((loc) => {
                        const isSelected = selectedLocation?.id === loc.id;
                        return (
                          <button
                            key={loc.id}
                            onClick={() => {
                              setSelectedLocation(loc);
                              setLocationDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between min-h-[40px] ${
                              isSelected
                                ? "bg-emerald-50 text-emerald-900 font-semibold"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className="truncate">{loc.name}, {loc.country}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Emergency Button */}
              <button
                onClick={() => handleNavClick("/emergency")}
                className="min-h-[44px] px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs active:scale-[0.98]"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>SOS Help</span>
              </button>
            </div>

            {/* Mobile Actions: SOS Call + Hamburger Menu */}
            <div className="flex md:hidden items-center space-x-2 shrink-0">
              <button
                onClick={() => handleNavClick("/emergency")}
                className="min-h-[44px] min-w-[44px] px-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-xs active:scale-[0.97]"
                aria-label="Emergency SOS Hotlines"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span className="text-[11px] font-extrabold">SOS</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors focus:outline-hidden active:bg-slate-200"
                aria-label={mobileMenuOpen ? "Close main navigation menu" : "Open main navigation menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-slate-800" /> : <Menu className="w-6 h-6 text-slate-800" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation with Outside Tap Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 z-10">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-slate-900 text-base">HydroGuard Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links (Stacked, 48px Touch Height) */}
            <nav className="space-y-1.5" aria-label="Mobile Navigation Menu">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = currentPath === link.path;

                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`w-full min-h-[48px] flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-colors ${
                      link.isEmergency
                        ? isActive
                          ? "bg-rose-600 text-white shadow-xs font-bold"
                          : "text-rose-700 bg-rose-50 border border-rose-200 font-bold"
                        : isActive
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                        : "text-slate-700 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${link.isEmergency ? (isActive ? "text-white" : "text-rose-600") : (isActive ? "text-emerald-600" : "text-slate-400")}`} />
                    <span className="flex-1">{link.label}</span>
                    {isActive && <span className="text-xs font-mono uppercase text-emerald-600">Active</span>}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Location Selector */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monitored District Station</span>
              </div>
              <select
                value={selectedLocation?.id || ""}
                onChange={(e) => {
                  const found = locations.find((l) => l.id === e.target.value);
                  if (found) setSelectedLocation(found);
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                {(locations || []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}, {loc.country} ({loc.region})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
