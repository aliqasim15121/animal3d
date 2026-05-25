import express from "express";
import { protect } from "../middleware/auth.js";
import Enrollment from "../models/Payment.js";
import Review from "../models/Review.js";

const router = express.Router();

router.get("/check-enrollment/:courseId", protect, async (req, res) => {
  try {
    const enrolled = await Enrollment.findOne({
      userId: req.user.id,
      courseType: { $in: [req.params.courseId] },
      status: "approved",
    });
    res.json({ enrolled: !!enrolled });
  } catch (err) {
    res.status(500).json({ enrolled: false, error: err.message });
  }
});

// ── GET all reviews for a course ──
router.get("/reviews/:courseId", async (req, res) => {
  try {
    const reviews = await Review.find({ course: req.params.courseId })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reviews", protect, async (req, res) => {
  try {
    const { courseId, rating, name, review } = req.body;
    await Review.create({
      user: req.user.id,
      course: courseId,
      rating,
      name,
      review,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;