const config = require("config");
const { google } = require("googleapis");
const request = require("request-promise");
const express = require("express");
const qs = require("qs");
const axios = require("axios");
const User = require("../models/user");
const setJwtCookie = require("../utils/setJwtCookie");
const isProduction = require("../utils/isProduction");
const queryString = require("querystring");
const router = express.Router();
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];
router.post("/glogin", async function(req, res, next) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      config.get("Config.google_details.client_id"),
      config.get("Config.google_details.client_secret"),
      config.get("Config.google_details.redirect_uri")
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
router.get("/glogin", async function(req, res, next) {
  try {
    if ("code" in req.query) {
      const formData = {
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: config.get("Config.google_details.redirect_uri"),
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
      const accessToken = tokenRes.data.access_token;
      const requestURL = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`;
      const profileRes = await axios.get(requestURL);
      const profile = profileRes.data;
      if ("email" in profile) {
        const { name, email, gender, picture } = profile;
        const isUser = await User.findOne({ email }).lean();
        let userId;
        if (!isUser) {
          const user = new User({
            name,
            email,
            gender,
            picture
          });
          const savedUser = await user.save();
          userId = savedUser._id;
        } else {
          userId = isUser._id;
        }
        setJwtCookie(req, res, userId);
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
// FB login creates authentication URL
// sample url https://www.facebook.com/v3.0/dialog/oauth?client_id=2131564737127720&redirect_uri=https://advcrawler.buyhatke.com:8888/fblogin&state=unchanged&scope=email
router.post("/fblogin", function(req, res) {
  const url =
    "https://www.facebook.com/v3.0/dialog/oauth?client_id=" +
    config.get("Config.fb_details.client_id") +
    "&redirect_uri=" +
    config.get("Config.fb_details.redirect_uri") +
    "&state=unchanged&scope=public_profile";
  res.send({ flag: 1, msg: url });
});
router.get("/fblogin", async function(req, res, next) {
  try {
    if (
      "code" in req.query &&
      "state" in req.query &&
      req.query.state == "unchanged"
    ) {
      const graphUrl = "https://graph.facebook.com/v3.0/oauth/access_token";
      const requestConfig = {
        params: {
          client_id: config.get("Config.fb_details.client_id"),
          redirect_uri: config.get("Config.fb_details.redirect_uri"),
          client_secret: config.get("Config.fb_details.client_secret"),
          code: req.query.code
        },
        headers: { "Cache-Control": "no-cache" }
      };
      const tokenRes = await axios.get(graphUrl, requestConfig);
      const accessToken = tokenRes.data.access_token;
      const profileJson = await request({
        method: "GET",
        url: "https://graph.facebook.com/me?fields=id,name,email",
        auth: { bearer: accessToken }
      });
      const profile = JSON.parse(profileJson);

      if ("email" in profile) {
        const { name, email } = profile;
        const isUser = await User.findOne({ email }).lean();
        let userId;
        if (!isUser) {
          const user = new User({
            name,
            email,
            gender,
            picture
          });
          const savedUser = await user.save();
          userId = savedUser._id;
        } else {
          userId = isUser._id;
        }
        setJwtCookie(req, res, userId);
        res.setHeader("Content-Type", "text/html");
        res.send(
          `<!DOCTYPE html><html><body><script>
                          window.opener.postMessage("loginsuccess", '*');
                          window.close();
                          </script></body></html>`
        );
      } else {
        res.json({ flag: 0, msg: "Invalid token." });
      }
    } else if ("error_reason" in req.query)
      res.send({ flag: 0, msg: req.query.error_reason });
    else res.send({ flag: 0, msg: "Login error with Facebook." });
  } catch (err) {
    next(err);
  }
});

router.get("/logout", async function(req, res) {
  res.clearCookie("user");
  res.redirect("/");
});
module.exports = router;
