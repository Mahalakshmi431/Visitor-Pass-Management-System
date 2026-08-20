const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getAllUsers,
  createUser,
  toggleUserStatus,
  updateUser,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Employee list (accessible by all authenticated users to select host employee)
router.get("/employees", protect, getEmployees);

// User account management (Admin only)
router.get("/", protect, authorizeRoles("Administrator"), getAllUsers);
router.post("/", protect, authorizeRoles("Administrator"), createUser);
router.put("/:id", protect, authorizeRoles("Administrator"), updateUser);
router.put("/:id/toggle-status", protect, authorizeRoles("Administrator"), toggleUserStatus);

module.exports = router;
