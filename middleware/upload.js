import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be before cloudinary.config()

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// ✅ Cloud name: CLOUDINARY_CLOUD_NAME → CLOUDINARY_NAME → from CLOUDINARY_URL (cloudinary://key:secret@cloud_name)
const cloudNameKey = Object.keys(process.env).find(
  (k) => k.toUpperCase() === "CLOUDINARY_CLOUD_NAME"
); // case-insensitive (Render had "CLOUDINARY_Cloud_NAME")
const cloudName =
  process.env[cloudNameKey]?.trim() ||
  process.env.CLOUDINARY_NAME?.trim() ||
  (process.env.CLOUDINARY_URL || "").split("@")[1]?.trim();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

// ✅ Verify keys loaded
console.log("☁️ cloud_name:", cloudName || "❌ MISSING");console.log("☁️ api_key:", process.env.CLOUDINARY_API_KEY ? "✅ SET" : "❌ MISSING");
console.log("☁️ api_secret:", process.env.CLOUDINARY_API_SECRET ? "✅ SET" : "❌ MISSING");

// ✅ Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "payment-screenshots",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1000, crop: "limit" }],
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

export default uploadMiddleware;