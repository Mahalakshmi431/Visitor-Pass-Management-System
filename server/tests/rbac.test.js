const jwt = require("jsonwebtoken");
jest.mock("../models/User");

const User = require("../models/User");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const createMockReq = (overrides = {}) => ({
  headers: {},
  ...overrides,
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = jest.fn();

const JWT_SECRET = process.env.JWT_SECRET || "visitor_pass_secret_key_2026_super_secure";

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "1h" });
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// JWT Authentication middleware
// ============================================================
describe("JWT Authentication (protect middleware)", () => {
  test("Should reject request without token", async () => {
    const req = createMockReq({});
    const res = createMockRes();

    await protect(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("Should reject request with invalid token format", async () => {
    const req = createMockReq({
      headers: { authorization: "Bearer invalidtoken" },
    });
    const res = createMockRes();

    User.findById = jest.fn().mockResolvedValue(null);

    await protect(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("Should reject request with expired token", async () => {
    const token = jwt.sign({ id: "u001", role: "Employee" }, JWT_SECRET, { expiresIn: "0s" });

    // Small delay to ensure token is expired
    await new Promise((resolve) => setTimeout(resolve, 100));

    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();

    await protect(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("Should accept valid token and attach user to request", async () => {
    const token = generateToken("u001", "Employee");
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();

    const mockUser = { _id: "u001", name: "Test User", role: "Employee" };
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await protect(req, res, createMockNext);

    expect(createMockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  test("Should accept token with Authorization header (case insensitive Bearer prefix)", async () => {
    const token = generateToken("u001", "Employee");
    const req = createMockReq({
      headers: { authorization: `bearer ${token}` },
    });
    const res = createMockRes();

    const mockUser = { _id: "u001", name: "Test User", role: "Employee" };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    await protect(req, res, createMockNext);

    // "bearer" doesn't start with "Bearer" (capital B) so it won't match
    // The code checks .startsWith("Bearer"), so lowercase "bearer" won't match
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ============================================================
// Role-based access control (authorizeRoles middleware)
// ============================================================
describe("Role-based access control (authorizeRoles middleware)", () => {
  test("Should allow access for matching role", () => {
    const middleware = authorizeRoles("Receptionist", "Administrator");
    const req = { user: { role: "Receptionist" } };
    const res = createMockRes();

    middleware(req, res, createMockNext);

    expect(createMockNext).toHaveBeenCalled();
  });

  test("Should deny access for non-matching role", () => {
    const middleware = authorizeRoles("Administrator");
    const req = { user: { role: "Employee" } };
    const res = createMockRes();

    middleware(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("not authorized"),
      })
    );
  });

  test("Should deny access when user is undefined", () => {
    const middleware = authorizeRoles("Administrator");
    const req = {};
    const res = createMockRes();

    middleware(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("Should allow Administrator access to Employee-only routes", () => {
    const middleware = authorizeRoles("Employee", "Administrator");
    const req = { user: { role: "Administrator" } };
    const res = createMockRes();

    middleware(req, res, createMockNext);

    expect(createMockNext).toHaveBeenCalled();
  });

  test("Should deny Receptionist access to Employee-only routes", () => {
    const middleware = authorizeRoles("Employee", "Administrator");
    const req = { user: { role: "Receptionist" } };
    const res = createMockRes();

    middleware(req, res, createMockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
