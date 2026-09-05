/**
 * HydroGuard - Client-side Freshness Evaluation Utility (Step 17)
 *
 * Evaluates telemetry timestamp age against provider-specific thresholds:
 * - Weather: FRESH (<= 30 min), AGING (30-120 min), STALE (> 120 min)
 * - Hydrology: FRESH (<= 60 min), AGING (60-240 min), STALE (> 240 min)
 * - Seismic: FRESH (<= 60 min), AGING (60-360 min), STALE (> 360 min)
 */

export const FRESHNESS_THRESHOLDS = {
  WEATHER: {
    FRESH_MAX_MIN: 30,
    AGING_MAX_MIN: 120
  },
  HYDROLOGY: {
    FRESH_MAX_MIN: 60,
    AGING_MAX_MIN: 240
  },
  SEISMIC: {
    FRESH_MAX_MIN: 60,
    AGING_MAX_MIN: 360
  },
  DEFAULT: {
    FRESH_MAX_MIN: 60,
    AGING_MAX_MIN: 180
  }
};

/**
 * Evaluates the freshness tier of an observation timestamp.
 *
 * @param {string|Date|number} observedAt
 * @param {'WEATHER'|'HYDROLOGY'|'SEISMIC'|'DEFAULT'} [providerType='DEFAULT']
 * @returns {{
 *   tier: 'FRESH' | 'AGING' | 'STALE' | 'STORED' | 'UNKNOWN',
 *   label: string,
 *   badgeClass: string,
 *   dotClass: string,
 *   ageMinutes: number | null
 * }}
 */
export function getFreshnessMeta(observedAt, providerType = "DEFAULT", isStored = false) {
  if (isStored) {
    return {
      tier: "STORED",
      label: "Stored Benchmark",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
      ageMinutes: null
    };
  }

  if (!observedAt) {
    return {
      tier: "UNKNOWN",
      label: "Time Unknown",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      dotClass: "bg-slate-300",
      ageMinutes: null
    };
  }

  const parsed = new Date(observedAt);
  const timeMs = parsed.getTime();

  if (isNaN(timeMs)) {
    return {
      tier: "UNKNOWN",
      label: "Time Malformed",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      dotClass: "bg-slate-300",
      ageMinutes: null
    };
  }

  const nowMs = Date.now();
  const ageMs = Math.max(0, nowMs - timeMs);
  const ageMinutes = Math.round(ageMs / (60 * 1000));

  const thresholds = FRESHNESS_THRESHOLDS[providerType.toUpperCase()] || FRESHNESS_THRESHOLDS.DEFAULT;

  if (ageMinutes <= thresholds.FRESH_MAX_MIN) {
    return {
      tier: "FRESH",
      label: "Fresh Telemetry",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dotClass: "bg-emerald-500",
      ageMinutes
    };
  }

  if (ageMinutes <= thresholds.AGING_MAX_MIN) {
    return {
      tier: "AGING",
      label: "Aging Feed",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300/80",
      dotClass: "bg-amber-500",
      ageMinutes
    };
  }

  return {
    tier: "STALE",
    label: "Stale Feed",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    dotClass: "bg-rose-500",
    ageMinutes
  };
}

export default getFreshnessMeta;
