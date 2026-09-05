import React from "react";
import {
  Menu,
  ShieldAlert,
  PhoneCall,
  MapPin,
  AlertCircle
} from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";
import { useLocation } from "../../context/LocationContext";

export default function MobileTopBar({ onOpenMenu }) {
  const { navigate } = useNavigation();
  const { selectedLocation } = useLocation();

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-3.5 py-2.5 flex items-center justify-between gap-2 max-w-full">
      {/* Left: Hamburger Menu Button + Brand Logo */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <button
          onClick={onOpenMenu}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors focus:outline-hidden active:bg-slate-200 shrink-0"
          aria-label="Open left navigation menu"
        >
          <Menu className="w-5 h-5 text-slate-800" />
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex items-center space-x-2 text-left focus:outline-hidden min-w-0 truncate"
          aria-label="HydroGuard Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 truncate whitespace-nowrap">
            Hydro<span className="text-emerald-600">Guard</span>
          </span>
        </button>
      </div>

      {/* Right: Location Pill + Emergency SOS Button */}
      <div className="flex items-center space-x-2 shrink-0">
        {selectedLocation && (
          <div className="hidden xs:flex items-center space-x-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 max-w-[110px] truncate">
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{selectedLocation.name}</span>
          </div>
        )}

        <button
          onClick={() => navigate("/emergency")}
          className="min-h-[44px] px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-xs active:scale-[0.97]"
          aria-label="Emergency SOS Hotlines"
        >
          <PhoneCall className="w-3.5 h-3.5 text-white" />
          <span>SOS</span>
        </button>
      </div>
    </header>
  );
}
