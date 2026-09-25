import React from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Info,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Droplets,
  Mountain,
  AlertTriangle
} from "lucide-react";
import { useNavigation } from "../context/NavigationContext";

export default function About() {
  const { navigate } = useNavigation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Banner */}
      <section className="bg-white border-b border-slate-200/80 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transparent Disaster Intelligence Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            About HydroGuard
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            HydroGuard is an AI-powered disaster risk assessment and early warning system designed to provide localized, explainable, and multi-hazard intelligence to communities and emergency responders.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {/* Section 1: What is HydroGuard */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            <span>1. What is HydroGuard?</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Extreme climate events, sudden landslides, riverine floods, and earthquake tremors pose severe risks to vulnerable communities worldwide. HydroGuard bridges the gap between raw scientific environmental sensors and actionable emergency preparedness.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            By aggregating live meteorology, hydrological forecasts, seismic catalogs, and elevation gradient models, HydroGuard continuously computes multi-hazard risk indices (0–100 scale) and classifies them into actionable threat levels (LOW, MODERATE, HIGH, CRITICAL).
          </p>
        </section>

        {/* Section 2: How Risk Assessment Works */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600" />
            <span>2. How Risk Assessment Works (The Deterministic Risk Engine)</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            HydroGuard relies on an open, published mathematical scoring system rather than opaque black-box neural networks. This ensures that every risk score is reproducible, verifiable, and explainable:
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-800">
              <strong className="text-blue-900 font-bold block mb-1">Flood Risk Formula:</strong>
              <code className="font-mono text-blue-800">
                Flood = (Rainfall × 40%) + (River Level × 30%) + (Elevation × 10%) + (Historical Risk × 20%)
              </code>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-slate-800">
              <strong className="text-amber-900 font-bold block mb-1">Landslide Risk Formula:</strong>
              <code className="font-mono text-amber-800">
                Landslide = (Rainfall × 30%) + (Slope × 35%) + (Historical Risk × 20%) + (Elevation × 15%)
              </code>
            </div>

            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-xs text-slate-800">
              <strong className="text-rose-900 font-bold block mb-1">Seismic Risk Formula:</strong>
              <code className="font-mono text-rose-800">
                Seismic = (24h Activity × 60%) + (Historical Recurrence × 40%)
              </code>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-slate-800">
              <strong className="text-emerald-900 font-bold block mb-1">Overall Multi-Hazard Index:</strong>
              <code className="font-mono text-emerald-800">
                Overall = (Flood × 40%) + (Landslide × 35%) + (Seismic × 25%)
              </code>
            </div>
          </div>
        </section>

        {/* Section 3: Data Telemetry, Provenance & Risk Confidence */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>3. Data Telemetry, Provenance & Risk Confidence</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every input signal ingested into the HydroGuard pipeline passes through rigorous provenance tracking and freshness evaluation:
          </p>
          <ul className="text-xs sm:text-sm text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Open-Meteo Weather API:</strong> Live hourly precipitation rate (TTL: 5–15 minutes).</li>
            <li><strong>GloFAS Flood API:</strong> River basin stage and discharge rates (TTL: 5–15 minutes).</li>
            <li><strong>USGS Earthquake Catalog:</strong> Real-time seismic event records within a 100km radius.</li>
            <li><strong>Digital Elevation Models:</strong> Terrain slope angles and sea level elevation baselines.</li>
            <li><strong>Risk Confidence & Reliability Layer:</strong> Computes data completeness, sensor freshness, and penalizes missing or fallback metrics to guarantee transparent risk confidence.</li>
          </ul>
        </section>

        {/* Section 4: Smart Alerts & Escalation */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <span>4. Threshold-Driven Alerts & Risk Shift Detection</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            HydroGuard continuously analyzes environmental fluctuations. When a significant escalation occurs (such as a shift from MODERATE to HIGH, or a sudden surge in precipitation), the system dispatches priority safety warnings and desktop alerts to keep users vigilant before conditions become hazardous.
          </p>
        </section>

        {/* Section 5: Emergency Assistance & Offline Support */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>5. Emergency Assistance & Offline Emergency Mode</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            During disasters, cellular connectivity and power grids often fail. HydroGuard provides:
          </p>
          <ul className="text-xs sm:text-sm text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Verified Emergency Directory:</strong> Direct tap-to-call links to national, state, and district emergency response desks (NDRF, SDRF, Fire, Police, Ambulance).</li>
            <li><strong>Proximity Shelters & Hospitals:</strong> Geospatial coordinates and turn-by-turn navigation paths to verified relief units.</li>
            <li><strong>HydroGuard Emergency Offline Mode:</strong> Stores complete regional life-safety packs in browser local storage—including cached maps, shelter GPS, emergency contacts, and deterministic safety procedures—accessible completely offline without cellular service.</li>
          </ul>
        </section>

        {/* Section 6: AI Explanation Layer */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>6. Downstream AI Explanation Layer</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Large Language Models (Gemini 2.0 Flash) are utilized strictly downstream as an explainability and translation engine. The AI translates verified environmental numbers and mathematical contributing factors into clear natural-language briefings and emergency safety guidance.
          </p>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <strong className="text-slate-800">Architectural Guardrail:</strong> AI never calculates or alters risk scores, never trains on unverified inputs, and never fabricates disaster predictions.
          </div>
        </section>

        {/* Section 7: Future ML Architecture */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-600" />
            <span>7. Future Machine Learning Architecture</span>
          </h2>
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-2">
            <strong className="font-bold block">Scientific Transparency Statement:</strong>
            <p>
              The current production risk score uses the deterministic explainable Risk Engine. A production ML model is not currently deployed.
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            HydroGuard includes a formal Feature Contract, Model Registry, and Shadow Mode architecture to support future empirical machine learning research without disrupting the authoritative deterministic engine. Any future model must pass all 12 Model Safety Gates and temporal holdout validation before consideration.
          </p>
        </section>

        {/* Section 8: Demo Mode & Limitations */}
        <section className="bg-white rounded-2xl border border-purple-200 shadow-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span>8. HydroGuard Demo Mode & Synthetic Data Limitations</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            HydroGuard Demo Mode provides an isolated, deterministic simulation sandbox using predefined scenarios (e.g. Flash Flood Surge, Monsoonal Landslide, Seismic Swarm). All demo mode outputs are strictly labeled as <strong>SYNTHETIC TEST DATA — NOT REAL-TIME DATA</strong> and are completely isolated from live environmental sensor feeds and official civil protection alerts.
          </p>
        </section>

        {/* Section 9: Safety & Responsible Disclosure Statement */}
        <section className="bg-white rounded-2xl border-2 border-rose-300 shadow-card p-6 sm:p-8 space-y-4 bg-rose-50/20">
          <h2 className="text-xl font-bold text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>9. Responsible Disclosure & Essential Disclaimers</span>
          </h2>
          <div className="p-4 bg-rose-100/70 border border-rose-300 rounded-xl text-xs sm:text-sm text-rose-950 font-semibold leading-relaxed">
            HydroGuard is a risk-assessment and preparedness system, not an exact disaster or earthquake prediction system.
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            HydroGuard provides localized multi-hazard risk indices, situational awareness, and early warning assistance based on scientific environmental sensors and deterministic models. It does NOT guarantee exact disaster occurrence, time of strike, or earthquake forecasts.
          </p>
          <p className="text-xs text-slate-600">
            HydroGuard is not a replacement for official state or national disaster management authorities (NDMA, IMD, USGS, local civil protection agencies). Always prioritize official government sirens, evacuation directives, and emergency broadcast instructions.
          </p>
        </section>

        {/* CTA Banner */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">Ready to check your localized risk?</h3>
            <p className="text-xs text-slate-400">Access real-time telemetry on the live dashboard.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center space-x-2"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
