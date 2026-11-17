
const express = require("express");
const router = express.Router();

const {
  uploadPatientReport,
} = require("../controllers/reportUploadController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

const upload = require("../middleware/uploadMiddleware");

router.post(
  "/upload",
  staffAuthMiddleware,
  allowRoles("ADMIN", "DOCTOR", "TEAM"),
  upload.single("report"),
  uploadPatientReport
);

module.exports = router;
