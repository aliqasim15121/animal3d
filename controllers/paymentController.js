// paymentController.js
import Payment from "../models/Payment.js";
import User from "../models/User.js";

// Existing uploadPayment function
export const uploadPayment = async (req, res) => {
  // ... your existing code
};

// New approvePayment function
export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.status = "approved";
    await payment.save();

    const user = await User.findById(payment.userId);
    if (user) {
      user.notifications = user.notifications || [];
      user.notifications.push({
        message: "Your payment is approved! Click to join the course.",
        link: `/course/${payment.courseId || "default"}`,
        read: false,
        createdAt: new Date(),
      });
      await user.save();
    }

    res.status(200).json({ message: "Payment approved and user notified.", payment });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
