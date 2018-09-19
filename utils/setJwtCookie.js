const jwt = require("jsonwebtoken");
const getCookieDomain = require("./getCookieDomain");
const jwtSecret = "secret3";
module.exports = function(req, res, { cookieKey, id }) {
  const token = jwt.sign({ id }, jwtSecret);
  res.cookie(cookieKey, token, {
    httpOnly: true,
    maxAge: 86400 * 7 * 1000,
    domain: getCookieDomain(req.header("origin"))
  });
};
