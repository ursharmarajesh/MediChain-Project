
const mongoose = require("mongoose");
const User = require("../models/User");

// Create Team Member
const createTeamMember = async (req, res) => {
  try {
    const {
      name,
      email,
      mobileNumber,
      password,
      doctorId,
    } = req.body;

    if (!name || !email || !mobileNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobile = String(mobileNumber).trim();

    if (!/^[0-9]{10}$/.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid 10 digit mobile number",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    let assignedDoctorId;

    // Admin can select any active doctor
    if (req.staff.role === "ADMIN") {
      if (!doctorId || !mongoose.isValidObjectId(doctorId)) {
        return res.status(400).json({
          success: false,
          message: "Valid doctor ID is required",
        });
      }

      assignedDoctorId = doctorId;
    }

    // Doctor can create team only for himself
    else if (req.staff.role === "DOCTOR") {
      assignedDoctorId = req.staff._id;
    }

    else {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Doctor can create team members",
      });
    }

    const doctor = await User.findOne({
      _id: assignedDoctorId,
      role: "DOCTOR",
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Active doctor not found",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { mobileNumber: normalizedMobile },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already registered",
      });
    }

    const teamMember = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      mobileNumber: normalizedMobile,
      password,
      role: "TEAM",
      doctor: doctor._id,
      permissions: [],
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Team member created successfully",
      teamMember: {
        id: teamMember._id,
        name: teamMember.name,
        email: teamMember.email,
        mobileNumber: teamMember.mobileNumber,
        role: teamMember.role,
        doctor: teamMember.doctor,
      },
    });

  } catch (error) {
    console.error("Create Team Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create team member",
    });
  }
};


// Get Doctor Team
const getDoctorTeam = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    // Doctor can view only his own team
    if (
      req.staff.role === "DOCTOR" &&
      req.staff._id.toString() !== doctorId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own team",
      });
    }

    // Only Admin and Doctor can view team
    if (!["ADMIN", "DOCTOR"].includes(req.staff.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission",
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

    const team = await User.find({
      doctor: doctorId,
      role: "TEAM",
    })
      .select("name email mobileNumber role isActive createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: team.length,
      team,
    });

  } catch (error) {
    console.error("Get Doctor Team Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctor team",
    });
  }
};

module.exports = {
  createTeamMember,
  getDoctorTeam
};
