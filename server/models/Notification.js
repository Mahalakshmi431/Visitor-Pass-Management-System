const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
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
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      default: null,
    },
    passCode: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
