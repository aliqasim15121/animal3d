import express from "express";
import dotenv from "dotenv";
import cors from "cors"; // ✅ import cors
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from "path";
import adminRoutes from "./routes/adminRoutes.js";

// ⬇️ below other routes



dotenv.config();
connectDB();

const app = express();

// Enable CORS for your frontend
app.use(cors({
  origin: "http://localhost:5173", // your frontend URL
  credentials: true, // optional, if using cookies
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
