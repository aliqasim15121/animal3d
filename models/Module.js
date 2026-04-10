import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, default: 0 },
    videoUrl: { type: String },
    content: { type: String },
    isPublished: { type: Boolean, default: true },
    duration: { type: String }, // e.g. "2h 30m"
  },
  { timestamps: true }
);

const Module = mongoose.model("Module", moduleSchema);

export default Module;