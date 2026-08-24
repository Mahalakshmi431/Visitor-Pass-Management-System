const Notification = require("../models/Notification");
const { sendSuccess, sendError } = require("../utils/responseHelper");

// @desc Get notifications for current user
// @route GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const query = { recipient: req.user._id };
    if (unreadOnly === "true") query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    sendSuccess(res, { data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
};

// @desc Get unread notification count
// @route GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    sendSuccess(res, { data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

// @desc Mark notification as read
// @route PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return sendError(res, { message: "Notification not found", statusCode: 404 });
    }

    sendSuccess(res, { message: "Notification marked as read", data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc Mark all notifications as read
// @route PUT /api/notifications/mark-all-read
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    sendSuccess(res, { message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a notification
// @route DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return sendError(res, { message: "Notification not found", statusCode: 404 });
    }

    sendSuccess(res, { message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc Clear all notifications for current user
// @route DELETE /api/notifications
const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    sendSuccess(res, { message: "All notifications cleared" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
};
