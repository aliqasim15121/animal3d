import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
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

    lastIp: {
      type: String,
      default: "",
    },

    lastCountry: {
      type: String,
      default: "",
    },

    lastCity: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    approvedAt: {
      type: Date,
      default: Date.now,
    },

    lastSeenAt: {
  type: Date,
  default: Date.now,
},

isBlocked: {
  type: Boolean,
  default: false,
},

blockedAt: {
  type: Date,
  default: null,
},

revokedAt: {
  type: Date,
  default: null,
},

  },
  { timestamps: true }
);

trustedDeviceSchema.index({ userId: 1, isActive: 1 });


const TrustedDevice = mongoose.model("TrustedDevice", trustedDeviceSchema);

export default TrustedDevice;