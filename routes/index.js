const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
const User = require("../models/user");
const Team = require("../models/team");
const Event = require("../models/event");
const isAuthenticated = require("../utils/is-authenticated");
const isValidEvent = require("../utils/isValidEvent");
const router = express.Router();
const saltRounds = 10;
const jwtSecret = "secret";
//signup
router.post("/signup", async function(req, res, next) {
  try {
    const { name, password, email, phone, college, code } = req.body;
    const user = await User.findOne({ email })
      .select("email")
      .lean();
    if (user) {
      return res.json({
        success: false,
        message: "This email is already taken"
      });
      //todo: check for phone also
    }
    const pwdHash = await bcrypt.hash(password, saltRounds);
    const userData = {
      name,
      email,
      phone,
      college,
      password: pwdHash,
      referralCode: shortid.generate()
    };
    if (code) {
      const isValidCode = await User.findOne({ referralCode: code })
        .select("refferalCode")
        .lean();
      if (!isValidCode) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid refferal code" });
      } else {
        userData.referredBy = { code };
      }
    }

    const newUser = new User(userData);
    const savedUser = await newUser.save();
    //login the user now
    const token = jwt.sign({ id: savedUser._id }, jwtSecret);
    res.cookie("user", token, {
      httpOnly: true,
      maxAge: 86400 * 7 * 1000
    });
    res.json({ token, success: true, message: "user created" });
  } catch (err) {
    next(err);
  }
});

//signin
router.post("/signin", async function(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.json({ message: "Incorrect details" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect details" });
    //login the user now
    const token = jwt.sign({ id: user._id }, jwtSecret);
    res.cookie("user", token, {
      httpOnly: true,
      maxAge: 86400 * 7 * 1000
    });
    res.json({ token, success: true, message: "login successful" });
  } catch (err) {
    next(err);
  }
});
//get userprofile
router.get("/profile", isAuthenticated, async function(req, res, next) {
  try {
    const userid = req.decoded.id;
    const projection = {
      name: 1,
      email: 1,
      phone: 1,
      college: 1
    };
    const user = await User.findOne({ _id: userid }, projection);
    res.json({ profile: user });
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
router.get("/all-events", isAuthenticated, async function(req, res, next) {
  try {
    const events = await Event.find({}).select({
      name: 1,
      displayName: 1,
      _id: 0
    });
    res.json({ success: true, events });
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
    const projection = { registeredEvents: 1 };
    const user = await User.findById(userId).select(projection);
    const maxEventsToRegister = 5;
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
//check user availability for a team
// router.post(
//   "/check-user-availability",
//   isAuthenticated,
//   async (req, res, next) => {
//     try {
//       const { email, eventName } = req.body;
//       //check if email exists and user is registered
//       const dbuser = await User.findOne({ email }).lean();
//       if (!dbuser)
//         return res.send({ success: false, message: "Invalid Email" });
//       if (!dbuser.registeredEvents.includes(eventName)) {
//         return res.json({
//           success: false,
//           message: `${dbuser.name} hasn't yet registered for ${eventName}`
//         });
//       }

//       //check if the users already have a team or invited
//       const dbQuery = {
//         $and: [{ event: eventName }, { "users.email": email }]
//       };
//       const team = await Team.find(dbQuery)
//         .limit(1)
//         .lean();
//       if (team.length === 0) {
//         //checks passed
//         return res.json({
//           success: true,
//           message: "User available"
//         });
//       }
//       const [user] = team[0].users.filter(function(user) {
//         return user.email == email;
//       });
//       if (user.status == "pending") {
//         return res.json({
//           success: false,
//           message: "Someone already sent them a request!"
//         });
//       } else if (user.status == "member") {
//         return res.json({
//           success: false,
//           message: "This user already has a team for ${eventName}!"
//         });
//       }
//     } catch (err) {
//       next(err);
//     }
//   }
// );

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
  const userId = req.decoded.id;
  const user = await User.findById(userId)
    .select("email")
    .lean();
  const dbQuery = {
    "users.email": user.email
  };
  const teams = await Team.find(dbQuery)
    .select("event")
    .lean();
  res.json({
    success: true,
    teams
  });
});
//check user availability for a team
router.post("/check-user-availability", async (req, res, next) => {
  try {
    const { email, eventName } = req.body;
    //check if email exists and user is registered
    const dbuser = await User.findOne({ email }).lean();
    if (!dbuser)
      return res.status(400).send({ success: false, message: "Invalid Email" });
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
});
//create team
router.post("/create-team", isAuthenticated, async function(req, res, next) {
  try {
    const { invitedEmails, eventName, teamName } = req.body;
    //TODO check the team size and eventName
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

    //check if the users already have a team or invited
    for (let i = 0; i < invitedEmails.length; i++) {
      const dbQuery = {
        $and: [{ event: eventName }, { "users.email": invitedEmails[i] }]
      };
      const team = await Team.find(dbQuery).lean();
      if (team.length === 0) {
        continue;
      }
      const [user] = team[0].users.filter(function(user) {
        return user.email == invitedEmails[i];
      });
      if (user.status == "pending") {
        return res.json({
          success: false,
          message: "Someone already sent them a request!"
        });
      } else if (user.status == "member") {
        return res.json({
          success: false,
          message: "This user already has a team!"
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
    const team = new Team({
      name: teamName,
      users: [...sender, ...receivers],
      event: eventName
    });
    const savedTeam = await team.save();
    res.json({
      success: true,
      team: savedTeam
    });
  } catch (err) {
    next(err);
  }
});

//get team requests
router.get("/team-requests", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const dbQuery = {
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
//pending-request
router.get("/pending-request", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const dbQuery = {
      $and: [
        { users: { email: user.email, status: "leader" } },
        { "users.status": "pending" }
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
//accept team request
router.post("/accept-request", isAuthenticated, async function(req, res, next) {
  try {
    const { teamId } = req.body;
    const userId = req.decoded.id;
    const user = await User.findById(userId).lean();
    const team = await Team.findById(teamId);
    const users = team.users.filter(function(teamUser) {
      if (teamUser.email == user.email && teamUser.status == "pending") {
        teamUser.status = "member";
      }
      return teamUser;
    });
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
  const dbQuery = {
    // users: { email: user.email, status: { $ne: "pending" } }
    $and: [
      { "users.email": user.email },
      { "users.status": { $ne: "pending" } }
    ]
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
module.exports = router;
