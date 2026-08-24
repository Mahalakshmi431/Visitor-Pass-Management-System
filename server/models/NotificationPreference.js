const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    smsEnabled: {
      type: Boolean,
      default: false,
    },
    emailTypes: {
      type: [String],
      default: [
        "VISITOR_REGISTERED",
        "VISITOR_APPROVED",
        "VISITOR_REJECTED",
        "VISITOR_CHECKED_IN",
        "VISITOR_CHECKED_OUT",
        "VISITOR_CANCELLED",
        "BULK_APPROVED",
        "BULK_REJECTED",
        "BULK_CHECKED_IN",
        "BULK_CHECKED_OUT",
      ],
    },
    smsTypes: {
      type: [String],
      default: [
        "VISITOR_CHECKED_IN",
        "VISITOR_CHECKED_OUT",
      ],
    },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ user: 1 });

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);
