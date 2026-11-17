
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Routes
const patientRoutes = require("./routes/patientRoutes");
const otpRoutes = require("./routes/otpRoutes");
const medicalHistoryRoutes = require("./routes/medicalHistoryRoutes");
const reportRoutes = require("./routes/reportRoutes");
const staffAuthRoutes = require("./routes/staffAuthRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const teamRoutes = require("./routes/teamRoutes");
const reportUploadRoutes = require("./routes/reportUploadRoutes");
const patientAssignmentRoutes = require("./routes/patientAssignmentRoutes");
const doctorPatientRoutes = require("./routes/doctorPatientRoutes");
const doctorDashboardRoutes = require("./routes/doctorDashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// CORS
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/otp", otpRoutes);

// IMPORTANT: Patient routes and report routes are correctly mapped.
app.use("/api/patients", reportRoutes);
app.use("/api/reports", patientRoutes);

app.use("/api/medical-history", medicalHistoryRoutes);
app.use("/api/staff-auth", staffAuthRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/report-upload", reportUploadRoutes);
app.use("/api/patient-assignment", patientAssignmentRoutes);
app.use("/api/doctor-patients", doctorPatientRoutes);
app.use("/api/doctor-dashboard", doctorDashboardRoutes);
app.use("/api/admin", adminRoutes);

// Home Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MediChain Backend is running",
  });
});

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Server Start
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log("--------------------------------");
      console.log("MediChain Backend Started");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server Startup Error:", error.message);
    process.exit(1);
  }
};

startServer();
