const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { notifyVisitorLifecycle, createBulkNotification } = require("../services/notificationService");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const generatePassCode = async () => {
  const dateStr = getTodayDateString().replace(/-/g, "");
  const count = await Visitor.countDocuments();
  const nextNum = String(count + 1).padStart(3, "0");
  return `VP-${dateStr}-${nextNum}`;
};

const logActivity = async (visitorId, passCode, action, req, remarks = "") => {
  try {
    await ActivityLog.create({
      visitorId,
      passCode,
      action,
      performedBy: req.user ? req.user.name : "System",
      performedById: req.user ? req.user._id : null,
      performedByRole: req.user ? req.user.role : "",
      remarks,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
};

const createVisitor = async (req, res, next) => {
  try {
    const {
      fullName, email, phone, company, govtIdType, govtIdNumber,
      employeeId, visitDate, expectedTime, purpose,
    } = req.body;

    if (!fullName || !email || !phone || !employeeId || !visitDate || !expectedTime || !purpose) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const todayStr = getTodayDateString();
    const currentTimeStr = getCurrentTimeString();

    if (visitDate < todayStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 3): Visit date cannot be earlier than the current date.",
      });
    }

    if (visitDate === todayStr && expectedTime < currentTimeStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 4): Expected arrival time cannot be earlier than the current time for today's visits.",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== "Employee") {
      return res.status(400).json({ message: "Selected employee is invalid or not found" });
    }

    const pendingCount = await Visitor.countDocuments({ employee: employeeId, status: "PENDING" });
    if (pendingCount >= 3) {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 5): Employee ${employee.name} already has ${pendingCount} pending requests awaiting approval (maximum 3 allowed).`,
      });
    }

    const normEmail = email.toLowerCase().trim();
    const normPhone = phone.trim();

    const activeVisit = await Visitor.findOne({
      $or: [{ email: normEmail }, { phone: normPhone }],
      status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
    });
    if (activeVisit) {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 1): Visitor already has an active visit pass (${activeVisit.passCode} - ${activeVisit.status}).`,
      });
    }

    const sameDateVisit = await Visitor.findOne({
      $or: [{ email: normEmail }, { phone: normPhone }],
      visitDate: visitDate,
      status: { $ne: "CANCELLED" },
    });
    if (sameDateVisit) {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 2): Visitor is already registered for a visit on ${visitDate}.`,
      });
    }

    const passCode = await generatePassCode();

    const visitor = await Visitor.create({
      passCode,
      fullName: fullName.trim(),
      email: normEmail,
      phone: normPhone,
      company: company || "Independent",
      govtIdType: govtIdType || "N/A",
      govtIdNumber: govtIdNumber || "",
      employee: employee._id,
      employeeName: employee.name,
      visitDate,
      expectedTime,
      purpose: purpose.trim(),
      status: "PENDING",
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    await logActivity(visitor._id, visitor.passCode, "CREATED", req, `Visit requested for employee ${employee.name}`);

    await notifyVisitorLifecycle(visitor, "VISITOR_REGISTERED", req.user);

    res.status(201).json(visitor);
  } catch (error) {
    next(error);
  }
};

const getVisitors = async (req, res, next) => {
  try {
    const { search, status, visitDate, includeCancelled } = req.query;

    const query = {};

    if (!includeCancelled || includeCancelled !== "true") {
      query.status = { $ne: "CANCELLED" };
    }

    if (status) {
      query.status = status;
    }

    if (visitDate) {
      query.visitDate = visitDate;
    }

    if (req.user.role === "Employee") {
      query.employee = req.user._id;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [
        { fullName: searchRegex },
        { employeeName: searchRegex },
        { passCode: searchRegex },
        { phone: searchRegex },
        { company: searchRegex },
      ];
    }

    const visitors = await Visitor.find(query)
      .populate("employee", "name email department phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json(visitors);
  } catch (error) {
    next(error);
  }
};

const getVisitorById = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate("employee", "name email department phone")
      .populate("createdBy", "name email role");

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    const logs = await ActivityLog.find({ visitorId: visitor._id }).sort({ timestamp: -1 });

    res.json({ visitor, activityLogs: logs });
  } catch (error) {
    next(error);
  }
};

const approveVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor request not found" });
    }

    if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not authorized to approve this request" });
    }

    if (visitor.status !== "PENDING") {
      return res.status(400).json({ message: `Cannot approve request with current status '${visitor.status}'` });
    }

    visitor.status = "APPROVED";
    if (remarks) visitor.remarks = remarks;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "APPROVED", req, remarks || "Approved by employee");
    await notifyVisitorLifecycle(visitor, "VISITOR_APPROVED", req.user);

    res.json({ message: "Visitor request approved successfully", visitor });
  } catch (error) {
    next(error);
  }
};

const rejectVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor request not found" });
    }

    if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not authorized to reject this request" });
    }

    if (visitor.status !== "PENDING") {
      return res.status(400).json({ message: `Cannot reject request with current status '${visitor.status}'` });
    }

    visitor.status = "REJECTED";
    if (remarks) visitor.remarks = remarks;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "REJECTED", req, remarks || "Rejected by employee");
    await notifyVisitorLifecycle(visitor, "VISITOR_REJECTED", req.user);

    res.json({ message: "Visitor request rejected", visitor });
  } catch (error) {
    next(error);
  }
};

const checkInVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status !== "APPROVED") {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 6/9): Visitors can only be checked in when status is APPROVED (Current status: ${visitor.status}).`,
      });
    }

    visitor.status = "CHECKED_IN";
    visitor.checkInTime = new Date();
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_IN", req, `Checked in at ${visitor.checkInTime.toLocaleTimeString()}`);
    await notifyVisitorLifecycle(visitor, "VISITOR_CHECKED_IN", req.user);

    res.json({ message: "Visitor checked in successfully", visitor });
  } catch (error) {
    next(error);
  }
};

const checkOutVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status !== "CHECKED_IN") {
      return res.status(400).json({ message: `Visitor is not currently checked in (Status: ${visitor.status})` });
    }

    const now = new Date();

    if (visitor.checkInTime && now <= new Date(visitor.checkInTime)) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 8): Check-out time must always be later than check-in time.",
      });
    }

    visitor.status = "CHECKED_OUT";
    visitor.checkOutTime = now;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_OUT", req, `Checked out at ${visitor.checkOutTime.toLocaleTimeString()}`);
    await notifyVisitorLifecycle(visitor, "VISITOR_CHECKED_OUT", req.user);

    res.json({ message: "Visitor checked out successfully", visitor });
  } catch (error) {
    next(error);
  }
};

const cancelVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status === "REJECTED") {
      return res.status(400).json({ message: "Business Rule Violation (Rule 10): Rejected visitor requests cannot be cancelled." });
    }

    if (visitor.status === "CHECKED_OUT") {
      return res.status(400).json({ message: "Cannot cancel a completed/checked-out visit" });
    }

    if (visitor.status === "CANCELLED") {
      return res.status(400).json({ message: "Visitor pass is already cancelled" });
    }

    visitor.status = "CANCELLED";
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CANCELLED", req, "Visit request cancelled");
    await notifyVisitorLifecycle(visitor, "VISITOR_CANCELLED", req.user);

    res.json({ message: "Visitor pass cancelled", visitor });
  } catch (error) {
    next(error);
  }
};

const updateVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status === "CHECKED_IN" || visitor.status === "CHECKED_OUT") {
      return res.status(400).json({ message: `Cannot edit details for visitor with status '${visitor.status}'` });
    }

    if (visitor.status === "REJECTED") {
      return res.status(400).json({ message: "Cannot edit a rejected visitor request" });
    }

    if (visitor.status === "CANCELLED") {
      return res.status(400).json({ message: "Cannot edit a cancelled visitor request" });
    }

    const {
      fullName, email, phone, company, govtIdType, govtIdNumber,
      employeeId, visitDate, expectedTime, purpose,
    } = req.body;

    const todayStr = getTodayDateString();
    const currentTimeStr = getCurrentTimeString();

    const newVisitDate = visitDate || visitor.visitDate;
    const newExpectedTime = expectedTime || visitor.expectedTime;
    const newEmail = email ? email.toLowerCase().trim() : visitor.email;
    const newPhone = phone ? phone.trim() : visitor.phone;
    const newEmployeeId = employeeId || visitor.employee;

    if (visitDate && visitDate < todayStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 3): Visit date cannot be earlier than the current date.",
      });
    }

    if (newVisitDate === todayStr && newExpectedTime < currentTimeStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 4): Expected arrival time cannot be earlier than the current time for today's visits.",
      });
    }

    const emailOrPhoneChanged = (email && email.toLowerCase().trim() !== visitor.email) || (phone && phone.trim() !== visitor.phone);
    const dateChanged = visitDate && visitDate !== visitor.visitDate;

    if (emailOrPhoneChanged || dateChanged) {
      const activeVisit = await Visitor.findOne({
        _id: { $ne: visitor._id },
        $or: [{ email: newEmail }, { phone: newPhone }],
        status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
      });
      if (activeVisit) {
        return res.status(400).json({
          message: `Business Rule Violation (Rule 1): Visitor already has an active visit pass (${activeVisit.passCode} - ${activeVisit.status}).`,
        });
      }

      const sameDateVisit = await Visitor.findOne({
        _id: { $ne: visitor._id },
        $or: [{ email: newEmail }, { phone: newPhone }],
        visitDate: newVisitDate,
        status: { $ne: "CANCELLED" },
      });
      if (sameDateVisit) {
        return res.status(400).json({
          message: `Business Rule Violation (Rule 2): Visitor is already registered for a visit on ${newVisitDate}.`,
        });
      }
    }

    if (employeeId && String(employeeId) !== String(visitor.employee)) {
      const employee = await User.findById(employeeId);
      if (!employee || employee.role !== "Employee") {
        return res.status(400).json({ message: "Selected employee is invalid or not found" });
      }

      const pendingCount = await Visitor.countDocuments({ employee: employeeId, status: "PENDING" });
      if (pendingCount >= 3) {
        return res.status(400).json({
          message: `Business Rule Violation (Rule 5): Employee ${employee.name} already has ${pendingCount} pending requests awaiting approval (maximum 3 allowed).`,
        });
      }

      visitor.employee = employee._id;
      visitor.employeeName = employee.name;
    }

    if (fullName) visitor.fullName = fullName.trim();
    if (email) visitor.email = email.toLowerCase().trim();
    if (phone) visitor.phone = phone.trim();
    if (company) visitor.company = company;
    if (govtIdType) visitor.govtIdType = govtIdType;
    if (govtIdNumber !== undefined) visitor.govtIdNumber = govtIdNumber;
    if (visitDate) visitor.visitDate = visitDate;
    if (expectedTime) visitor.expectedTime = expectedTime;
    if (purpose) visitor.purpose = purpose.trim();

    await visitor.save();

    res.json({ message: "Visitor details updated successfully", visitor });
  } catch (error) {
    next(error);
  }
};

// ─── Bulk Operations ─────────────────────────────────────────

const VALID_BULK_ACTIONS = {
  approve: { from: "PENDING", to: "APPROVED", notification: "BULK_APPROVED", logAction: "APPROVED", allowedRoles: ["Employee", "Administrator"] },
  reject: { from: "PENDING", to: "REJECTED", notification: "BULK_REJECTED", logAction: "REJECTED", allowedRoles: ["Employee", "Administrator"] },
  checkin: { from: "APPROVED", to: "CHECKED_IN", notification: "BULK_CHECKED_IN", logAction: "CHECKED_IN", allowedRoles: ["Receptionist", "Administrator"] },
  checkout: { from: "CHECKED_IN", to: "CHECKED_OUT", notification: "BULK_CHECKED_OUT", logAction: "CHECKED_OUT", allowedRoles: ["Receptionist", "Administrator"] },
};

const bulkOperation = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Please provide an array of visitor IDs" });
    }

    if (ids.length > 50) {
      return res.status(400).json({ message: "Cannot process more than 50 visitors at once" });
    }

    const config = VALID_BULK_ACTIONS[action];
    if (!config) {
      return res.status(400).json({ message: `Invalid bulk action: ${action}` });
    }

    const visitors = await Visitor.find({ _id: { $in: ids } });

    const results = { success: [], failed: [] };

    for (const visitor of visitors) {
      if (visitor.status !== config.from) {
        results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: `Status is ${visitor.status}, expected ${config.from}` });
        continue;
      }

      if (action === "reject" && req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
        results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Not authorized" });
        continue;
      }

      if (action === "approve") {
        const normEmail = visitor.email;
        const normPhone = visitor.phone;
        const activeVisit = await Visitor.findOne({
          _id: { $ne: visitor._id },
          $or: [{ email: normEmail }, { phone: normPhone }],
          status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
        });
        if (activeVisit) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: `Rule 1: Visitor has active pass ${activeVisit.passCode}` });
          continue;
        }

        const pendingCount = await Visitor.countDocuments({ employee: visitor.employee, status: "PENDING" });
        if (pendingCount >= 3) {
          const emp = await User.findById(visitor.employee).select("name");
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: `Rule 5: Employee ${emp?.name || "N/A"} at pending limit` });
          continue;
        }
      }

      visitor.status = config.to;
      if (action === "checkin") visitor.checkInTime = new Date();
      if (action === "checkout") visitor.checkOutTime = new Date();
      await visitor.save();

      await logActivity(visitor._id, visitor.passCode, config.logAction, req, `Bulk ${action}`);
      results.success.push({ id: visitor._id, passCode: visitor.passCode });
    }

    if (results.success.length > 0) {
      const employeeIds = [...new Set(visitors.filter((v) => results.success.some((s) => String(s.id) === String(v._id))).map((v) => String(v.employee)))];
      await createBulkNotification(employeeIds, config.notification, { count: results.success.length });
    }

    res.json({
      message: `Bulk ${action}: ${results.success.length} succeeded, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
