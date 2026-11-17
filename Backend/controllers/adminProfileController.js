const User = require("../models/User");

// GET ADMIN PROFILE
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findOne({
      _id: req.staff._id,
      role: "ADMIN",
      isActive: true,
    }).select("name email mobileNumber role");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    return res.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error("Get Admin Profile:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch admin profile",
    });
  }
};

// UPDATE ADMIN PROFILE
exports.updateAdminProfile = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    const admin = await User.findOne({
      _id: req.staff._id,
      role: "ADMIN",
      isActive: true,
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    // Check whether another account already uses this email.
    const existingUser = await User.findOne({
      email,
      _id: { $ne: admin._id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered with another account",
      });
    }

    admin.name = name;
    admin.email = email;

    await admin.save();

    return res.json({
      success: true,
      message: "Admin profile updated successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        mobileNumber: admin.mobileNumber,
        role: admin.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    console.error("Update Admin Profile:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update admin profile",
    });
  }
};