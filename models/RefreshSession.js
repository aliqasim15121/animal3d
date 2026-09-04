import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrustedDevice",
      default: null,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    revokedReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

refreshSessionSchema.index({ userId: 1, isActive: 1 });

const RefreshSession = mongoose.model(
  "RefreshSession",
  refreshSessionSchema
);

export default RefreshSession;