
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");

// Assign patient to doctor
const assignPatientToDoctor = async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID and Doctor ID are required",
      });
    }

    if (
      !mongoose.isValidObjectId(patientId) ||
      !mongoose.isValidObjectId(doctorId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Patient ID or Doctor ID",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Active patient not found",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "DOCTOR",
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Active doctor not found",
      });
    }

    patient.assignedDoctor = doctor._id;
    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Patient assigned to doctor successfully",
      assignment: {
        patientId: patient._id,
        patientName: patient.name,
        doctorId: doctor._id,
        doctorName: doctor.name,
      },
    });
  } catch (error) {
    console.error("Patient Assignment Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to assign patient",
    });
  }
};

module.exports = {
  assignPatientToDoctor,
};
