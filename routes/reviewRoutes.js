import express from "express";
import { protect } from "../middleware/auth.js";
import Review from "../models/Review.js";
const router = express.Router();

// ── Check enrollment (now uses isApproved from User) ──
router.get("/check-enrollment/:courseId", protect, async (req, res) => {
  try {
    res.json({ enrolled: req.user.isApproved === true });
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

// ── POST a review (only approved users) ──
router.post("/reviews", protect, async (req, res) => {
  try {
    if (!req.user.isApproved) {
      return res.status(403).json({ error: "You must be enrolled to post a review." });
    }

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