
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const staffAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Staff authentication token required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff token",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Staff account is inactive or not found",
      });
    }

    if (
      !["ADMIN", "DOCTOR", "TEAM"].includes(user.role) ||
      user.role !== decoded.role
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid staff permissions",
      });
    }

    if (user.role === "TEAM" && !user.doctor) {
      return res.status(403).json({
        success: false,
        message: "Team account is not linked to a doctor",
      });
    }

    req.staff = user;
    req.staffId = user._id;
    req.staffRole = user.role;

    next();

  } catch (error) {
    console.error("Staff Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired staff token",
    });
  }
};

// Restrict routes according to staff roles
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.staff || !roles.includes(req.staff.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission",
      });
    }

    next();
  };
};

module.exports = {
  staffAuthMiddleware,
  allowRoles
};
