const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const User = require("../models/User");

let emailTransporter = null;

const getTransporter = () => {
  if (emailTransporter) return emailTransporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return emailTransporter;
};

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
    message: `Your visit request from ${v.visitorName} has been rejected.${v.remarks ? ` Reason: ${v.remarks}` : ""}`,
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

const createNotification = async (recipientId, type, data = {}) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return null;
    const { title, message } = template(data);

    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      visitorId: data.visitorId || null,
      passCode: data.passCode || "",
    });

    sendEmailNotification(recipientId, title, message).catch(() => {});
    sendSmsNotification(recipientId, message).catch(() => {});

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
};

const createBulkNotification = async (recipientIds, type, data = {}) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return;
    const { title, message } = template(data);

    const notifications = recipientIds.map((rid) => ({
      recipient: rid,
      type,
      title,
      message,
      visitorId: null,
      passCode: "",
    }));

    await Notification.insertMany(notifications);
  } catch (err) {
    console.error("Failed to create bulk notifications:", err.message);
  }
};

const sendEmailNotification = async (recipientId, subject, text) => {
  const transporter = getTransporter();
  if (!transporter) return;

  try {
    const user = await User.findById(recipientId).select("email name");
    if (!user || !user.email) return;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: `[VPMS] ${subject}`,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a2e;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <h3 style="margin:0">Visitor Pass Management</h3>
        </div>
        <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h4 style="color:#1a1a2e;margin-top:0">${subject}</h4>
          <p style="color:#4b5563;line-height:1.6">${text}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
          <p style="color:#9ca3af;font-size:12px">This is an automated notification from the Visitor Pass Management System.</p>
        </div>
      </div>`,
    });
  } catch (err) {
    console.error("Email notification failed:", err.message);
  }
};

const sendSmsNotification = async (recipientId, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return;
  }

  try {
    const user = await User.findById(recipientId).select("phone");
    if (!user || !user.phone) return;

    const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `[VPMS] ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone,
    });
  } catch (err) {
    console.error("SMS notification failed:", err.message);
  }
};

const notifyVisitorLifecycle = async (visitor, action, reqUser) => {
  const employeeId = visitor.employee;
  const createdBy = visitor.createdBy;

  const notifyTarget = (action === "VISITOR_REGISTERED" || action === "VISITOR_APPROVED" || action === "VISITOR_REJECTED")
    ? employeeId
    : employeeId;

  const baseData = {
    visitorId: visitor._id,
    passCode: visitor.passCode,
    visitorName: visitor.fullName,
    company: visitor.company || "Independent",
    visitDate: visitor.visitDate,
    expectedTime: visitor.expectedTime,
    remarks: visitor.remarks || "",
    time: new Date().toLocaleTimeString(),
    duration: visitor.checkInTime
      ? `${Math.round((new Date() - new Date(visitor.checkInTime)) / 60000)} min`
      : "",
  };

  const targets = new Set();
  if (String(employeeId) !== String(reqUser._id)) targets.add(String(employeeId));
  if (String(createdBy) !== String(reqUser._id) && String(createdBy) !== String(employeeId)) {
    targets.add(String(createdBy));
  }

  for (const uid of targets) {
    await createNotification(uid, action, baseData);
  }
};

module.exports = {
  createNotification,
  createBulkNotification,
  sendEmailNotification,
  sendSmsNotification,
  notifyVisitorLifecycle,
};
