import express    from "express";
import jwt         from "jsonwebtoken";
import crypto      from "crypto";
import bcrypt      from "bcryptjs";
import { Resend }  from "resend";
import User        from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

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

   user.password = newPassword;
    user.resetOtp        = undefined;
    user.resetOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

export default router;
