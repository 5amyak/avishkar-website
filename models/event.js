const mongoose = require("mongoose");
const eventSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true, unique: true },
  size: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String },
  info: { type: String }
});

const Event = mongoose.model("Event", eventSchema);
module.exports = Event;
