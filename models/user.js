const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  college: { type: String, required: true },
  year: { type: Number },
  referralCode: { type: String, required: true, unique: true },
  referredBy: { code: { type: String }, status: { type: Number, default: 0 } },
  registeredEvents: [],
  requestsSent: [{ event: { type: String }, to: { type: String } }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;
