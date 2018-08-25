const isProduction = require("./isProduction");
module.exports = function(origin) {
  if (isProduction) {
    if (origin === "https://www.avishkarmnnit.in") return ".avishkarmnnit.in";
    else if (origin === "https://avishkar.mnnit.ac.in") return ".mnnit.ac.in";
  }
  return "localhost";
};
