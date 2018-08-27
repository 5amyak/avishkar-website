//const path = require("path");
const mgunKey = "key-6b588d97fe36edeb417b5c371609818b";
const domain = "api.avishkarmnnit.in";
const mailgun = require("mailgun-js")({ apiKey: mgunKey, domain });
const ejs = require("ejs");
const fs = require("fs");
//const crypto = require("crypto");
const util = require("util");
const isProduction = require("./isProduction");
const User = require("../models/user");
const readFileAsync = util.promisify(fs.readFile);

const baseUrl = isProduction
  ? "https://api.avishkarmnnit.in"
  : "http://localhost:3001";

function mailgunSendAsync(data) {
  return new Promise(function(resolve, reject) {
    mailgun.messages().send(data, function(err, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}
async function sendEmail({ email, name, resetToken }) {
  //const resetLink = `${baseUrl}/api/reset-password/${resetToken}`;
  const fileString = await readFileAsync("./views/reset-password.ejs", "utf-8");
  const html = ejs.render(fileString, { name, resetToken });

  const data = {
    from: "Avishkar MNNIT <avishkar2017.mnnit@gmail.com>",
    to: email,
    subject: "Reset your password",
    html
  };
  const resBody = await mailgunSendAsync(data);
  return resBody;
}

module.exports = sendEmail;
