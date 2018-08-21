const isProduction = require("./isProduction");
module.exports = function(origin) {
  if (isProduction) {
    const domain = origin.slice(8); //strip "https://"
    return domain;
  }
  return "localhost";
};
