const express = require("express");
const User = require("../models/user");
const Team = require("../models/team");
const Event = require("../models/event");
const isAuthenticated = require("../utils/is-authenticated");
const router = express.Router();

//get userprofile
router.get("/profile", isAuthenticated, async function(req, res, next) {
  try {
    const userid = req.decoded.id;
    const projection = {
      name: 1,
      email: 1,
      gender: 1,
      city: 1,
      college: 1,
      updatedProfile: 1,
      picture: 1
    };
    const user = await User.findOne({ _id: userid }, projection);
    res.json({ profile: user });
  } catch (err) {
    next(err);
  }
});
//update profile
router.post("/update-profile", isAuthenticated, async function(req, res, next) {
  try {
    const profile = req.body;
    const user = await User.findById(req.decoded.id);
    if (user.updatedProfile) {
      return res.status(400).json({
        success: false,
        message: "You had already updated the profile!"
      });
    }
    profile.updatedProfile = true;
    user.set(profile);
    const savedUser = await user.save();
    res.json({
      success: true,
      message: "Updated profile successfully!"
    });
  } catch (err) {
    next(err);
  }
});
//check if email is taken
router.post("/is-email-taken", async function(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email })
      .select({ email: 1 })
      .lean();
    if (user) {
      return res.json({ success: false, message: "Email already taken !" });
    } else {
      return res.json({ success: true });
    }
  } catch (err) {
    next(err);
  }
});
//check if a referral code is valid
router.get("/referral/:code", async function(req, res, next) {
  try {
    const { code } = req.params;
    const user = await User.findOne({ referralCode: code })
      .select("referralCode")
      .lean();
    if (user) {
      return res.json({ success: true, message: "Referral code applied" });
    }
    return res.json({ success: false, message: "Invalid referral code" });
  } catch (err) {
    next(err);
  }
});
//get referrals of a user
router.get("/referrals", isAuthenticated, async function(req, res) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId);
    const projection = {
      name: 1,
      email: 1,
      referredBy: 1
    };
    const referredUsers = User.find({
      "referredBy.code": user.referralCode
    }).lean();
    res.json({ referredUsers });
  } catch (err) {
    next(err);
  }
});
//fetch all event-names
router.get("/all-events", async function(req, res, next) {
  try {
    const events = await Event.find({}).select({
      name: 1,
      displayName: 1,
      category: 1,
      _id: 0
    });
    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
});
//fetch-all-categories
router.get("/event-categories", async function(req, res, next) {
  try {
    const categories = await Event.distinct("category");
    res.json({
      success: true,
      categories
    });
  } catch (err) {
    next(err);
  }
});
//fetch-category events
router.post("/fetch-category-events", async function(req, res, next) {
  try {
    const { category } = req.body;
    const subEvents = await Event.find({ category });
    res.json({
      success: true,
      subEvents
    });
  } catch (err) {
    next(err);
  }
});
//fetch event info
router.post("/fetch-event-info", isAuthenticated, async function(
  req,
  res,
  next
) {
  try {
    const { eventDisplayName } = req.body;
    const event = await Event.findOne({ displayName: eventDisplayName });
    if (event) return res.json({ success: true, event });
    res.json({ success: false });
  } catch (err) {
    next(err);
  }
});
// register for an event
router.post("/register-event", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const projection = { registeredEvents: 1, updatedProfile: 1 };
    const user = await User.findById(userId).select(projection);
    if (user.updatedProfile === false) {
      return res.json({
        success: false,
        message: "Update your profile first!"
      });
    }
    const maxEventsToRegister = 15;
    if (user.registeredEvents.length >= maxEventsToRegister) {
      return res.json({
        success: false,
        message: `You can only register upto ${maxEventsToRegister} events`
      });
    }
    const { eventName } = req.body;
    const { registeredEvents } = user;
    let check = -1;
    for (let i = 0; i < registeredEvents.length; i++) {
      if (registeredEvents[i].name === eventName) {
        check = 100;
        break;
      }
    }
    if (check > 0) {
      return res.json({
        success: false,
        message: `You are already registered for this event`
      });
    }
    const eventProjection = {
      info: 0,
      category: 0,
      _id: 0
    };
    const event = await Event.findOne({ name: eventName })
      .select(eventProjection)
      .lean();
    if (!event) {
      return res.status(400).json({
        success: false,
        message: `Invalid Event`
      });
    }
    //check if user is already registered
    const isRegistered = user.registeredEvents.some(function(event) {
      return event.name === eventName;
    });
    if (isRegistered) {
      return res.json({
        success: false,
        message: `You already registered for ${eventName}!`
      });
    }
    //now register
    user.registeredEvents.push(event);
    const savedUser = await user.save();
    res.json({
      success: true,
      message: `Registered for ${eventName} successfully`
    });
  } catch (err) {
    next(err);
  }
});

//show registered events
router.get("/registered-events", isAuthenticated, async function(
  req,
  res,
  next
) {
  try {
    const userId = req.decoded.id;
    const projection = { registeredEvents: 1 };
    const user = await User.findById(userId)
      .select(projection)
      .lean();
    res.json({
      success: true,
      registeredEvents: user.registeredEvents
    });
  } catch (err) {
    next(err);
  }
});

//check if team name is already taken
router.post("/is-teamname-available", isAuthenticated, async function(
  req,
  res,
  next
) {
  const { teamName, eventName } = req.body;
  const team = await Team.findOne({ team: teamName, event: eventName });
  if (!team) {
    return res.json({
      success: true,
      message: `${teamName} is available for ${eventName}`
    });
  }
  return res.json({
    success: false,
    message: `Someone took this name for ${eventName}`
  });
});
//get teamsize of event
router.get("/size/:eventName", async function(req, res, next) {
  const { eventName } = req.params;
  const event = await Event.findOne({ name: eventName })
    .select("size")
    .lean();
  console.log(event);
  res.json({ success: true, event });
});
//get teams/events of user(created,invited and invite sent)
router.get("/get-all-teams", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId)
      .select("email")
      .lean();
    const dbQuery = {
      "users.email": user.email
    };
    const teams = await Team.find(dbQuery)
      .select({ event: 1, status: 1 })
      .lean();
    res.json({
      success: true,
      teams
    });
  } catch (err) {
    next(err);
  }
});
//check user availability for a team
router.post(
  "/check-user-availability",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { email, eventName } = req.body;
      const userId = req.decoded.id;
      const authUser = await User.findById(userId).lean();
      if (authUser.email === email) {
        return res.json({
          success: false,
          message: "You are already part and cannot be added again!"
        });
      }
      //check if email exists and user is registered
      const dbuser = await User.findOne({ email }).lean();
      if (!dbuser)
        return res
          .status(400)
          .send({ success: false, message: "User doesn't exist!" });
      const isRegistered = dbuser.registeredEvents.some(function(event) {
        return event.name === eventName;
      });
      if (!isRegistered) {
        return res.json({
          success: false,
          message: `${dbuser.name} hasn't yet registered for ${eventName}`
        });
      }

      //check if the users already have a team or invited
      const dbQuery = {
        $and: [{ event: eventName }, { "users.email": email }]
      };
      const team = await Team.find(dbQuery).lean();
      if (team.length === 0) {
        //checks passed
        return res.json({
          success: true,
          message: "User available"
        });
      }
      const [user] = team[0].users.filter(function(user) {
        return user.email == email;
      });
      if (user.status == "pending") {
        return res.json({
          success: false,
          message: "Someone already sent them a request!"
        });
      } else if (user.status == "member") {
        return res.json({
          success: false,
          message: "This user already has a team for ${eventName}!"
        });
      }
      //checks passed
      res.json({
        success: true,
        message: "User available"
      });
    } catch (err) {
      next(err);
    }
  }
);
//create team
router.post("/create-team", isAuthenticated, async function(req, res, next) {
  try {
    const { invitedEmails, eventName, teamName } = req.body;
    //TODO check the team size and eventName
    const event = await Event.findOne({ name: eventName });
    if (!event) {
      return res.json({
        success: false,
        message: "This event doesn't exist"
      });
    }
    if (invitedEmails.length >= event.size) {
      return res.json({
        success: "false",
        message: "Your team has more people than the limit!"
      });
    }
    const userId = req.decoded.id;

    //check if the user is registered for the event
    const user = await User.findById(userId).lean();
    const isRegistered = user.registeredEvents.some(function(event) {
      return event.name === eventName;
    });
    if (!isRegistered) {
      return res.json({
        success: false,
        message: `You haven't yet registered for ${eventName}`
      });
    }
    //check if the user is already in a team
    const checkUserTeamQuery = {
      event: eventName,
      status: { $ne: "rejected" },
      "users.email": user.email
    };
    const userTeam = await Team.findOne(checkUserTeamQuery);
    if (userTeam) {
      return res.json({
        success: false,
        message: "User already in a created team or a pending team!"
      });
    }

    //check if emails are valid and they are registered
    for (let i = 0; i < invitedEmails.length; i++) {
      const user = await User.findOne({ email: invitedEmails[i] }).lean();
      if (!user)
        return res
          .status(400)
          .send({ success: false, message: "Invalid Email" });
      const isRegistered = user.registeredEvents.some(function(event) {
        return event.name === eventName;
      });
      if (!isRegistered) {
        return res.json({
          success: false,
          message: `${user.name} hasn't yet registered for ${eventName}`
        });
      }
    }
    const userRefs = [userId]; //store userids
    //check if the users already have a team or invited and store refs
    for (let i = 0; i < invitedEmails.length; i++) {
      const checkUserTeamQuery = {
        event: eventName,
        status: { $ne: "rejected" },
        "users.email": invitedEmails[i]
      };
      const userTeam = await Team.findOne(checkUserTeamQuery);
      if (userTeam) {
        return res.json({
          success: false,
          message: "User already in a created team or a pending team!"
        });
      }
    }
    const sender = [
      {
        email: user.email,
        status: "leader"
      }
    ];
    const receivers = invitedEmails.map(function(email) {
      return {
        email,
        status: "pending"
      };
    });
    const teamData = {
      name: teamName,
      users: [...sender, ...receivers],
      event: eventName,
      userRefs
    };
    let teamStatus = "pending";
    if (teamData.users.length === 1) {
      teamStatus = "created";
    }
    teamData.status = teamStatus;
    const team = new Team(teamData);
    const savedTeam = await team.save();
    res.json({
      success: true,
      team: savedTeam
    });
  } catch (err) {
    next(err);
  }
});

//get received team requests
router.get("/team-requests", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const dbQuery = {
      status: "pending",
      users: { email: user.email, status: "pending" }
    };
    const teams = await Team.find(dbQuery);
    res.json({
      teams,
      success: true
    });
  } catch (err) {
    next(err);
  }
});
//get pending teams which are to be accepted by others
router.get("/pending-request", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const dbQuery = {
      status: "pending",
      users: { email: user.email, status: "leader" }
    };
    console.log({ dbQuery });
    // const dbQuery = {
    //   $and: [
    //     { users: { email: user.email, $or: [{ status: "leader" }] } },
    //     { "users.status": "pending" },
    //     { "users.status": { $ne: "refusenik" } }
    //   ]
    // };
    const pendingTeams = await Team.find(dbQuery);
    res.json({
      success: true,
      pendingTeams
    });
  } catch (err) {
    next(err);
  }
});
//get pending-requests that are accepted //TODO:"May have to remove"
router.get("/accepted-pending-request", isAuthenticated, async function(
  req,
  res,
  next
) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const dbQuery = {
      $and: [
        { users: { email: user.email, status: "member" } },
        { "users.status": "pending" },
        { "users.status": { $ne: "refusenik" } }
      ]
    };
    const pendingTeams = await Team.find(dbQuery);
    res.json({
      success: true,
      pendingTeams
    });
  } catch (err) {
    next(err);
  }
});
//accept or reject team request
router.post("/respond-to-request", isAuthenticated, async function(
  req,
  res,
  next
) {
  try {
    const { teamId, action } = req.body;
    let userStatus, teamStatus;
    if (action === "accept") {
      userStatus = "member";
    } else if (action === "reject") {
      userStatus = "rejected";
      teamStatus = "rejected";
    } else return res.sendStatus(400);
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const team = await Team.findOne({ _id: teamId, status: "pending" });
    if (!team) return res.sendStatus(400);
    let pendingUsersCount = 0;
    const users = team.users.filter(function(teamUser) {
      if (teamUser.status === "pending") {
        pendingUsersCount++;
        if (teamUser.email === user.email) {
          teamUser.status = userStatus;
          pendingUsersCount--;
        }
      }
      return teamUser;
    });
    if (teamStatus !== "rejected" && pendingUsersCount === 0) {
      teamStatus = "created";
    } else if (teamStatus !== "rejected" && pendingUsersCount > 0) {
      teamStatus = "pending";
    }
    team.status = teamStatus;
    team.users = users;
    team.markModified("users");
    const savedTeam = await team.save();
    res.json({
      team: savedTeam,
      success: true
    });
  } catch (err) {
    next(err);
  }
});

//get teams created
router.get("/teams", isAuthenticated, async function(req, res, next) {
  const userId = req.decoded.id;
  const user = await User.findById(userId);
  // send those that match email & status not equal to pending
  // const dbQuery = {
  //   $and: [
  //     { "users.email": user.email },
  //     { "users.status": { $nin: ["pending", "refusenik"] } }
  //   ]
  // };
  const dbQuery = {
    status: "created",
    "users.email": user.email
  };
  const teams = await Team.find(dbQuery);
  res.json({
    teams,
    success: true
  });
});
//store
router.post("/store", async function(req, res) {
  const { data } = req.body;
  Event.insertMany(data)
    .then(function(ok) {
      res.send(ok);
    })
    .catch(err => {
      res.send(err);
    });
});

// all-teams of a user
router.get("/all-user-teams", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const aggregate = Team.aggregate();
    const teams = await aggregate
      .match({ "users.email": user.email })
      .project({ userRefs: 0 })
      .group({ _id: "$status", teams: { $push: "$$ROOT" } });
    //const teams = await Team.find({ "users.email": user.email });
    res.json({
      success: true,
      requestBy: user.email,
      teams
    });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
