import express    from "express";
import jwt         from "jsonwebtoken";
import crypto      from "crypto";
import bcrypt      from "bcryptjs";
import nodemailer  from "nodemailer";
import User        from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });

    if (!user || !user.password)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id, user.role),
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
isApproved: user.isApproved || user.hasCourseAccess,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET CURRENT USER
========================= */
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("moduleAccess.moduleId")
    .select("-password");

  console.log("isApproved:", user.isApproved);
  console.log("hasaccess:", user.hasaccess);

  const userObj = user.toObject();
  userObj.isApproved = user.isApproved || user.hasCourseAccess;

  console.log("final isApproved:", userObj.isApproved);

  res.json(userObj);
});

/* ─────────────────────────────────────────────────────────────
   HELPERS
   getTransporter() is a FUNCTION — called lazily inside each
   request so process.env is guaranteed to be loaded by then.
   Never instantiate nodemailer at module top-level.
───────────────────────────────────────────────────────────── */
const getTransporter = () =>
  nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

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
    <div class="foot">© ${new Date().getFullYear()} YourApp</div>
  </div>
</body>
</html>`;

/* =========================
   FORGOT PASSWORD
   POST /api/auth/forgot-password
   Body: { email }
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    const genericMsg = "If that email is registered, a reset code has been sent.";
    if (!user) return res.status(200).json({ message: genericMsg });

    const otp    = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);

    user.resetOtp        = hashed;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    // ✅ getTransporter() called HERE (inside the request), not at module load time
    await getTransporter().sendMail({
      from:    `"Animal3D Animation" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: "Your password reset code",
      html:    otpEmailHtml(otp),
    });

    return res.status(200).json({ message: genericMsg });

  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

/* =========================
   VERIFY OTP
   POST /api/auth/verify-otp
   Body: { email, otp }
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
   POST /api/auth/reset-password
   Body: { email, otp, newPassword }
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

    // ⚠️ If your User model pre-save hook auto-hashes passwords, use:
    //      user.password = newPassword;
    // Otherwise this manual hash is safe:
    user.password        = await bcrypt.hash(newPassword, 12);
    user.resetOtp        = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully." });

  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

export default router;
