const jwt = require("jsonwebtoken");
const User = require("../models/User");

const staffLogin = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const user = await User.findOne({ email })
      .select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect =
      await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!["ADMIN", "DOCTOR", "TEAM"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Invalid staff role",
      });
    }

    if (user.role === "TEAM" && !user.doctor) {
      return res.status(403).json({
        success: false,
        message: "Team account is not linked to a doctor",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Staff login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        specialization: user.specialization || "",
        doctor: user.doctor,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error("Staff Login Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Staff login failed",
    });
  }
};

// CHANGE PASSWORD - logged-in staff only
const changeStaffPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.staff._id)
      .select("+password");

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "Staff account not found",
      });
    }

    const passwordMatches =
      await user.comparePassword(currentPassword);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change Staff Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

module.exports = {
  staffLogin,
  changeStaffPassword,
};