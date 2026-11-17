
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Report = require("../models/Report");
const Patient = require("../models/Patient");

const downloadPatientReport = async (req, res) => {
  try {
    const patientId = req.patientId;
    const reportId = req.params.id;

    if (
      !patientId ||
      !mongoose.isValidObjectId(patientId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Patient authentication required",
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

    // Patient can download only their own report.
    const report = await Report.findOne({
      _id: reportId,
      patient: patient._id,
      isActive: true,
    }).select("+filePath");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const uploadDirectory = path.resolve(
      __dirname,
      "../uploads"
    );

    // Existing records may contain an absolute or relative path.
    const filePath = path.isAbsolute(report.filePath)
      ? path.resolve(report.filePath)
      : path.resolve(uploadDirectory, report.filePath);

    // Prevent access to files outside the uploads folder.
    const relativePath = path.relative(
      uploadDirectory,
      filePath
    );

    if (
      !relativePath ||
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid file location",
      });
    }

    await fs.promises.access(
      filePath,
      fs.constants.R_OK
    );

    return res.download(
      filePath,
      path.basename(report.fileName),
      (error) => {
        if (error && !res.headersSent) {
          console.error(
            "Report Download Error:",
            error.message
          );

          res.status(500).json({
            success: false,
            message: "Unable to download report",
          });
        }
      }
    );

  } catch (error) {
    console.error(
      "Download Report Error:",
      error.message
    );

    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Report file does not exist on server",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to download report",
    });
  }
};

module.exports = {
  downloadPatientReport,
};
