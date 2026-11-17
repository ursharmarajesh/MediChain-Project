
const express = require("express");
const router = express.Router();

const {
  createTeamMember,
  getDoctorTeam,
} = require("../controllers/teamController");

const {
  staffAuthMiddleware,
  allowRoles,
} = require("../middleware/staffAuthMiddleware");

// All routes require staff login
router.use(staffAuthMiddleware);

// ADMIN can create a team member for any doctor.
// DOCTOR can create a team member for their own team.
router.post(
  "/",
  allowRoles("ADMIN", "DOCTOR"),
  createTeamMember
);

// ADMIN can view any doctor's team.
// DOCTOR can view only their own team.
router.get(
  "/:doctorId",
  allowRoles("ADMIN", "DOCTOR"),
  (req, res, next) => {
    if (
      req.staff.role === "DOCTOR" &&
      req.staff._id.toString() !== req.params.doctorId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own team",
      });
    }

    next();
  },
  getDoctorTeam
);

module.exports = router;
