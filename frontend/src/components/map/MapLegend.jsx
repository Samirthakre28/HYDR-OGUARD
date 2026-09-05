import React from "react";
import { Info } from "lucide-react";

export default function MapLegend({ compact = false }) {
  const legendItems = [
    { label: "Low", color: "bg-emerald-500", ring: "ring-emerald-200", desc: "Minimal baseline threat" },
    { label: "Moderate", color: "bg-amber-400", ring: "ring-amber-200", desc: "Elevated advisory watch" },
    { label: "High", color: "bg-orange-500", ring: "ring-orange-200", desc: "Heightened hazard warning" },
    { label: "Critical", color: "bg-rose-600", ring: "ring-rose-200", desc: "Immediate danger zone" }
  ];

  if (compact) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-lg p-2.5 border border-slate-200/80 shadow-md text-xs space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-700">
          <span>Hazard Risk Legend</span>
          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Model</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5 text-[11px] text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color} ring-2 ${item.ring}`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/80 shadow-card text-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="font-semibold text-slate-800 text-xs">Hazard Risk Zones</div>
        <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          <span>Modeled Visualization</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color} ring-2 ${item.ring}`}></span>
            <span className="font-medium text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 leading-tight">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Concentric hazard radii are a modeled visualization, not official government hazard boundaries.</span>
      </p>
    </div>
  );
}
