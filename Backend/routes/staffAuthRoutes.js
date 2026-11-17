const express = require("express");
const router = express.Router();

const { staffLogin } = require("../controllers/staffAuthController");
const {
  changePassword,
  adminResetDoctorPassword,
} = require("../controllers/passwordController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// Public staff login
router.post("/login", staffLogin);

// All routes below require a valid staff login
router.use(staffAuthMiddleware);

// Logged-in staff profile
router.get("/me", (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.staff._id,
      name: req.staff.name,
      email: req.staff.email,
      mobileNumber: req.staff.mobileNumber,
      role: req.staff.role,
      specialization: req.staff.specialization || "",
      doctor: req.staff.doctor,
      permissions: req.staff.permissions,
    },
  });
});

// Admin, Doctor and Team can change their own password
router.patch(
  "/change-password",
  allowRoles("ADMIN", "DOCTOR", "TEAM"),
  changePassword
);

// Only Admin can reset a Doctor's password
router.patch(
  "/admin/doctors/:doctorId/password",
  allowRoles("ADMIN"),
  adminResetDoctorPassword
);

module.exports = router;