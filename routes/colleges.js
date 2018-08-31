const College = require("../models/college");
const router = require("express").Router();
//get all cities
router.get("/all-cities", async function(req, res, next) {
  try {
    //const cities = await College.distinct("city");
    const aggregate = College.aggregate();
    const cities = await aggregate.group({ _id: "$city" });
    res.status(200).json({
      cities
    });
  } catch (err) {
    next(err);
  }
});
//get colleges in a city
router.get("/colleges/:city", async function(req, res, next) {
  try {
    const { city } = req.params;
    const colleges = await College.find({ city }).select({
      college: 1,
      _id: 0
    });
    res.status(200).json({
      colleges
    });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
