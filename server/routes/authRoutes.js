const express = require("express");
const router = express.Router();
const { loginUser, getMe, getDemoAccounts, changePassword, updateProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.get("/demo-accounts", getDemoAccounts);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);
router.put("/update-profile", protect, updateProfile);

module.exports = router;