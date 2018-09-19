const mongoose = require("mongoose");
const sheetSchema = mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  sheetId: { type: Number },
  event: { type: String, required: true }
});

module.exports = mongoose.model("Sheet", sheetSchema);
