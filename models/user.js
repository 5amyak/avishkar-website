const mongoose = require("mongoose");
const eventSchema = mongoose.Schema({
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  size: { type: Number, required: true }
});
const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String, enum: ["male", "female", "others"] },
  picture: { type: String },
  password: { type: String },
  phone: { type: String },
  college: { type: String },
  year: { type: Number },
  referralCode: { type: String, unique: true },
  referredBy: { code: { type: String }, status: { type: Number, default: 0 } },
  registeredEvents: [eventSchema],
  requestsSent: [{ event: { type: String }, to: { type: String } }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;
