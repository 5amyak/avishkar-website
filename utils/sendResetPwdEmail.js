const path = require("path");
const mgunKey = "key-6b588d97fe36edeb417b5c371609818b";
const domain = "www.avishkarmnnit.in";
const mailgun = require("mailgun-js")({ apiKey: mgunKey, domain });
const ejs = require("ejs");
const fs = require("fs");
// const app = require("express")();
// app.set("views", path.join(__dirname, "views"));
// app.set("view engine", "ejs");

module.exports = function(email, pwdLink, cb) {
    fs.readFile(path.join(__dirname, "views/reset-password.ejs"),"utf-8",function(err,str){
       const html =  ejs.render(str,pwdLink);
       const data = {
        from: "Avishkar - MNNIT",
        to: email,
        subject: "Avishar MNNIT - Password reset instructions",
        html
      };
      mailgun.messages().send(data, function(err, body) {
        cb(err, body);
      });
    })

 
