
const MedicalHistory = require("../models/MedicalHistory");
const Patient = require("../models/Patient");

// Add Medical History
const addMedicalHistory = async (req, res) => {
  try {
    const {
      diagnosis,
      symptoms,
      treatment,
      medicines,
      doctorName,
      notes,
      recordDate,
    } = req.body;

    if (!diagnosis || typeof diagnosis !== "string") {
      return res.status(400).json({
        success: false,
        message: "Diagnosis is required",
      });
    }

    const patient = await Patient.findOne({
      _id: req.patientId,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const history = await MedicalHistory.create({
      patient: patient._id,
      diagnosis,
      symptoms: symptoms || [],
      treatment: treatment || "",
      medicines: medicines || [],
      doctorName: doctorName || "",
      notes: notes || "",
      recordDate: recordDate || new Date(),
    });

    await Patient.findByIdAndUpdate(patient._id, {
      $addToSet: { medicalHistory: history._id },
    });

    return res.status(201).json({
      success: true,
      message: "Medical history added successfully",
      history,
    });
  } catch (error) {
    console.error("Add Medical History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add medical history",
    });
  }
};

// Get Patient Medical History
const getMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.patientId,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const histories = await MedicalHistory.find({
      patient: patient._id,
    }).sort({ recordDate: -1 });

    return res.status(200).json({
      success: true,
      count: histories.length,
      histories,
    });
  } catch (error) {
    console.error("Get Medical History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch medical history",
    });
  }
};

// Get Single Medical History Record
const getSingleMedicalHistory = async (req, res) => {
  try {
    const history = await MedicalHistory.findOne({
      _id: req.params.id,
      patient: req.patientId,
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Medical history record not found",
      });
    }

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch medical history record",
    });
  }
};

module.exports = {
  addMedicalHistory,
  getMedicalHistory,
  getSingleMedicalHistory,
};
