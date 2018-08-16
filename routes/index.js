const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
const User = require("../models/user");
const Team = require("../models/team");
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
      return res.status(400).json({
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
      maxAge: 86400 * 7
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
      maxAge: 86400 * 7
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
// register for an event
router.post("/register-event", isAuthenticated, async function(req, res, next) {
  try {
    const userId = req.decoded.id;
    const projection = { registeredEvents: 1 };
    const user = await User.findById(userId).select(projection);
    const maxEventsToRegister = 5;
    if (user.registeredEvents.length >= maxEventsToRegister) {
      return res.json({
        success: "false",
        message: `You can only register upto ${maxEventsToRegister} events`
      });
    }
    const { eventName } = req.body;
    console.log({ eventName });
    if (!isValidEvent(eventName)) {
      return res.status(400).json({
        success: "false",
        message: `Invalid Event`
      });
    }
    user.registeredEvents.push(eventName);
    const savedUser = await user.save();
    if (savedUser.registeredEvents.includes(eventName)) {
      res.json({
        success: true,
        message: `Registered for ${eventName} successfully`
      });
    } else {
      next(err);
    }
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

//create team
router.post("/create-team", isAuthenticated, async function(req, res, next) {
  try {
    const { invitedEmails, eventName, teamName } = req.body;
    const userId = req.decoded.id;

    //check if the user is registered for the event
    const user = await User.findById(userId).lean();
    if (!user.registeredEvents.includes(eventName)) {
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
          .satus(400)
          .send({ success: false, message: "Invalid Email" });
      if (!user.registeredEvents.includes(eventName)) {
        return res.json({
          success: false,
          message: `${user.name} hasn't yet registered for ${eventName}`
        });
      }
    }

    //check if the users already have a team
    for (let i = 0; i < invitedEmails.length; i++) {
      const dbQuery = {
        $and: [{ event: eventName }, { "users.email": invitedEmails[i] }]
      };
      const team = await Team.find(dbQuery).lean();
      const [user] = team.users.filter(function(user) {
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
      users: [...sender, ...receivers]
    });
    const savedTeam = await team.save();
    res.json({
      success: true,
      team: save
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
      user: { email: user.email, status: "pending" }
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
    //user: { email: user.email, status: { $ne: "pending" } }
    $and: [{ "user.email": user.email }, { "user.status": { $ne: "pending" } }]
  };
  const teams = await Team.find(dbQuery);
  res.json({
    teams,
    success: true
  });
});

module.exports = router;
