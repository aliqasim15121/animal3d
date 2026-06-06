import jwt from "jsonwebtoken";
import User from "../models/User.js"; // ← add this

export const protect = async (req, res, next) => { // ← async
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = await User.findById(decoded.id).select("-password"); // ← DB lookup
    
    if (!req.user) return res.status(401).json({ message: "User not found" });
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied (Admin only)" });
  }
  next();
};