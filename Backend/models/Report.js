
const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportTitle: {
      type: String,
      required: true,
      trim: true,
    },

    reportType: {
      type: String,
      enum: [
        "BLOOD_TEST",
        "XRAY",
        "MRI",
        "CT_SCAN",
        "ULTRASOUND",
        "PRESCRIPTION",
        "OTHER",
      ],
      default: "OTHER",
    },

    fileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
      select: false,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },

    reportDate: {
      type: Date,
      default: Date.now,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "reports",
  }
);

const Report =
  mongoose.models.Report ||
  mongoose.model("Report", ReportSchema);

module.exports = Report;
