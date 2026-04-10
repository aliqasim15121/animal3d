// testmail.js — run with: node testmail.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log("─────────────────────────────────");
console.log("SMTP_USER :", JSON.stringify(user));
console.log("SMTP_PASS :", JSON.stringify(pass));
console.log("PASS length:", pass?.length);
console.log("─────────────────────────────────");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user, pass },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP FAILED:", err.message);
    console.error("   Code:", err.code);
  } else {
    console.log("✅ SMTP connection works! Email will send.");
  }
});