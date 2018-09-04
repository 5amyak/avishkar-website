const mongoose = require("mongoose");

const orgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String }, //TODO: Add enum
  picture: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String }
});

module.exports = mongoose.model("Org", orgSchema);
