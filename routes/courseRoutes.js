const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { getCourse } = require("../controllers/courseController");

router.get("/", auth, getCourse);

module.exports = router;
