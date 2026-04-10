import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

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

export default router;