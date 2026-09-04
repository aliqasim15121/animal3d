import mongoose from "mongoose";

const deviceApprovalRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    requestTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
      index: true,
    },

    deviceName: {
      type: String,
      default: "Unknown Device",
    },

    browser: {
      type: String,
      default: "Unknown Browser",
    },

    platform: {
      type: String,
      default: "Unknown Platform",
    },

    userAgent: {
      type: String,
      default: "",
    },

    screenResolution: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "",
    },

    fingerprint: {
      type: String,
      default: "",
    },

    ip: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    loginMethod: {
      type: String,
      enum: ["password", "google"],
      default: "password",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

deviceApprovalRequestSchema.index(
  { userId: 1, status: 1 },
  { background: true }
);

const DeviceApprovalRequest = mongoose.model(
  "DeviceApprovalRequest",
  deviceApprovalRequestSchema
);

export default DeviceApprovalRequest;