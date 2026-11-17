const User = require("../models/User");

// Logged-in user changes their own password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const user = await User.findById(req.staff._id).select("+password");

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "Active account not found",
      });
    }

    const passwordMatches = await user.comparePassword(currentPassword);

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
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

// Admin resets a doctor's password
const adminResetDoctorPassword = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "DOCTOR",
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.password = newPassword;
    await doctor.save();

    return res.status(200).json({
      success: true,
      message: "Doctor password reset successfully",
    });
  } catch (error) {
    console.error("Admin Reset Doctor Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset doctor password",
    });
  }
};

module.exports = {
  changePassword,
  adminResetDoctorPassword,
};