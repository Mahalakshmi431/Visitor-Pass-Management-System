const express = require("express");
const router = express.Router();
const { loginUser, getMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

module.exports = router;