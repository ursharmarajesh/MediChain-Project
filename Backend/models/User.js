
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Enter valid 10 digit mobile number"],
    },

    specialization: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ["ADMIN", "DOCTOR", "TEAM"],
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User =
  mongoose.models.User ||
  mongoose.model("User", UserSchema);

module.exports = User;
