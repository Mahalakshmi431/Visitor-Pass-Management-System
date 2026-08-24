const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { notifyVisitorLifecycle, createBulkNotification } = require("../services/notificationService");
const { sendSuccess, sendError } = require("../utils/responseHelper");

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
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VP-${dateStr}-${rand}`;
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
      return sendError(res, { message: "Please provide all required fields", statusCode: 400 });
    }

    const todayStr = getTodayDateString();
    const currentTimeStr = getCurrentTimeString();

    if (visitDate < todayStr) {
      return sendError(res, {
        message: "Business Rule Violation (Rule 3): Visit date cannot be earlier than the current date.",
        statusCode: 400,
      });
    }

    if (visitDate === todayStr && expectedTime < currentTimeStr) {
      return sendError(res, {
        message: "Business Rule Violation (Rule 4): Expected arrival time cannot be earlier than the current time for today's visits.",
        statusCode: 400,
      });
    }

    const [employee, pendingCount] = await Promise.all([
      User.findById(employeeId),
      Visitor.countDocuments({ employee: employeeId, status: "PENDING" }),
    ]);
    if (!employee || employee.role !== "Employee") {
      return sendError(res, { message: "Selected employee is invalid or not found", statusCode: 400 });
    }

    if (pendingCount >= 3) {
      return sendError(res, {
        message: `Business Rule Violation (Rule 5): Employee ${employee.name} already has ${pendingCount} pending requests awaiting approval (maximum 3 allowed).`,
        statusCode: 400,
      });
    }

    const normEmail = email.toLowerCase().trim();
    const normPhone = phone.trim();

    const [activeVisit, sameDateVisit] = await Promise.all([
      Visitor.findOne({
        $or: [{ email: normEmail }, { phone: normPhone }],
        status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
      }),
      Visitor.findOne({
        $or: [{ email: normEmail }, { phone: normPhone }],
        visitDate: visitDate,
        status: { $ne: "CANCELLED" },
      }),
    ]);
    if (activeVisit) {
      return sendError(res, {
        message: `Business Rule Violation (Rule 1): Visitor already has an active visit pass (${activeVisit.passCode} - ${activeVisit.status}).`,
        statusCode: 400,
      });
    }

    if (sameDateVisit) {
      return sendError(res, {
        message: `Business Rule Violation (Rule 2): Visitor is already registered for a visit on ${visitDate}.`,
        statusCode: 400,
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

    sendSuccess(res, { statusCode: 201, message: "Visitor registered successfully", data: visitor });
  } catch (error) {
    next(error);
  }
};

const getVisitors = async (req, res, next) => {
  try {
    const { search, status, visitDate, includeCancelled } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    } else if (!includeCancelled || includeCancelled !== "true") {
      query.status = { $ne: "CANCELLED" };
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

    sendSuccess(res, { data: visitors });
  } catch (error) {
    next(error);
  }
};

const getVisitorById = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate("employee", "name email department phone")
      .populate("createdBy", "name email role")
      .lean();

    if (!visitor) {
      return sendError(res, { message: "Visitor pass not found", statusCode: 404 });
    }

    const logs = await ActivityLog.find({ visitorId: visitor._id })
      .select("-visitorId -passCode -__v")
      .sort({ timestamp: -1 })
      .lean();

    sendSuccess(res, { data: { visitor, activityLogs: logs } });
  } catch (error) {
    next(error);
  }
};

const approveVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor request not found", statusCode: 404 });
    }

    if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
      return sendError(res, { message: "You are not authorized to approve this request", statusCode: 403 });
    }

    if (visitor.status !== "PENDING") {
      return sendError(res, { message: `Cannot approve: only PENDING requests can be approved (current status: ${visitor.status})`, statusCode: 400 });
    }

    visitor.status = "APPROVED";
    if (remarks) visitor.remarks = remarks;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "APPROVED", req, remarks || "Approved by employee");
    await notifyVisitorLifecycle(visitor, "VISITOR_APPROVED", req.user);

    sendSuccess(res, { message: "Visitor request approved successfully", data: visitor });
  } catch (error) {
    next(error);
  }
};

const rejectVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor request not found", statusCode: 404 });
    }

    if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
      return sendError(res, { message: "You are not authorized to reject this request", statusCode: 403 });
    }

    if (visitor.status !== "PENDING") {
      return sendError(res, { message: `Cannot reject: only PENDING requests can be rejected (current status: ${visitor.status})`, statusCode: 400 });
    }

    visitor.status = "REJECTED";
    if (remarks) visitor.remarks = remarks;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "REJECTED", req, remarks || "Rejected by employee");
    await notifyVisitorLifecycle(visitor, "VISITOR_REJECTED", req.user);

    sendSuccess(res, { message: "Visitor request rejected", data: visitor });
  } catch (error) {
    next(error);
  }
};

const checkInVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor pass not found", statusCode: 404 });
    }

    if (visitor.status !== "APPROVED") {
      return sendError(res, {
        message: `Business Rule Violation (Rule 6/9): Visitors can only be checked in when status is APPROVED (Current status: ${visitor.status}).`,
        statusCode: 400,
      });
    }

    visitor.status = "CHECKED_IN";
    visitor.checkInTime = new Date();
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_IN", req, `Checked in at ${visitor.checkInTime.toLocaleTimeString()}`);
    await notifyVisitorLifecycle(visitor, "VISITOR_CHECKED_IN", req.user);

    sendSuccess(res, { message: "Visitor checked in successfully", data: visitor });
  } catch (error) {
    next(error);
  }
};

const checkOutVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor pass not found", statusCode: 404 });
    }

    if (visitor.status !== "CHECKED_IN") {
      return sendError(res, { message: `Cannot check out: visitor must be CHECKED_IN (current status: ${visitor.status})`, statusCode: 400 });
    }

    const now = new Date();

    if (visitor.checkInTime && now <= new Date(visitor.checkInTime)) {
      return sendError(res, {
        message: "Business Rule Violation (Rule 8): Check-out time must always be later than check-in time.",
        statusCode: 400,
      });
    }

    visitor.status = "CHECKED_OUT";
    visitor.checkOutTime = now;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_OUT", req, `Checked out at ${visitor.checkOutTime.toLocaleTimeString()}`);
    await notifyVisitorLifecycle(visitor, "VISITOR_CHECKED_OUT", req.user);

    sendSuccess(res, { message: "Visitor checked out successfully", data: visitor });
  } catch (error) {
    next(error);
  }
};

const cancelVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor pass not found", statusCode: 404 });
    }

    if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
      return sendError(res, { message: "You are not authorized to cancel this request", statusCode: 403 });
    }

    if (visitor.status === "REJECTED") {
      return sendError(res, { message: "Business Rule Violation (Rule 10): Rejected visitor requests cannot be cancelled.", statusCode: 400 });
    }

    if (visitor.status === "CHECKED_OUT") {
      return sendError(res, { message: "Cannot cancel: visit is already completed (CHECKED_OUT)", statusCode: 400 });
    }

    if (visitor.status === "CANCELLED") {
      return sendError(res, { message: "Cannot cancel: visit is already cancelled", statusCode: 400 });
    }

    visitor.status = "CANCELLED";
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CANCELLED", req, "Visit request cancelled");
    await notifyVisitorLifecycle(visitor, "VISITOR_CANCELLED", req.user);

    sendSuccess(res, { message: "Visitor pass cancelled", data: visitor });
  } catch (error) {
    next(error);
  }
};

const updateVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return sendError(res, { message: "Visitor pass not found", statusCode: 404 });
    }

    if (visitor.status === "CHECKED_IN" || visitor.status === "CHECKED_OUT") {
      return sendError(res, { message: `Cannot edit: visitor is ${visitor.status.toLowerCase()} and details are locked`, statusCode: 400 });
    }

    if (visitor.status === "REJECTED") {
      return sendError(res, { message: "Cannot edit: rejected visitor requests cannot be modified", statusCode: 400 });
    }

    if (visitor.status === "CANCELLED") {
      return sendError(res, { message: "Cannot edit: cancelled visitor requests cannot be modified", statusCode: 400 });
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
      return sendError(res, {
        message: "Business Rule Violation (Rule 3): Visit date cannot be earlier than the current date.",
        statusCode: 400,
      });
    }

    if (newVisitDate === todayStr && newExpectedTime < currentTimeStr) {
      return sendError(res, {
        message: "Business Rule Violation (Rule 4): Expected arrival time cannot be earlier than the current time for today's visits.",
        statusCode: 400,
      });
    }

    const emailOrPhoneChanged = (email && email.toLowerCase().trim() !== visitor.email) || (phone && phone.trim() !== visitor.phone);
    const dateChanged = visitDate && visitDate !== visitor.visitDate;

    if (emailOrPhoneChanged || dateChanged) {
      const [activeVisit, sameDateVisit] = await Promise.all([
        Visitor.findOne({
          _id: { $ne: visitor._id },
          $or: [{ email: newEmail }, { phone: newPhone }],
          status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
        }),
        Visitor.findOne({
          _id: { $ne: visitor._id },
          $or: [{ email: newEmail }, { phone: newPhone }],
          visitDate: newVisitDate,
          status: { $ne: "CANCELLED" },
        }),
      ]);
      if (activeVisit) {
        return sendError(res, {
          message: `Business Rule Violation (Rule 1): Visitor already has an active visit pass (${activeVisit.passCode} - ${activeVisit.status}).`,
          statusCode: 400,
        });
      }

      if (sameDateVisit) {
        return sendError(res, {
          message: `Business Rule Violation (Rule 2): Visitor is already registered for a visit on ${newVisitDate}.`,
          statusCode: 400,
        });
      }
    }

    if (employeeId && String(employeeId) !== String(visitor.employee)) {
      const [employee, pendingCount] = await Promise.all([
        User.findById(employeeId),
        Visitor.countDocuments({ employee: employeeId, status: "PENDING" }),
      ]);
      if (!employee || employee.role !== "Employee") {
        return sendError(res, { message: "Selected employee is invalid or not found", statusCode: 400 });
      }

      if (pendingCount >= 3) {
        return sendError(res, {
          message: `Business Rule Violation (Rule 5): Employee ${employee.name} already has ${pendingCount} pending requests awaiting approval (maximum 3 allowed).`,
          statusCode: 400,
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

    sendSuccess(res, { message: "Visitor details updated successfully", data: visitor });
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

const logBulkActivity = async (successVisitors, action, req, remarks) => {
  try {
    const now = new Date();
    const logs = successVisitors.map((v) => ({
      visitorId: v._id,
      passCode: v.passCode,
      action,
      performedBy: req.user ? req.user.name : "System",
      performedById: req.user ? req.user._id : null,
      performedByRole: req.user ? req.user.role : "",
      remarks: remarks || "",
      timestamp: now,
    }));
    await ActivityLog.insertMany(logs);
  } catch (err) {
    console.error("Failed to log bulk activity:", err.message);
  }
};

const bulkOperation = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, { message: "Please provide an array of visitor IDs", statusCode: 400 });
    }

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > 50) {
      return sendError(res, { message: "Cannot process more than 50 unique visitors at once", statusCode: 400 });
    }

    const config = VALID_BULK_ACTIONS[action];
    if (!config) {
      return sendError(res, { message: "Invalid bulk action: " + action, statusCode: 400 });
    }

    if (!config.allowedRoles.includes(req.user.role)) {
      return sendError(res, { message: "Role '" + req.user.role + "' is not authorized for bulk " + action + " operations", statusCode: 403 });
    }

    const visitors = await Visitor.find({ _id: { $in: uniqueIds } });

    const foundIds = new Set(visitors.map((v) => String(v._id)));
    const results = { success: [], failed: [] };

    for (const id of uniqueIds) {
      if (!foundIds.has(String(id))) {
        results.failed.push({ id, reason: "Visitor not found" });
      }
    }

    if (action === "approve") {
      const allEmails = visitors.map((v) => v.email);
      const allPhones = visitors.map((v) => v.phone);
      const allEmployeeIds = [...new Set(visitors.map((v) => String(v.employee)))];

      const [activeVisits, pendingAgg] = await Promise.all([
        Visitor.find({
          _id: { $nin: visitors.map((v) => v._id) },
          $or: [
            { email: { $in: allEmails } },
            { phone: { $in: allPhones } },
          ],
          status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
        }).select("email phone passCode status").lean(),
        Visitor.aggregate([
          { $match: { employee: { $in: allEmployeeIds }, status: "PENDING" } },
          { $group: { _id: "$employee", count: { $sum: 1 } } },
        ]),
      ]);

      const activeVisitMap = {};
      for (const av of activeVisits) {
        activeVisitMap[av.email] = av;
        activeVisitMap[av.phone] = av;
      }

      const pendingCountMap = {};
      for (const row of pendingAgg) {
        pendingCountMap[String(row._id)] = row.count;
      }

      const bulkOps = [];
      const successVisitors = [];

      for (const visitor of visitors) {
        if (visitor.status !== config.from) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Status is " + visitor.status + ", expected " + config.from });
          continue;
        }

        if (req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Not authorized to approve this visitor" });
          continue;
        }

        const activeMatch = activeVisitMap[visitor.email] || activeVisitMap[visitor.phone];
        if (activeMatch) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Rule 1: Visitor has active pass " + activeMatch.passCode });
          continue;
        }

        const empId = String(visitor.employee);
        const currentCount = pendingCountMap[empId] || 0;
        if (currentCount >= 3) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Rule 5: Employee at pending limit" });
          continue;
        }

        pendingCountMap[empId] = currentCount - 1;
        bulkOps.push({ updateOne: { filter: { _id: visitor._id }, update: { $set: { status: config.to } } } });
        successVisitors.push(visitor);
        results.success.push({ id: visitor._id, passCode: visitor.passCode });
      }

      if (bulkOps.length > 0) {
        await Visitor.bulkWrite(bulkOps, { ordered: false });
        await logBulkActivity(successVisitors, config.logAction, req, "Bulk " + action);
        const employeeIds = [...new Set(successVisitors.map((v) => String(v.employee)))];
        await createBulkNotification(employeeIds, config.notification, { count: results.success.length });
      }
    } else {
      const bulkOps = [];
      const successVisitors = [];

      for (const visitor of visitors) {
        if (visitor.status !== config.from) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Status is " + visitor.status + ", expected " + config.from });
          continue;
        }

        if (action === "reject" && req.user.role === "Employee" && String(visitor.employee) !== String(req.user._id)) {
          results.failed.push({ id: visitor._id, passCode: visitor.passCode, reason: "Not authorized to reject this visitor" });
          continue;
        }

        const update = { $set: { status: config.to } };
        if (action === "checkin") update.$set.checkInTime = new Date();
        if (action === "checkout") update.$set.checkOutTime = new Date();

        bulkOps.push({ updateOne: { filter: { _id: visitor._id }, update } });
        successVisitors.push(visitor);
        results.success.push({ id: visitor._id, passCode: visitor.passCode });
      }

      if (bulkOps.length > 0) {
        await Visitor.bulkWrite(bulkOps, { ordered: false });
        await logBulkActivity(successVisitors, config.logAction, req, "Bulk " + action);
        const employeeIds = [...new Set(successVisitors.map((v) => String(v.employee)))];
        await createBulkNotification(employeeIds, config.notification, { count: results.success.length });
      }
    }

    sendSuccess(res, {
      message: "Bulk " + action + ": " + results.success.length + " succeeded, " + results.failed.length + " failed",
      data: results,
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
