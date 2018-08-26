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
  college: { type: String },
  year: { type: Number },
  //referralCode: { type: String, unique: true },
  //referredBy: { code: { type: String }, status: { type: Number, default: 0 } },
  registeredEvents: [eventSchema],
  requestsSent: [{ event: { type: String }, to: { type: String } }],
  updatedProfile: { type: Boolean, default: false },
  paymentDone: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verifyToken: { type: String },
  resetToken: { type: String }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
