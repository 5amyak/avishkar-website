const router = require("express").Router();
const Team = require("../models/team");
const Org = require("../models/org");
const Event = require("../models/event");
const Sheet = require("../models/sheet");
const config = require("config");
const { google } = require("googleapis");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const qs = require("qs");
const setJwtCookie = require("../utils/setJwtCookie");
const request = require("request-promise");
const isAuthenticated = require("../utils/is-org-authenticated");
const secret = "avishkar";

router.get("/fetch-participants", async function(req, res, next) {
  try {
    //const { eventName, password } = req.body;
    // if (password !== secret) {
    //   return res.json({
    //     success: false,
    //     messsage: "Incorrect password"
    //   });
    // }
    const event = await Event.findOne({ name: "webster" }).lean();
    if (!event) {
      return res.json({
        success: false,
        messsage: "No such event exists"
      });
    }
    if (event.size > 1) {
      const refProjection = {
        name: 1,
        phone: 1,
        email: 1,
        regNum: 1,
        courseYear: 1,
        course: 1,
        college: 1
      };
      const teams = await Team.find({
        event: "webster",
        status: "created"
      }).populate("userRefs", refProjection);
      res.json({
        success: true,
        teams
      });
    } else {
      res.send("for solo events write code in backend");
    }
  } catch (err) {
    next(err);
  }
});

var SheetsHelper = require("../utils/sheets");

router.post("/spreadsheets", isAuthenticated, async function(req, res, next) {
  try {
    const { eventName } = req.body;
    // var auth = req.get("Authorization");
    // if (!auth) {
    //   return next(Error("Authorization required."));
    // }
    const orgId = req.decoded.id;
    //var accessToken = auth.split(" ")[1];
    const org = await Org.findById(orgId);
    const event = await Event.findOne({ name: "webster" });
    var helper = new SheetsHelper(org);
    var title = "Orders (" + new Date().toLocaleTimeString() + ")";
    const columns = helper.createColumns(event.size);
    helper.createSpreadsheet(title, columns, async function(err, spreadsheet) {
      if (err) {
        return next(err);
      }
      const sheet = new Sheet({
        _id: spreadsheet.spreadsheetId,
        sheetId: spreadsheet.sheets[0].properties.sheetId,
        name: spreadsheet.properties.title,
        event: event.name
      });
      const savedSheet = await sheet.save();
      const refProjection = {
        name: 1,
        phone: 1,
        email: 1,
        regNum: 1,
        courseYear: 1,
        college: 1,
        course: 1
      };
      const teams = await Team.find({
        event: "webster",
        status: "created"
      }).populate("userRefs", refProjection);

      const { _id, sheetId } = savedSheet;
      helper.sync(_id, sheetId, teams, columns, function() {
        if (err) {
          return next(err);
        }
        return res.json({ sucess: "This is insane bro" });
      });
    });
  } catch (err) {
    next(err);
  }
});

//google login
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets"
];
router.post("/glogin", async function(req, res, next) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      config.get("Config.google_details.client_id"),
      config.get("Config.google_details.client_secret"),
      config.get("Config.google_details.co_redirect_uri")
    );

    const url = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: "offline",
      // If you only need one scope you can pass it as a string
      scope: scopes
    });
    res.send({ flag: 1, msg: url });
  } catch (err) {
    next(err);
  }
});
//google login
router.get("/glogin", async function(req, res, next) {
  try {
    if ("code" in req.query) {
      const formData = {
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: config.get("Config.google_details.co_redirect_uri"),
        client_id: config.get("Config.google_details.client_id"),
        client_secret: config.get("Config.google_details.client_secret")
      };
      const headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const tokenRes = await axios.post(
        "https://www.googleapis.com/oauth2/v4/token",
        qs.stringify(formData),
        headers
      );
      const { access_token, refresh_token } = tokenRes.data;
      const requestURL = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`;
      const profileRes = await axios.get(requestURL);
      const profile = profileRes.data;
      if ("email" in profile) {
        const { name, email, gender, picture } = profile;
        const isOrg = await Org.findOne({ email }).lean();
        let orgId;
        if (!isOrg) {
          const org = new Org({
            name,
            email,
            gender,
            picture,
            accessToken: access_token,
            refreshToken: refresh_token
          });
          const savedOrg = await org.save();
          orgId = savedOrg._id;
        } else {
          orgId = isOrg._id;
        }
        setJwtCookie(req, res, { cookieKey: "org", id: orgId });
        console.log("hello");
        res.setHeader("Content-Type", "text/html");
        res.send(
          `<!DOCTYPE html><html><body><script>
                          window.opener.postMessage("loginsuccess", '*');
                          window.close();
                          </script></body></html>`
        );
      } else res.json({ flag: 0, msg: "Invalid access token." });
    }
  } catch (err) {
    next(err);
  }
});
module.exports = router;
