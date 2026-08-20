const {
  Visitor,
  User,
  ActivityLog,
  createMockReq,
  createMockRes,
  createMockNext,
  getTodayString,
  getCurrentTimeString,
  getFutureDateString,
  getPastDateString,
  getFutureTimeString,
  getPastTimeString,
  resetMocks,
  validVisitorBody,
} = require("./setup");

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

beforeEach(() => {
  resetMocks();
});

// ============================================================
// RULE 1: A visitor cannot have more than one active visit
// RULE 2: Duplicate visitor registrations on same date blocked
// ============================================================
describe("Rule 1 & 2: Visitor uniqueness constraints", () => {
  test("Rule 1 - Should reject visitor with an active visit (PENDING status)", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    // Mock: employee exists
    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    // Mock: employee has < 3 pending
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    // Mock: active visit already exists
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce({ passCode: "VP-20260818-001", status: "PENDING" }) // active visit check
      .mockResolvedValueOnce(null); // same-date check

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 1"),
      })
    );
  });

  test("Rule 1 - Should reject visitor with an active visit (APPROVED status)", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce({ passCode: "VP-20260818-002", status: "APPROVED" })
      .mockResolvedValueOnce(null);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 1"),
      })
    );
  });

  test("Rule 1 - Should reject visitor with an active visit (CHECKED_IN status)", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce({ passCode: "VP-20260818-003", status: "CHECKED_IN" })
      .mockResolvedValueOnce(null);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 1"),
      })
    );
  });

  test("Rule 1 - Should allow visitor with only completed/cancelled past visits", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce(null) // no active visit
      .mockResolvedValueOnce(null); // no same-date visit
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    const mockVisitor = { _id: "v001", passCode: "VP-20260818-001", save: jest.fn() };
    Visitor.create = jest.fn().mockResolvedValue(mockVisitor);

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  test("Rule 2 - Should reject duplicate registration for same visitor on same date", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce(null) // no active visit
      .mockResolvedValueOnce({ passCode: "VP-20260818-001", visitDate: body.visitDate }); // same date visit exists

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 2"),
      })
    );
  });

  test("Rule 2 - Should allow re-registration if previous visit was cancelled", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce(null) // no active visit
      .mockResolvedValueOnce(null); // same-date visits are all cancelled
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(Visitor.create).toHaveBeenCalled();
  });

  test("Rule 1 - Should match visitor by phone even if email differs", async () => {
    const body = { ...validVisitorBody(), email: "newemail@example.com" };
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn()
      .mockResolvedValueOnce({ passCode: "VP-20260818-001", status: "APPROVED" }) // active visit matched by phone
      .mockResolvedValueOnce(null);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 1"),
      })
    );
  });
});

// ============================================================
// RULE 3: Visit date cannot be earlier than the current date
// ============================================================
describe("Rule 3: Visit date validation", () => {
  test("Should reject visit date in the past", async () => {
    const body = { ...validVisitorBody(), visitDate: getPastDateString(1) };
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 3"),
      })
    );
  });

  test("Should reject visit date significantly in the past", async () => {
    const body = { ...validVisitorBody(), visitDate: getPastDateString(30) };
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 3"),
      })
    );
  });

  test("Should accept today's date as visit date", async () => {
    const body = { ...validVisitorBody(), visitDate: getTodayString(), expectedTime: getFutureTimeString(60) };
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  test("Should accept future date as visit date", async () => {
    const body = { ...validVisitorBody(), visitDate: getFutureDateString(7) };
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});

// ============================================================
// RULE 4: For today's visits, expected time cannot be in the past
// ============================================================
describe("Rule 4: Expected arrival time validation for today", () => {
  test("Should reject past arrival time for today's visit", async () => {
    const body = {
      ...validVisitorBody(),
      visitDate: getTodayString(),
      expectedTime: getPastTimeString(30),
    };
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 4"),
      })
    );
  });

  test("Should accept future arrival time for today's visit", async () => {
    const body = {
      ...validVisitorBody(),
      visitDate: getTodayString(),
      expectedTime: getFutureTimeString(60),
    };
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  test("Should NOT enforce Rule 4 for future dates (time check is date-specific)", async () => {
    const body = {
      ...validVisitorBody(),
      visitDate: getFutureDateString(1),
      expectedTime: "06:00", // early morning, but it's for tomorrow
    };
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});

// ============================================================
// RULE 5: Employee max 3 pending requests
// ============================================================
describe("Rule 5: Employee pending request limit", () => {
  test("Should reject when employee has exactly 3 pending requests", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(3);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 5"),
      })
    );
  });

  test("Should reject when employee has more than 3 pending requests", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(5);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 5"),
      })
    );
  });

  test("Should allow when employee has fewer than 3 pending requests", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(2);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(Visitor.create).toHaveBeenCalled();
  });

  test("Should allow when employee has 0 pending requests", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Employee" });
    Visitor.countDocuments = jest.fn().mockResolvedValue(0);
    Visitor.findOne = jest.fn().mockResolvedValue(null);
    Visitor.create = jest.fn().mockResolvedValue({ _id: "v001", passCode: "VP-20260818-001", save: jest.fn() });

    await createVisitor(req, res, createMockNext);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});

// ============================================================
// RULE 6: Visitors can only be checked in after approval
// RULE 7: Cannot check in again if already checked in
// RULE 9: Rejected visitors cannot be checked in
// ============================================================
describe("Rules 6, 7, 9: Check-in state transitions", () => {
  test("Rule 6 - Should reject check-in for PENDING visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "PENDING",
      checkInTime: null,
    });

    await checkInVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 6"),
      })
    );
  });

  test("Rule 9 - Should reject check-in for REJECTED visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "REJECTED",
      checkInTime: null,
    });

    await checkInVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 6/9"),
      })
    );
  });

  test("Rule 7 - Should reject check-in for already CHECKED_IN visitor (caught by Rule 6 status check)", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_IN",
      checkInTime: new Date(),
    });

    await checkInVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 6"),
      })
    );
  });

  test("Should allow check-in for APPROVED visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "APPROVED",
      checkInTime: null,
      save: jest.fn(),
      passCode: "VP-20260818-001",
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await checkInVisitor(req, res, createMockNext);

    expect(mockVisitor.status).toBe("CHECKED_IN");
    expect(mockVisitor.checkInTime).toBeInstanceOf(Date);
    expect(mockVisitor.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Visitor checked in successfully" })
    );
  });

  test("Rule 6 - Should reject check-in for CHECKED_OUT visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_OUT",
      checkInTime: new Date(Date.now() - 3600000),
    });

    await checkInVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 6"),
      })
    );
  });
});

// ============================================================
// RULE 8: Check-out time must be later than check-in time
// ============================================================
describe("Rule 8: Check-out time must be later than check-in time", () => {
  test("Rule 8 - Should reject checkout if check-out time equals check-in time", async () => {
    const checkInTime = new Date(Date.now() + 5000); // 5 seconds in the future
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_IN",
      checkInTime: checkInTime,
      save: jest.fn(),
    });

    await checkOutVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Rule 8"),
      })
    );
  });

  test("Should allow checkout when check-out is after check-in", async () => {
    const checkIn = new Date(Date.now() - 3600000); // 1 hour ago
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "CHECKED_IN",
      checkInTime: checkIn,
      save: jest.fn(),
      passCode: "VP-20260818-001",
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await checkOutVisitor(req, res, createMockNext);

    expect(mockVisitor.status).toBe("CHECKED_OUT");
    expect(mockVisitor.checkOutTime).toBeInstanceOf(Date);
    expect(mockVisitor.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Visitor checked out successfully" })
    );
  });

  test("Should reject checkout for non-CHECKED_IN visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "APPROVED",
      checkInTime: null,
    });

    await checkOutVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ============================================================
// RULE 10: Cancelled visits hidden from active visitor list
// ============================================================
describe("Rule 10: Cancelled visits excluded from active list", () => {
  test("Should exclude cancelled visits by default", async () => {
    const req = createMockReq({ query: {} });
    const res = createMockRes();

    Visitor.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    });

    await getVisitors(req, res, createMockNext);

    expect(Visitor.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $ne: "CANCELLED" },
      })
    );
  });

  test("Should include cancelled visits when includeCancelled=true", async () => {
    const req = createMockReq({ query: { includeCancelled: "true" } });
    const res = createMockRes();

    Visitor.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    });

    await getVisitors(req, res, createMockNext);

    expect(Visitor.find).toHaveBeenCalledWith(
      expect.not.objectContaining({
        status: { $ne: "CANCELLED" },
      })
    );
  });

  test("Should set status to CANCELLED when cancel is called", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "PENDING",
      save: jest.fn(),
      passCode: "VP-20260818-001",
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await cancelVisitor(req, res, createMockNext);

    expect(mockVisitor.status).toBe("CANCELLED");
    expect(mockVisitor.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Visitor pass cancelled" })
    );
  });

  test("Should reject cancellation for CHECKED_OUT visit", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_OUT",
    });

    await cancelVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Cannot cancel a completed/checked-out visit"),
      })
    );
  });
});

// ============================================================
// Additional lifecycle tests
// ============================================================
describe("Visitor lifecycle: approve/reject transitions", () => {
  test("Should reject approval for non-PENDING visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "APPROVED",
      employee: "emp001",
    });

    await approveVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject rejection for non-PENDING visitor", async () => {
    const req = createMockReq({ params: { id: "v001" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "APPROVED",
      employee: "emp001",
    });

    await rejectVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should allow Employee to approve only their own assigned request", async () => {
    const req = createMockReq({
      params: { id: "v001" },
      user: { _id: "emp001", name: "Emp One", role: "Employee" },
    });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "PENDING",
      employee: "emp002", // different employee
      save: jest.fn(),
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await approveVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("Should allow Admin to approve any request", async () => {
    const req = createMockReq({
      params: { id: "v001" },
      user: { _id: "admin001", name: "Admin", role: "Administrator" },
    });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "PENDING",
      employee: "emp002",
      save: jest.fn(),
      passCode: "VP-20260818-001",
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await approveVisitor(req, res, createMockNext);

    expect(mockVisitor.status).toBe("APPROVED");
    expect(mockVisitor.save).toHaveBeenCalled();
  });
});

// ============================================================
// Update visitor validation
// ============================================================
describe("Update visitor: state restrictions", () => {
  test("Should reject update for CHECKED_IN visitor", async () => {
    const req = createMockReq({ params: { id: "v001" }, body: { fullName: "New Name" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_IN",
    });

    await updateVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject update for CHECKED_OUT visitor", async () => {
    const req = createMockReq({ params: { id: "v001" }, body: { fullName: "New Name" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue({
      _id: "v001",
      status: "CHECKED_OUT",
    });

    await updateVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should allow update for PENDING visitor", async () => {
    const req = createMockReq({ params: { id: "v001" }, body: { fullName: "Updated Name" } });
    const res = createMockRes();

    const mockVisitor = {
      _id: "v001",
      status: "PENDING",
      fullName: "Old Name",
      save: jest.fn(),
    };
    Visitor.findById = jest.fn().mockResolvedValue(mockVisitor);

    await updateVisitor(req, res, createMockNext);

    expect(mockVisitor.fullName).toBe("Updated Name");
    expect(mockVisitor.save).toHaveBeenCalled();
  });
});

// ============================================================
// Required fields validation
// ============================================================
describe("Required fields validation", () => {
  test("Should reject when fullName is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.fullName;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when email is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.email;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when phone is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.phone;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when employeeId is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.employeeId;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when visitDate is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.visitDate;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when expectedTime is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.expectedTime;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject when purpose is missing", async () => {
    const body = { ...validVisitorBody() };
    delete body.purpose;
    const req = createMockReq({ body });
    const res = createMockRes();

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject invalid employee (not Employee role)", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({ _id: "emp001", name: "Emp One", role: "Receptionist" });

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("invalid"),
      })
    );
  });

  test("Should reject when employee not found", async () => {
    const body = validVisitorBody();
    const req = createMockReq({ body });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue(null);

    await createVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ============================================================
// Visitor not found
// ============================================================
describe("Visitor not found handling", () => {
  test("Should return 404 for non-existent visitor", async () => {
    const req = createMockReq({ params: { id: "nonexistent" } });
    const res = createMockRes();

    const chainMock = {
      populate: jest.fn().mockReturnThis(),
      then: (resolve) => resolve(null),
    };
    chainMock[Symbol.for("jest.mock.details")] = undefined;

    // Mock findById to return a thenable that resolves to null
    Visitor.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await getVisitorById(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("Should return 404 for approve on non-existent visitor", async () => {
    const req = createMockReq({ params: { id: "nonexistent" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue(null);

    await approveVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("Should return 404 for check-in on non-existent visitor", async () => {
    const req = createMockReq({ params: { id: "nonexistent" } });
    const res = createMockRes();

    Visitor.findById = jest.fn().mockResolvedValue(null);

    await checkInVisitor(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
