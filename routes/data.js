const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Team = require("../models/team");
const Event = require("../models/event");
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
    const modifiedUsers = users.map(function(user) {
      const events = user.registeredEvents.map(function(event) {
        return event.name;
      });
      user.events = events;
      return user;
    });
    res.render("registered-users", { users: modifiedUsers });
  } catch (err) {
    next(err);
  }
});

router.get("/registered-teams/:eventName", async function(req, res, next) {
  try {
    const { eventName } = req.params;
    const event = await Event.findOne({ displayName: eventName });
    if (!event) {
      return res.send("Incorrect event url!");
    }
    const teamProjection = {
      name: 1,
      event: 1,
      date: 1,
      _id: 0
    };
    const userProjection = {
      name: 1,
      email: 1,
      phone: 1,
      city: 1,
      college: 1,
      regNum: 1,
      courseYear: 1,
      _id: 0
    };
    const teams = await Team.find({ status: "created", event: event.name })
      .select(teamProjection)
      .populate("userRefs", userProjection);
    res.render("registered-teams", { teams });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
