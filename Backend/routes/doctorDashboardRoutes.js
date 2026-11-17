
const express = require("express");
const router = express.Router();

const {
  getDoctorPatients,
  createDoctorPatient,
  getDoctorPatientById,
  getDoctorPatientReports,
  addDoctorMedicalHistory,
  getDoctorDashboardTeam,
  updateDoctorPatient,
  deleteDoctorPatient,
  updateDoctorMedicalHistory,
  deleteDoctorMedicalHistory,
} = require("../controllers/doctorDashboardController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// Check imported functions
const handlers = {
  staffAuthMiddleware,
  allowRoles,
  getDoctorPatients,
  createDoctorPatient,
  getDoctorPatientById,
  getDoctorPatientReports,
  addDoctorMedicalHistory,
  getDoctorDashboardTeam,
  updateDoctorPatient,
  deleteDoctorPatient,
  updateDoctorMedicalHistory,
  deleteDoctorMedicalHistory,
};

for (const [name, handler] of Object.entries(handlers)) {
  if (typeof handler !== "function") {
    throw new TypeError(
      `doctorDashboardRoutes.js: ${name} is not a function. Check its export/import.`
    );
  }
}

// Doctor and linked Team workspace
router.use(
  staffAuthMiddleware,
  allowRoles("DOCTOR", "TEAM")
);

// Create patient
router.post(
  "/patients",
  allowRoles("DOCTOR"),
  createDoctorPatient
);

// Get patients
router.get(
  "/patients",
  getDoctorPatients
);

// Edit/delete an assigned patient (doctor only)
router.put("/patients/:patientId", allowRoles("DOCTOR"), updateDoctorPatient);
router.delete("/patients/:patientId", allowRoles("DOCTOR"), deleteDoctorPatient);

// Edit/delete an assigned patient's history record (doctor only)
router.put("/patients/:patientId/medical-history/:historyId", allowRoles("DOCTOR"), updateDoctorMedicalHistory);
router.delete("/patients/:patientId/medical-history/:historyId", allowRoles("DOCTOR"), deleteDoctorMedicalHistory);

// Get patient details
router.get(
  "/patients/:patientId",
  getDoctorPatientById
);

// Get patient reports
router.get(
  "/patients/:patientId/reports",
  getDoctorPatientReports
);

// Add medical history
router.post(
  "/patients/:patientId/medical-history",
  allowRoles("DOCTOR"),
  addDoctorMedicalHistory
);

// Get doctor team
router.get(
  "/team",
  allowRoles("DOCTOR"),
  getDoctorDashboardTeam
);

module.exports = router;