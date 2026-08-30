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

const normalizedEmail = email.trim().toLowerCase();

const courseType = req.body.courseType
  ? req.body.courseType
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

if (courseType.length === 0) {
  return res.status(400).json({
    message: "Please select at least one product or package.",
  });
}

const existingPayments = await Payment.find({
  email: normalizedEmail,
  status: { $in: ["pending", "approved"] },
}).select("courseType status");

const duplicateProducts = courseType.filter((product) =>
  existingPayments.some((payment) =>
    payment.courseType?.includes(product)
  )
);

if (duplicateProducts.length > 0) {
  return res.status(409).json({
    message:
      "A payment submission already exists for one or more selected products.",
    duplicateProducts,
  });
}

    const hashedPassword = await bcrypt.hash(password, 10);
    const screenshotUrl = req.file.path;


    const payment = await Payment.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      screenshotUrl,
      courseType,
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