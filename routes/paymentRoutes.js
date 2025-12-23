import express from "express";
import { uploadPayment, approvePayment } from "../controllers/paymentController.js";
import authMiddleware, { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route for user to upload payment screenshot
router.post("/upload", authMiddleware, uploadPayment);

// Admin route to approve/reject payment
router.put("/admin/payment/:id", verifyAdmin, approvePayment);

export default router;
