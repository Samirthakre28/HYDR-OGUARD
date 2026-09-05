import { config } from "../config/index.js";

/**
 * HydroGuard - AI-Powered Risk Explanation Service
 *
 * CRITICAL RULE:
 * The AI service does NOT calculate, modify, invent, or override risk scores.
 * It serves solely as an explainable translation layer converting authoritative,
 * calculated deterministic risk engine outputs into clear, human-readable
 * situation summaries, causal explanations, and safety recommendations.
 */

const SYSTEM_PROMPT = `You are HydroGuard's disaster-risk explanation assistant.
You do not predict disasters.
You do not calculate risk scores.
You do not modify risk scores.
You must only explain the risk assessment supplied to you.
Treat all supplied scores, levels, inputs, and factors as authoritative.
Never invent environmental measurements, disasters, locations, weather conditions, or emergency information.
If information is unavailable, explicitly say that it is unavailable.
Provide practical, cautious safety recommendations appropriate to the supplied risk level.

You must respond ONLY with a raw JSON object conforming strictly to this schema (no markdown, no backticks, no extra text):
{
  "summary": "1-2 sentence human-readable overview of the current risk level",
  "riskExplanation": "Detailed explanation of why the risk level exists based on supplied factors and inputs",
  "keyDrivers": ["List of main drivers identified in the supplied factors/inputs"],
  "recommendedActions": ["3-4 practical, safety-oriented recommendations corresponding to the hazard and severity"],
  "warning": "Severity-specific warning message (e.g. LOW: No immediate elevated risk / HIGH: Increased risk. Monitor advisories / CRITICAL: Very high risk. Follow official emergency guidance)"
}`;

/**
 * Validates riskData payload before sending to AI provider.
 * @param {Object} riskData
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateAIInput(riskData) {
  const errors = [];

  if (!riskData || typeof riskData !== "object" || Array.isArray(riskData)) {
    return {
      isValid: false,
      errors: ["Request body must contain a valid 'riskData' object."]
    };
  }

  const requiredCategories = ["overall", "flood", "landslide", "seismic"];
  const validLevels = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

  for (const cat of requiredCategories) {
    const item = riskData[cat];
    if (!item || typeof item !== "object") {
      errors.push(`Missing or invalid risk category: '${cat}'.`);
      continue;
    }

    if (item.score === undefined || typeof item.score !== "number" || isNaN(item.score)) {
      errors.push(`Category '${cat}' must have a valid numeric 'score'.`);
    } else if (item.score < 0 || item.score > 100) {
      errors.push(`Category '${cat}.score' must be between 0 and 100. Received: ${item.score}.`);
    }

    if (!item.level || !validLevels.includes(item.level.toUpperCase())) {
      errors.push(`Category '${cat}' must have a valid 'level' (LOW, MODERATE, HIGH, CRITICAL). Received: '${item.level}'.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper to strip markdown code fences from AI response string
 * @param {string} text
 * @returns {string}
 */
export function cleanJsonText(text) {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Generates deterministic fallback risk explanation from authoritative risk engine outputs.
 * Avoids LLM hallucinations or empty UI when AI API is unconfigured/unavailable.
 */
export function generateDeterministicExplanation(riskData) {
  const overall = riskData?.overall || { level: "MODERATE", score: 45 };
  const flood = riskData?.flood || { level: "LOW", score: 20 };
  const landslide = riskData?.landslide || { level: "LOW", score: 20 };
  const seismic = riskData?.seismic || { level: "LOW", score: 20 };

  const keyDrivers = [];
  if (flood.score >= 50) keyDrivers.push(`Elevated surface water & river basin saturation (${flood.score}/100)`);
  if (landslide.score >= 50) keyDrivers.push(`Steep topography with continuous precipitation (${landslide.score}/100)`);
  if (seismic.score >= 50) keyDrivers.push(`Elevated regional seismic tremor activity (${seismic.score}/100)`);
  if (keyDrivers.length === 0) {
    keyDrivers.push("Environmental baseline within seasonal operational boundaries");
    keyDrivers.push("Multi-source sensor telemetry showing steady-state metrics");
  }

  const recommendedActions = [];
  if (overall.level === "CRITICAL" || overall.level === "HIGH") {
    recommendedActions.push("Stay alert to official municipal disaster broadcast channels.");
    recommendedActions.push("Prepare an emergency grab-bag with medications, water, and documents.");
    recommendedActions.push("Avoid low-lying river embankments, bridges, and unstable hill slopes.");
    recommendedActions.push("Verify contact with family members and locate nearest evacuation centers.");
  } else if (overall.level === "MODERATE") {
    recommendedActions.push("Monitor local weather updates and streamflow radar feeds regularly.");
    recommendedActions.push("Inspect residential drainage paths to prevent localized water pooling.");
    recommendedActions.push("Keep emergency communication devices and battery power banks charged.");
  } else {
    recommendedActions.push("Normal conditions: maintain standard household disaster readiness kits.");
    recommendedActions.push("Review local evacuation routes and primary community assembly points.");
    recommendedActions.push("Continue routine monitoring of HydroGuard environmental indicators.");
  }

  const warning = overall.level === "CRITICAL"
    ? "High hazard warning: Follow local civil defense guidance and maintain evacuation readiness."
    : overall.level === "HIGH"
    ? "Elevated multi-hazard conditions active: Exercise heightened caution in vulnerable zones."
    : overall.level === "MODERATE"
    ? "Moderate environmental sensitivity detected: Periodic observation advised."
    : "Low baseline threat: Standard continuous monitoring active.";

  return {
    summary: `Current multi-hazard evaluation indicates a ${overall.level} risk condition (${overall.score}/100). Primary influence stems from localized terrain and hydrology dynamics.`,
    riskExplanation: `The composite index of ${overall.score}/100 integrates flood risk (${flood.score}), landslide susceptibility (${landslide.score}), and seismic activity (${seismic.score}). Contributing drivers are monitored against physical catchment thresholds.`,
    keyDrivers,
    recommendedActions,
    warning,
    source: "HydroGuard Rule-Based Synthesis",
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generates an AI-powered human-readable explanation from authoritative risk data.
 * @param {Object} riskData - Calculated risk engine results
 * @returns {Promise<{ success: boolean, data?: Object, message?: string, isConfigured?: boolean }>}
 */
export async function generateRiskExplanation(riskData) {
  // 1. Strict pre-validation
  const validation = validateAIInput(riskData);
  if (!validation.isValid) {
    return {
      success: false,
      message: "Invalid risk data provided for explanation.",
      errors: validation.errors
    };
  }

  // 2. Check AI Configuration - Graceful deterministic fallback if unconfigured
  const apiKey = config.aiApiKey;
  if (!apiKey || apiKey.trim() === "") {
    return {
      success: false,
      data: generateDeterministicExplanation(riskData),
      fallbackData: generateDeterministicExplanation(riskData),
      isConfigured: false,
      isFallback: true,
      message: "AI_API_KEY is not configured in server environment. Fallback deterministic protocol active."
    };
  }

  const model = config.aiModel || "gemini-2.0-flash";
  const apiUrl = config.aiApiUrl || "https://generativelanguage.googleapis.com/v1beta/models";

  const userPrompt = `Here is the authoritative, calculated risk assessment data from the HydroGuard Risk Engine.
Explain this assessment accurately without changing any numbers or levels:

${JSON.stringify(riskData, null, 2)}`;

  try {
    let rawText = "";

    // Determine API protocol: Google Gemini vs OpenAI-compatible format
    if (apiUrl.includes("googleapis.com")) {
      const endpoint = `${apiUrl.replace(/\/$/, "")}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[HydroGuard AI Service] Gemini API returned error ${response.status}:`, errText);
        return {
          success: false,
          message: `AI provider error (${response.status}): ${response.statusText}`,
          isConfigured: true
        };
      }

      const jsonResult = await response.json();
      rawText = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Standard OpenAI / compatible chat completions endpoint
      const endpoint = apiUrl.endsWith("/chat/completions") ? apiUrl : `${apiUrl.replace(/\/$/, "")}/chat/completions`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[HydroGuard AI Service] OpenAI-compatible API error ${response.status}:`, errText);
        return {
          success: false,
          message: `AI provider error (${response.status}): ${response.statusText}`,
          isConfigured: true
        };
      }

      const jsonResult = await response.json();
      rawText = jsonResult?.choices?.[0]?.message?.content || "";
    }

    const cleanedText = cleanJsonText(rawText);
    const parsedExplanation = JSON.parse(cleanedText);

    // Validate required fields in parsed output
    if (!parsedExplanation.summary || !parsedExplanation.warning || !Array.isArray(parsedExplanation.recommendedActions)) {
      throw new Error("AI output missing required schema fields.");
    }

    return {
      success: true,
      data: {
        summary: parsedExplanation.summary,
        riskExplanation: parsedExplanation.riskExplanation || parsedExplanation.summary,
        keyDrivers: parsedExplanation.keyDrivers || [],
        recommendedActions: parsedExplanation.recommendedActions || [],
        warning: parsedExplanation.warning,
        generatedAt: new Date().toISOString()
      },
      isConfigured: true
    };
  } catch (error) {
    console.warn("[HydroGuard AI Service] Provider call failed, falling back to deterministic explanation:", error.message);
    return {
      success: true,
      data: generateDeterministicExplanation(riskData),
      isConfigured: true,
      isFallback: true
    };
  }
}

export default {
  validateAIInput,
  cleanJsonText,
  generateDeterministicExplanation,
  generateRiskExplanation
};
