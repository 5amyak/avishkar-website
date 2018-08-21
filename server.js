const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const routes = require("./routes");
const errorHandler = require("./utils/error-handler");
const isProduction = require("./utils/isProduction");
const allowedOrigins = [
  "https://avishkarmnnit.in",
  "https://avishkar.mnnit.ac.in"
];
mongoose.connect(
  "mongodb://localhost:27017/avishkar",
  { useNewUrlParser: true }
);
const app = express();
//CORS handler
app.use("/api", function(req, res, next) {
  if (isProduction) {
    const origin = req.get("origin");
    if (!allowedOrigins.includes(origin)) {
      return res.sendStatus(403);
    }
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "origin, x-requested-with, content-type, accept,cookie"
    );
  }

  next();
});
app.use("/api", cookieParser());
app.use("/api", bodyParser.urlencoded({ extended: false }));
app.use("/api", bodyParser.json());
app.use("/api", routes);
app.use(errorHandler);
app.use("*", function(req, res) {
  res.sendStatus(404);
});

app.listen(3001, err => {
  if (err) throw err;
  console.log("> Ready on http://localhost:3001");
});
module.exports = app;
