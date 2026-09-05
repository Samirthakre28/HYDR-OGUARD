import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Send, AlertCircle, HelpCircle, ShieldCheck } from "lucide-react";
import { submitAlertFeedback } from "../../services/api";

const REASON_OPTIONS = [
  { id: "RISK_DID_NOT_OCCUR", label: "Risk did not occur" },
  { id: "WRONG_RISK_LEVEL", label: "Risk level was incorrect" },
  { id: "WRONG_LOCATION", label: "Wrong location" },
  { id: "ALERT_TOO_LATE", label: "Alert arrived too late" },
  { id: "OTHER", label: "Other" }
];

export default function AlertFeedbackForm({
  alertId = "general-alert",
  locationId = "global",
  alertRiskLevel = "HIGH",
  alertRiskScore = 82,
  alertType = "FLOOD",
  isDemo = false,
  className = ""
}) {
  const sessionKey = `hydroguard_feedback_${alertId}`;

  const [selectedResponse, setSelectedResponse] = useState(null); // 'ACCURATE' | 'INCORRECT'
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Check if feedback already submitted in this session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        setSubmittedData(JSON.parse(saved));
      }
    } catch (_) {}
  }, [sessionKey]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResponse) return;

    if (selectedResponse === "INCORRECT" && !selectedReason) {
      setErrorMsg("Please select a reason for the incorrect report.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      userResponse: selectedResponse,
      reason: selectedResponse === "INCORRECT" ? selectedReason : null,
      comment: comment.trim(),
      alertRiskLevel,
      alertRiskScore,
      alertType,
      locationId,
      mode: isDemo ? "DEMO" : "LIVE"
    };

    try {
      const res = await submitAlertFeedback(alertId, payload);
      const dataToSave = res?.data || payload;
      setSubmittedData(dataToSave);
      sessionStorage.setItem(sessionKey, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn("Alert feedback fallback save:", err.message);
      // Fallback save to session storage so user is not blocked
      setSubmittedData(payload);
      sessionStorage.setItem(sessionKey, JSON.stringify(payload));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SUBMITTED STATE VIEW
  // ---------------------------------------------------------------------------
  if (submittedData) {
    const isAccurate = submittedData.userResponse === "ACCURATE";
    const matchedReason = REASON_OPTIONS.find((r) => r.id === submittedData.reason);

    return (
      <div className={`bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 ${className}`}>
        <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Feedback Submitted
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {isDemo && (
              <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md border border-amber-300">
                Demo Feedback
              </span>
            )}
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
              Recorded
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Your Response:</span>
            <span
              className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                isAccurate
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {isAccurate ? "✅ Accurate" : "❌ Incorrect"}
            </span>
          </div>

          {!isAccurate && matchedReason && (
            <div className="text-slate-600">
              <span className="font-semibold text-slate-500">Reported Reason:</span>{" "}
              <span className="font-medium text-slate-800">{matchedReason.label}</span>
            </div>
          )}

          {submittedData.comment && (
            <div className="text-slate-600 italic bg-white/80 p-2.5 rounded-xl border border-emerald-100 text-[11px]">
              "{submittedData.comment}"
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-emerald-200/40 text-[10px] text-slate-500 italic">
          User-reported alert feedback — not scientific validation.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE FORM VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3 mb-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Was this alert accurate?</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Help us improve HydroGuard by reporting whether an alert was accurate.
          </p>
        </div>

        {isDemo && (
          <span className="self-start sm:self-auto px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md border border-amber-200">
            Demo Mode
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Response Selector Buttons */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <button
          type="button"
          onClick={() => {
            setSelectedResponse("ACCURATE");
            setSelectedReason("");
            setErrorMsg(null);
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all focus:outline-hidden ${
            selectedResponse === "ACCURATE"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200 hover:border-emerald-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Accurate</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedResponse("INCORRECT");
            setErrorMsg(null);
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all focus:outline-hidden ${
            selectedResponse === "INCORRECT"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200 hover:border-amber-300"
          }`}
        >
          <XCircle className="w-4 h-4 shrink-0" />
          <span>Incorrect</span>
        </button>
      </div>

      {/* Incorrect Reasons Selector */}
      {selectedResponse === "INCORRECT" && (
        <div className="space-y-2 mb-3 bg-amber-50/50 border border-amber-200/60 p-3 rounded-xl animate-in fade-in duration-150">
          <label className="text-[11px] font-bold text-slate-700 block">
            Select Reason for Incorrect Report:
          </label>

          <div className="space-y-1.5">
            {REASON_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                onClick={() => setSelectedReason(opt.id)}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs flex items-center space-x-2.5 cursor-pointer transition-all ${
                  selectedReason === opt.id
                    ? "bg-white text-slate-900 border-amber-500 font-bold shadow-xs"
                    : "bg-white/80 hover:bg-white text-slate-700 border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="incorrectReason"
                  value={opt.id}
                  checked={selectedReason === opt.id}
                  onChange={() => setSelectedReason(opt.id)}
                  className="accent-amber-600 w-4 h-4 shrink-0"
                />
                <span className="flex-1">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Optional Short Comment Input */}
      {selectedResponse && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Optional Feedback Comment (Max 500 chars):
            </label>
            <textarea
              rows="2"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide brief details about local ground conditions..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedResponse === "INCORRECT" && !selectedReason)}
            className="w-full min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-40 focus:outline-hidden shadow-xs"
          >
            {isSubmitting ? (
              <span>Submitting Feedback...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-400 italic">
        User-reported alert feedback — not scientific validation.
      </div>
    </div>
  );
}
