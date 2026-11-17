
const mongoose = require("mongoose");
const Report = require("../models/Report");
const Patient = require("../models/Patient");

// Get All Reports of Logged-in Patient
const getPatientReports = async (req, res) => {
  try {
    const patientId = req.patientId;

    if (!patientId || !mongoose.isValidObjectId(patientId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient authentication",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const reports = await Report.find({
      patient: patient._id,
      isActive: true,
    })
      .select(
        "reportTitle reportType fileName mimeType fileSize reportDate description createdAt"
      )
      .sort({ reportDate: -1 });

    return res.status(200).json({
      success: true,
      message: "Patient reports fetched successfully",
      count: reports.length,
      reports,
    });

  } catch (error) {
    console.error("Get Patient Reports Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient reports",
    });
  }
};


// Get Single Report of Logged-in Patient
const getSingleReport = async (req, res) => {
  try {
    const patientId = req.patientId;
    const reportId = req.params.id;

    if (!patientId || !mongoose.isValidObjectId(patientId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient authentication",
      });
    }

    if (!mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const report = await Report.findOne({
      _id: reportId,
      patient: patient._id,
      isActive: true,
    }).select(
      "reportTitle reportType fileName mimeType fileSize reportDate description createdAt"
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report fetched successfully",
      report,
    });

  } catch (error) {
    console.error("Get Single Report Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch report",
    });
  }
};


module.exports = {
  getPatientReports,
  getSingleReport,
};
