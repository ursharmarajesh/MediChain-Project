
const Patient = require("../models/Patient");

// Get patients assigned to logged-in doctor
const getDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.staff._id;

    const patients = await Patient.find({
      assignedDoctor: doctorId,
      isActive: true,
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });

  } catch (error) {
    console.error("Get Doctor Patients Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assigned patients",
    });
  }
};

module.exports = {
  getDoctorPatients,
};
