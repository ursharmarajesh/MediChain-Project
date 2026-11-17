
const express = require("express");
const router = express.Router();

const {
  getDoctorPatients,
} = require("../controllers/doctorPatientController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

router.get(
  "/",
  staffAuthMiddleware,
  allowRoles("DOCTOR"),
  getDoctorPatients
);

module.exports = router;
