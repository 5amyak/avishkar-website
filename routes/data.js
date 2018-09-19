const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Team = require("../models/team");
router.get("/registered-users", async function(req, res, next) {
  try {
    const projection = {
      name: 1,
      phone: 1,
      email: 1,
      gender: 1,
      "registeredEvents.name": 1,
      picture: 1,
      city: 1,
      college: 1,
      _id: 0
    };
    const users = await User.find({
      "registeredEvents.0": { $exists: true }
    }).select(projection);
    res.json(users);
  } catch (err) {
    next(err);
  }
});
// router.get("/registered-teams", async function(req, res, next) {
//   try {
//     const teams = await Team.find({}).populate();
//     res.json(teams);
//   } catch (err) {
//     next(err);
//   }
// });
module.exports = router;
