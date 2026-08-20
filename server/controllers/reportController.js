const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeFilter = (range, startDate, endDate) => {
  const todayStr = getTodayDateString();
  const today = new Date();

  if (range === "today") {
    return todayStr;
  } else if (range === "week") {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const s = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
    return { $gte: s, $lte: todayStr };
  } else if (range === "month") {
    const s = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return { $gte: s, $lte: todayStr };
  } else if (range === "last30days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { $gte: s, $lte: todayStr };
  } else if (range === "custom" && startDate && endDate) {
    return { $gte: startDate, $lte: endDate };
  }
  return undefined;
};

const buildAdvancedFilters = (query, reqQuery) => {
  const { search, company, employeeName, purpose } = reqQuery;

  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { company: regex },
      { passCode: regex },
      { employeeName: regex },
    ];
  }
  if (company) {
    query.company = company;
  }
  if (employeeName) {
    query.employeeName = employeeName;
  }
  if (purpose) {
    query.purpose = purpose;
  }
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
      const [totalEmployees, counts] = await Promise.all([
        User.countDocuments({ role: "Employee" }),
        Visitor.aggregate([
          { $match: { status: { $ne: "CANCELLED" } } },
          { $group: {
            _id: null,
            totalVisitors: { $sum: 1 },
            currentlyInside: { $sum: { $cond: [{ $eq: ["$status", "CHECKED_IN"] }, 1, 0] } },
            pendingRequests: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
            todayVisitors: { $sum: { $cond: [{ $eq: ["$visitDate", todayStr] }, 1, 0] } },
          }},
        ]),
      ]);
      const c = counts[0] || { totalVisitors: 0, currentlyInside: 0, pendingRequests: 0, todayVisitors: 0 };
      stats = { totalEmployees, todayVisitors: c.todayVisitors, currentlyInside: c.currentlyInside, pendingRequests: c.pendingRequests, totalVisitors: c.totalVisitors };
    } else if (role === "Receptionist") {
      const counts = await Visitor.aggregate([
        { $match: { status: { $ne: "CANCELLED" } } },
        { $group: {
          _id: null,
          currentlyInside: { $sum: { $cond: [{ $eq: ["$status", "CHECKED_IN"] }, 1, 0] } },
          pendingApprovals: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          todayScheduled: { $sum: { $cond: [{ $eq: ["$visitDate", todayStr] }, 1, 0] } },
          approvedReadyCheckIn: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$visitDate", todayStr] }] }, 1, 0] } },
          checkedOutToday: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "CHECKED_OUT"] }, { $eq: ["$visitDate", todayStr] }] }, 1, 0] } },
        }},
      ]);
      const c = counts[0] || {};
      stats = {
        todayScheduled: c.todayScheduled || 0,
        currentlyInside: c.currentlyInside || 0,
        pendingApprovals: c.pendingApprovals || 0,
        approvedReadyCheckIn: c.approvedReadyCheckIn || 0,
        checkedOutToday: c.checkedOutToday || 0,
      };
    } else if (role === "Employee") {
      const counts = await Visitor.aggregate([
        { $match: { employee: userId, status: { $ne: "CANCELLED" } } },
        { $group: {
          _id: null,
          pendingRequests: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          approvedByMe: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
          todayVisits: { $sum: { $cond: [{ $eq: ["$visitDate", todayStr] }, 1, 0] } },
          currentlyVisitingMe: { $sum: { $cond: [{ $eq: ["$status", "CHECKED_IN"] }, 1, 0] } },
        }},
      ]);
      const c = counts[0] || {};
      stats = {
        pendingRequests: c.pendingRequests || 0,
        approvedByMe: c.approvedByMe || 0,
        todayVisits: c.todayVisits || 0,
        currentlyVisitingMe: c.currentlyVisitingMe || 0,
      };
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// @desc Get filterable summary reports with advanced search
// @route GET /api/reports/visitors
const getVisitorReport = async (req, res, next) => {
  try {
    const { range, startDate, endDate, status } = req.query;

    const query = { status: { $ne: "CANCELLED" } };

    const visitDateFilter = getDateRangeFilter(range, startDate, endDate);
    if (visitDateFilter !== undefined) {
      query.visitDate = visitDateFilter;
    }

    if (status) {
      query.status = status;
    }

    if (req.user.role === "Employee") {
      query.employee = req.user._id;
    }

    buildAdvancedFilters(query, req.query);

    const visitors = await Visitor.find(query)
      .populate("employee", "name email department")
      .sort({ visitDate: -1, createdAt: -1 });

    const summary = {
      total: visitors.length,
      pending: visitors.filter((v) => v.status === "PENDING").length,
      approved: visitors.filter((v) => v.status === "APPROVED").length,
      rejected: visitors.filter((v) => v.status === "REJECTED").length,
      checkedIn: visitors.filter((v) => v.status === "CHECKED_IN").length,
      checkedOut: visitors.filter((v) => v.status === "CHECKED_OUT").length,
    };

    res.json({ summary, visitors });
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

// @desc Get chart analytics data
// @route GET /api/reports/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const match = { status: { $ne: "CANCELLED" } };

    const visitDateFilter = getDateRangeFilter(range, startDate, endDate);
    if (visitDateFilter !== undefined) {
      match.visitDate = visitDateFilter;
    }

    if (req.user.role === "Employee") {
      match.employee = req.user._id;
    }

    const [statusResult, dailyResult, companyResult, hostResult, hourlyResult, purposeResult] = await Promise.all([
      Visitor.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Visitor.aggregate([
        { $match: match },
        { $group: {
          _id: "$visitDate",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
          checkedIn: { $sum: { $cond: [{ $eq: ["$status", "CHECKED_IN"] }, 1, 0] } },
          checkedOut: { $sum: { $cond: [{ $eq: ["$status", "CHECKED_OUT"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
        }},
        { $sort: { _id: 1 } },
      ]),
      Visitor.aggregate([
        { $match: match },
        { $group: { _id: "$company", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Visitor.aggregate([
        { $match: match },
        { $group: { _id: "$employeeName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      Visitor.aggregate([
        { $match: { ...match, expectedTime: { $ne: "" } } },
        { $project: { hour: { $toInt: { $substr: ["$expectedTime", 0, 2] } } } },
        { $match: { hour: { $gte: 0, $lt: 24 } } },
        { $group: { _id: "$hour", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Visitor.aggregate([
        { $match: match },
        { $group: { _id: "$purpose", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const statusDistribution = statusResult.map(({ _id, count }) => ({ name: _id, value: count }));
    const dailyTrend = dailyResult.map(({ _id, total, pending, approved, checkedIn, checkedOut, rejected }) => ({
      date: _id, total, pending, approved, checkedIn, checkedOut, rejected,
    }));
    const topCompanies = companyResult.map(({ _id, count }) => ({ name: _id || "Independent", count }));
    const topHosts = hostResult.map(({ _id, count }) => ({ name: _id || "Unknown", count }));

    const hourlyMap = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
    hourlyResult.forEach(({ _id, count }) => { hourlyMap[_id] = count; });
    const hourlyDistribution = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`, count,
    }));

    const purposeBreakdown = purposeResult.map(({ _id, count }) => ({ name: _id || "Not specified", count }));

    const totalVisitors = dailyResult.reduce((sum, d) => sum + d.total, 0);

    res.json({
      statusDistribution,
      dailyTrend,
      topCompanies,
      topHosts,
      hourlyDistribution,
      purposeBreakdown,
      totalVisitors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get distinct filter values for advanced filter dropdowns
// @route GET /api/reports/filters
const getFilterOptions = async (req, res, next) => {
  try {
    const companies = await Visitor.distinct("company", { company: { $ne: "" } });
    const hosts = await Visitor.distinct("employeeName", { employeeName: { $ne: "" } });
    const purposes = await Visitor.distinct("purpose", { purpose: { $ne: "" } });

    res.json({
      companies: companies.sort(),
      hosts: hosts.sort(),
      purposes: purposes.sort(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getVisitorReport,
  getActivityLogs,
  getAnalytics,
  getFilterOptions,
};
