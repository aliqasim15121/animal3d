exports.getCourse = async (req, res) => {
  if (!req.user.hasCourseAccess) {
    return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: "Welcome to the full course 🎓" });
};
