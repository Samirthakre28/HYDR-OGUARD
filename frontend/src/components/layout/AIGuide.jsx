import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Droplets,
  PhoneCall,
  Radio,
  ArrowRight,
  LifeBuoy,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Globe,
  AlertTriangle
} from "lucide-react";
import { useLocation } from "../../context/LocationContext";
import { useNavigation } from "../../context/NavigationContext";
import { getRiskExplanation } from "../../services/api";

// Configurable inactivity threshold in milliseconds (default: 15 seconds)
export const DEFAULT_INACTIVITY_THRESHOLD_MS = 15000;

export default function AIGuide({ inactivityThresholdMs = DEFAULT_INACTIVITY_THRESHOLD_MS }) {
  const { selectedLocation, riskData } = useLocation();
  const { navigate } = useNavigation();

  // Chatbot State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Inactivity AI Guide Spotlight Mode State (Subtle 15s Focus)
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Voice Input (Speech Recognition) & Voice Output (Speech Synthesis) State
  const [isListening, setIsListening] = useState(false);
  const [autoVoiceOutput, setAutoVoiceOutput] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-US"); // 'en-US' or 'hi-IN'
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceError, setVoiceError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize welcome message when opened
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: `Hello! I am your HydroGuard AI Guide. Ask me anything about disaster risks, telemetry analysis, safety procedures, or shelter locations for ${selectedLocation?.name || "your area"}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  }, [selectedLocation, messages.length]);

  // Auto-scroll chat to latest message & focus input when open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  // =========================================================================
  // 1. INACTIVITY DETECTION & TIMER MANAGEMENT
  // =========================================================================
  const resetInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Do NOT trigger spotlight if chatbot is already open or spotlight is active
    if (isOpen || showSpotlight) return;

    timerRef.current = setTimeout(() => {
      // Activate subtle AI Guide Spotlight after 15s of inactivity
      setShowSpotlight(true);
    }, inactivityThresholdMs);
  }, [isOpen, showSpotlight, inactivityThresholdMs]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

    const handleUserActivity = () => {
      if (showSpotlight) {
        // Dismiss spotlight on user interaction & return to normal UI
        setShowSpotlight(false);
      }
      resetInactivityTimer();
    };

    // Attach global activity listeners
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    
    // Start initial timer
    resetInactivityTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetInactivityTimer, showSpotlight]);

  // Handle Escape key to close spotlight or chatbot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showSpotlight) {
          setShowSpotlight(false);
          resetInactivityTimer();
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSpotlight, isOpen, resetInactivityTimer]);

  // =========================================================================
  // 2. SPOTLIGHT MODE ACTION HANDLERS
  // =========================================================================
  const handleSpotlightButtonClick = () => {
    setShowSpotlight(false);
    setIsOpen(true);
  };

  const handleDismissSpotlight = (e) => {
    if (e) e.stopPropagation();
    setShowSpotlight(false);
    resetInactivityTimer();
  };

  // =========================================================================
  // 3. VOICE INPUT (SPEECH RECOGNITION) HANDLERS
  // =========================================================================
  const toggleListening = () => {
    setVoiceError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input isn't supported in this browser. You can continue using text chat.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setInputQuery(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceError("Microphone permission is required for voice input. You can continue using text chat.");
        } else if (event.error !== "no-speech") {
          setVoiceError("I couldn't understand that. Please try again or type your question.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
      setVoiceError("Microphone permission is required for voice input. You can continue using text chat.");
    }
  };

  // =========================================================================
  // 4. VOICE OUTPUT (TEXT-TO-SPEECH) HANDLERS
  // =========================================================================
  const speakText = (text, messageId) => {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Voice playback is not supported in this browser.");
      return;
    }

    // If currently speaking this exact message, stop it
    if (speakingMessageId === messageId && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Cancel any active playback
    window.speechSynthesis.cancel();

    // Clean html/formatting tags for speech synthesis
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = speechLanguage;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Clean up speech synthesis on unmount or panel close
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // =========================================================================
  // 5. CHATBOT QUERY EXECUTION
  // =========================================================================
  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      setIsListening(false);
    }

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setIsLoading(true);

    try {
      const payload = {
        hazard: textToSend.toLowerCase().includes("landslide") ? "landslide" : textToSend.toLowerCase().includes("seismic") ? "seismic" : "flood",
        riskScore: riskData?.overall?.score || riskData?.overallRisk?.score || 82,
        riskLevel: riskData?.overall?.level || riskData?.overallRisk?.level || "HIGH",
        confidence: riskData?.confidence?.rating || "HIGH",
        factors: (riskData?.allFactorBreakdown || riskData?.factors || []).map(f => f.name || f.factor),
        dataQuality: "Good",
        userQuery: textToSend
      };

      const response = await getRiskExplanation(payload);

      let botText = "";
      if (response?.data?.riskExplanation || response?.data?.summary) {
        botText = response.data.summary || response.data.riskExplanation;
      } else {
        botText = generateSmartAnswer(textToSend, selectedLocation, riskData);
      }

      const botMsgId = (Date.now() + 1).toString();
      const botMsg = {
        id: botMsgId,
        sender: "bot",
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);

      // If Auto Voice Output is enabled, automatically speak response
      if (autoVoiceOutput) {
        speakText(botText, botMsgId);
      }
    } catch (err) {
      console.warn("AI Guide response fallback:", err.message);
      const fallbackMsgId = (Date.now() + 1).toString();
      const botText = generateSmartAnswer(textToSend, selectedLocation, riskData);
      const fallbackMsg = {
        id: fallbackMsgId,
        sender: "bot",
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, fallbackMsg]);

      if (autoVoiceOutput) {
        speakText(botText, fallbackMsgId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateSmartAnswer = (query, location, risk) => {
    const q = query.toLowerCase().trim();
    const locName = location?.name || "Kathmandu, Nepal";
    const overallScore = risk?.overall?.score || risk?.overallRisk?.score || 65;
    const overallLevel = risk?.overall?.level || risk?.overallRisk?.level || "HIGH";

    // 1. "What does my risk score mean?"
    if (q.includes("what does my risk score mean") || q.includes("score mean") || q.includes("risk score mean") || q.includes("meaning of score")) {
      return `Your risk score (${overallScore}/100, ${overallLevel}) is a composite multi-hazard index for ${locName}. Thresholds are: 0–25 Low (Safe baseline), 26–50 Moderate (Advisory vigilance), 51–75 High (Heightened precautions), and 76–100 Critical (Immediate danger). It mathematically balances flood, landslide, and seismic factors.`;
    }

    // 2. "Why is my risk high?"
    if (q.includes("why is my risk high") || q.includes("risk high") || q.includes("why high") || q.includes("why risk")) {
      const floodScore = risk?.flood?.score || 70;
      const landslideScore = risk?.landslide?.score || 67;
      return `Risk for ${locName} is elevated primarily due to localized flood vulnerability (${floodScore}/100) and slope saturation (${landslideScore}/100). Recent precipitation and river gauge stages are actively driving the composite assessment.`;
    }

    // 3. "How does HydroGuard work?"
    if (q.includes("how does hydroguard work") || q.includes("how hydroguard works") || q.includes("how it works") || q.includes("how does it work")) {
      return `HydroGuard continuously monitors environmental telemetry (rainfall from Open-Meteo, river discharge from GloFAS, and seismic data from USGS). These signals are fed into a 100% deterministic mathematical Risk Engine to generate early warnings without AI hallucinations.`;
    }

    // 4. "Where are emergency contacts?"
    if (q.includes("where are emergency contacts") || q.includes("emergency contact") || q.includes("helpline") || q.includes("phone number") || q.includes("contacts")) {
      return `Verified quick emergency contacts are accessible on the Emergency page and the Quick Contacts card on your Dashboard. In Nepal, dial 100 for Police, 101 for Fire, 102 for Ambulance, and 1149 for NDRRMA. In India, dial 112 or 108. One-tap calling is supported.`;
    }

    // 5. "How do I use Risk Map?"
    if (q.includes("how do i use risk map") || q.includes("use risk map") || q.includes("risk map")) {
      return `On the Risk Map page, you can interact with multi-tier hazard perimeter zones around ${locName}, switch between Flood, Landslide, and Seismic overlays, and locate emergency facilities (Hospitals, Police, Fire, Shelters) with direct navigation and call buttons.`;
    }

    // 6. "How do I save offline information?"
    if (q.includes("how do i save offline information") || q.includes("save offline") || q.includes("offline information") || q.includes("offline pack") || q.includes("offline mode")) {
      return `You can download an Emergency Offline Pack from the Dashboard or Offline Safe Map page. It caches your latest risk assessment, emergency contacts, shelter coordinates, and civil defense safety advice so you can navigate without internet access.`;
    }

    // 7. "What should I do during high risk?"
    if (q.includes("what should i do during high risk") || q.includes("during high risk") || q.includes("what should i do") || q.includes("safety action") || q.includes("prepare")) {
      return `During HIGH or CRITICAL risk in ${locName}: 1. Avoid low-lying river embankments, bridges, and steep hillside paths. 2. Pack an emergency go-bag with essentials, medicines, and power banks. 3. Monitor municipal broadcast sirens. 4. Pre-locate your nearest evacuation shelter on the map.`;
    }

    if (q.includes("danger") || q.includes("emergency") || q.includes("sos") || q.includes("help me") || q.includes("save me")) {
      return `EMERGENCY ALERT: If you are in immediate danger, seek higher ground immediately! Please access the Emergency Help section to contact national emergency helplines (112/100/102/1149) and locate nearest shelters.`;
    }
    if (q.includes("flood") || q.includes("water") || q.includes("rain")) {
      return `Flood risk for ${locName} is currently assessed at ${risk?.flood?.score || 70}/100. Primary factors include rainfall intensity and river stage height. Stay clear of low-lying drainage channels.`;
    }
    if (q.includes("shelter") || q.includes("safe") || q.includes("evacuat")) {
      return `Pre-downloaded safe shelters and emergency relief units for ${locName} are accessible on the Offline Safe Map page. You can pre-save shelter GPS coordinates for offline use.`;
    }

    return `Currently, ${locName} shows an overall disaster risk score of ${overallScore}/100 (${overallLevel}). Risk scores are calculated deterministically by the HydroGuard Risk Engine using real-time weather and SRTM terrain telemetry.`;
  };

  const quickQuestions = [
    "What does my risk score mean?",
    "Why is my risk high?",
    "How does HydroGuard work?",
    "Where are emergency contacts?",
    "How do I use Risk Map?",
    "How do I save offline information?",
    "What should I do during high risk?"
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 4. SUBTLE SPOTLIGHT BACKDROP & "NEED HELP?" TOOLTIP BUBBLE (15s Inactivity Trigger) */}
      {/* ========================================================================= */}
      {showSpotlight && (
        <>
          {/* Soft Page Dimming Backdrop (Clicking dismisses spotlight & restores UI) */}
          <div
            onClick={handleDismissSpotlight}
            className="fixed inset-0 z-[990] bg-slate-950/40 pointer-events-auto transition-opacity duration-300 animate-in fade-in"
            aria-hidden="true"
          />

          {/* Small "Need help?" Speech Bubble positioned directly above AI Guide button */}
          <div
            className="fixed right-4 bottom-[96px] sm:right-6 sm:bottom-[100px] z-[1001] pointer-events-auto animate-bounce-subtle"
            role="tooltip"
          >
            <div className="relative bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-emerald-500/60 flex items-center space-x-2">
              <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Need help?</span>
              <button
                onClick={handleDismissSpotlight}
                className="ml-1 p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors focus:outline-hidden"
                aria-label="Dismiss help prompt"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Speech bubble pointer arrow */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900 border-r border-b border-emerald-500/60 rotate-45"></div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. AI GUIDE CHAT PANEL (Pops up from Bottom Right) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed bottom-[96px] right-4 sm:right-6 sm:bottom-[100px] z-[1000] w-80 sm:w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 antialiased">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-3.5 flex items-center justify-between shrink-0 border-b border-slate-700/80">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>HydroGuard AI Guide</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-slate-300 font-mono">
                  {selectedLocation ? `${selectedLocation.name} Station` : "Global AI Assistant"}
                </p>
              </div>
            </div>

            {/* Header Voice Settings & Close Button */}
            <div className="flex items-center space-x-1.5">
              {/* Auto Voice Response Toggle Button */}
              <button
                type="button"
                onClick={() => setAutoVoiceOutput(!autoVoiceOutput)}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                  autoVoiceOutput
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                }`}
                title={autoVoiceOutput ? "Auto Voice Output Enabled" : "Auto Voice Output Disabled"}
                aria-label="Toggle Auto Voice Responses"
              >
                {autoVoiceOutput ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">Voice</span>
              </button>

              {/* Language Selector Toggle (EN / HI) */}
              <button
                type="button"
                onClick={() => setSpeechLanguage(prev => prev === "en-US" ? "hi-IN" : "en-US")}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white transition-colors text-[10px] font-mono font-bold flex items-center gap-1 min-h-[36px]"
                title="Toggle Voice Language (English / Hindi)"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{speechLanguage === "hi-IN" ? "HI" : "EN"}</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors focus:outline-hidden min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close AI Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Error Alert Banner */}
          {voiceError && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-[11px] text-amber-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1.5 pr-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{voiceError}</span>
              </div>
              <button
                onClick={() => setVoiceError(null)}
                className="p-1 text-amber-600 hover:text-amber-900 rounded-md shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Panel Messages Area */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50/60 no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white font-medium rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>

                <div className="flex items-center space-x-2 mt-1 px-1">
                  <span className="text-[9px] font-mono text-slate-400">
                    {msg.timestamp}
                  </span>

                  {/* Speaker Button for Bot Responses (Min 44x44px touch container) */}
                  {msg.sender === "bot" && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.text, msg.id)}
                      className={`min-h-[44px] px-2 flex items-center space-x-1 text-[10px] font-bold rounded-lg transition-colors focus:outline-hidden ${
                        speakingMessageId === msg.id
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                          : "text-slate-500 hover:text-emerald-700 hover:bg-slate-100"
                      }`}
                      aria-label={speakingMessageId === msg.id ? "Stop voice playback" : "Listen to AI response"}
                    >
                      {speakingMessageId === msg.id ? (
                        <>
                          <Square className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 w-fit">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>Analyzing risk telemetry...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Listening State Animation Bar */}
          {isListening && (
            <div className="bg-red-50 border-t border-red-200 px-3 py-2 flex items-center justify-between shrink-0 animate-pulse">
              <div className="flex items-center space-x-2 text-xs font-bold text-red-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span>Listening... Speak now</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            </div>
          )}

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/80 shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
              Quick Inquiries
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(q)}
                  className="text-[10px] font-semibold text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-2 py-1 rounded-lg transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isListening ? "Listening... Speak your question" : "Type or speak..."}
              className="flex-1 min-h-[44px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900 transition-colors"
            />

            {/* Microphone Button (Min 48x48px Touch Target) */}
            <button
              type="button"
              onClick={toggleListening}
              className={`min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition-all focus:outline-hidden ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title={isListening ? "Stop listening" : "Speak to AI Guide"}
              aria-label={isListening ? "Stop voice recording" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-white animate-bounce" />
              ) : (
                <Mic className="w-5 h-5 text-emerald-600" />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="min-h-[48px] min-w-[48px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 focus:outline-hidden"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. FLOATING AI GUIDE BUTTON (ALWAYS FIXED IN BOTTOM-RIGHT CORNER - 1.5x SCALE) */}
      {/* ========================================================================= */}
      <button
        onClick={() => {
          if (showSpotlight) {
            handleSpotlightButtonClick();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={`fixed right-4 bottom-4 sm:right-6 sm:bottom-6 min-h-[72px] min-w-[72px] px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 hover:from-emerald-900 hover:to-slate-900 text-white rounded-full shadow-2xl border-2 flex items-center space-x-3 transition-all transform focus:outline-hidden group ${
          showSpotlight
            ? "z-[1001] border-emerald-400 ring-4 ring-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.85)] scale-105 animate-pulse"
            : "z-[1000] border-emerald-500/50 hover:scale-105 active:scale-95"
        }`}
        aria-label="Toggle HydroGuard AI Guide Assistant"
        aria-expanded={isOpen}
      >
        <div className="relative w-9 h-9 flex items-center justify-center">
          <Bot className="w-7 h-7 text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400"></span>
        </div>
        <span className="text-sm font-extrabold tracking-tight hidden xs:inline sm:inline pr-1">
          AI Guide
        </span>
      </button>
    </>
  );
}
