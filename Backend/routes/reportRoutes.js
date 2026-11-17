
const express = require("express");
const router = express.Router();

const {
  registerPatient,
  getPatientProfile,
  getPatientDashboard,
  updatePatientProfile,
  getAllPatients,
} = require("../controllers/patientController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// ======================================
// ADMIN / DOCTOR / TEAM - Register Patient
// ======================================
router.post(
  "/register",
  staffAuthMiddleware,
  allowRoles("ADMIN", "DOCTOR", "TEAM"),
  registerPatient
);

// ======================================
// ADMIN - Get All Patients
// GET /api/patients
// ======================================
router.get(
  "/",
  staffAuthMiddleware,
  allowRoles("ADMIN"),
  getAllPatients
);

// ======================================
// PATIENT - Dashboard
// GET /api/patients/dashboard
// ======================================
router.get(
  "/dashboard",
  authMiddleware,
  getPatientDashboard
);

// ======================================
// PATIENT - Get Profile
// GET /api/patients/profile
// ======================================
router.get(
  "/profile",
  authMiddleware,
  getPatientProfile
);

// ======================================
// PATIENT - Update Profile
// PUT /api/patients/profile
// ======================================
router.put(
  "/profile",
  authMiddleware,
  updatePatientProfile
);

module.exports = router;
