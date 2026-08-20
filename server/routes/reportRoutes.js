const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getVisitorReport,
  getActivityLogs,
  getAnalytics,
  getFilterOptions,
} = require("../controllers/reportController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/dashboard/stats", getDashboardStats);
router.get("/reports/visitors", getVisitorReport);
router.get("/reports/analytics", getAnalytics);
router.get("/reports/filters", getFilterOptions);
router.get("/reports/activity-logs", authorizeRoles("Administrator"), getActivityLogs);

module.exports = router;