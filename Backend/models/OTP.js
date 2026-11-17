const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Invalid mobile number"],
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    purpose: {
      type: String,
      enum: ["PATIENT_LOGIN"],
      default: "PATIENT_LOGIN",
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    collection: "otps",
  }
);

OTPSchema.index({ mobileNumber: 1, purpose: 1 });

const OTP =
  mongoose.models.OTP || mongoose.model("OTP", OTPSchema);

module.exports = OTP;