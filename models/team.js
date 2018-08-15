const mongoose = require("mongoose");
const teamSchema = mongoose.Schema({
  name: { type: String, required: true },
  users: [],
  // college: { type: String, required: true },
  event: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Team = mongoose.model("Team", teamSchema);
module.exports = Team;
