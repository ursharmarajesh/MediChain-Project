
const Report = require("../models/Report");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");
const fs = require("fs");

// Upload Patient Report
const uploadPatientReport = async (req, res) => {
  let savedFilePath;
  let createdReport;

  const cleanupUploadedFile = async () => {
    if (!savedFilePath) return;

    try {
      await fs.promises.unlink(savedFilePath);
    } catch (error) {
      console.error("File cleanup error:", error.message);
    }

    savedFilePath = null;
  };

  try {
    // Multer uploaded file path
    savedFilePath = req.file?.path;

    const {
      patientId,
      reportTitle,
      reportType,
      description,
    } = req.body;

    const staff = req.staff;

    // Check staff authentication
    if (
      !staff ||
      !["ADMIN", "DOCTOR", "TEAM"].includes(staff.role)
    ) {
      await cleanupUploadedFile();

      return res.status(403).json({
        success: false,
        message: "You are not allowed to upload reports",
      });
    }

    // Required fields
    if (
      !patientId ||
      typeof reportTitle !== "string" ||
      !reportTitle.trim() ||
      !reportType ||
      !req.file
    ) {
      await cleanupUploadedFile();

      return res.status(400).json({
        success: false,
        message: "Patient, title, type and file are required",
      });
    }

    // Validate patient ID
    if (!mongoose.isValidObjectId(patientId)) {
      await cleanupUploadedFile();

      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    // Allowed report types
    const allowedTypes = [
      "BLOOD_TEST",
      "XRAY",
      "MRI",
      "CT_SCAN",
      "ULTRASOUND",
      "PRESCRIPTION",
      "OTHER",
    ];

    if (!allowedTypes.includes(reportType)) {
      await cleanupUploadedFile();

      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    // Patient access filter
    const patientFilter = {
      _id: patientId,
      isActive: true,
    };

    // Doctor can upload only assigned patients' reports
    if (staff.role === "DOCTOR") {
      patientFilter.assignedDoctor = staff._id;
    }

    // Team can upload only their doctor's patients' reports
    if (staff.role === "TEAM") {
      if (!staff.doctor) {
        await cleanupUploadedFile();

        return res.status(403).json({
          success: false,
          message: "Team member is not linked to a doctor",
        });
      }

      patientFilter.assignedDoctor = staff.doctor;
    }

    // Admin can access all active patients
    const patient = await Patient.findOne(patientFilter);

    if (!patient) {
      await cleanupUploadedFile();

      return res.status(404).json({
        success: false,
        message: "Patient not found or you do not have access",
      });
    }

    // Create report
    createdReport = await Report.create({
      patient: patient._id,
      uploadedBy: staff._id,
      reportTitle: reportTitle.trim(),
      reportType,
      fileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description:
        typeof description === "string" ? description.trim() : "",
      reportDate: new Date(),
      isActive: true,
    });

    // Add report ID to patient
    await Patient.updateOne(
      { _id: patient._id },
      {
        $addToSet: {
          reports: createdReport._id,
        },
      }
    );

    // Successful upload: keep file
    savedFilePath = null;

    return res.status(201).json({
      success: true,
      message: "Report uploaded successfully",
      report: {
        id: createdReport._id,
        patient: createdReport.patient,
        reportTitle: createdReport.reportTitle,
        reportType: createdReport.reportType,
        fileName: createdReport.fileName,
        reportDate: createdReport.reportDate,
      },
    });

  } catch (error) {
    // Cleanup report document if created
    if (createdReport) {
      try {
        await Report.deleteOne({
          _id: createdReport._id,
        });
      } catch (deleteError) {
        console.error(
          "Report cleanup error:",
          deleteError.message
        );
      }
    }

    await cleanupUploadedFile();

    console.error(
      "Upload Report Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to upload report",
    });
  }
};

module.exports = {
  uploadPatientReport,
};
