const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

// Get formatted today string
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// @desc Get dashboard metrics per role
// @route GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const todayStr = getTodayDateString();
    const role = req.user.role;
    const userId = req.user._id;

    let stats = {};

    if (role === "Administrator") {
      const totalEmployees = await User.countDocuments({ role: "Employee" });
      const todayVisitors = await Visitor.countDocuments({ visitDate: todayStr, status: { $ne: "CANCELLED" } });
      const currentlyInside = await Visitor.countDocuments({ status: "CHECKED_IN" });
      const pendingRequests = await Visitor.countDocuments({ status: "PENDING" });
      const totalVisitors = await Visitor.countDocuments({ status: { $ne: "CANCELLED" } });

      stats = {
        totalEmployees,
        todayVisitors,
        currentlyInside,
        pendingRequests,
        totalVisitors,
      };
    } else if (role === "Receptionist") {
      const todayScheduled = await Visitor.countDocuments({ visitDate: todayStr, status: { $ne: "CANCELLED" } });
      const currentlyInside = await Visitor.countDocuments({ status: "CHECKED_IN" });
      const pendingApprovals = await Visitor.countDocuments({ status: "PENDING" });
      const approvedReadyCheckIn = await Visitor.countDocuments({ status: "APPROVED", visitDate: todayStr });
      const checkedOutToday = await Visitor.countDocuments({ status: "CHECKED_OUT", visitDate: todayStr });

      stats = {
        todayScheduled,
        currentlyInside,
        pendingApprovals,
        approvedReadyCheckIn,
        checkedOutToday,
      };
    } else if (role === "Employee") {
      const pendingRequests = await Visitor.countDocuments({ employee: userId, status: "PENDING" });
      const approvedByMe = await Visitor.countDocuments({ employee: userId, status: "APPROVED" });
      const todayVisits = await Visitor.countDocuments({ employee: userId, visitDate: todayStr, status: { $ne: "CANCELLED" } });
      const currentlyVisitingMe = await Visitor.countDocuments({ employee: userId, status: "CHECKED_IN" });

      stats = {
        pendingRequests,
        approvedByMe,
        todayVisits,
        currentlyVisitingMe,
      };
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// @desc Get filterable summary reports
// @route GET /api/reports/visitors
const getVisitorReport = async (req, res, next) => {
  try {
    const { range, startDate, endDate, status } = req.query;

    const query = { status: { $ne: "CANCELLED" } };

    const today = new Date();
    const todayStr = getTodayDateString();

    if (range === "today") {
      query.visitDate = todayStr;
    } else if (range === "week") {
      // Calculate start of current week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
      query.visitDate = { $gte: startOfWeekStr, $lte: todayStr };
    } else if (range === "custom" && startDate && endDate) {
      query.visitDate = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      query.status = status;
    }

    // Role scope
    if (req.user.role === "Employee") {
      query.employee = req.user._id;
    }

    const visitors = await Visitor.find(query)
      .populate("employee", "name email department")
      .sort({ visitDate: -1, createdAt: -1 });

    // Calculate report summaries
    const summary = {
      total: visitors.length,
      pending: visitors.filter((v) => v.status === "PENDING").length,
      approved: visitors.filter((v) => v.status === "APPROVED").length,
      rejected: visitors.filter((v) => v.status === "REJECTED").length,
      checkedIn: visitors.filter((v) => v.status === "CHECKED_IN").length,
      checkedOut: visitors.filter((v) => v.status === "CHECKED_OUT").length,
    };

    res.json({
      summary,
      visitors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Activity Logs
// @route GET /api/reports/activity-logs
const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getVisitorReport,
  getActivityLogs,
};
