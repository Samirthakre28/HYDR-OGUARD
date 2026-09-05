import mongoose from "mongoose";

const alertFeedbackSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: [true, "alertId is required"],
      index: true
    },
    locationId: {
      type: String,
      required: [true, "locationId is required"],
      index: true
    },
    userResponse: {
      type: String,
      enum: ["ACCURATE", "INCORRECT"],
      required: [true, "userResponse must be ACCURATE or INCORRECT"]
    },
    reason: {
      type: String,
      enum: [
        "RISK_DID_NOT_OCCUR",
        "WRONG_RISK_LEVEL",
        "WRONG_LOCATION",
        "ALERT_TOO_LATE",
        "OTHER",
        null
      ],
      default: null
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      default: ""
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    alertRiskLevel: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      default: "MODERATE"
    },
    alertRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    alertType: {
      type: String,
      default: "FLOOD"
    },
    mode: {
      type: String,
      enum: ["LIVE", "DEMO"],
      default: "LIVE",
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index for querying feedback by alert or location
alertFeedbackSchema.index({ alertId: 1, submittedAt: -1 });
alertFeedbackSchema.index({ mode: 1, userResponse: 1 });

export const AlertFeedback = mongoose.model("AlertFeedback", alertFeedbackSchema);
export default AlertFeedback;
