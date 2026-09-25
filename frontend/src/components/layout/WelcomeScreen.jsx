import React, { useState, useEffect } from "react";
import { Droplets, Activity } from "lucide-react";

/**
 * Startup Welcome Screen for HydroGuard Application
 * Displays brand identity and subtitle for ~2.5 seconds during initial site load.
 * Automatically fades out and transitions into the main application.
 */
export default function WelcomeScreen({ onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 2.1s display + 0.4s fade out transition = ~2.5s total duration
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2100);

    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-opacity duration-500 ease-out select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="region"
      aria-label="Welcome Screen"
    >
      <div className="flex flex-col items-center text-center px-6 max-w-lg mx-auto animate-hg-fade-in">
        {/* Brand Icon Container */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-600/10 dark:bg-teal-500/20 border border-teal-600/20 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 shadow-sm">
          <Droplets className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Brand Heading */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-slate-900 dark:text-white uppercase mb-3">
          HYDRO<span className="text-teal-600 dark:text-teal-400">GUARD</span>
        </h1>

        {/* Required Exact Subtitle */}
        <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 max-w-md leading-relaxed mb-8">
          AI-Powered Flash Flood Risk Assessment &amp; Decision Support System
        </p>

        {/* Subtle Progress Bar */}
        <div className="w-48 sm:w-64 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mb-4">
          <div className="h-full bg-teal-600 dark:bg-teal-400 rounded-full w-full animate-hg-progress" />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin" />
          <span>Initializing Decision Support Engine...</span>
        </div>
      </div>
    </div>
  );
}
