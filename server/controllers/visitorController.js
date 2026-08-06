const Visitor = require("../models/Visitor");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

// Helper to get formatted dates
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

// Generate pass code
const generatePassCode = async () => {
  const dateStr = getTodayDateString().replace(/-/g, "");
  const count = await Visitor.countDocuments();
  const nextNum = String(count + 1).padStart(3, "0");
  return `VP-${dateStr}-${nextNum}`;
};

// Log activity helper
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

// @desc Register a new visitor
// @route POST /api/visitors
// @access Receptionist / Admin
const createVisitor = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      company,
      govtIdType,
      govtIdNumber,
      employeeId,
      visitDate,
      expectedTime,
      purpose,
    } = req.body;

    // Basic fields validation
    if (!fullName || !email || !phone || !employeeId || !visitDate || !expectedTime || !purpose) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const todayStr = getTodayDateString();
    const currentTimeStr = getCurrentTimeString();

    // RULE 3: Visit date cannot be earlier than the current date
    if (visitDate < todayStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 3): Visit date cannot be earlier than the current date.",
      });
    }

    // RULE 4: For today's registrations, expected arrival time cannot be earlier than current time
    if (visitDate === todayStr && expectedTime < currentTimeStr) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 4): Expected arrival time cannot be earlier than the current time for today's visits.",
      });
    }

    // Check Employee exists
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== "Employee") {
      return res.status(400).json({ message: "Selected employee is invalid or not found" });
    }

    // RULE 5: An employee cannot have more than three pending visitor requests awaiting approval
    const pendingCount = await Visitor.countDocuments({
      employee: employeeId,
      status: "PENDING",
    });

    if (pendingCount >= 3) {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 5): Employee ${employee.name} already has ${pendingCount} pending requests awaiting approval (maximum 3 allowed).`,
      });
    }

    const normEmail = email.toLowerCase().trim();
    const normPhone = phone.trim();

    // RULE 1: A visitor cannot have more than one active visit at the same time
    const activeVisit = await Visitor.findOne({
      $or: [{ email: normEmail }, { phone: normPhone }],
      status: { $in: ["PENDING", "APPROVED", "CHECKED_IN"] },
    });

    if (activeVisit) {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 1): Visitor already has an active visit pass (${activeVisit.passCode} - ${activeVisit.status}).`,
      });
    }

    // RULE 2: Duplicate visitor registrations for the same visitor on the same date should not be allowed
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

    // Log CREATED activity
    await logActivity(visitor._id, visitor.passCode, "CREATED", req, `Visit requested for employee ${employee.name}`);

    res.status(201).json(visitor);
  } catch (error) {
    next(error);
  }
};

// @desc Get visitors with search & filters
// @route GET /api/visitors
// @access All authenticated roles (scoped by role)
const getVisitors = async (req, res, next) => {
  try {
    const { search, status, visitDate, includeCancelled } = req.query;

    const query = {};

    // RULE 10: Cancelled visits should not appear in active visitor lists by default
    if (!includeCancelled || includeCancelled !== "true") {
      query.status = { $ne: "CANCELLED" };
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Visit Date filter
    if (visitDate) {
      query.visitDate = visitDate;
    }

    // Role-based scope: Employee can only view requests assigned to them
    if (req.user.role === "Employee") {
      query.employee = req.user._id;
    }

    // Search filter: Visitor Name, Employee Name, Phone, Pass Code
    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
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
      .sort({ createdAt: -1 });

    res.json(visitors);
  } catch (error) {
    next(error);
  }
};

// @desc Get visitor details by ID
// @route GET /api/visitors/:id
const getVisitorById = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate("employee", "name email department phone")
      .populate("createdBy", "name email role");

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    // Fetch activity history
    const logs = await ActivityLog.find({ visitorId: visitor._id }).sort({ timestamp: -1 });

    res.json({
      visitor,
      activityLogs: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Employee approves visitor request
// @route PUT /api/visitors/:id/approve
// @access Employee (assigned to visit) / Admin
const approveVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor request not found" });
    }

    // Ensure authorized employee
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

    res.json({ message: "Visitor request approved successfully", visitor });
  } catch (error) {
    next(error);
  }
};

// @desc Employee rejects visitor request
// @route PUT /api/visitors/:id/reject
// @access Employee / Admin
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

    res.json({ message: "Visitor request rejected", visitor });
  } catch (error) {
    next(error);
  }
};

// @desc Receptionist checks in visitor
// @route PUT /api/visitors/:id/checkin
// @access Receptionist / Admin
const checkInVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    // RULE 9: Rejected visitor requests cannot be checked in
    if (visitor.status === "REJECTED") {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 9): Rejected visitor requests cannot be checked in.",
      });
    }

    // RULE 6: Visitors can only be checked in after approval
    if (visitor.status !== "APPROVED") {
      return res.status(400).json({
        message: `Business Rule Violation (Rule 6): Visitors can only be checked in after approval (Current status: ${visitor.status}).`,
      });
    }

    // RULE 7: A visitor who is already checked in cannot be checked in again until checked out
    if (visitor.status === "CHECKED_IN") {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 7): Visitor is already checked in.",
      });
    }

    visitor.status = "CHECKED_IN";
    visitor.checkInTime = new Date();
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_IN", req, `Checked in at ${visitor.checkInTime.toLocaleTimeString()}`);

    res.json({ message: "Visitor checked in successfully", visitor });
  } catch (error) {
    next(error);
  }
};

// @desc Receptionist checks out visitor
// @route PUT /api/visitors/:id/checkout
// @access Receptionist / Admin
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

    // RULE 8: Check-out time must always be later than check-in time
    if (visitor.checkInTime && now <= new Date(visitor.checkInTime)) {
      return res.status(400).json({
        message: "Business Rule Violation (Rule 8): Check-out time must always be later than check-in time.",
      });
    }

    visitor.status = "CHECKED_OUT";
    visitor.checkOutTime = now;
    await visitor.save();

    await logActivity(visitor._id, visitor.passCode, "CHECKED_OUT", req, `Checked out at ${visitor.checkOutTime.toLocaleTimeString()}`);

    res.json({ message: "Visitor checked out successfully", visitor });
  } catch (error) {
    next(error);
  }
};

// @desc Cancel visit request
// @route PUT /api/visitors/:id/cancel
// @access Admin / Receptionist
const cancelVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status === "CHECKED_OUT") {
      return res.status(400).json({ message: "Cannot cancel a completed/checked-out visit" });
    }

    visitor.status = "CANCELLED";
    await visitor.save();

    // RULE 10: Cancelled visits should not appear in active visitor lists
    await logActivity(visitor._id, visitor.passCode, "CANCELLED", req, "Visit request cancelled");

    res.json({ message: "Visitor pass cancelled", visitor });
  } catch (error) {
    next(error);
  }
};

// @desc Update visitor pass details
// @route PUT /api/visitors/:id
// @access Receptionist / Admin
const updateVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    if (visitor.status === "CHECKED_IN" || visitor.status === "CHECKED_OUT") {
      return res.status(400).json({ message: `Cannot edit details for visitor with status '${visitor.status}'` });
    }

    const {
      fullName,
      email,
      phone,
      company,
      govtIdType,
      govtIdNumber,
      employeeId,
      visitDate,
      expectedTime,
      purpose,
    } = req.body;

    if (fullName) visitor.fullName = fullName.trim();
    if (email) visitor.email = email.toLowerCase().trim();
    if (phone) visitor.phone = phone.trim();
    if (company) visitor.company = company;
    if (govtIdType) visitor.govtIdType = govtIdType;
    if (govtIdNumber !== undefined) visitor.govtIdNumber = govtIdNumber;
    if (visitDate) visitor.visitDate = visitDate;
    if (expectedTime) visitor.expectedTime = expectedTime;
    if (purpose) visitor.purpose = purpose.trim();

    if (employeeId && String(employeeId) !== String(visitor.employee)) {
      const employee = await User.findById(employeeId);
      if (employee) {
        visitor.employee = employee._id;
        visitor.employeeName = employee.name;
      }
    }

    await visitor.save();

    res.json({ message: "Visitor details updated successfully", visitor });
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
};

