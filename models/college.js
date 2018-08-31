const mongoose = require("mongoose");
const collegeSchema = mongoose.Schema({
  _id: { type: String, required: true },
  city: { type: String, required: true },
  college: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("College", collegeSchema);
