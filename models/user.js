const mongoose = require("mongoose");
const eventSchema = mongoose.Schema({
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  size: { type: Number, required: true }
});
const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String }, //TODO: Add enum
  picture: { type: String },
  password: { type: String },
  phone: { type: String },
  city: { type: String },
  college: { type: String },
  course: { type: String },
  courseYear: { type: String },
  regNum: { type: String },
  registeredEvents: [eventSchema],
  updatedProfile: { type: Boolean, default: false },
  paymentDone: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verifyToken: { type: String, unique: true },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
