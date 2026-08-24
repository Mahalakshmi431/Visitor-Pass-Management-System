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
  bulkOperation,
} = require("../controllers/visitorController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", createVisitor);
router.get("/", getVisitors);

router.put("/bulk/:action", authorizeRoles("Receptionist", "Administrator", "Employee"), bulkOperation);

router.get("/:id", getVisitorById);
router.put("/:id", authorizeRoles("Receptionist", "Administrator"), updateVisitor);

router.put("/:id/approve", authorizeRoles("Employee", "Administrator"), approveVisitor);
router.put("/:id/reject", authorizeRoles("Employee", "Administrator"), rejectVisitor);

router.put("/:id/checkin", authorizeRoles("Receptionist", "Administrator"), checkInVisitor);
router.put("/:id/checkout", authorizeRoles("Receptionist", "Administrator"), checkOutVisitor);
router.put("/:id/cancel", authorizeRoles("Receptionist", "Administrator", "Employee"), cancelVisitor);

module.exports = router;
