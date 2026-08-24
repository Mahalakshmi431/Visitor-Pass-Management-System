const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const User = require("../models/User");
const NotificationPreference = require("../models/NotificationPreference");

let emailTransporter = null;
let etherealAccount = null;

// --- Transporter Setup ---
const getTransporter = async () => {
  if (emailTransporter) return emailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return emailTransporter;
  }

  try {
    etherealAccount = await nodemailer.createTestAccount();
    emailTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass },
    });
    console.log("[Email] Using Ethereal test account:", etherealAccount.user);
    return emailTransporter;
  } catch (err) {
    console.warn("[Email] Ethereal setup failed, email disabled:", err.message);
    return null;
  }
};

// --- Notification Templates ---
const NOTIFICATION_TEMPLATES = {
  VISITOR_REGISTERED: (v) => ({
    title: "New Visitor Registration",
    message: `${v.visitorName} (${v.company}) has been registered for a visit on ${v.visitDate} at ${v.expectedTime}. Pass code: ${v.passCode}`,
  }),
  VISITOR_APPROVED: (v) => ({
    title: "Visit Approved",
    message: `Your visit request from ${v.visitorName} has been approved. Pass code: ${v.passCode}. Visit date: ${v.visitDate} at ${v.expectedTime}.`,
  }),
  VISITOR_REJECTED: (v) => ({
    title: "Visit Rejected",
    message: `Your visit request from ${v.visitorName} has been rejected.${v.remarks ? " Reason: " + v.remarks : ""}`,
  }),
  VISITOR_CHECKED_IN: (v) => ({
    title: "Visitor Checked In",
    message: `${v.visitorName} has checked in at ${v.time}. Pass code: ${v.passCode}.`,
  }),
  VISITOR_CHECKED_OUT: (v) => ({
    title: "Visitor Checked Out",
    message: `${v.visitorName} has checked out at ${v.time}. Duration: ${v.duration}. Pass code: ${v.passCode}.`,
  }),
  VISITOR_CANCELLED: (v) => ({
    title: "Visit Cancelled",
    message: `Visit from ${v.visitorName} (Pass: ${v.passCode}) has been cancelled.`,
  }),
  BULK_APPROVED: (v) => ({
    title: "Bulk Approval Complete",
    message: `${v.count} visitor request(s) have been approved successfully.`,
  }),
  BULK_REJECTED: (v) => ({
    title: "Bulk Rejection Complete",
    message: `${v.count} visitor request(s) have been rejected.`,
  }),
  BULK_CHECKED_IN: (v) => ({
    title: "Bulk Check-In Complete",
    message: `${v.count} visitor(s) have been checked in successfully.`,
  }),
  BULK_CHECKED_OUT: (v) => ({
    title: "Bulk Check-Out Complete",
    message: `${v.count} visitor(s) have been checked out successfully.`,
  }),
};

// --- Email HTML Builder ---
const buildEmailHtml = (title, message) => {
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb">'
    + '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:20px 24px;border-radius:12px 12px 0 0">'
    + '<h2 style="margin:0;font-size:18px">Visitor Pass Management System</h2>'
    + '</div>'
    + '<div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">'
    + '<h3 style="color:#1a1a2e;margin:0 0 12px;font-size:16px">' + title + '</h3>'
    + '<p style="color:#4b5563;line-height:1.7;font-size:14px;margin:0">' + message + '</p>'
    + '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />'
    + '<p style="color:#9ca3af;font-size:11px;margin:0">This is an automated notification from the Visitor Pass Management System. Do not reply to this email.</p>'
    + '</div></div>';
};

// --- Preference Checks ---
const shouldSendEmail = async (recipientId, type) => {
  try {
    const prefs = await NotificationPreference.findOne({ user: recipientId });
    if (!prefs) return true;
    return prefs.emailEnabled && prefs.emailTypes.includes(type);
  } catch {
    return true;
  }
};

const shouldSendSms = async (recipientId, type) => {
  try {
    const prefs = await NotificationPreference.findOne({ user: recipientId });
    if (!prefs) return false;
    return prefs.smsEnabled && prefs.smsTypes.includes(type);
  } catch {
    return false;
  }
};

// --- Employee Email Sender ---
const sendEmailNotification = async (recipientId, subject, text, type) => {
  const transporter = await getTransporter();
  if (!transporter) return;

  if (type && !(await shouldSendEmail(recipientId, type))) return;

  try {
    const user = await User.findById(recipientId).select("email name");
    if (!user || !user.email) return;

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || (etherealAccount && etherealAccount.user) || "vpms@localhost";
    const info = await transporter.sendMail({
      from,
      to: user.email,
      subject: "[VPMS] " + subject,
      text,
      html: buildEmailHtml(subject, text),
    });

    if (etherealAccount && !process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log("[Email] Preview:", previewUrl);
    }
  } catch (err) {
    console.error("[Email] Failed:", err.message);
  }
};

// --- Visitor Email Sender ---
const sendVisitorEmail = async (visitorEmail, subject, text) => {
  const transporter = await getTransporter();
  if (!transporter) return;

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || (etherealAccount && etherealAccount.user) || "vpms@localhost";
    const info = await transporter.sendMail({
      from,
      to: visitorEmail,
      subject: "[VPMS] " + subject,
      text,
      html: buildEmailHtml(subject, text),
    });

    if (etherealAccount && !process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log("[Email->Visitor] Preview:", previewUrl);
    }
  } catch (err) {
    console.error("[Email->Visitor] Failed:", err.message);
  }
};

// --- SMS Sender ---
const sendSmsNotification = async (recipientId, message, type) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return;
  }

  if (type && !(await shouldSendSms(recipientId, type))) return;

  try {
    const user = await User.findById(recipientId).select("phone name");
    if (!user || !user.phone) return;

    const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: "[VPMS] " + message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone,
    });
    console.log("[SMS] Sent to", user.name, "(" + user.phone + ")");
  } catch (err) {
    console.error("[SMS] Failed:", err.message);
  }
};

// --- Core Notification Creator ---
const createNotification = async (recipientId, type, data) => {
  data = data || {};
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return null;
    const result = template(data);
    const title = result.title;
    const message = result.message;

    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      visitorId: data.visitorId || null,
      passCode: data.passCode || "",
    });

    sendEmailNotification(recipientId, title, message, type).catch(function() {});
    sendSmsNotification(recipientId, message, type).catch(function() {});

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
};

// --- Bulk Notification Creator ---
const createBulkNotification = async (recipientIds, type, data) => {
  data = data || {};
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return;
    const result = template(data);
    const title = result.title;
    const message = result.message;

    const notifications = recipientIds.map(function(rid) {
      return {
        recipient: rid,
        type,
        title,
        message,
        visitorId: null,
        passCode: "",
      };
    });

    await Notification.insertMany(notifications);

    recipientIds.forEach(function(rid) {
      sendEmailNotification(rid, title, message, type).catch(function() {});
      sendSmsNotification(rid, message, type).catch(function() {});
    });
  } catch (err) {
    console.error("Failed to create bulk notifications:", err.message);
  }
};

// --- Lifecycle Notifier (N+1 optimized: batch fetch users + preferences) ---
const notifyVisitorLifecycle = async function(visitor, action, reqUser) {
  var employeeId = visitor.employee;
  var createdBy = visitor.createdBy;

  var baseData = {
    visitorId: visitor._id,
    passCode: visitor.passCode,
    visitorName: visitor.fullName,
    company: visitor.company || "Independent",
    visitDate: visitor.visitDate,
    expectedTime: visitor.expectedTime,
    remarks: visitor.remarks || "",
    time: new Date().toLocaleTimeString(),
    duration: visitor.checkInTime
      ? Math.round((new Date() - new Date(visitor.checkInTime)) / 60000) + " min"
      : "",
  };

  var targetIds = [];
  if (String(employeeId) !== String(reqUser._id)) targetIds.push(String(employeeId));
  if (String(createdBy) !== String(reqUser._id) && String(createdBy) !== String(employeeId)) {
    if (targetIds.indexOf(String(createdBy)) === -1) targetIds.push(String(createdBy));
  }

  var template = NOTIFICATION_TEMPLATES[action];
  var templateResult = template ? template(baseData) : null;

  if (targetIds.length > 0 && templateResult) {
    var [users, prefs] = await Promise.all([
      User.find({ _id: { $in: targetIds } }).select("email name phone").lean(),
      NotificationPreference.find({ user: { $in: targetIds } }).lean(),
    ]);

    var userMap = {};
    users.forEach(function(u) { userMap[String(u._id)] = u; });

    var prefMap = {};
    prefs.forEach(function(p) { prefMap[String(p.user)] = p; });

    var notifications = [];
    for (var i = 0; i < targetIds.length; i++) {
      var rid = targetIds[i];
      notifications.push({
        recipient: rid,
        type: action,
        title: templateResult.title,
        message: templateResult.message,
        visitorId: visitor._id || null,
        passCode: visitor.passCode || "",
      });

      var pref = prefMap[rid];
      var user = userMap[rid];

      if (pref && pref.emailEnabled && pref.emailTypes.indexOf(action) !== -1 && user && user.email) {
        sendEmailNotification(rid, templateResult.title, templateResult.message, action).catch(function() {});
      } else if (!pref && user && user.email) {
        sendEmailNotification(rid, templateResult.title, templateResult.message, action).catch(function() {});
      }

      if (pref && pref.smsEnabled && pref.smsTypes.indexOf(action) !== -1 && user && user.phone) {
        sendSmsNotification(rid, templateResult.message, action).catch(function() {});
      } else if (!pref && user && user.phone) {
        sendSmsNotification(rid, templateResult.message, action).catch(function() {});
      }
    }

    await Notification.insertMany(notifications);
  }

  if (visitor.email && ["VISITOR_REGISTERED", "VISITOR_APPROVED", "VISITOR_REJECTED"].indexOf(action) !== -1) {
    if (templateResult) {
      sendVisitorEmail(visitor.email, templateResult.title, templateResult.message).catch(function() {});
    }
  }
};

module.exports = {
  createNotification,
  createBulkNotification,
  sendEmailNotification,
  sendSmsNotification,
  sendVisitorEmail,
  notifyVisitorLifecycle,
};
