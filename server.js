// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";

// import connectDB from "./config/db.js";

// import authRoutes from "./routes/auth.js";
// import paymentRoutes from "./routes/paymentRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import guestUploadRoutes from "./routes/guestUploadRoutes.js";

// dotenv.config();

// const app = express();

// /* =========================
//    PATH SETUP
// ========================= */
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// /* =========================
//    CORS
// ========================= */
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       process.env.FRONTEND_URL,
//       "https://animals3d.online",
//     ],
//     credentials: true,
//   })
// );

// /* =========================
//    BODY PARSER
// ========================= */
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// /* =========================
//    SECURITY HEADERS
// ========================= */
// app.use((req, res, next) => {
//   res.setHeader("X-Content-Type-Options", "nosniff");
//   res.setHeader("X-Frame-Options", "DENY");
//   res.setHeader("X-XSS-Protection", "1; mode=block");
//   next();
// });

// /* =========================
//    ROUTES
// ========================= */
// app.use("/api/auth", authRoutes);
// app.use("/api/payment", paymentRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/guest-upload", guestUploadRoutes);

// /* =========================
//    HEALTH CHECK
// ========================= */
// app.get("/", (req, res) => {
//   res.json({
//     message: "🚀 API running successfully",
//     status: "active",
//     time: new Date().toISOString(),
//     endpoints: {
//       auth: "/api/auth",
//       payment: "/api/payment",
//       admin: "/api/admin",
//       guestUpload: "/api/guest-upload",
//     },
//   });
// });

// /* =========================
//    404 HANDLER
// ========================= */
// app.use((req, res) => {
//   if (req.originalUrl.startsWith("/api/")) {
//     return res.status(404).json({
//       error: "API route not found",
//       path: req.originalUrl,
//       method: req.method,
//     });
//   }
//   res.status(404).json({
//     error: "Route not found",
//     path: req.originalUrl,
//   });
// });

// /* =========================
//    ERROR HANDLER — FIXED
// ========================= */
// app.use((err, req, res, next) => {
//   // ✅ Now prints full error so we can see what's crashing
//   console.error("❌ FULL ERROR:", err);
//   console.error("❌ ERROR MESSAGE:", err.message);
//   console.error("❌ ERROR STACK:", err.stack);

//   res.status(err.status || 500).json({
//     error: "Server error",
//     // ✅ Always return real message (remove NODE_ENV check for debugging)
//     message: err.message || "Something went wrong",
//   });
// });

// /* =========================
//    START SERVER
// ========================= */
// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log("✅ MongoDB connected");

//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on http://localhost:${PORT}`);
//       console.log(`🔗 Auth: /api/auth`);
//       console.log(`💳 Payment: /api/payment`);
//       console.log(`👨‍💼 Admin: /api/admin`);
//       console.log(`📦 Guest Upload: /api/guest-upload`);

//       // ✅ Check Cloudinary env vars on startup
//       console.log("☁️ Cloudinary cloud_name:", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
//       console.log("☁️ Cloudinary api_key:", process.env.CLOUDINARY_API_KEY ? "✅ SET" : "❌ MISSING");
//       console.log("☁️ Cloudinary api_secret:", process.env.CLOUDINARY_API_SECRET ? "✅ SET" : "❌ MISSING");
//     });
//   } catch (err) {
//     console.error("❌ DB connection failed:", err.message);
//     process.exit(1);
//   }
// };

// startServer();

// export default app;
// import dns from "dns";
// dns.setServers(["8.8.8.8", "8.8.4.4"]);
import "./config/env.js"; 
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import guestUploadRoutes from "./routes/guestUploadRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import polarRoutes from "./routes/polarRoutes.js";
import geoip from "geoip-lite";
dotenv.config();
console.log("SUCCESS URL:", process.env.POLAR_SUCCESS_URL);


const app = express();

app.set("trust proxy", true);

/* =========================
   PATH SETUP
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.FRONTEND_URL,
  "https://animals3d.online",
],
    credentials: true,
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =========================
   SECURITY HEADERS
========================= */
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);       // ✅ includes /forgot-password, /verify-otp, /reset-password
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/guest-upload", guestUploadRoutes);
app.use("/api", reviewRoutes);
app.use("/api/polar", polarRoutes); // ✅ includes /checkout
app.get("/api/location", (req, res) => {
  let ip = req.ip || req.socket?.remoteAddress || "";

  if (ip?.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  const geo =
    ip === "127.0.0.1"
      ? null
      : geoip.lookup(ip);

  const country =
    ip === "127.0.0.1"
      ? "LOCAL"
      : geo?.country || "UNKNOWN";

  const city =
    ip === "127.0.0.1"
      ? "Localhost"
      : geo?.city || "Unknown";

  const currency = country === "PK" ? "PKR" : "USD";

  res.json({
    ip,
    city,
    country,
    currency,
  });
});
/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    message: "🚀 API running successfully",
    status: "active",
    time: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      payment: "/api/payment",
      admin: "/api/admin",
      guestUpload: "/api/guest-upload",
    },
  });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      error: "API route not found",
      path: req.originalUrl,
      method: req.method,
    });
  }
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("❌ FULL ERROR:", err);
  console.error("❌ ERROR MESSAGE:", err.message);
  console.error("❌ ERROR STACK:", err.stack);

  res.status(err.status || 500).json({
    error: "Server error",
    message: err.message || "Something went wrong",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔗 Auth:         /api/auth`);
      console.log(`🔑 Forgot PW:    /api/auth/forgot-password`);
      console.log(`🔑 Verify OTP:   /api/auth/verify-otp`);
      console.log(`🔑 Reset PW:     /api/auth/reset-password`);
      console.log(`💳 Payment:      /api/payment`);
      console.log(`👨‍💼 Admin:        /api/admin`);
      console.log(`📦 Guest Upload: /api/guest-upload`);

      console.log("☁️ Cloudinary cloud_name:", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
      console.log("☁️ Cloudinary api_key:",    process.env.CLOUDINARY_API_KEY    ? "✅ SET" : "❌ MISSING");
      console.log("☁️ Cloudinary api_secret:", process.env.CLOUDINARY_API_SECRET ? "✅ SET" : "❌ MISSING");

      // ✅ SMTP check for forgot-password emails
      console.log("📧 SMTP user:",   process.env.SMTP_USER ? "✅ SET" : "❌ MISSING");
      console.log("📧 SMTP pass:",   process.env.SMTP_PASS ? "✅ SET" : "❌ MISSING");
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
};

startServer();

export default app;