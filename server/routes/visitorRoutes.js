const express = require("express");
const router = express.Router();
const {
  createVisitor,
  getVisitors,
  getVisitorById,
  updateVisitor,
  approveVisitor,
  rejectVisitor,
  checkInVisitor,
  checkOutVisitor,
  cancelVisitor,
} = require("../controllers/visitorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", authorizeRoles("Receptionist", "Administrator"), createVisitor);
router.get("/", getVisitors);
router.get("/:id", getVisitorById);
router.put("/:id", authorizeRoles("Receptionist", "Administrator"), updateVisitor);

router.put("/:id/approve", authorizeRoles("Employee", "Administrator"), approveVisitor);

router.put("/:id/reject", authorizeRoles("Employee", "Administrator"), rejectVisitor);

router.put("/:id/checkin", authorizeRoles("Receptionist", "Administrator"), checkInVisitor);
router.put("/:id/checkout", authorizeRoles("Receptionist", "Administrator"), checkOutVisitor);
router.put("/:id/cancel", authorizeRoles("Receptionist", "Administrator"), cancelVisitor);

module.exports = router;
