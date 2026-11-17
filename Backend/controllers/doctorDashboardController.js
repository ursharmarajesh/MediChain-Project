const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const Report = require("../models/Report");
const User = require("../models/User");
const MedicalHistory = require("../models/MedicalHistory");

const getOwnerDoctorId = (staff) =>
  staff.role === "TEAM" ? staff.doctor : staff._id;

const getDoctorPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      assignedDoctor: getOwnerDoctorId(req.staff),
      isActive: true,
    })
      .select(
        "uniqueId name mobileNumber email age gender dateOfBirth bloodGroup address emergencyContact assignedDoctor isActive createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    console.error("Doctor Patients Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch assigned patients",
    });
  }
};

const createDoctorPatient = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email = "",
      age,
      gender = "",
      dateOfBirth,
      bloodGroup = "",
      address = "",
      emergencyContact = "",
    } = req.body;

    const mobile = String(mobileNumber || "").trim();

    if (!String(name || "").trim() || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message:
          "Patient name and valid 10-digit mobile number are required",
      });
    }

    const existing = await Patient.findOne({
      mobileNumber: mobile,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }

    const patient = await Patient.create({
      name: String(name).trim(),
      mobileNumber: mobile,
      email: String(email).trim().toLowerCase(),
      age: age === "" || age === undefined ? null : Number(age),
      gender,
      dateOfBirth: dateOfBirth || null,
      bloodGroup,
      address,
      emergencyContact,
      assignedDoctor: req.staff._id,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered and assigned to your account",
      patient,
    });
  } catch (error) {
    console.error("Create Doctor Patient Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register patient",
    });
  }
};

const getDoctorPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      assignedDoctor: getOwnerDoctorId(req.staff),
      isActive: true,
    }).populate("medicalHistory");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Assigned patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Doctor Patient Details Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient details",
    });
  }
};

const getDoctorPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      assignedDoctor: getOwnerDoctorId(req.staff),
      isActive: true,
    }).select("_id name uniqueId");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Assigned patient not found",
      });
    }

    const reports = await Report.find({
      patient: patient._id,
      isActive: true,
    })
      .select("-filePath")
      .populate("uploadedBy", "name email role")
      .sort({ reportDate: -1 });

    return res.status(200).json({
      success: true,
      patient: {
        id: patient._id,
        name: patient.name,
        uniqueId: patient.uniqueId,
      },
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Doctor Patient Reports Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient reports",
    });
  }
};

const addDoctorMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const {
      diagnosis,
      symptoms = [],
      treatment = "",
      medicines = [],
      doctorName = "",
      notes = "",
      recordDate,
    } = req.body;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    if (!String(diagnosis || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Diagnosis is required",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      assignedDoctor: getOwnerDoctorId(req.staff),
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Assigned patient not found",
      });
    }

    const history = await MedicalHistory.create({
      patient: patient._id,
      diagnosis: String(diagnosis).trim(),
      symptoms: Array.isArray(symptoms)
        ? symptoms
        : String(symptoms)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
      treatment,
      medicines: Array.isArray(medicines)
        ? medicines
        : String(medicines)
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
      doctorName: doctorName || req.staff.name,
      notes,
      recordDate: recordDate || new Date(),
    });

    await Patient.updateOne(
      { _id: patient._id },
      { $addToSet: { medicalHistory: history._id } }
    );

    return res.status(201).json({
      success: true,
      message: "Medical record added",
      history,
    });
  } catch (error) {
    console.error("Add Doctor Medical History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add medical record",
    });
  }
};

const getDoctorDashboardTeam = async (req, res) => {
  try {
    const team = await User.find({
      doctor: req.staff._id,
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
    console.error("Doctor Team Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch team members",
    });
  }
};


const updateDoctorPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }
    const patient = await Patient.findOne({
      _id: patientId,
      assignedDoctor: getOwnerDoctorId(req.staff),
      isActive: true,
    });
    if (!patient) return res.status(404).json({ success: false, message: "Assigned patient not found" });

    const allowed = ["name", "mobileNumber", "email", "age", "gender", "dateOfBirth", "bloodGroup", "address", "emergencyContact"];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === "age" && (req.body[key] === "" || req.body[key] == null)) {
          patient[key] = null;
        } else if (key === "dateOfBirth" && !req.body[key]) {
          patient[key] = null;
        } else if (key === "email") {
          patient[key] = String(req.body[key] || "").trim().toLowerCase();
        } else {
          patient[key] = req.body[key];
        }
      }
    }
    await patient.save();
    return res.json({ success: true, message: "Patient updated successfully", patient });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Mobile number already registered" });
    console.error("Update Doctor Patient Error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update patient" });
  }
};

// Soft-delete the patient to preserve linked clinical/report records and auditability.
const deleteDoctorPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.isValidObjectId(patientId)) return res.status(400).json({ success: false, message: "Invalid patient ID" });
    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, assignedDoctor: getOwnerDoctorId(req.staff), isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: "Assigned patient not found" });
    return res.json({ success: true, message: "Patient has been deactivated and removed from your active list" });
  } catch (error) {
    console.error("Delete Doctor Patient Error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to delete patient" });
  }
};

const updateDoctorMedicalHistory = async (req, res) => {
  try {
    const { patientId, historyId } = req.params;
    if (!mongoose.isValidObjectId(patientId) || !mongoose.isValidObjectId(historyId)) {
      return res.status(400).json({ success: false, message: "Invalid patient or history ID" });
    }
    const patient = await Patient.findOne({ _id: patientId, assignedDoctor: getOwnerDoctorId(req.staff), isActive: true }).select("_id");
    if (!patient) return res.status(404).json({ success: false, message: "Assigned patient not found" });
    const history = await MedicalHistory.findOne({ _id: historyId, patient: patient._id });
    if (!history) return res.status(404).json({ success: false, message: "Medical history record not found" });

    const fields = ["diagnosis", "symptoms", "treatment", "medicines", "doctorName", "notes", "recordDate"];
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        history[key] = ["symptoms", "medicines"].includes(key) && !Array.isArray(req.body[key])
          ? String(req.body[key] || "").split(key === "symptoms" ? "," : "\n").map(v => v.trim()).filter(Boolean)
          : req.body[key];
      }
    }
    await history.save();
    return res.json({ success: true, message: "Medical history updated successfully", history });
  } catch (error) {
    console.error("Update Doctor Medical History Error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update medical history" });
  }
};

const deleteDoctorMedicalHistory = async (req, res) => {
  try {
    const { patientId, historyId } = req.params;
    if (!mongoose.isValidObjectId(patientId) || !mongoose.isValidObjectId(historyId)) {
      return res.status(400).json({ success: false, message: "Invalid patient or history ID" });
    }
    const patient = await Patient.findOne({ _id: patientId, assignedDoctor: getOwnerDoctorId(req.staff), isActive: true }).select("_id");
    if (!patient) return res.status(404).json({ success: false, message: "Assigned patient not found" });
    const history = await MedicalHistory.findOneAndDelete({ _id: historyId, patient: patient._id });
    if (!history) return res.status(404).json({ success: false, message: "Medical history record not found" });
    await Patient.updateOne({ _id: patient._id }, { $pull: { medicalHistory: history._id } });
    return res.json({ success: true, message: "Medical history deleted successfully" });
  } catch (error) {
    console.error("Delete Doctor Medical History Error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to delete medical history" });
  }
};

module.exports = {
  getDoctorPatients,
  createDoctorPatient,
  getDoctorPatientById,
  getDoctorPatientReports,
  addDoctorMedicalHistory,
  getDoctorDashboardTeam,
  updateDoctorPatient,
  deleteDoctorPatient,
  updateDoctorMedicalHistory,
  deleteDoctorMedicalHistory,
};