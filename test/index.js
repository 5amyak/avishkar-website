const request = require("supertest");
const app = require("../server");
//succesful login without referral
describe("POST /api/signup", function() {
  it("respond with json", function(done) {
    request(app)
      .post("/api/signup")
      .send({
        name: "sumanth",
        email: "sumanth@email.com",
        password: "password",
        phone: "1234567890",
        college: "mnnit"
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200, done);
  });
});

//invalid referral code
describe("POST /api/signup", function() {
  it("responds with Invalid referral code", function(done) {
    request(app)
      .post("/api/signup")
      .send({
        name: "name",
        email: "name@email.com",
        password: "password",
        phone: "1234567890",
        college: "mnnit",
        code: "00000000"
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400, { message: "Invalid refferal code" }, done);
  });
});
//login with incorrect details

describe("POST /api/signin", function() {
  it("responds with 'Incorrect details'", function(done) {
    request(app)
      .post("/api/signin")
      .send({
        email: "sumanth@email.com",
        password: "wrong-password"
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400, { message: "Incorrect details" }, done);
  });
});
//successful login
describe("POST /api/signin", function() {
  it("responds with json", function(done) {
    request(app)
      .post("/api/signin")
      .send({
        email: "sumanth@email.com",
        password: "password"
      })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200, done);
  });
});
//unauthenticated profile access
describe("GET /api/profile", function() {
  it("responds with 'Not authenticated'", function(done) {
    request(app)
      .get("/api/profile")
      .expect("Content-Type", /json/)
      .expect(401, { message: "Not authenticated" }, done);
  });
});
//check for valid referral code
describe("GET /api/referral/hereisinvalidcode", function() {
  it("responds with 'Invalid referral code'", function(done) {
    request(app)
      .get("/api/referral/hereisinvalidcode")
      .expect("Content-Type", /json/)
      .expect(200, { success: false, message: "Invalid referral code" }, done);
  });
});
