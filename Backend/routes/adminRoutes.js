const express = require("express");
const router = express.Router();

const {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  updateDoctorStatus,
  changeAdminPassword,
} = require("../controllers/adminController");

const {
  getAdminProfile,
  updateAdminProfile,
} = require("../controllers/adminProfileController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// Every route in this file is Admin-only.
router.use(staffAuthMiddleware, allowRoles("ADMIN"));

// Admin profile
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);

// Doctor management
router.get("/doctors", getDoctors);
router.post("/doctors", createDoctor);
router.put("/doctors/:id", updateDoctor);
router.delete("/doctors/:id", deleteDoctor);
router.patch("/doctors/:id/status", updateDoctorStatus);

// Existing password feature — unchanged
router.patch("/change-password", changeAdminPassword);

module.exports = router;