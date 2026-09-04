import express    from "express";
import jwt         from "jsonwebtoken";
import crypto      from "crypto";
import bcrypt      from "bcryptjs";
import { Resend }  from "resend";
import { OAuth2Client } from "google-auth-library";
import User        from "../models/User.js";
import { protect } from "../middleware/auth.js";
import DeviceApprovalRequest from "../models/DeviceApprovalRequest.js";
import TrustedDevice from "../models/TrustedDevice.js";
import RefreshSession from "../models/RefreshSession.js";
import LoginEvent from "../models/LoginEvent.js";

import {
  hashToken,
  generateSecureToken,
  getRequestSecurityInfo,
  setTrustedDeviceCookie,
  getCookieValue,
  DEVICE_COOKIE_NAME,
} from "../utils/deviceSecurity.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id, role, authVersion = 1) =>
  jwt.sign(
    { id, role, authVersion },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
const handleStudentDeviceLogin = async (user, req, loginMethod) => {
  const securityInfo = getRequestSecurityInfo(req);

  const rawDeviceToken = getCookieValue(
    req,
    DEVICE_COOKIE_NAME
  );

  if (rawDeviceToken) {
    const deviceTokenHash = hashToken(rawDeviceToken);

    const trustedDevice = await TrustedDevice.findOne({
      userId: user._id,
      tokenHash: deviceTokenHash,
      isActive: true,
    });

    if (trustedDevice) {
      trustedDevice.lastSeenAt = new Date();
      trustedDevice.lastIp = securityInfo.ip;
      trustedDevice.lastCountry = securityInfo.country;
      trustedDevice.lastCity = securityInfo.city;

      await trustedDevice.save();

      return {
        allowed: true,
        securityInfo,
      };
    }
  }



  const rawRequestToken = generateSecureToken();
  const requestTokenHash = hashToken(rawRequestToken);

  const approvalRequest =
    await DeviceApprovalRequest.create({
      userId: user._id,

      requestTokenHash,

      status: "pending",

      deviceName: securityInfo.deviceName,
      browser: securityInfo.browser,
      platform: securityInfo.platform,
      userAgent: securityInfo.userAgent,
      screenResolution: securityInfo.screenResolution,
      timezone: securityInfo.timezone,
      fingerprint: securityInfo.fingerprint,

      ip: securityInfo.ip,
      country: securityInfo.country,
      city: securityInfo.city,

      loginMethod,

      expiresAt: new Date(
        Date.now() + 30 * 60 * 1000
      ),
    });

  return {
    allowed: false,
    requestToken: rawRequestToken,
    requestId: approvalRequest._id,
    securityInfo,
  };
};

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Admin accounts are NOT restricted by device binding
    if (user.role === "admin") {
      return res.json({
        token: generateToken(
          user._id,
          user.role,
          user.authVersion || 1
        ),

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved:
            user.isApproved ||
            user.hasCourseAccess,
        },
      });
    }

    const deviceResult =
      await handleStudentDeviceLogin(
        user,
        req,
        "password"
      );

    if (!deviceResult.allowed) {
      return res.status(202).json({
        status: "approval_required",

        message:
          "Device approval is required before you can login.",

        requestToken:
          deviceResult.requestToken,

        requestId:
          deviceResult.requestId,

        device: {
          deviceName:
            deviceResult.securityInfo.deviceName,

          browser:
            deviceResult.securityInfo.browser,

          platform:
            deviceResult.securityInfo.platform,

          ip:
            deviceResult.securityInfo.ip,

          country:
            deviceResult.securityInfo.country,

          city:
            deviceResult.securityInfo.city,
        },
      });
    }

    user.deviceBindingInitialized = true;
    user.requiresDeviceApproval = false;

    await user.save();

    return res.json({
      token: generateToken(
        user._id,
        user.role,
        user.authVersion || 1
      ),

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved:
          user.isApproved ||
          user.hasCourseAccess,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

/* =========================
   SIGNUP
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(400).json({ message: "Email already registered." });

    const newUser = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      phone,
    });

    await newUser.save();

    res.status(201).json({
      token: generateToken(newUser._id, newUser.role),
      user: {
        id:         newUser._id,
        name:       newUser.name,
        email:      newUser.email,
        role:       newUser.role,
        isApproved: newUser.isApproved || newUser.hasCourseAccess,
      },
    });
  } catch (err) {
    console.error("[signup]", err);
    res.status(500).json({ message: "Server error." });
  }
});

/* =========================
   GOOGLE LOGIN ✅
========================= */
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Google token is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const {
      name,
      email,
      picture,
      sub: googleId,
    } = ticket.getPayload();

    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        picture,
        googleId,
      });
    }

    // Admin accounts bypass device binding
    if (user.role === "admin") {
      return res.json({
        token: generateToken(
          user._id,
          user.role,
          user.authVersion || 1
        ),

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          picture: user.picture,
          isApproved:
            user.isApproved ||
            user.hasCourseAccess,
        },
      });
    }

    const deviceResult =
      await handleStudentDeviceLogin(
        user,
        req,
        "google"
      );

    if (!deviceResult.allowed) {
      return res.status(202).json({
        status: "approval_required",

        message:
          "Device approval is required before you can login.",

        requestToken:
          deviceResult.requestToken,

        requestId:
          deviceResult.requestId,

        device: {
          deviceName:
            deviceResult.securityInfo.deviceName,

          browser:
            deviceResult.securityInfo.browser,

          platform:
            deviceResult.securityInfo.platform,

          ip:
            deviceResult.securityInfo.ip,

          country:
            deviceResult.securityInfo.country,

          city:
            deviceResult.securityInfo.city,
        },
      });
    }

    user.deviceBindingInitialized = true;
    user.requiresDeviceApproval = false;

    await user.save();

    return res.json({
      token: generateToken(
        user._id,
        user.role,
        user.authVersion || 1
      ),

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        isApproved:
          user.isApproved ||
          user.hasCourseAccess,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(401).json({
      message: "Google login failed",
    });
  }
});

/* =========================
   GET CURRENT USER
========================= */
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("moduleAccess.moduleId")
    .select("-password");

  const userObj = user.toObject();
  userObj.isApproved = user.isApproved || user.hasCourseAccess;
  res.json(userObj);
});

/* =========================
   HELPERS
========================= */
const generateOtp = () => crypto.randomInt(100_000, 999_999).toString();

const otpEmailHtml = (otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif}
  .wrap{max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.08)}
  .hdr{background:#1a1a2e;padding:36px 40px;text-align:center}
  .hdr h1{color:#fff;font-size:22px;margin:0;font-weight:600}
  .bod{padding:36px 40px}
  .bod p{color:#555;font-size:15px;line-height:1.7;margin:0 0 20px}
  .box{background:#f4f4f7;border-radius:12px;text-align:center;padding:24px;margin:24px 0}
  .code{font-size:38px;font-weight:700;letter-spacing:12px;color:#1a1a2e}
  .note{font-size:13px!important;color:#999!important}
  .foot{padding:20px 40px;background:#f9f9f9;text-align:center;font-size:12px;color:#aaa}
</style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><h1>🔒 Password Reset</h1></div>
    <div class="bod">
      <p>Hello,</p>
      <p>Use the code below to reset your password — it expires in <strong>10 minutes</strong>.</p>
      <div class="box"><div class="code">${otp}</div></div>
      <p class="note">If you didn't request this, ignore this email.</p>
    </div>
    <div class="foot">© ${new Date().getFullYear()} Animal3D Animation</div>
  </div>
</body>
</html>`;

/* =========================
   FORGOT PASSWORD
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log("🔍 User found:", !!user);

    const genericMsg = "If that email is registered, a reset code has been sent.";
    if (!user) return res.status(200).json({ message: genericMsg });

    const otp    = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);

    user.resetOtp        = hashed;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const result = await resend.emails.send({
      from:    "Animal3D Animation <noreply@contact.animals3d.online>",
      to:      user.email,
      subject: "Your password reset code",
      html:    otpEmailHtml(otp),
    });

    console.log("📧 Trying to send to:", user.email);
    console.log("📧 Resend result:", JSON.stringify(result));

    if (result.error) {
      console.error("❌ Resend error:", result.error);
      return res.status(500).json({ message: "Email sending failed: " + result.error.message });
    }

    return res.status(200).json({ message: genericMsg });
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

/* =========================
   VERIFY OTP
========================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user?.resetOtp || !user?.resetOtpExpires)
      return res.status(400).json({ message: "Invalid or expired code." });

    if (user.resetOtpExpires < new Date())
      return res.status(400).json({ message: "Code has expired. Please request a new one." });

    const valid = await bcrypt.compare(otp.toString(), user.resetOtp);
    if (!valid)
      return res.status(400).json({ message: "Incorrect code. Please try again." });

    return res.status(200).json({ message: "Code verified." });
  } catch (err) {
    console.error("[verify-otp]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields are required." });

    if (newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user?.resetOtp || !user?.resetOtpExpires)
      return res.status(400).json({ message: "Invalid or expired code." });

    if (user.resetOtpExpires < new Date())
      return res.status(400).json({ message: "Code has expired. Please request a new one." });

    const valid = await bcrypt.compare(otp.toString(), user.resetOtp);
    if (!valid)
      return res.status(400).json({ message: "Incorrect code." });

    user.password        = newPassword;
    user.resetOtp        = undefined;
    user.resetOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// Check device approval status
router.post("/device-approval-status", async (req, res) => {
  try {
    const { requestToken } = req.body;

    if (!requestToken) {
      return res.status(400).json({
        message: "Request token is required",
      });
    }

    const requestTokenHash = hashToken(requestToken);

    const approvalRequest = await DeviceApprovalRequest.findOne({
      requestTokenHash,
    });

    if (!approvalRequest) {
      return res.status(404).json({
        message: "Device approval request not found",
      });
    }

    if (
      approvalRequest.status === "pending" &&
      approvalRequest.expiresAt <= new Date()
    ) {
      approvalRequest.status = "expired";
      await approvalRequest.save();

      return res.status(400).json({
        status: "expired",
        message: "Device approval request has expired",
      });
    }

    if (approvalRequest.status === "pending") {
      return res.json({
        status: "pending",
        message: "Device approval is still pending",
      });
    }

    if (approvalRequest.status === "rejected") {
      return res.status(403).json({
        status: "rejected",
        message: "This device request was rejected",
      });
    }

    if (approvalRequest.status === "expired") {
      return res.status(400).json({
        status: "expired",
        message: "Device approval request has expired",
      });
    }

    if (approvalRequest.status !== "approved") {
      return res.status(400).json({
        message: "Invalid device approval state",
      });
    }

    const user = await User.findById(approvalRequest.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts do not use device approval",
      });
    }

    let existingDevice = await TrustedDevice.findOne({
      userId: user._id,
      fingerprint: approvalRequest.fingerprint,
      isActive: true,
    });

    if (!existingDevice) {
      const rawDeviceToken = generateSecureToken();
      const deviceTokenHash = hashToken(rawDeviceToken);

      existingDevice = await TrustedDevice.create({
        userId: user._id,
        tokenHash: deviceTokenHash,

        deviceName: approvalRequest.deviceName,
        browser: approvalRequest.browser,
        platform: approvalRequest.platform,
        userAgent: approvalRequest.userAgent,
        screenResolution: approvalRequest.screenResolution,
        timezone: approvalRequest.timezone,
        fingerprint: approvalRequest.fingerprint,

        lastIp: approvalRequest.ip,
        lastCountry: approvalRequest.country,
        lastCity: approvalRequest.city,

        isActive: true,
        approvedAt: new Date(),
        lastSeenAt: new Date(),
      });

      setTrustedDeviceCookie(res, rawDeviceToken);
    }

    user.deviceBindingInitialized = true;
    user.requiresDeviceApproval = false;

    await user.save();
    await LoginEvent.create({
  userId: user._id,
  eventType: "trusted_device_reset",
  loginMethod: "admin",
  result: "reset",
});

    return res.json({
      status: "approved",
      message: "Device approved successfully. Please login again.",
    });
  } catch (error) {
    console.error("Device approval status error:", error);

    return res.status(500).json({
      message: "Failed to check device approval status",
    });
  }
});

export default router;