import Payment from "../models/Payment.js";

// Create payment
export const createPayment = async (req, res) => {
  try {
    const { name, email, phone, screenshot } = req.body;
    const userId = req.user?.id;

    const payment = new Payment({ name, email, phone, screenshot, userId });
    await payment.save();

    res.status(201).json({ message: "Payment submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payments
export const getPayments = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const payments = await Payment.find()
      .select("name email phone screenshot status createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve
export const approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reject
export const rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Dashboard stats
export const getStats = async (req, res) => {
  try {
    const [totalPayments, pending, approved] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "approved" }),
    ]);

    res.json({ totalPayments, pending, approved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};