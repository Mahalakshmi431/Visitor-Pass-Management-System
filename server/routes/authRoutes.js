const express = require("express");
const router = express.Router();
const { loginUser, getMe, getDemoAccounts, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.get("/demo-accounts", getDemoAccounts);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

module.exports = router;