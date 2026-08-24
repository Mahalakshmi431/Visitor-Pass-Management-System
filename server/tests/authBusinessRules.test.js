jest.mock("../models/Visitor");
jest.mock("../models/User");
jest.mock("../models/ActivityLog");

const User = require("../models/User");
const { createMockReq, createMockRes, createMockNext, resetMocks } = require("./setup");

const {
  loginUser,
  createUser,
  changePassword,
  toggleUserStatus,
} = require("../controllers/authController");

beforeEach(() => {
  resetMocks();
});

// ============================================================
// Login business rules
// ============================================================
describe("Login validation", () => {
  test("Should reject login without email", async () => {
    const req = createMockReq({ body: { password: "pass123" } });
    const res = createMockRes();

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Please provide email and password" })
    );
  });

  test("Should reject login without password", async () => {
    const req = createMockReq({ body: { email: "test@test.com" } });
    const res = createMockRes();

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject login without both email and password", async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject login for non-existent user", async () => {
    const req = createMockReq({ body: { email: "noone@test.com", password: "pass123" } });
    const res = createMockRes();

    User.findOne = jest.fn().mockResolvedValue(null);

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid email or password" })
    );
  });

  test("Should reject login with wrong password", async () => {
    const req = createMockReq({ body: { email: "test@test.com", password: "wrongpass" } });
    const res = createMockRes();

    const mockUser = {
      _id: "u001",
      name: "Test User",
      email: "test@test.com",
      role: "Employee",
      department: "IT",
      phone: "1234567890",
      isActive: true,
      matchPassword: jest.fn().mockResolvedValue(false),
    };
    User.findOne = jest.fn().mockResolvedValue(mockUser);

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("Should reject login for deactivated user", async () => {
    const req = createMockReq({ body: { email: "test@test.com", password: "pass123" } });
    const res = createMockRes();

    const mockUser = {
      _id: "u001",
      name: "Test User",
      email: "test@test.com",
      role: "Employee",
      isActive: false,
      matchPassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(mockUser);

    await loginUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("deactivated"),
      })
    );
  });

  test("Should allow login with correct credentials for active user", async () => {
    const req = createMockReq({ body: { email: "test@test.com", password: "pass123" } });
    const res = createMockRes();

    const mockUser = {
      _id: "u001",
      name: "Test User",
      email: "test@test.com",
      role: "Employee",
      department: "IT",
      phone: "1234567890",
      isActive: true,
      matchPassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(mockUser);

    await loginUser(req, res, createMockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          _id: "u001",
          name: "Test User",
          token: expect.any(String),
        }),
      })
    );
  });

  test("Should normalize email to lowercase before lookup", async () => {
    const req = createMockReq({ body: { email: "TEST@Test.COM", password: "pass123" } });
    const res = createMockRes();

    const mockUser = {
      _id: "u001",
      name: "Test User",
      email: "test@test.com",
      role: "Employee",
      department: "IT",
      phone: "1234567890",
      isActive: true,
      matchPassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(mockUser);

    await loginUser(req, res, createMockNext);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@test.com" });
  });
});

// ============================================================
// User creation business rules
// ============================================================
describe("User creation validation", () => {
  test("Should reject duplicate email", async () => {
    const req = createMockReq({
      body: { name: "New User", email: "existing@test.com", password: "pass123", role: "Employee" },
    });
    const res = createMockRes();

    User.findOne = jest.fn().mockResolvedValue({ _id: "existing", email: "existing@test.com" });

    await createUser(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("already exists"),
      })
    );
  });

  test("Should create user with default role Employee when no role specified", async () => {
    const req = createMockReq({
      body: { name: "New User", email: "new@test.com", password: "pass123" },
    });
    const res = createMockRes();

    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue({
      _id: "u002",
      name: "New User",
      email: "new@test.com",
      role: "Employee",
      department: "General",
      phone: "",
    });

    await createUser(req, res, createMockNext);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "Employee" })
    );
  });

  test("Should normalize email to lowercase on creation", async () => {
    const req = createMockReq({
      body: { name: "New User", email: "NEW@TEST.COM", password: "pass123" },
    });
    const res = createMockRes();

    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue({
      _id: "u002",
      name: "New User",
      email: "new@test.com",
      role: "Employee",
      department: "General",
      phone: "",
    });

    await createUser(req, res, createMockNext);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@test.com" })
    );
  });

  test("Should store demoPassword same as password", async () => {
    const req = createMockReq({
      body: { name: "New User", email: "new@test.com", password: "secretpass" },
    });
    const res = createMockRes();

    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue({
      _id: "u002",
      name: "New User",
      email: "new@test.com",
      role: "Employee",
      department: "General",
      phone: "",
    });

    await createUser(req, res, createMockNext);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ demoPassword: "secretpass" })
    );
  });
});

// ============================================================
// Password change business rules
// ============================================================
describe("Password change validation", () => {
  test("Should reject change without current password", async () => {
    const req = createMockReq({
      body: { newPassword: "newpass123" },
      user: { _id: "u001" },
    });
    const res = createMockRes();

    await changePassword(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject change without new password", async () => {
    const req = createMockReq({
      body: { currentPassword: "oldpass" },
      user: { _id: "u001" },
    });
    const res = createMockRes();

    await changePassword(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("Should reject new password shorter than 6 characters", async () => {
    const req = createMockReq({
      body: { currentPassword: "oldpass", newPassword: "12345" },
      user: { _id: "u001" },
    });
    const res = createMockRes();

    await changePassword(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("at least 6 characters"),
      })
    );
  });

  test("Should reject change with incorrect current password", async () => {
    const req = createMockReq({
      body: { currentPassword: "wrongpass", newPassword: "newpass123" },
      user: { _id: "u001" },
    });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue({
      _id: "u001",
      matchPassword: jest.fn().mockResolvedValue(false),
    });

    await changePassword(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("incorrect"),
      })
    );
  });

  test("Should allow password change with correct current password", async () => {
    const req = createMockReq({
      body: { currentPassword: "oldpass", newPassword: "newpass123" },
      user: { _id: "u001" },
    });
    const res = createMockRes();

    const mockUser = {
      _id: "u001",
      password: "hashedoldpass",
      matchPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    await changePassword(req, res, createMockNext);

    expect(mockUser.password).toBe("newpass123");
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Password updated successfully" })
    );
  });
});

// ============================================================
// Toggle user status
// ============================================================
describe("Toggle user status", () => {
  test("Should toggle active to inactive", async () => {
    const req = createMockReq({ params: { id: "u001" } });
    const res = createMockRes();

    const mockUser = { _id: "u001", isActive: true, save: jest.fn() };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    await toggleUserStatus(req, res, createMockNext);

    expect(mockUser.isActive).toBe(false);
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Inactive") })
    );
  });

  test("Should toggle inactive to active", async () => {
    const req = createMockReq({ params: { id: "u001" } });
    const res = createMockRes();

    const mockUser = { _id: "u001", isActive: false, save: jest.fn() };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    await toggleUserStatus(req, res, createMockNext);

    expect(mockUser.isActive).toBe(true);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Active") })
    );
  });

  test("Should return 404 for non-existent user", async () => {
    const req = createMockReq({ params: { id: "nonexistent" } });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue(null);

    await toggleUserStatus(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
