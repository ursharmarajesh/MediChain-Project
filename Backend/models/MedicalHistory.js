
const mongoose = require("mongoose");

const MedicalHistorySchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },

    symptoms: {
      type: [String],
      default: [],
    },

    treatment: {
      type: String,
      default: "",
      trim: true,
    },

    medicines: {
      type: [String],
      default: [],
    },

    doctorName: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    recordDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "medicalhistories",
  }
);

module.exports =
  mongoose.models.MedicalHistory ||
  mongoose.model("MedicalHistory", MedicalHistorySchema);
