import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  MapPin,
  ChevronDown,
  Search,
  Check
} from "lucide-react";
import { useLocation } from "../../context/LocationContext";

export default function Header({ onOpenMobileMenu }) {
  const { selectedLocation, setSelectedLocation, locations } = useLocation();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLocations = (locations || []).filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left Section: Mobile Menu + Page Titles */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
              Risk Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block truncate">
              Monitor localized disaster risk and environmental conditions.
            </p>
          </div>
        </div>

        {/* Right Section: Location Selector, Notifications, Profile */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Location Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-700 transition-colors shadow-xs"
              aria-expanded={isLocationOpen}
              aria-haspopup="true"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate font-semibold text-slate-900">
                {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : "Select Location"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isLocationOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-dropdown border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-1.5">Select Analysis Region</div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search city, district, country..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 space-y-0.5">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => {
                      const isSelected = selectedLocation?.id === loc.id;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setSelectedLocation(loc);
                            setIsLocationOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {loc.name}, {loc.country}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>{loc.region}</span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {loc.latitude.toFixed(2)}°N, {loc.longitude.toFixed(2)}°E
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2 mt-1" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching locations found.
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg text-center">
                  <span className="text-[11px] text-slate-500">
                    {locations.length} global stations monitored
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notification Button */}
          <button
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Profile Area */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            <button
              className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="User profile"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                TS
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">Admin Analyst</div>
                <div className="text-[11px] text-slate-400 leading-tight">Emergency Ops</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
