const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - JWT verification
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "visitor_pass_secret_key_2026_super_secure"
      );

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        req.user = decoded.user || decoded;
      }
      return next();
    } catch (error) {
      if (error.name === "MongooseError" || error.name === "MongoServerError" || error.message.includes("buffering timed out")) {
        return res.status(503).json({ message: "Service temporarily unavailable. Database connection issue." });
      }
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Authorize specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user ? req.user.role : "Unknown"}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };