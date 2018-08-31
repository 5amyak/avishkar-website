const jwt = require("jsonwebtoken");
const getCookieDomain = require("./getCookieDomain");
const jwtSecret = "secret2";
module.exports = function(req, res, userId) {
  const token = jwt.sign({ id: userId }, jwtSecret);
  res.cookie("user", token, {
    httpOnly: true,
    maxAge: 86400 * 7 * 1000,
    domain: getCookieDomain(req.header("origin"))
  });
};
