
const mongoose = require("mongoose");
const crypto = require("crypto");

const PatientSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      unique: true,
      index: true,
      default: () =>
        "MC-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Enter valid 10 digit mobile number"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    age: {
      type: Number,
      min: 0,
      default: null,
    },

    gender: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    bloodGroup: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    emergencyContact: {
      type: String,
      default: "",
    },
    

    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    medicalHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MedicalHistory",
      },
    ],

    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Report",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "patients",
  }
);

const Patient =
  mongoose.models.Patient ||
  mongoose.model("Patient", PatientSchema);

module.exports = Patient;
