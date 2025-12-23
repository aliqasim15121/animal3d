import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware to verify any logged-in user
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to verify admin users
export const verifyAdmin = async (req, res, next) => {
  await authMiddleware(req, res, async () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    next();
  });
};

export default authMiddleware;
