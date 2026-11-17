const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Patient = require("../models/Patient");

const SPECIALIZATIONS = [
  "General Physician",
  "Cardiologist",
  "Orthopedic",
  "Neurologist",
  "Neurosurgeon",
  "Gynecologist",
  "Obstetrician",
  "Pediatrician",
  "Dermatologist",
  "Ophthalmologist",
  "ENT Specialist",
  "Psychiatrist",
  "Psychologist",
  "Gastroenterologist",
  "Urologist",
  "Nephrologist",
  "Oncologist",
  "Pulmonologist",
  "Endocrinologist",
  "Dentist",
  "Radiologist",
  "Pathologist",
  "General Surgeon",
  "Physiotherapist",
  "Other",
];

// GET DOCTORS
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "DOCTOR" })
      .select("name email mobileNumber specialization role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("Admin Get Doctors:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctors",
    });
  }
};

// CREATE DOCTOR
exports.createDoctor = async (req, res) => {
  try {
    const { name, email, mobileNumber, password, specialization } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const mobile = String(mobileNumber || "").trim();

    if (!normalizedName || !normalizedEmail ||
        !/^[0-9]{10}$/.test(mobile) || !password ||
        String(password).length < 8 || !specialization) {
      return res.status(400).json({
        success: false,
        message: "All fields are required. Password must be at least 8 characters.",
      });
    }

    if (!SPECIALIZATIONS.includes(specialization)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor specialization",
      });
    }

    const existing = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { mobileNumber: mobile },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already registered",
      });
    }

    const doctor = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      mobileNumber: mobile,
      password,
      specialization,
      role: "DOCTOR",
      isActive: true,
      permissions: [],
    });

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        mobileNumber: doctor.mobileNumber,
        specialization: doctor.specialization,
        role: doctor.role,
        isActive: doctor.isActive,
      },
    });
  } catch (error) {
    console.error("Admin Create Doctor:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create doctor",
    });
  }
};

// EDIT DOCTOR
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, specialization, password } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await User.findOne({
      _id: id,
      role: "DOCTOR",
    }).select("+password");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (name !== undefined) doctor.name = String(name).trim();
    if (email !== undefined) doctor.email = String(email).trim().toLowerCase();

    if (mobileNumber !== undefined) {
      const mobile = String(mobileNumber).trim();

      if (!/^[0-9]{10}$/.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: "Enter valid 10 digit mobile number",
        });
      }

      doctor.mobileNumber = mobile;
    }

    if (specialization !== undefined) {
      if (!SPECIALIZATIONS.includes(specialization)) {
        return res.status(400).json({
          success: false,
          message: "Invalid specialization",
        });
      }
      doctor.specialization = specialization;
    }

    if (password) {
      if (String(password).length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      doctor.password = password;
    }

    await doctor.save();

    return res.json({
      success: true,
      message: "Doctor updated successfully",
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        mobileNumber: doctor.mobileNumber,
        specialization: doctor.specialization,
        isActive: doctor.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already exists",
      });
    }

    console.error("Admin Update Doctor:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update doctor",
    });
  }
};

// DELETE DOCTOR
exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await User.findOne({
      _id: id,
      role: "DOCTOR",
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Prevent deleting doctors who still own patients or team accounts.
    const [patientCount, teamCount] = await Promise.all([
      Patient.countDocuments({ assignedDoctor: doctor._id }),
      User.countDocuments({ doctor: doctor._id, role: "TEAM" }),
    ]);

    if (patientCount > 0 || teamCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This doctor has linked patients or team members. Deactivate the account instead of deleting it.",
        patientCount,
        teamCount,
      });
    }

    await User.deleteOne({ _id: doctor._id });

    return res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    console.error("Admin Delete Doctor:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete doctor",
    });
  }
};

// CHANGE ADMIN PASSWORD
exports.changeAdminPassword = async (req, res) => {
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

    const admin = await User.findOne({
      _id: req.staff._id,
      role: "ADMIN",
      isActive: true,
    }).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    const valid = await admin.comparePassword(currentPassword);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    admin.password = newPassword;
    await admin.save();

    return res.json({
      success: true,
      message: "Admin password changed successfully. Please log in again with your new password.",
    });
  } catch (error) {
    console.error("Admin Change Password:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

// UPDATE DOCTOR ACTIVE STATUS
exports.updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id) || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID or status",
      });
    }

    const doctor = await User.findOneAndUpdate(
      { _id: id, role: "DOCTOR" },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("name email mobileNumber specialization isActive");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.json({
      success: true,
      message: "Doctor status updated successfully",
      doctor,
    });
  } catch (error) {
    console.error("Admin Doctor Status:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update doctor status",
    });
  }
};