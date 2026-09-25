import React from "react";
import { Info } from "lucide-react";

export default function MapLegend({ compact = false }) {
  const legendItems = [
    { label: "Low", color: "bg-emerald-600", border: "border-emerald-700", opacity: "bg-emerald-500/20", desc: "Subtle green zone (Low threat)" },
    { label: "Moderate", color: "bg-amber-500", border: "border-amber-600", opacity: "bg-amber-500/30", desc: "Yellow/amber zone (Advisory watch)" },
    { label: "High", color: "bg-orange-600", border: "border-orange-700", opacity: "bg-orange-500/40", desc: "Orange zone (Heightened warning)" },
    { label: "Critical", color: "bg-rose-600", border: "border-rose-700", opacity: "bg-rose-500/50", desc: "Red zone (Critical danger)" }
  ];

  if (compact) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 border border-slate-200/90 shadow-md text-xs space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-1.5">
          <span>Risk Influence Zones</span>
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
            Live Overlay
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-700">
              <span className={`w-3 h-3 rounded-full ${item.color} border ${item.border} shrink-0`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="text-[9px] text-slate-400 leading-tight border-t border-slate-100 pt-1 font-medium">
          Risk influence zone — not an exact flood boundary
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/90 shadow-card text-xs space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Risk Influence Legend</div>
        <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          GIS Overlay
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center space-x-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className={`w-3.5 h-3.5 rounded-full ${item.color} border ${item.border} shrink-0`}></span>
            <div>
              <div className="font-bold text-slate-900 text-[11px] leading-none">{item.label}</div>
              <div className="text-[9px] text-slate-500 font-medium mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1 leading-tight font-medium border-t border-slate-100">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Risk influence zone — estimated spatial impact area around station, not an exact flood boundary.</span>
      </p>
    </div>
  );
}
