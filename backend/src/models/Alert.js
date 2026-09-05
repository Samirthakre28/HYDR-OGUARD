import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location reference (locationId) is required"],
      index: true
    },
    severity: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      required: [true, "Alert severity is required"]
    },
    title: {
      type: String,
      required: [true, "Alert title is required"],
      trim: true
    },
    message: {
      type: String,
      required: [true, "Alert message is required"],
      trim: true
    },
    hazardTypes: {
      type: [String],
      default: []
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now,
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

// Compound index for querying recent alerts by location
alertSchema.index({ locationId: 1, createdAt: -1 });

export const Alert = mongoose.model("Alert", alertSchema);
export default Alert;
