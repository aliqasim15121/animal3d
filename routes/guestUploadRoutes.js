import { Router } from "express";
import upload from "../middleware/upload.js";
import Payment from "../models/Payment.js";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Payment screenshot is required" });
    }

    // ✅ hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const screenshotUrl = req.file.path;

    const payment = await Payment.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: hashedPassword, // ✅ save hashed password
      screenshotUrl,
    });

    res.status(201).json({
      message: "Payment submitted successfully",
      paymentId: payment._id,
    });

  } catch (err) {
    console.error("Guest upload error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;