const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    passCode: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Visitor name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Visitor email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Visitor phone number is required"],
      trim: true,
    },
    company: {
      type: String,
      default: "Independent / N/A",
      trim: true,
    },
    govtIdType: {
      type: String,
      default: "Aadhaar / ID Card",
    },
    govtIdNumber: {
      type: String,
      default: "",
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee to visit is required"],
    },
    employeeName: {
      type: String,
      default: "",
    },
    visitDate: {
      type: String, // YYYY-MM-DD format for exact date matching
      required: [true, "Visit date is required"],
    },
    expectedTime: {
      type: String, // HH:mm format
      required: [true, "Expected arrival time is required"],
    },
    purpose: {
      type: String,
      required: [true, "Purpose of visit is required"],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"],
      default: "PENDING",
    },
    remarks: {
      type: String,
      default: "",
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Visitor", visitorSchema);
