import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: { type: String, trim: true }, // ✅ removed required (Google users have no phone)

    password: { type: String },

    // ✅ Google OAuth fields
    googleId: { type: String, default: undefined },
    picture:  { type: String, default: undefined },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    hasCourseAccess: { type: Boolean, default: false },

    resetOtp: { type: String, default: undefined },
    resetOtpExpires: { type: Date, default: undefined },

    moduleAccess: [
      {
        moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module" },
        grantedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/* =========================
   HASH PASSWORD
========================= */
userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

/* =========================
   COMPARE PASSWORD
========================= */
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
