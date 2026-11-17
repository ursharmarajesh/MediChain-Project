const Patient = require("../models/Patient");
const Report = require("../models/Report");
const MedicalHistory = require("../models/MedicalHistory");

// Register patient by Admin, Doctor or Team
const registerPatient = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      age,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      emergencyContact,
    } = req.body;

    if (!name || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and mobile number are required",
      });
    }

    const mobile = String(mobileNumber).trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid 10 digit mobile number",
      });
    }

    const existingPatient = await Patient.findOne({
      mobileNumber: mobile,
    });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Patient with this mobile number already exists",
      });
    }

    let assignedDoctor = null;

    if (req.staff.role === "DOCTOR") {
      assignedDoctor = req.staff._id;
    } else if (req.staff.role === "TEAM") {
      assignedDoctor = req.staff.doctor;
    }

    const patient = await Patient.create({
      name: name.trim(),
      mobileNumber: mobile,
      email,
      age,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      emergencyContact,
      assignedDoctor,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient,
    });
  } catch (error) {
    console.error("Patient Registration Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Patient registration failed",
    });
  }
};

// Get logged-in patient's profile
const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.patientId,
      isActive: true,
    }).select("-__v");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Patient Profile Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient profile",
    });
  }
};

// Get complete dashboard data for logged-in patient
const getPatientDashboard = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.patientId,
      isActive: true,
    }).select("-__v");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const [reports, medicalHistory] = await Promise.all([
      Report.find({
        patient: patient._id,
        isActive: true,
      })
        .select(
          "reportTitle reportType fileName mimeType fileSize reportDate description createdAt"
        )
        .sort({ reportDate: -1 }),

      MedicalHistory.find({
        patient: patient._id,
      }).sort({ recordDate: -1 }),
    ]);

    return res.status(200).json({
      success: true,
      patient,
      reports,
      medicalHistory,
    });
  } catch (error) {
    console.error("Patient Dashboard Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient dashboard",
    });
  }
};

// Update logged-in patient's profile
const updatePatientProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "email",
      "age",
      "gender",
      "dateOfBirth",
      "bloodGroup",
      "address",
      "emergencyContact",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const patient = await Patient.findOneAndUpdate(
      {
        _id: req.patientId,
        isActive: true,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-__v");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Patient profile updated",
      patient,
    });
  } catch (error) {
    console.error("Patient Profile Update Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update patient profile",
    });
  }
};
// Get all patients for Admin Dashboard
const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      isActive: true,
    })
      .select(
        "uniqueId name mobileNumber email age gender bloodGroup assignedDoctor createdAt isActive"
      )
      .populate("assignedDoctor", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error("Get All Patients Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patients",
    });
  }
};

module.exports = {
  registerPatient,
  getPatientProfile,
  getPatientDashboard,
  updatePatientProfile,
  getAllPatients,
};