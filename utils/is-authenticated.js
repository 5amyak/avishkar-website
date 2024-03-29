const jwt = require("jsonwebtoken");
const secret = "secret3";
module.exports = function isAuthenticated(req, res, next) {
  const token = req.cookies.user;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  jwt.verify(token, secret, function(err, decoded) {
    if (err) {
      res.clearCookie("user");
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.decoded = decoded;
    next();
  });
};
