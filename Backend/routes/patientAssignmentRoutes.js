
const express = require("express");
const router = express.Router();

const {
  assignPatientToDoctor,
} = require("../controllers/patientAssignmentController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

router.post(
  "/assign",
  staffAuthMiddleware,
  allowRoles("ADMIN"),
  assignPatientToDoctor
);

module.exports = router;
