
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check authorization header
    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Allow only authenticated patients
    if (
      !decoded.patientId ||
      decoded.role !== "PATIENT"
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid patient access",
      });
    }

    // Attach patient ID
    req.patientId = decoded.patientId;
    

    req.user = decoded;

    next();

  } catch (error) {
    console.error("Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
