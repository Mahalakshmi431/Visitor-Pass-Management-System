const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/responseHelper");

const generateToken = (id, role, userObj) => {
  return jwt.sign(
    { id, role, user: userObj },
    process.env.JWT_SECRET || "visitor_pass_secret_key_2026_super_secure",
    { expiresIn: "7d" }
  );
};

// @desc Login user
// @route POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, { message: "Please provide email and password", statusCode: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return sendError(res, { message: "Invalid email or password", statusCode: 401 });
    }

    if (!user.isActive) {
      return sendError(res, { message: "Your account is deactivated. Contact Administrator.", statusCode: 403 });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, { message: "Invalid email or password", statusCode: 401 });
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
    };

    sendSuccess(res, {
      data: {
        ...userResponse,
        token: generateToken(user._id, user.role, userResponse),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return sendSuccess(res, { data: req.user });
    }
    sendSuccess(res, { data: user });
  } catch (error) {
    next(error);
  }
};

// @desc Get all employees (for dropdowns and user listing)
// @route GET /api/users/employees
const getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: "Employee", isActive: true })
      .select("name email department phone")
      .sort({ name: 1 });
    sendSuccess(res, { data: employees });
  } catch (error) {
    next(error);
  }
};

// @desc Admin: Get all users
// @route GET /api/users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password -demoPassword").sort({ createdAt: -1 });
    sendSuccess(res, { data: users });
  } catch (error) {
    next(error);
  }
};

// @desc Get demo quick-fill login accounts (for the login screen)
// @route GET /api/auth/demo-accounts
const getDemoAccounts = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select("+demoPassword name email role department")
      .sort({ createdAt: 1 });

    sendSuccess(res, {
      data: users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        password: u.demoPassword || "",
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc Admin: Create new user account
// @route POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, { message: "User with this email already exists", statusCode: 400 });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      demoPassword: password,
      role: role || "Employee",
      department: department || "General",
      phone: phone || "",
    });

    sendSuccess(res, {
      statusCode: 201,
      message: "User created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Admin: Toggle user status
// @route PUT /api/users/:id/toggle-status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, { message: "User not found", statusCode: 404 });
    }
    user.isActive = !user.isActive;
    await user.save();
    sendSuccess(res, { message: `User status updated to ${user.isActive ? "Active" : "Inactive"}`, data: { isActive: user.isActive } });
  } catch (error) {
    next(error);
  }
};

// @desc Admin: Update user details
// @route PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, department, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, { message: "User not found", statusCode: 404 });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return sendError(res, { message: "Email already in use by another account", statusCode: 400 });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    sendSuccess(res, {
      message: "User updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Change password
// @route PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, { message: "Please provide current and new password", statusCode: 400 });
    }

    if (newPassword.length < 6) {
      return sendError(res, { message: "New password must be at least 6 characters long", statusCode: 400 });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, { message: "User not found", statusCode: 404 });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return sendError(res, { message: "Current password is incorrect", statusCode: 400 });
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, { message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile
// @route PUT /api/auth/update-profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, department } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, { message: "User not found", statusCode: 404 });
    }
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    await user.save();
    sendSuccess(res, {
      message: "Profile updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  getMe,
  getDemoAccounts,
  getEmployees,
  getAllUsers,
  createUser,
  toggleUserStatus,
  updateUser,
  changePassword,
  updateProfile,
};
