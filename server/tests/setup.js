const mongoose = require("mongoose");

// Mock Mongoose models globally before any controller is loaded
jest.mock("../models/Visitor");
jest.mock("../models/User");
jest.mock("../models/ActivityLog");
jest.mock("../models/Notification");
jest.mock("../models/NotificationPreference");
jest.mock("../services/notificationService", () => ({
  notifyVisitorLifecycle: jest.fn().mockResolvedValue(undefined),
  createBulkNotification: jest.fn().mockResolvedValue(undefined),
  createNotification: jest.fn().mockResolvedValue(undefined),
  sendEmailNotification: jest.fn().mockResolvedValue(undefined),
  sendSmsNotification: jest.fn().mockResolvedValue(undefined),
  sendVisitorEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("nodemailer", () => ({
  createTestAccount: jest.fn().mockResolvedValue({ user: "test@ethereal", pass: "testpass" }),
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn().mockResolvedValue({ messageId: "test" }) }),
  getTestMessageUrl: jest.fn().mockReturnValue("http://preview.test"),
}));
jest.mock("twilio", () => jest.fn().mockReturnValue({ messages: { create: jest.fn().mockResolvedValue({ sid: "test-sid" }) } }));

const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

// Helper: create mock Express req/res/next
const createMockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { _id: "user001", name: "Test User", role: "Receptionist", email: "test@test.com" },
  ...overrides,
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = jest.fn();

// Helper: get today's date string in YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: get current time string in HH:mm
const getCurrentTimeString = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper: get future date string
const getFutureDateString = (daysAhead = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: get past date string
const getPastDateString = (daysBack = 1) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: get future time string
const getFutureTimeString = (minutesAhead = 30) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutesAhead);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper: get past time string
const getPastTimeString = (minutesBack = 30) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesBack);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper: reset all mocks
const resetMocks = () => {
  jest.clearAllMocks();
};

// Factory: default valid visitor body
const validVisitorBody = () => ({
  fullName: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  company: "Acme Corp",
  govtIdType: "Aadhaar",
  govtIdNumber: "1234-5678-9012",
  employeeId: "emp001",
  visitDate: getFutureDateString(1),
  expectedTime: "10:00",
  purpose: "Business Meeting",
});

module.exports = {
  Visitor,
  User,
  ActivityLog,
  createMockReq,
  createMockRes,
  createMockNext,
  getTodayString,
  getCurrentTimeString,
  getFutureDateString,
  getPastDateString,
  getFutureTimeString,
  getPastTimeString,
  resetMocks,
  validVisitorBody,
};
