const mongoose = require("mongoose");
const teamSchema = mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ["pending", "rejected", "created"] },
  event: { type: String, required: true },
  date: { type: Date, default: Date.now },
  users: [],
  userRefs: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  ]
});

const Team = mongoose.model("Team", teamSchema);
module.exports = Team;
