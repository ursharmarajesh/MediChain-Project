
const express = require("express");
const router = express.Router();

const {
  addMedicalHistory,
  getMedicalHistory,
  getSingleMedicalHistory,
} = require("../controllers/medicalHistoryController");

const authMiddleware = require("../middleware/authMiddleware");

// Add medical history
router.post("/", authMiddleware, addMedicalHistory);

// Get all medical history
router.get("/", authMiddleware, getMedicalHistory);

// Get one medical history record
router.get("/:id", authMiddleware, getSingleMedicalHistory);

module.exports = router;
