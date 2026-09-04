import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      enum: [
        "login_success",
        "new_device_attempt",
        "invalid_credentials",
        "device_blocked_attempt",
        "approval_approved",
        "approval_rejected",
        "trusted_device_activated",
        "trusted_device_reset",
        "device_blocked",
        "device_unblocked",
        "logout",
      ],
      default: "login_success",
      index: true,
    },

    loginMethod: {
      type: String,
      enum: ["password", "google", "admin", "system"],
      default: "system",
    },

    result: {
      type: String,
      enum: [
        "success",
        "approval_required",
        "approved",
        "rejected",
        "invalid_credentials",
        "blocked",
        "unblocked",
        "reset",
        "logout",
      ],
      required: true,
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

    approvalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceApprovalRequest",
      default: null,
    },

    trustedDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrustedDevice",
      default: null,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshSession",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

loginEventSchema.index({ userId: 1, createdAt: -1 });

const LoginEvent = mongoose.model("LoginEvent", loginEventSchema);

export default LoginEvent;