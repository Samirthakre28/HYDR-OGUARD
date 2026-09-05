import mongoose from "mongoose";

const emergencyCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Emergency center name is required"],
      trim: true
    },
    type: {
      type: String,
      enum: ["Hospital", "Shelter", "Police", "Fire Station"],
      required: [true, "Emergency center type is required"]
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location reference (locationId) is required"],
      index: true
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    phone: {
      type: String,
      default: "Demo Contact - Simulation"
    },
    availability: {
      type: String,
      default: "Operational / Available"
    },
    isDemo: {
      type: Boolean,
      default: true
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

emergencyCenterSchema.index({ locationId: 1, type: 1 });

export const EmergencyCenter = mongoose.model("EmergencyCenter", emergencyCenterSchema);
export default EmergencyCenter;
