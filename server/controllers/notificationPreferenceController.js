const NotificationPreference = require("../models/NotificationPreference");
const { sendSuccess } = require("../utils/responseHelper");

const ALL_TYPES = [
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
];

// @desc Get current user notification preferences
// @route GET /api/notifications/preferences
const getPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ user: req.user._id });
    }
    sendSuccess(res, { data: prefs });
  } catch (error) {
    next(error);
  }
};

// @desc Update current user notification preferences
// @route PUT /api/notifications/preferences
const updatePreferences = async (req, res, next) => {
  try {
    const { emailEnabled, smsEnabled, emailTypes, smsTypes } = req.body;

    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user._id });
    }

    if (typeof emailEnabled === "boolean") prefs.emailEnabled = emailEnabled;
    if (typeof smsEnabled === "boolean") prefs.smsEnabled = smsEnabled;
    if (Array.isArray(emailTypes)) {
      prefs.emailTypes = emailTypes.filter((t) => ALL_TYPES.includes(t));
    }
    if (Array.isArray(smsTypes)) {
      prefs.smsTypes = smsTypes.filter((t) => ALL_TYPES.includes(t));
    }

    await prefs.save();
    sendSuccess(res, { message: "Preferences updated successfully", data: prefs });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPreferences, updatePreferences };
