import mongoose from "mongoose";

/**
 * RiskData Schema
 * Contains environmental drivers and calculated risk scores for a location.
 */
const riskDataSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location reference (locationId) is required"],
      index: true
    },
    // Environmental / Geographic Drivers
    rainfall: {
      type: Number,
      default: 0,
      min: [0, "Rainfall cannot be negative"],
      max: [100, "Rainfall must be between 0 and 100"]
    },
    riverLevel: {
      type: Number,
      default: 0,
      min: [0, "River level cannot be negative"],
      max: [100, "River level must be between 0 and 100"]
    },
    slope: {
      type: Number,
      default: 0,
      min: [0, "Slope cannot be negative"],
      max: [100, "Slope must be between 0 and 100"]
    },
    elevation: {
      type: Number,
      default: 0,
      min: [0, "Elevation score cannot be negative"],
      max: [100, "Elevation score must be between 0 and 100"]
    },
    historicalRisk: {
      type: Number,
      default: 0,
      min: [0, "Historical risk score must be between 0 and 100"],
      max: [100, "Historical risk score must be between 0 and 100"]
    },
    seismicActivity: {
      type: Number,
      default: 0,
      min: [0, "Seismic activity score must be between 0 and 100"],
      max: [100, "Seismic activity score must be between 0 and 100"]
    },

    // Hazard Sub-Scores (0 - 100)
    floodRisk: {
      type: Number,
      required: true,
      min: [0, "Flood risk must be between 0 and 100"],
      max: [100, "Flood risk must be between 0 and 100"]
    },
    landslideRisk: {
      type: Number,
      required: true,
      min: [0, "Landslide risk must be between 0 and 100"],
      max: [100, "Landslide risk must be between 0 and 100"]
    },
    seismicRisk: {
      type: Number,
      required: true,
      min: [0, "Seismic risk must be between 0 and 100"],
      max: [100, "Seismic risk must be between 0 and 100"]
    },

    // Aggregated Overall Threat Index (0 - 100)
    overallRisk: {
      type: Number,
      required: true,
      min: [0, "Overall risk must be between 0 and 100"],
      max: [100, "Overall risk must be between 0 and 100"]
    },

    updatedAt: {
      type: Date,
      default: Date.now
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

// Create compound index for querying latest risk per location
riskDataSchema.index({ locationId: 1, updatedAt: -1 });

export const RiskData = mongoose.model("RiskData", riskDataSchema);
export default RiskData;
