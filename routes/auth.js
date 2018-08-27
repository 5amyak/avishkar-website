const config = require("config");
const { google } = require("googleapis");
const util = require("util");
const crypto = require("crypto");
const request = require("request-promise");
const bcrypt = require("bcryptjs");
const express = require("express");
const qs = require("qs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const uniqid = require("uniqid");
const getCookieDomain = require("../utils/getCookieDomain");
const sendVerificationEmail = require("../utils/sendVerificationEmail");
const sendResetEmail = require("../utils/sendResetEmail");
const User = require("../models/user");
const setJwtCookie = require("../utils/setJwtCookie");
const isProduction = require("../utils/isProduction");
const isAuthenticated = require("../utils/is-authenticated");
const queryString = require("querystring");
const router = express.Router();
const saltRounds = 10;
const jwtSecret = "secret";
const randBytesAsync = util.promisify(crypto.randomBytes);
const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];
//google login
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
//google login
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
//fb login
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

//signup
router.post("/signup", async function(req, res, next) {
  try {
    const { name, password, email, college } = req.body;
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
    // const randBuffer = await randBytesAsync(20);
    // const verifyToken = randBuffer.toString("hex");
    const userData = {
      name,
      email,
      phone,
      college,
      password: pwdHash,
      verifyToken: uniqid()
    };

    const newUser = new User(userData);
    const savedUser = await newUser.save();
    const mailgunResponse = await sendVerificationEmail({
      email,
      name,
      verifyToken
    });
    //login the user now
    const token = jwt.sign({ id: savedUser._id }, jwtSecret);
    res.cookie("user", token, {
      httpOnly: true,
      maxAge: 86400 * 7 * 1000,
      domain: getCookieDomain(req.header("origin"))
    });
    res.json({
      success: true,
      message: `verfication link sent to ${savedUser.email}`
    });
  } catch (err) {
    next(err);
  }
});
//has user verified email
router.post("/is-user-verified", async function(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.json({
        success: false,
        message: "That email doesn't exist"
      });
    }
    if (user.emailVerified === true) {
      return res.json({
        verified: true
      });
    }
    res.json({ verified: false });
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
    if (!user.password) {
      //happens if signedup with google or fb
      return res.json({
        success: false,
        message: "Incorrect password"
      });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect details" });
    //login the user now
    const token = jwt.sign({ id: user._id }, jwtSecret);
    res.cookie("user", token, {
      httpOnly: true,
      maxAge: 86400 * 7 * 1000,
      domain: getCookieDomain(req.header("origin"))
    });
    res.json({ token, success: true, message: "login successful" });
  } catch (err) {
    next(err);
  }
});
//verify email
router.get("/verify-email/:verifyToken", async function(req, res) {
  const { verifyToken } = req.params;
  const user = await User.findOne({ verifyToken });
  if (user) {
    if (user.emailVerified === true) {
      return res.status(400).json({
        success: false,
        message: "Already verified!"
      });
    }
    user.set({ emailVerified: true });
    const savedUser = await user.save();
    //login the user now
    const token = jwt.sign({ id: user._id }, jwtSecret);
    res.cookie("user", token, {
      httpOnly: true,
      maxAge: 86400 * 7 * 1000,
      domain: getCookieDomain(req.header("origin"))
    });
  } else {
    res.json({
      success: false,
      message: "This is not a valid verfication link"
    });
  }
});
//send email - forgot password
router.post("/forgot-password", async function(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: `No account exists with the email ${email}`
      });
    }
    const randBuffer = await randBytesAsync(8);
    const resetToken = randBuffer.toString("hex");
    user.set({ resetToken });
    user.set({ resetTokenExpiry: Date.now() + 10 * 60 * 1000 });
    const savedUser = await user.save();
    //send reset email
    const emailRes = await sendResetEmail({
      email,
      name: user.name,
      resetToken: user.resetToken
    });
    return res.json({
      success: true,
      message: `A reset code is sent to ${email}`
    });
  } catch (err) {
    next(err);
  }
});
//save new password
router.post("/new-password", async function(req, res, next) {
  try {
    const { resetToken, password } = req.body;
    const user = await User.findOne({ resetToken });
    if (!user) {
      return res.json({ success: false, message: "Invalid one time password" });
    }
    if (user.resetTokenExpiry < Date.now()) {
      return res.json({
        success: false,
        message: "Oops the OTP expired!"
      });
    }
    const pwdHash = await bcrypt.hash(password, saltRounds);
    user.set({ password: pwdHash, resetTokenExpiry: Date.now() });
    const savedUser = await user.save();
    res.json({
      success: true,
      message: "password reset successfully"
    });
  } catch (err) {
    next(err);
  }
});
//is user logged in
router.get("/check-state", async function(req, res, next) {
  try {
    const token = req.cookies.user;
    if (!token) return res.json({ success: false });

    jwt.verify(token, jwtSecret, function(err) {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    });
  } catch (err) {
    next(err);
  }
});
//logout
router.get("/logout", async function(req, res) {
  res.clearCookie("user");
  res.redirect("/");
});
module.exports = router;
