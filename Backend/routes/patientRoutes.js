
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  downloadPatientReport,
} = require("../controllers/reportDownloadController");

// Only the authenticated patient can download their own reports.
router.get(
  "/:id/download",
  authMiddleware,
  downloadPatientReport
);

module.exports = router;
