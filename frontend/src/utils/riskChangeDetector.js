/**
 * HydroGuard - Meaningful Risk Change Detection Engine (Step 10)
 *
 * Compares incoming risk calculation telemetry with the previous state.
 * Flags meaningful shifts based on:
 *   1. Absolute score differential >= 5 points across overall or individual hazards.
 *   2. Any categorical risk-level transition (LOW, MODERATE, HIGH, CRITICAL).
 */

export const RISK_LEVEL_SEVERITY = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4
};

export const MEANINGFUL_SCORE_DELTA_THRESHOLD = 5;

/**
 * Detects whether an incoming risk telemetry update represents a meaningful shift.
 *
 * @param {Object} previousRisk - Previous calculated risk object
 * @param {Object} currentRisk - Newly fetched calculated risk object
 * @param {string} [locationName] - Name of the active location
 * @returns {{
 *   hasMeaningfulChange: boolean,
 *   isSeverityIncrease: boolean,
 *   isLevelShift: boolean,
 *   previousLevel: string,
 *   currentLevel: string,
 *   scoreDiff: number,
 *   hazardDiffs: { flood: number, landslide: number, seismic: number },
 *   title: string,
 *   message: string,
 *   timestamp: number
 * } | null}
 */
export function detectRiskChange(previousRisk, currentRisk, locationName = "") {
  // Initial load or invalid payloads do not constitute a transition event
  if (!previousRisk || !currentRisk || !previousRisk.overall || !currentRisk.overall) {
    return null;
  }

  const prevOverall = previousRisk.overall;
  const currOverall = currentRisk.overall;

  const prevScore = Number(prevOverall.score ?? 0);
  const currScore = Number(currOverall.score ?? 0);
  const scoreDiff = currScore - prevScore;
  const absScoreDiff = Math.abs(scoreDiff);

  const prevLevel = (prevOverall.level || "LOW").toUpperCase();
  const currLevel = (currOverall.level || "LOW").toUpperCase();
  const isLevelShift = prevLevel !== currLevel;

  // Calculate hazard-specific differentials
  const prevFlood = Number(previousRisk.flood?.score ?? 0);
  const currFlood = Number(currentRisk.flood?.score ?? 0);
  const floodDiff = currFlood - prevFlood;

  const prevLandslide = Number(previousRisk.landslide?.score ?? 0);
  const currLandslide = Number(currentRisk.landslide?.score ?? 0);
  const landslideDiff = currLandslide - prevLandslide;

  const prevSeismic = Number(previousRisk.seismic?.score ?? 0);
  const currSeismic = Number(currentRisk.seismic?.score ?? 0);
  const seismicDiff = currSeismic - prevSeismic;

  const hasMeaningfulHazardDiff =
    Math.abs(floodDiff) >= MEANINGFUL_SCORE_DELTA_THRESHOLD ||
    Math.abs(landslideDiff) >= MEANINGFUL_SCORE_DELTA_THRESHOLD ||
    Math.abs(seismicDiff) >= MEANINGFUL_SCORE_DELTA_THRESHOLD;

  const hasMeaningfulChange =
    isLevelShift ||
    absScoreDiff >= MEANINGFUL_SCORE_DELTA_THRESHOLD ||
    hasMeaningfulHazardDiff;

  if (!hasMeaningfulChange) {
    return null;
  }

  // Determine direction of shift
  const prevSeverityVal = RISK_LEVEL_SEVERITY[prevLevel] || 1;
  const currSeverityVal = RISK_LEVEL_SEVERITY[currLevel] || 1;
  const isSeverityIncrease = currSeverityVal > prevSeverityVal || (currSeverityVal === prevSeverityVal && scoreDiff > 0);

  // Construct clear, user-facing explanation
  let title = "Risk Level Changed";
  let message = "";

  if (isLevelShift) {
    if (isSeverityIncrease) {
      title = "Risk Level Escalated";
      message = `Overall risk increased from ${prevLevel} (${prevScore}/100) to ${currLevel} (${currScore}/100)${locationName ? ` in ${locationName}` : ""}.`;
    } else {
      title = "Risk Level Improved";
      message = `Overall risk decreased from ${prevLevel} (${prevScore}/100) to ${currLevel} (${currScore}/100)${locationName ? ` in ${locationName}` : ""}.`;
    }
  } else if (absScoreDiff >= MEANINGFUL_SCORE_DELTA_THRESHOLD) {
    if (scoreDiff > 0) {
      title = "Risk Score Increased";
      message = `Overall risk increased by +${scoreDiff} points (${prevScore} → ${currScore}) under ${currLevel} severity${locationName ? ` in ${locationName}` : ""}.`;
    } else {
      title = "Risk Score Improved";
      message = `Overall risk improved by ${scoreDiff} points (${prevScore} → ${currScore}) under ${currLevel} severity${locationName ? ` in ${locationName}` : ""}.`;
    }
  } else {
    // Specific hazard shift
    const primaryHazard = Math.abs(floodDiff) >= MEANINGFUL_SCORE_DELTA_THRESHOLD
      ? { name: "Flood Risk", diff: floodDiff, prev: prevFlood, curr: currFlood }
      : Math.abs(landslideDiff) >= MEANINGFUL_SCORE_DELTA_THRESHOLD
      ? { name: "Landslide Risk", diff: landslideDiff, prev: prevLandslide, curr: currLandslide }
      : { name: "Seismic Risk", diff: seismicDiff, prev: prevSeismic, curr: currSeismic };

    title = primaryHazard.diff > 0 ? `${primaryHazard.name} Elevated` : `${primaryHazard.name} Reduced`;
    message = `${primaryHazard.name} shifted from ${primaryHazard.prev} to ${primaryHazard.curr} (${primaryHazard.diff > 0 ? `+${primaryHazard.diff}` : primaryHazard.diff} points)${locationName ? ` in ${locationName}` : ""}.`;
  }

  return {
    hasMeaningfulChange: true,
    isSeverityIncrease,
    isLevelShift,
    previousLevel: prevLevel,
    currentLevel: currLevel,
    scoreDiff,
    hazardDiffs: {
      flood: floodDiff,
      landslide: landslideDiff,
      seismic: seismicDiff
    },
    title,
    message,
    timestamp: Date.now()
  };
}

export default {
  detectRiskChange,
  MEANINGFUL_SCORE_DELTA_THRESHOLD,
  RISK_LEVEL_SEVERITY
};
