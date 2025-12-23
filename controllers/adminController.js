import Payment from "../models/Payment.js";

/* GET PAYMENTS */
export const getPayments = async (req, res) => {
  const limit = Number(req.query.limit) || 0;

  const payments = await Payment.find()
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json(payments); // 🔥 ARRAY ONLY
};

/* UPDATE STATUS */
export const updatePaymentStatus = async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  res.json(payment);
};

/* DASHBOARD STATS */
export const getStats = async (req, res) => {
  const totalPayments = await Payment.countDocuments();
  const pending = await Payment.countDocuments({ status: "pending" });
  const approved = await Payment.countDocuments({ status: "approved" });

  res.json({ totalPayments, pending, approved });
};
