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
async function sendEmail({ email, name, verifyToken }) {
  const verifyLink = `${baseUrl}/verify-email/${verifyToken}`;
  const fileString = await readFileAsync("./views/reset-password.ejs", "utf-8");
  const html = ejs.render(fileString, { name, verifyLink });

  const data = {
    from: "Avishkar MNNIT <avishkar2017.mnnit@gmail.com>",
    to: email,
    subject: "Password reset instructions",
    html
  };
  const resBody = await mailgunSendAsync(data);
  return resBody;
}

// function sendEmail(email, pwdLink, cb) {
//   crypto.randomBytes(20,function(err,buffer){
//     const token = buffer.toString("hex");
//     fs.readFile(
//       path.join(__dirname, "../views/reset-password.ejs"),
//       "utf-8",
//       function(err, str) {
//         if (err) cb(err);
//         else {
//           const html = ejs.render(str, { pwdLink });
//           const data = {
//             from: "Avishkar MNNIT <avishkar2017.mnnit@gmail.com>",
//             to: email,
//             subject: "Password reset instructions",
//             html
//           };
//           mailgun.messages().send(data, function(err, body) {
//             cb(err, body);
//           });
//         }
//       }
//     );
//   })
// }

// sendEmail("srksumanth@gmail.com", "https://nodejs.org", function(err, body) {
//   if (err) {
//     console.log(err);
//     return;
//   }
//   console.log(body);
// });
module.exports = sendEmail;
