const jwt = require("jsonwebtoken");
const secret = "secret2";
module.exports = function isOrgAuthenticated(req, res, next) {
  const token = req.cookies.org;
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
