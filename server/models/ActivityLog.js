const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      required: true,
    },
    passCode: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      enum: ["CREATED", "APPROVED", "REJECTED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"],
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    performedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    performedByRole: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ visitorId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ performedById: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
