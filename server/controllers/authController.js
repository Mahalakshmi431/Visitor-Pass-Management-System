const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is deactivated. Contact Administrator." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
    };

    res.json({
      ...userResponse,
      token: generateToken(user._id, user.role, userResponse),
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
      return res.json(req.user);
    }
    res.json(user);
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
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// @desc Admin: Get all users
// @route GET /api/users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password -demoPassword").sort({ createdAt: -1 });
    res.json(users);
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

    res.json(
      users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        password: u.demoPassword || "",
      }))
    );
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
      return res.status(400).json({ message: "User with this email already exists" });
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

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
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
      return res.status(404).json({ message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User status updated to ${user.isActive ? "Active" : "Inactive"}` });
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
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
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
  changePassword,
};

