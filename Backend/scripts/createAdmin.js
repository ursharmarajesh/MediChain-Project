
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    const {
      MONGO_URI,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_MOBILE,
      ADMIN_PASSWORD,
    } = process.env;

    // Validate environment variables
    if (
      !MONGO_URI ||
      !ADMIN_NAME ||
      !ADMIN_EMAIL ||
      !ADMIN_MOBILE ||
      !ADMIN_PASSWORD
    ) {
      throw new Error(
        "Missing required environment variables. Check Backend/.env"
      );
    }

    const name = ADMIN_NAME.trim();
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const mobileNumber = ADMIN_MOBILE.trim();
    const password = ADMIN_PASSWORD;

    if (!name) {
      throw new Error("Admin name is required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid admin email address");
    }

    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      throw new Error(
        "Admin mobile number must contain exactly 10 digits"
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Admin password must contain at least 8 characters"
      );
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB Atlas connected successfully");

    // Check email and mobile separately
    const [emailUser, mobileUser] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ mobileNumber }),
    ]);

    // Do not create duplicate or conflicting accounts
    if (emailUser || mobileUser) {
      if (
        emailUser &&
        mobileUser &&
        emailUser._id.equals(mobileUser._id) &&
        emailUser.role === "ADMIN"
      ) {
        console.log("Admin account already exists.");
        console.log("Existing Admin:", emailUser.email);
        return;
      }

      throw new Error(
        "Email or mobile number is already registered to another account. Check the users collection."
      );
    }

    // Create the Admin.
    // User model automatically hashes the password using bcrypt.
    const admin = await User.create({
      name,
      email,
      mobileNumber,
      password,
      role: "ADMIN",
      permissions: ["ALL"],
      isActive: true,
    });

    console.log("--------------------------------");
    console.log("ADMIN ACCOUNT CREATED SUCCESSFULLY");
    console.log("--------------------------------");
    console.log("Admin ID:", admin._id.toString());
    console.log("Admin Name:", admin.name);
    console.log("Admin Email:", admin.email);
    console.log("Admin Role:", admin.role);
    console.log("--------------------------------");
    console.log("You can now login to MediChain.");
  } catch (error) {
    console.error("--------------------------------");
    console.error("ADMIN CREATION FAILED");
    console.error("--------------------------------");
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
    }
  }
};

createAdmin();
