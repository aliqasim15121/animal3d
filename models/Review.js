import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
course: { type: String },  // change from ObjectId to String
  name:   String,
  rating: Number,
  review: String,
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);