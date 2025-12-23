import { Router } from "express";
import auth from "../middleware/authMiddleware.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const router = Router();

/**
 * GET all payments (email + screenshot only)
 */
router.get("/payments", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find({
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * APPROVE payment
 */
router.post("/approve/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: "Not found" });

  payment.status = "approved";
  await payment.save();

  await User.findByIdAndUpdate(payment.userId, {
    hasCourseAccess: true,
  });

  res.json({ message: "Approved" });
});

/**
 * REJECT payment
 */
router.post("/reject/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  await Payment.findByIdAndUpdate(req.params.id, {
    status: "rejected",
  });

  res.json({ message: "Rejected" });
});

export default router;
