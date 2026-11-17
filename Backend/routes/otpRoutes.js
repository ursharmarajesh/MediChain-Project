
const express = require("express");

const router = express.Router();

const {
  sendPatientOtp,
  verifyPatientOtp,
} = require("../controllers/otpController");

// Generate demo OTP
router.post("/send", sendPatientOtp);

// Verify demo OTP
router.post("/verify", verifyPatientOtp);

module.exports = router;
