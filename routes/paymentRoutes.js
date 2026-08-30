import { Router } from "express";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Module from "../models/Module.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

// GET /api/payment
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status && status !== "all" ? { status } : {};

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name email")
      .populate("reviewedBy", "name");

    res.json({ payments, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET payments error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// GET /api/payment/stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const [total, pending, approved, rejected, totalUsers] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "approved" }),
      Payment.countDocuments({ status: "rejected" }),
      User.countDocuments({ role: "user" }),
    ]);

    res.json({ total, pending, approved, rejected, totalUsers });
  } catch (err) {
    console.error("GET stats error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// GET /api/payment/my
router.get("/my", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ email: req.user.email }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error("MY payments error:", err.message);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// POST /api/payment/:id/approve
router.post("/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status === "approved") return res.status(400).json({ message: "Already approved" });

    const includesCourse = payment.courseType?.includes("full_course");

const allModules = includesCourse
  ? await Module.find({ isPublished: true }).select("_id")
  : [];

    let user = await User.findOne({ email: payment.email });

    if (!user) {
      const phoneValue = payment.phone?.trim() || "00000000000";

      user = await User.create({
        name: payment.name,
        email: payment.email,
        phone: phoneValue,
        password: phoneValue,
        role: "user",
        isApproved: includesCourse,
hasCourseAccess: includesCourse,
approvedAt: includesCourse ? new Date() : undefined,
moduleAccess: includesCourse
  ? allModules.map((m) => ({ moduleId: m._id }))
  : [],
      });
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
  ...(includesCourse
    ? {
        isApproved: true,
        hasCourseAccess: true,
        approvedAt: new Date(),
        moduleAccess: allModules.map((m) => ({
          moduleId: m._id,
        })),
      }
    : {}),
  ...(user.phone
    ? {}
    : { phone: payment.phone || "00000000000" }),
},
        }
      );
      user = await User.findById(user._id);
    }

    payment.status = "approved";
    payment.adminNote = adminNote || "";
    payment.reviewedAt = new Date();
    payment.reviewedBy = req.user._id;
    payment.userId = user._id;
    await payment.save();

    res.json({ message: "Payment approved", userId: user._id });
  } catch (err) {
    console.error("APPROVE error:", err.message);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// POST /api/payment/:id/reject
router.post("/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.status = "rejected";
    payment.adminNote = adminNote || "";
    payment.reviewedAt = new Date();
    payment.reviewedBy = req.user._id;
    await payment.save();

    res.json({ message: "Payment rejected" });
  } catch (err) {
    console.error("REJECT error:", err.message);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// DELETE /api/payment/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch (err) {
    console.error("DELETE payment error:", err.message);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;