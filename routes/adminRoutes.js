import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import DeviceApprovalRequest from "../models/DeviceApprovalRequest.js";
import TrustedDevice from "../models/TrustedDevice.js";
import RefreshSession from "../models/RefreshSession.js";
import LoginEvent from "../models/LoginEvent.js";

const router = Router();

router.use(protect);
router.use(adminOnly);

// Get pending payments
router.get("/payments", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const payments = await Payment.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(payments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});
// Get pending device approval requests
router.get("/device-approvals", async (req, res) => {
  try {
    const requests = await DeviceApprovalRequest.find({
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("Error fetching device approvals:", err);

    res.status(500).json({
      message: "Failed to fetch device approval requests",
    });
  }
});

// Get students with pending device approvals + complete attempt count
router.get("/device-approval-students", async (req, res) => {
  try {
    const now = new Date();

    const allRequests = await DeviceApprovalRequest.find({})
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    const grouped = new Map();

    for (const request of allRequests) {
      if (!request.userId?._id) {
        continue;
      }

      const userId = String(request.userId._id);

      if (!grouped.has(userId)) {
        grouped.set(userId, {
          user: request.userId,
          attempts: [],
          pendingRequests: [],
        });
      }

      const group = grouped.get(userId);

      group.attempts.push(request);

      if (
        request.status === "pending" &&
        request.expiresAt &&
        new Date(request.expiresAt) > now
      ) {
        group.pendingRequests.push(request);
      }
    }

    const students = [];

    for (const group of grouped.values()) {
      if (group.pendingRequests.length === 0) {
        continue;
      }

      const latestRequest = group.pendingRequests[0];

      students.push({
        user: group.user,
        latestRequest,
        totalAttempts: group.attempts.length,
        pendingAttempts: group.pendingRequests.length,
      });
    }

    students.sort((a, b) => {
      return (
        new Date(b.latestRequest.createdAt) -
        new Date(a.latestRequest.createdAt)
      );
    });

    return res.json(students);
  } catch (error) {
    console.error(
      "Error fetching device approval students:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch device approval students",
    });
  }
});

// Approve a new device
router.post("/device-approvals/:id/approve", async (req, res) => {
  try {
    const request = await DeviceApprovalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Device approval request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "This request has already been processed",
      });
    }

    if (request.expiresAt <= new Date()) {
      request.status = "expired";
      await request.save();

      return res.status(400).json({
        message: "This device approval request has expired",
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await TrustedDevice.updateMany(
      {
        userId: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
        },
      }
    );

    await RefreshSession.updateMany(
      {
        userId: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          endedAt: new Date(),
          revokedReason: "New device approved",
        },
      }
    );

    user.authVersion = (user.authVersion || 1) + 1;
    user.requiresDeviceApproval = false;

    await user.save();

    request.status = "approved";
    request.approvedAt = new Date();

    await request.save();

    res.json({
      message: "Device approved successfully",
      requestId: request._id,
    });
  } catch (err) {
    console.error("Error approving device:", err);

    res.status(500).json({
      message: "Failed to approve device",
    });
  }
});

// Reject a device
router.post("/device-approvals/:id/reject", async (req, res) => {
  try {
    const request = await DeviceApprovalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Device approval request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "This request has already been processed",
      });
    }

    request.status = "rejected";
    request.rejectedAt = new Date();

    await request.save();
    await LoginEvent.create({
  userId: request.userId,
  eventType: "approval_rejected",
  loginMethod: "admin",
  result: "rejected",

  deviceName: request.deviceName,
  browser: request.browser,
  platform: request.platform,
  fingerprint: request.fingerprint,

  ip: request.ip,
  country: request.country,
  city: request.city,

  approvalRequestId: request._id,
});

    res.json({
      message: "Device request rejected successfully",
    });
  } catch (err) {
    console.error("Error rejecting device:", err);

    res.status(500).json({
      message: "Failed to reject device",
    });
  }
});

// Reset student's trusted device
router.post("/users/:userId/reset-trusted-device", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts do not use device binding",
      });
    }

    await TrustedDevice.updateMany(
      {
        userId: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
        },
      }
    );

    await RefreshSession.updateMany(
      {
        userId: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          endedAt: new Date(),
          revokedReason: "Trusted device reset by admin",
        },
      }
    );

    await DeviceApprovalRequest.updateMany(
      {
        userId: user._id,
        status: "pending",
      },
      {
        $set: {
          status: "expired",
        },
      }
    );

    user.authVersion = (user.authVersion || 1) + 1;
    user.requiresDeviceApproval = true;
    user.deviceBindingInitialized = true;

    await user.save();

    res.json({
      message: "Trusted device reset successfully",
    });
  } catch (err) {
    console.error("Error resetting trusted device:", err);

    res.status(500).json({
      message: "Failed to reset trusted device",
    });
  }
});
// Security students summary
router.get("/security-students", async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: "admin" },
    })
      .select("name email phone role")
      .sort({ name: 1 })
      .lean();

    const userIds = users.map((user) => user._id);

    const [devices, events, pendingRequests] = await Promise.all([
      TrustedDevice.find({
        userId: { $in: userIds },
      })
        .sort({ lastSeenAt: -1, createdAt: -1 })
        .lean(),

      LoginEvent.find({
        userId: { $in: userIds },
      })
        .sort({ createdAt: -1 })
        .lean(),

      DeviceApprovalRequest.find({
        userId: { $in: userIds },
        status: "pending",
        expiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const students = users.map((user) => {
      const userId = String(user._id);

      const userDevices = devices.filter(
        (device) => String(device.userId) === userId
      );

      const userEvents = events.filter(
        (event) => String(event.userId) === userId
      );

      const userPendingRequests = pendingRequests.filter(
        (request) => String(request.userId) === userId
      );

      const trustedDevice =
        userDevices.find(
          (device) => device.isActive && !device.isBlocked
        ) || null;

      const newDeviceAttempts = userEvents.filter(
        (event) => event.eventType === "new_device_attempt"
      ).length;

      return {
        ...user,

        trustedDevice,

        totalDevices: userDevices.length,

        blockedDevices: userDevices.filter(
          (device) => device.isBlocked
        ).length,

        pendingApprovals: userPendingRequests.length,

        newDeviceAttempts,

        latestEvent: userEvents[0] || null,
      };
    });

    return res.json(students);
  } catch (error) {
    console.error("Error fetching security students:", error);

    return res.status(500).json({
      message: "Failed to fetch security students",
    });
  }
});
router.get("/security-students/:userId/history", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("name email phone role")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts are not included in device security",
      });
    }

    const [events, devices, approvalRequests] = await Promise.all([
      LoginEvent.find({
        userId: user._id,
      })
        .sort({ createdAt: -1 })
        .lean(),

      TrustedDevice.find({
        userId: user._id,
      })
        .sort({ createdAt: -1 })
        .lean(),

      DeviceApprovalRequest.find({
        userId: user._id,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.json({
      user,
      events,
      devices,
      approvalRequests,
    });
  } catch (error) {
    console.error("Error fetching student security history:", error);

    return res.status(500).json({
      message: "Failed to fetch student security history",
    });
  }
});
router.post("/devices/:deviceId/block", async (req, res) => {
  try {
    const device = await TrustedDevice.findById(req.params.deviceId);

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const user = await User.findById(device.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin devices cannot be blocked here",
      });
    }

    device.isBlocked = true;
    device.blockedAt = new Date();
    device.isActive = false;
    device.revokedAt = new Date();

    await device.save();

    await RefreshSession.updateMany(
      {
        userId: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          endedAt: new Date(),
          revokedReason: "Device blocked by admin",
        },
      }
    );

    user.authVersion = (user.authVersion || 1) + 1;
    user.requiresDeviceApproval = true;

    await user.save();

    await LoginEvent.create({
      userId: user._id,
      eventType: "device_blocked",
      loginMethod: "admin",
      result: "blocked",

      deviceName: device.deviceName,
      browser: device.browser,
      platform: device.platform,
      fingerprint: device.fingerprint,

      ip: device.lastIp,
      country: device.lastCountry,
      city: device.lastCity,

      trustedDeviceId: device._id,
    });

    return res.json({
      message: "Device blocked successfully",
    });
  } catch (error) {
    console.error("Error blocking device:", error);

    return res.status(500).json({
      message: "Failed to block device",
    });
  }
});
router.post("/devices/:deviceId/unblock", async (req, res) => {
  try {
    const device = await TrustedDevice.findById(req.params.deviceId);

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const user = await User.findById(device.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    device.isBlocked = false;
    device.blockedAt = null;

    // Do NOT automatically make it trusted again.
    // It must request approval again.
    device.isActive = false;

    await device.save();

    await LoginEvent.create({
      userId: user._id,
      eventType: "device_unblocked",
      loginMethod: "admin",
      result: "unblocked",

      deviceName: device.deviceName,
      browser: device.browser,
      platform: device.platform,
      fingerprint: device.fingerprint,

      ip: device.lastIp,
      country: device.lastCountry,
      city: device.lastCity,

      trustedDeviceId: device._id,
    });

    return res.json({
      message:
        "Device unblocked. It must be approved again before becoming trusted.",
    });
  } catch (error) {
    console.error("Error unblocking device:", error);

    return res.status(500).json({
      message: "Failed to unblock device",
    });
  }
});

router.get(
  "/device-approval-students/:userId/history",
  async (req, res) => {
    try {
      const attempts = await DeviceApprovalRequest.find({
        userId: req.params.userId,
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.json(attempts);
    } catch (error) {
      console.error(
        "Error fetching device approval history:",
        error
      );

      return res.status(500).json({
        message: "Failed to fetch device approval history",
      });
    }
  }
);

export default router;