const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const routes = require("./routes");
const errorHandler = require("./utils/error-handler");
mongoose.connect(
  "mongodb://localhost:27017/avishkar",
  { useNewUrlParser: true }
);

const app = express();
//CORS handler
app.use("/api", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "origin, x-requested-with, content-type, accept,x-access-token,cookie"
  );
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
