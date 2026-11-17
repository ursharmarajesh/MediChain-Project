const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const OTP = require("../models/OTP");
const Patient = require("../models/Patient");

const OTP_VALUE = "123456";
const OTP_EXPIRY_MINUTES = 5;
const RESEND_WAIT_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function createOtpHash(mobileNumber, otp) {
  const secret = process.env.OTP_SECRET;

  if (!secret) {
    throw new Error("OTP_SECRET is missing in .env");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${mobileNumber}:${otp}`)
    .digest("hex");
}

function compareOtp(mobileNumber, enteredOtp, storedHash) {
  const enteredHash = createOtpHash(mobileNumber, enteredOtp);

  const enteredBuffer = Buffer.from(enteredHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (
    enteredBuffer.length !== storedBuffer.length ||
    enteredBuffer.length === 0
  ) {
    return false;
  }

  return crypto.timingSafeEqual(enteredBuffer, storedBuffer);
}

// Generate fixed demo OTP. No SMS is sent.
const sendPatientOtp = async (req, res) => {
  try {
    const mobileNumber = String(
      req.body.mobileNumber || ""
    ).trim();

    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    const previousOtp = await OTP.findOne({
      mobileNumber,
      purpose: "PATIENT_LOGIN",
    });

    if (
      previousOtp &&
      Date.now() - previousOtp.createdAt.getTime() <
        RESEND_WAIT_SECONDS * 1000
    ) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
      });
    }

    await OTP.deleteMany({
      mobileNumber,
      purpose: "PATIENT_LOGIN",
    });

    const otpHash = createOtpHash(mobileNumber, OTP_VALUE);

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    await OTP.create({
      mobileNumber,
      otpHash,
      purpose: "PATIENT_LOGIN",
      attempts: 0,
      verified: false,
      expiresAt,
    });

    return res.status(200).json({
      success: true,
      message: "Demo OTP generated. No SMS was sent.",
      demoOtp: OTP_VALUE,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("Send OTP Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate OTP",
    });
  }
};

// Verify OTP and login registered Patient
const verifyPatientOtp = async (req, res) => {
  try {
    const mobileNumber = String(
      req.body.mobileNumber || ""
    ).trim();

    const enteredOtp = String(req.body.otp || "").trim();

    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    if (!/^[0-9]{6}$/.test(enteredOtp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 6-digit OTP",
      });
    }

    const otpRecord = await OTP.findOne({
      mobileNumber,
      purpose: "PATIENT_LOGIN",
      verified: false,
    }).select("+otpHash");

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Request a new OTP.",
      });
    }

    if (otpRecord.expiresAt.getTime() <= Date.now()) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(400).json({
        success: false,
        message: "OTP expired. Request a new OTP.",
      });
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Request a new OTP.",
      });
    }

    if (
      !compareOtp(
        mobileNumber,
        enteredOtp,
        otpRecord.otpHash
      )
    ) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
        attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts,
      });
    }

    const patient = await Patient.findOne({
      mobileNumber,
      isActive: true,
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "No active patient account found with this number",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in .env");
    }

    const token = jwt.sign(
      {
        patientId: patient._id,
        role: "PATIENT",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Patient login successful",
      token,
      patient: {
        uniqueId: patient.uniqueId,
        name: patient.name,
        mobileNumber: patient.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

module.exports = {
  sendPatientOtp,
  verifyPatientOtp,
};