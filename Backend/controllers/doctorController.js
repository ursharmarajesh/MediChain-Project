const mongoose = require("mongoose");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Report = require("../models/Report");

// CREATE DOCTOR
const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      mobileNumber,
      password,
      specialization,
    } = req.body;

    if (
      !name ||
      !email ||
      !mobileNumber ||
      !password ||
      !specialization
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including specialization are required",
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

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { mobileNumber: normalizedMobile },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already exists",
      });
    }

    const doctor = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      mobileNumber: normalizedMobile,
      password,
      specialization: String(specialization).trim(),
      role: "DOCTOR",
      permissions: [],
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      doctor: {
        _id: doctor._id,
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        mobileNumber: doctor.mobileNumber,
        specialization: doctor.specialization,
        role: doctor.role,
        isActive: doctor.isActive,
      },
    });
  } catch (error) {
    console.error("Create Doctor Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create doctor",
    });
  }
};

// GET ALL DOCTORS
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      role: "DOCTOR",
    })
      .select(
        "name email mobileNumber specialization role isActive createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("Get Doctors Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctors",
    });
  }
};

// GET SINGLE DOCTOR
const getDoctorById = async (req, res) => {
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
    }).select(
      "name email mobileNumber specialization role isActive createdAt"
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("Get Doctor Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctor",
    });
  }
};

// ACTIVATE / DEACTIVATE DOCTOR
const updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const doctor = await User.findOneAndUpdate(
      {
        _id: id,
        role: "DOCTOR",
      },
      {
        $set: { isActive },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("name email role specialization isActive");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor status updated successfully",
      doctor,
    });
  } catch (error) {
    console.error("Update Doctor Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update doctor status",
    });
  }
};

// DOCTOR DASHBOARD SUMMARY
const getDoctorDashboard = async (req, res) => {
  try {
    if (!req.staff || !req.staff._id) {
      return res.status(401).json({
        success: false,
        message: "Doctor authentication required",
      });
    }

    const doctorId = req.staff._id;

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "DOCTOR",
      isActive: true,
    }).select("name email role specialization");

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "Doctor account not found or inactive",
      });
    }

    const patients = await Patient.find({
      assignedDoctor: doctor._id,
      isActive: true,
    })
      .select(
        "uniqueId name mobileNumber email age gender dateOfBirth bloodGroup address emergencyContact createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const patientIds = patients.map((patient) => patient._id);

    const reports = patientIds.length
      ? await Report.find({
          patient: { $in: patientIds },
          isActive: true,
        })
          .select(
            "patient reportTitle reportType fileName mimeType fileSize reportDate description uploadedBy createdAt"
          )
          .sort({ reportDate: -1 })
          .lean()
      : [];

    const reportsMap = {};

    reports.forEach((report) => {
      const patientKey = report.patient.toString();

      if (!reportsMap[patientKey]) {
        reportsMap[patientKey] = [];
      }

      reportsMap[patientKey].push(report);
    });

    const patientData = patients.map((patient) => {
      const patientReports =
        reportsMap[patient._id.toString()] || [];

      return {
        ...patient,
        reports: patientReports,
        reportCount: patientReports.length,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Doctor dashboard fetched successfully",

      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialization: doctor.specialization,
      },

      summary: {
        totalPatients: patients.length,
        totalReports: reports.length,
      },

      patients: patientData,
    });
  } catch (error) {
    console.error("Doctor Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctor dashboard",
    });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  getDoctorDashboard,
};