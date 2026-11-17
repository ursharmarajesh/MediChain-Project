
const express = require("express");
const router = express.Router();

const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  getDoctorDashboard,
} = require("../controllers/doctorController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// Doctor Dashboard
// Only logged-in Doctor can access
router.get(
  "/dashboard",
  staffAuthMiddleware,
  allowRoles("DOCTOR"),
  getDoctorDashboard
);

// Admin-only routes
router.use(
  staffAuthMiddleware,
  allowRoles("ADMIN")
);

// Create Doctor
router.post("/", createDoctor);

// Get All Doctors
router.get("/", getAllDoctors);

// Get Single Doctor
router.get("/:id", getDoctorById);

// Activate / Deactivate Doctor
router.patch("/:id/status", updateDoctorStatus);

module.exports = router;
